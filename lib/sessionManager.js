'use strict';
/**
 * Session manager: owns every linked WhatsApp account and every pairing attempt.
 *
 *  - One BotSession per linked number. Auth files live in <DATA_DIR>/sessions/<number>/
 *  - Pairing attempts are tracked separately by a random id. The website only ever
 *    receives the attempt status and the (short-lived) pairing code, never credentials.
 *  - An attempt is only "connected" when Baileys reports connection === 'open'.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Boom } = require('@hapi/boom');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} = require('@whiskeysockets/baileys');
const { baileysLogger } = require('./logger');
const { SettingsStore } = require('./settings');

/**
 * Baileys 6.7.x writes a PLACEHOLDER identity (creds.me = {id: '<number>@s.whatsapp.net', name: '~'})
 * as soon as requestPairingCode() is called. That must never count as "linked".
 * A real, completed pairing has creds.account and a device-suffixed id ("<number>:<device>@...").
 */
function hasRealIdentity(creds) {
  if (!creds || !creds.me) return false;
  return !!creds.account || /:\d+@/.test(String(creds.me.id || ''));
}

const FINAL = new Set(['connected', 'expired', 'failed', 'cancelled']);

class PairingError extends Error {
  constructor(status, message) { super(message); this.httpStatus = status; }
}

/** Validate and normalise a phone number. Returns digits or throws PairingError(400). */
function normalizeNumber(input) {
  if (typeof input !== 'string' && typeof input !== 'number') throw new PairingError(400, 'Please enter your WhatsApp number.');
  const raw = String(input).trim();
  if (!/^[+\d\s\-().]+$/.test(raw)) throw new PairingError(400, 'Enter digits only, with country code (example: 923001234567).');
  const n = raw.replace(/\D/g, '');
  if (n.startsWith('0')) throw new PairingError(400, 'Do not start with 0. Use the international format with country code (example: 923001234567).');
  if (n.length < 8 || n.length > 15) throw new PairingError(400, 'That number looks invalid. It must be 8-15 digits including the country code.');
  return n;
}

class BotSession {
  constructor(manager, number, attempt) {
    this.manager = manager;
    this.number = number;
    this.attempt = attempt || null;
    this.dir = path.join(manager.config.sessionsDir, number);
    this.sock = null;
    this.authState = null;
    this.state = 'starting'; // starting | connected | closed
    this.stopped = false;
    this.codeRequested = false;
    this.retries = 0;
    this.timers = { reconnect: null, expiry: null, code: null };
    this.saving = Promise.resolve();
    this.settings = new SettingsStore(manager.config.settingsDir, number, manager.config, manager.log);
  }

  get log() { return this.manager.log; }
  get paired() { return hasRealIdentity(this.authState && this.authState.creds); }

  clearTimers() {
    for (const k of Object.keys(this.timers)) { clearTimeout(this.timers[k]); this.timers[k] = null; }
  }

  armExpiry(ms) {
    clearTimeout(this.timers.expiry);
    if (!this.attempt) return;
    this.attempt.expiresAt = Date.now() + ms;
    this.timers.expiry = setTimeout(() => {
      if (!this.attempt || FINAL.has(this.attempt.status)) return;
      this.finishAttempt('expired', 'The pairing attempt expired. Please request a new code and enter it faster.');
      this.manager.remove(this, { deleteData: true });
    }, ms);
    this.timers.expiry.unref?.();
  }

  finishAttempt(status, message) {
    const a = this.attempt;
    if (!a || FINAL.has(a.status)) return;
    a.status = status;
    a.message = message;
    a.code = null;
    a.finishedAt = Date.now();
  }

  async connect() {
    if (this.stopped) return;
    fs.mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    await this.saving; // make sure the last credentials write finished before re-reading them
    if (this.stopped) return;
    const { state, saveCreds } = await useMultiFileAuthState(this.dir);
    this.authState = state;
    const version = await this.manager.getWaVersion();

    const sock = makeWASocket({
      ...(version ? { version } : {}),
      logger: baileysLogger,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, baileysLogger) },
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined,
    });
    this.sock = sock;

    sock.ev.on('creds.update', () => {
      this.saving = this.saving
        .then(() => saveCreds())
        .catch((e) => this.log.error({ err: e.message }, 'failed to save credentials'))
        .then(() => { if (sock === this.sock && !this.stopped) this.onCredsUpdate(); });
    });
    sock.ev.on('call', (calls) => {
      if (sock !== this.sock || this.state !== 'connected') return;
      this.manager.handler?.onCall(this, calls).catch((e) => this.log.error({ err: e.message }, 'call handler error'));
    });
    sock.ev.on('group-participants.update', (ev) => {
      if (sock !== this.sock || this.state !== 'connected') return;
      this.manager.handler?.onGroupParticipants(this, ev).catch((e) => this.log.error({ err: e.message }, 'group event error'));
    });
    sock.ev.on('connection.update', (u) => this.onConnectionUpdate(sock, u));
    sock.ev.on('messages.upsert', (ev) => {
      if (sock !== this.sock || this.state !== 'connected') return;
      this.manager.handler?.onMessages(this, ev).catch((e) => this.log.error({ err: e.message }, 'handler crash'));
    });

    // Fallback: if no "qr" event arrives, still ask for the code after a short delay.
    if (!this.paired && this.attempt && !this.codeRequested) {
      this.timers.code = setTimeout(() => this.requestCode(sock), 5000);
    }
  }

  onCredsUpdate() {
    if (this.attempt && this.attempt.status === 'code_ready' && this.paired) this.markLinking();
  }

  markLinking() {
    const a = this.attempt;
    if (!a || a.status !== 'code_ready') return;
    a.status = 'linking';
    a.code = null;
    a.message = 'Code accepted by WhatsApp. Finishing the connection, please wait...';
    this.armExpiry(this.manager.config.pairing.linkingGraceMs);
  }

  async requestCode(sock) {
    if (this.codeRequested || sock !== this.sock || this.stopped || !this.attempt || this.paired) return;
    this.codeRequested = true;
    clearTimeout(this.timers.code);
    try {
      const raw = await sock.requestPairingCode(this.number);
      if (sock !== this.sock || this.stopped) return;
      const code = String(raw).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const a = this.attempt;
      a.code = code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
      a.status = 'code_ready';
      a.message = 'Open WhatsApp > Linked devices > Link a device > Link with phone number instead, then enter this code.';
      this.armExpiry(this.manager.config.pairing.attemptTtlMs);
      this.log.info({ number: this.number }, 'pairing code issued');
    } catch (e) {
      this.log.warn({ err: e.message, number: this.number }, 'pairing code request failed');
      this.finishAttempt('failed', 'WhatsApp did not give a pairing code. Check the number and try again in a moment.');
      this.manager.remove(this, { deleteData: true });
    }
  }

  onConnectionUpdate(sock, update) {
    if (sock !== this.sock || this.stopped) return;
    const { connection, lastDisconnect, qr } = update;
    if (qr && !this.paired && this.attempt) this.requestCode(sock);
    if (update.isNewLogin && this.attempt && this.attempt.status === 'code_ready') this.markLinking();
    if (connection === 'open') this.onOpen(sock);
    else if (connection === 'close') this.onClose(lastDisconnect);
  }

  async onOpen(sock) {
    this.state = 'connected';
    this.retries = 0;
    clearTimeout(this.timers.expiry);
    clearTimeout(this.timers.code);
    this.log.info({ number: this.number }, 'WhatsApp connection open');
    if (this.settings.get('online')) sock.sendPresenceUpdate('available').catch(() => {});

    if (this.attempt && !FINAL.has(this.attempt.status)) {
      this.attempt.status = 'connected';
      this.attempt.message = 'Connected! Your WhatsApp is now linked to SHADOW MD.';
      this.attempt.code = null;
      this.attempt.finishedAt = Date.now();
    }
    // The session is now long-lived; the pairing attempt (if any) is done.
    this.attempt = null;

    const cfg = this.manager.config;
    try {
      const selfJid = jidNormalizedUser(sock.user?.id || '');
      if (selfJid && !this.welcomed) {
        this.welcomed = true;
        await sock.sendMessage(selfJid, {
          text: `✅ *${this.settings.get('botName')}* connected successfully.\nType *${this.settings.get('prefix')}menu* to see the commands.\n\n📢 ${cfg.channel.link}`,
        });
      }
    } catch (e) { this.log.debug({ err: e.message }, 'welcome message failed'); }

    if (cfg.autoFollowChannel && typeof sock.newsletterFollow === 'function') {
      try { await sock.newsletterFollow(cfg.channel.jid); } catch (e) { this.log.debug({ err: e.message }, 'channel follow failed'); }
    }
  }

  onClose(lastDisconnect) {
    const err = lastDisconnect?.error;
    const status = err instanceof Boom ? err.output.statusCode : err?.output?.statusCode;
    this.state = 'closed';
    this.log.info({ number: this.number, status }, 'WhatsApp connection closed');

    if (status === DisconnectReason.loggedOut) {
      this.finishAttempt('failed', 'WhatsApp logged this session out. Please pair again.');
      this.manager.remove(this, { deleteData: true });
      return;
    }
    if (status === DisconnectReason.connectionReplaced) {
      this.log.warn({ number: this.number }, 'session replaced by another connection; not reconnecting');
      this.finishAttempt('failed', 'This number was opened somewhere else. Please try again.');
      this.manager.remove(this, { deleteData: false });
      return;
    }
    if (status === DisconnectReason.restartRequired) {
      // Normal right after pairing succeeds: WhatsApp asks for a fresh socket.
      this.connect().catch((e) => this.onFatal(e));
      return;
    }
    if (this.attempt && !this.paired) {
      this.finishAttempt('failed', 'The connection to WhatsApp was lost before pairing finished. Please try again.');
      this.manager.remove(this, { deleteData: true });
      return;
    }
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.stopped) return;
    this.retries += 1;
    if (this.retries > 10) {
      this.log.error({ number: this.number }, 'too many reconnect failures; giving up until next restart');
      this.finishAttempt('failed', 'Could not keep the WhatsApp connection alive. Please try again.');
      this.manager.remove(this, { deleteData: false });
      return;
    }
    const delay = Math.min(2000 * 2 ** (this.retries - 1), 30000);
    this.timers.reconnect = setTimeout(() => this.connect().catch((e) => this.onFatal(e)), delay);
    this.timers.reconnect.unref?.();
  }

  onFatal(e) {
    this.log.error({ err: e.message, number: this.number }, 'session error');
    if (this.attempt && !this.paired) {
      this.finishAttempt('failed', 'Internal error while connecting to WhatsApp. Please try again.');
      this.manager.remove(this, { deleteData: true });
    } else {
      this.scheduleReconnect();
    }
  }

  stop() {
    this.stopped = true;
    this.clearTimers();
    const sock = this.sock;
    this.sock = null;
    try { sock?.end(undefined); } catch (_) { /* ignore */ }
  }
}

class SessionManager {
  constructor({ config, logger }) {
    this.config = config;
    this.log = logger;
    this.handler = null;
    this.sessions = new Map(); // number -> BotSession
    this.attempts = new Map(); // id -> attempt
    this._wa = { version: null, at: 0 };
    fs.mkdirSync(config.sessionsDir, { recursive: true, mode: 0o700 });

    this.sweeper = setInterval(() => this.sweep(), 60 * 1000);
    this.sweeper.unref?.();
  }

  setHandler(handler) { this.handler = handler; }

  async getWaVersion() {
    if (this._wa.version && Date.now() - this._wa.at < 3600 * 1000) return this._wa.version;
    try {
      const r = await fetchLatestBaileysVersion();
      if (r && Array.isArray(r.version)) this._wa = { version: r.version, at: Date.now() };
    } catch (e) { this.log.debug({ err: e.message }, 'could not fetch latest WA version; using library default'); }
    return this._wa.version;
  }

  sweep() {
    const cutoff = Date.now() - this.config.pairing.attemptRetentionMs;
    for (const [id, a] of this.attempts) if (a.finishedAt && a.finishedAt < cutoff) this.attempts.delete(id);
  }

  /** Re-open sessions that were linked before the last restart. */
  async restoreAll() {
    let names = [];
    try { names = fs.readdirSync(this.config.sessionsDir); } catch (_) { return; }
    let restored = 0;
    for (const name of names) {
      if (!/^\d{6,15}$/.test(name)) continue;
      const dir = path.join(this.config.sessionsDir, name);
      let creds = null;
      try { creds = JSON.parse(fs.readFileSync(path.join(dir, 'creds.json'), 'utf8')); } catch (_) { /* no creds */ }
      // Only half-finished pairings (no real identity) are removed. Real sessions are never deleted here.
      if (!hasRealIdentity(creds)) { fs.rmSync(dir, { recursive: true, force: true }); continue; }
      if (this.sessions.has(name)) continue;
      const s = new BotSession(this, name, null);
      this.sessions.set(name, s);
      s.connect().catch((e) => s.onFatal(e));
      restored += 1;
      await new Promise((r) => setTimeout(r, 500));
    }
    this.log.info({ restored }, 'restored saved sessions');
  }

  async startPairing(rawNumber) {
    const number = normalizeNumber(rawNumber);
    const cfg = this.config;

    const existing = this.sessions.get(number);
    if (existing) {
      if (!existing.attempt) { // long-lived (restored or connected) session
        throw new PairingError(409, 'This number is already linked to SHADOW MD. To link again, first remove the linked device in WhatsApp.');
      }
      existing.finishAttempt('cancelled', 'Replaced by a newer pairing request.');
      this.remove(existing, { deleteData: true });
    } else {
      fs.rmSync(path.join(cfg.sessionsDir, number), { recursive: true, force: true });
    }

    if (this.sessions.size >= cfg.pairing.maxSessions) {
      throw new PairingError(503, 'The server has reached its maximum number of linked accounts.');
    }

    const now = Date.now();
    const attempt = {
      id: crypto.randomBytes(16).toString('hex'),
      number,
      status: 'starting',
      message: 'Starting a secure connection to WhatsApp...',
      code: null,
      createdAt: now,
      expiresAt: now + cfg.pairing.attemptTtlMs,
      finishedAt: null,
    };
    const session = new BotSession(this, number, attempt);
    this.sessions.set(number, session);
    this.attempts.set(attempt.id, attempt);
    session.armExpiry(cfg.pairing.attemptTtlMs + 15000); // includes time to reach WhatsApp
    session.connect().catch((e) => session.onFatal(e));
    return attempt;
  }

  /** Public, safe view of an attempt. Never includes auth data. */
  getPublic(id) {
    const a = this.attempts.get(id);
    if (!a) return null;
    const live = a.status === 'code_ready' || a.status === 'linking';
    return {
      status: a.status,
      message: a.message,
      code: a.status === 'code_ready' ? a.code : null,
      number: `${'*'.repeat(Math.max(0, a.number.length - 4))}${a.number.slice(-4)}`,
      expiresInSeconds: live || a.status === 'starting' ? Math.max(0, Math.round((a.expiresAt - Date.now()) / 1000)) : 0,
    };
  }

  cancel(id) {
    const a = this.attempts.get(id);
    if (!a) return false;
    const s = this.sessions.get(a.number);
    if (s && s.attempt === a) {
      s.finishAttempt('cancelled', 'Pairing was cancelled.');
      this.remove(s, { deleteData: true });
    }
    return true;
  }

  remove(session, { deleteData }) {
    session.stop();
    session.settings.flush();
    if (this.sessions.get(session.number) === session) this.sessions.delete(session.number);
    if (deleteData) {
      try { fs.rmSync(session.dir, { recursive: true, force: true }); } catch (e) { this.log.warn({ err: e.message }, 'could not delete session dir'); }
    }
  }

  stats() {
    let connected = 0;
    for (const s of this.sessions.values()) if (s.state === 'connected') connected += 1;
    return { sessions: this.sessions.size, connected };
  }

  /** Close sockets without logging out so sessions survive a restart. */
  shutdown() {
    clearInterval(this.sweeper);
    for (const s of this.sessions.values()) { s.stop(); s.settings.flush(); }
  }
}

module.exports = { SessionManager, PairingError, normalizeNumber, hasRealIdentity };

'use strict';
/**
 * Message handler shared by all sessions. Handles:
 *  - command parsing with the per-session prefix, mode (public/private) and sudo users
 *  - permission checks (owner, sudo, group, admin, bot admin) and per-command cooldowns
 *  - passive features: auto-read, auto-typing, auto-react, antilink
 *  - group welcome/goodbye messages and call blocking
 * A failing command can never crash the bot or block other commands.
 */
const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const { jidNum, extractText, quotedOf, mentionedOf, resolveTarget, pick } = require('./utils');

const LINK_RE = /(https?:\/\/|www\.|chat\.whatsapp\.com\/)\S+/i;
const REACTIONS = ['👍', '❤️', '🔥', '😂', '🙏', '✨'];

function isAdminOf(meta, jids) {
  const wanted = new Set(jids.filter(Boolean).map(jidNum));
  return (meta?.participants || []).some((p) => {
    if (!p.admin) return false;
    return [p.id, p.lid, p.phoneNumber].filter(Boolean).some((j) => wanted.has(jidNum(j)));
  });
}

class Handler {
  constructor({ config, registry, logger }) {
    this.config = config;
    this.registry = registry;
    this.log = logger;
    this.cooldowns = new Map();
    const gc = setInterval(() => {
      const now = Date.now();
      for (const [k, t] of this.cooldowns) if (t < now) this.cooldowns.delete(k);
    }, 60000);
    gc.unref?.();
  }

  async onMessages(session, { messages, type }) {
    if (type !== 'notify') return;
    for (const msg of messages) {
      try { await this.handle(session, msg); }
      catch (e) { this.log.error({ err: e.message, number: session.number }, 'message handler error'); }
    }
  }

  async handle(session, msg) {
    const { config, registry } = this;
    const sock = session.sock;
    const settings = session.settings;
    if (!sock || !msg.message) return;

    const from = msg.key.remoteJid;
    if (!from || from === 'status@broadcast' || from.endsWith('@newsletter')) return;

    const text = extractText(msg.message).trim();
    const isGroup = from.endsWith('@g.us');
    const selfJid = jidNormalizedUser(sock.user?.id || '');
    const fromMe = !!msg.key.fromMe;
    const sender = fromMe ? selfJid : (isGroup ? (msg.key.participant || msg.participant) : from);
    const senderNumber = jidNum(sender);

    const isSuperOwner = fromMe || config.owners.includes(senderNumber) || senderNumber === session.number;
    const isOwner = isSuperOwner || (settings.get('sudo') || []).includes(senderNumber);

    // ---- passive features (incoming messages only) ----
    if (!fromMe) {
      if (settings.get('autoread')) sock.readMessages([msg.key]).catch(() => {});
      if (isGroup && text && LINK_RE.test(text) && settings.group(from).antilink) {
        if (await this.antilink(sock, msg, from, sender, isOwner)) return;
      }
    }

    // ---- command parsing ----
    const prefix = settings.get('prefix');
    if (!text || !text.startsWith(prefix)) return;
    const body = text.slice(prefix.length).trim();
    if (!body) return;
    const [rawName, ...args] = body.split(/\s+/);
    const command = registry.get(rawName);
    if (!command) return;

    if (settings.get('mode') === 'private' && !isOwner) return; // private mode: owners only, stay silent

    const reply = (content, opts = {}) => {
      const payload = typeof content === 'string' ? { text: content } : content;
      return sock.sendMessage(from, payload, { quoted: msg, ...opts });
    };

    if (command.superOwnerOnly && !isSuperOwner) return reply('🚫 This command is for the bot owner only.');
    if (command.ownerOnly && !isOwner) return reply('🚫 This command is for the bot owner only.');
    if (command.groupOnly && !isGroup) return reply('👥 This command can only be used in groups.');
    if (command.privateOnly && isGroup) return reply('💬 This command can only be used in a private chat.');

    if (command.cooldown && !isOwner) {
      const key = `${session.number}:${senderNumber}:${command.name}`;
      const until = this.cooldowns.get(key) || 0;
      if (until > Date.now()) return reply(`⏳ Please wait ${Math.ceil((until - Date.now()) / 1000)}s before using ${prefix}${command.name} again.`);
      this.cooldowns.set(key, Date.now() + command.cooldown * 1000);
    }

    let groupMetadata = null;
    let isAdmin = false;
    let isBotAdmin = false;
    if (isGroup && (command.adminOnly || command.botAdmin || command.groupOnly || command.needsGroupMeta)) {
      try {
        groupMetadata = await sock.groupMetadata(from);
        isAdmin = isAdminOf(groupMetadata, [sender]);
        isBotAdmin = isAdminOf(groupMetadata, [sock.user?.id, sock.user?.lid]);
      } catch (e) {
        return reply('⚠️ Could not read group information. Please try again.');
      }
    }
    if (command.adminOnly && !(isAdmin || isOwner)) return reply('🛡️ This command is for group admins only.');
    if (command.botAdmin && !isBotAdmin) return reply('🤖 I need to be a group admin to do that.');

    if (settings.get('autoreact') && !fromMe) sock.sendMessage(from, { react: { text: pick(REACTIONS), key: msg.key } }).catch(() => {});
    if (settings.get('autotyping')) sock.sendPresenceUpdate('composing', from).catch(() => {});

    const quoted = quotedOf(msg.message);
    const ctx = {
      sock, msg, from, sender, senderNumber, isGroup, isOwner, isSuperOwner, isAdmin, isBotAdmin, groupMetadata,
      args, text: args.join(' '), command: command.name, prefix,
      quoted, mentioned: mentionedOf(msg.message), getTarget: () => resolveTarget(msg.message, args),
      config, registry, session, settings, reply,
      react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } }),
    };

    try {
      await command.run(ctx);
    } catch (e) {
      this.log.error({ err: e.message, command: command.name }, 'command failed');
      try { await reply('❌ Something went wrong while running this command.'); } catch (_) { /* ignore */ }
    } finally {
      if (settings.get('autotyping')) sock.sendPresenceUpdate('paused', from).catch(() => {});
    }
  }

  /** Delete messages with links from non-admins. Returns true if the message was handled. */
  async antilink(sock, msg, from, sender, isOwner) {
    try {
      if (isOwner) return false;
      const meta = await sock.groupMetadata(from);
      if (isAdminOf(meta, [sender])) return false;
      if (!isAdminOf(meta, [sock.user?.id, sock.user?.lid])) return false; // cannot delete without admin rights
      await sock.sendMessage(from, { delete: msg.key });
      await sock.sendMessage(from, { text: `🔗 @${jidNum(sender)} links are not allowed in this group.`, mentions: [sender] });
      return true;
    } catch (e) {
      this.log.debug({ err: e.message }, 'antilink failed');
      return false;
    }
  }

  async onGroupParticipants(session, { id, participants, action }) {
    const g = session.settings.group(id);
    const wantWelcome = action === 'add' && g.welcome;
    const wantBye = action === 'remove' && g.goodbye;
    if (!wantWelcome && !wantBye) return;
    const sock = session.sock;
    let subject = 'the group';
    try { subject = (await sock.groupMetadata(id)).subject || subject; } catch (_) { /* keep default */ }
    const jids = (participants || []).map((p) => (typeof p === 'string' ? p : p.id || p.phoneNumber)).filter(Boolean);
    for (const jid of jids) {
      if (jidNum(jid) === jidNum(sock.user?.id)) continue;
      const text = wantWelcome
        ? `👋 Welcome @${jidNum(jid)} to *${subject}*!\nPlease read the group rules and enjoy your stay.`
        : `👋 Goodbye @${jidNum(jid)}, we will miss you.`;
      await sock.sendMessage(id, { text, mentions: [jid] }).catch(() => {});
    }
  }

  async onCall(session, calls) {
    if (!session.settings.get('anticall')) return;
    for (const call of calls || []) {
      if (call.status !== 'offer' || call.isGroup) continue;
      try {
        await session.sock.rejectCall(call.id, call.from);
        await session.sock.sendMessage(call.from, { text: '📵 Calls are not accepted. Please send a message instead.' });
      } catch (e) { this.log.debug({ err: e.message }, 'reject call failed'); }
    }
  }
}

module.exports = { Handler, extractText, isAdminOf };

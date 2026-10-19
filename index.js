import fs from "node:fs";
import pino from "pino";
import * as baileys from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { config } from "./config.js";
import { commands } from "./plugins/index.js";
import { features } from "./lib/features.js";
import { reply, jidNumber } from "./lib/command-utils.js";
import { pairingEvents } from "./lib/pairing-events.js";

// ---- Baileys import fix: works with every Baileys build ----
const asFn = v => (typeof v === "function" ? v : null);
const makeWASocket =
  asFn(baileys.default) ||
  asFn(baileys.default?.default) ||
  asFn(baileys.makeWASocket) ||
  asFn(baileys.default?.makeWASocket);

if (!makeWASocket) {
  throw new Error("Could not resolve makeWASocket from @whiskeysockets/baileys");
}

const lib =
  baileys.default && typeof baileys.default === "object"
    ? { ...baileys, ...baileys.default }
    : baileys;

const {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} = lib;
// ------------------------------------------------------------

const logger = pino({ level: process.env.LOG_LEVEL || "silent" });
const seenMessages = new Map();
let sock;
let reconnectTimer;
let starting = false;

function unwrap(m) {
  let x = m;
  for (const k of ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2", "documentWithCaptionMessage"]) {
    if (x?.[k]?.message) x = x[k].message;
  }
  return x || {};
}

function textOf(msg) {
  const m = unwrap(msg.message);
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ""
  );
}

function scheduleRestart(delay = 3000) {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    start().catch(e => console.error("Reconnect failed:", e.message));
  }, delay);
}

async function start() {
  if (starting) return;
  starting = true;

  let state, saveCreds;
  try {
    fs.mkdirSync(config.authDir, { recursive: true });
    ({ state, saveCreds } = await useMultiFileAuthState(config.authDir));

    // Not paired yet: wait for the pairing page instead of looping on QR.
    // After a fresh link, Baileys fills creds.me (registered can still be false).
    if (!state.creds.registered && !state.creds.me) {
      console.log("⏳ Not paired yet. Open the pairing page and link your number.");
      return;
    }
    console.log("🔑 Saved session found, starting WhatsApp socket...");

    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      logger,
      browser: Browsers.windows("Chrome"),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false
    });
  } finally {
    starting = false;
  }

  attachHandlers(sock, saveCreds);
}

function attachHandlers(s, saveCreds) {
  s.ev.on("creds.update", saveCreds);

  s.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") console.log("🟢 SHADOW MD connected");

    if (connection === "close") {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log("Connection closed:", code || lastDisconnect?.error?.message || "unknown");

      if (code !== DisconnectReason.loggedOut) {
        scheduleRestart(3000);
      } else {
        console.error("Session logged out. Re-pair using the pairing page.");
      }
    }
  });

  s.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message) continue;

      const remote = msg.key.remoteJid || "";
      const protocol = msg.message.protocolMessage;

      if (protocol && features.antidelete && protocol.key?.id) {
        const old = seenMessages.get(protocol.key.id);
        if (old) {
          s.sendMessage(old.remote, {
            text: `🗑️ *DELETED MESSAGE DETECTED*\nFrom: ${jidNumber(old.key.participant || old.remote)}\nMessage: ${old.body || "[non-text message]"}`
          }).catch(() => {});
        }
        continue;
      }

      if (msg.key.fromMe) continue;

      const body = textOf(msg).trim();

      if (features.autoreacts && !remote.endsWith("@status")) {
        s.sendMessage(remote, { react: { text: "🟢", key: msg.key } }).catch(() => {});
      }

      if (features.antibadwords && remote.endsWith("@g.us") && /\b(fuck|bitch|motherfucker)\b/i.test(body)) {
        const md = await s.groupMetadata(remote).catch(() => null);
        if (md?.participants.some(p => p.id === s.user?.id && ["admin", "superadmin"].includes(p.admin))) {
          s.sendMessage(remote, { delete: msg.key }).catch(() => {});
          s.sendMessage(remote, { text: "⚠️ Inappropriate language is not allowed." }, { quoted: msg }).catch(() => {});
        }
      }

      if (features.antidelete) {
        seenMessages.set(msg.key.id, { remote, key: msg.key, body, at: Date.now() });
        if (seenMessages.size > 500) seenMessages.delete(seenMessages.keys().next().value);
      }

      if ((features.autostatus || features.antistatus) && remote === "status@broadcast") {
        s.readMessages([msg.key]).catch(() => {});
      }

      if (!body.startsWith(config.prefix)) continue;

      const parts = body.slice(config.prefix.length).trim().split(/\s+/);
      const name = (parts.shift() || "").toLowerCase();
      const args = parts;
      const command =
        commands.get(name) || [...commands.values()].find(c => c.aliases?.includes(name));
      if (!command) continue;

      const ctx = { sock: s, remote, msg, args, commandName: name, body };

      try {
        if (features.autotyping) await s.sendPresenceUpdate("composing", remote).catch(() => {});
        if (command.group && !remote.endsWith("@g.us")) {
          await reply(s, remote, msg, "This command works in groups only.");
          continue;
        }
        await command.run(ctx);
      } catch (e) {
        console.error(`[${name}]`, e);
        await reply(s, remote, msg, `❌ ${e.message || "Command failed."}`).catch(() => {});
      }
    }
  });

  s.ev.on("call", async calls => {
    if (!features.anticall) return;
    for (const c of calls) {
      if (c.status === "offer") {
        await s.rejectCall(c.id, c.from).catch(() => {});
        await s.sendMessage(c.from, { text: "🚫 Calls are disabled on this bot." }).catch(() => {});
      }
    }
  });
}

pairingEvents.on("session-saved", () => {
  console.log("Pairing session saved; restarting WhatsApp socket to load new credentials...");
  try { sock?.end(undefined); } catch {}
  scheduleRestart(1500);
});

start().catch(e => {
  console.error("Startup failed:", e);
  process.exitCode = 1;
});

import "./web.js";

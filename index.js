const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const { handleCommand } = require("./handler");

const OWNER = "923003719761";
const PREFIX = ".";
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {}
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["RANA MD", "Chrome", "1.0.0"],
  });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === "open") console.log("RANA MD connected.");
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log("Connection closed:", code || "unknown");
      if (code !== DisconnectReason.loggedOut) setTimeout(startBot, 3000);
      else
        console.log(
          "Logged out. Remove auth_info_baileys only if you intend to pair again."
        );
    }
  });
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue;
        await handleCommand(sock, msg, { PREFIX, OWNER });
      } catch (e) {
        console.error("Message handler error:", e?.message || e);
      }
    }
  });
}
startBot().catch((e) => {
  console.error("Startup failed:", e);
  process.exitCode = 1;
});
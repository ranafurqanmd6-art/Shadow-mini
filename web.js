import express from "express";
import fs from "node:fs";
import path from "node:path";
import pino from "pino";
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from "@whiskeysockets/baileys";
import { config } from "./config.js";
import { pairingEvents } from "./lib/pairing-events.js";

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.dirname(config.authDir);
const MAIN = config.authDir;
const active = new Map();
const last = new Map();
const logger = pino({ level: process.env.LOG_LEVEL || "silent" });

app.get("/health", (_, res) => res.status(200).send("OK"));

app.get("/", (_, res) => res.type("html").send(`<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SHADOW MD Pairing</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#030806;color:#eafff1;font-family:Arial;display:grid;min-height:100vh;place-items:center}
.card{width:min(92vw,480px);padding:28px;border:1px solid #00e676;border-radius:24px;background:#07130d;box-shadow:0 0 35px #00e67622}
h1{color:#00ff7f;text-align:center}
p{color:#a8cbb6}
input,button{width:100%;padding:14px;margin:8px 0;border-radius:12px;font-size:16px}
input{background:#030806;border:1px solid #16864a;color:white}
button{background:#00e676;border:0;font-weight:bold;color:#001b0c}
#out{font-size:24px;text-align:center;letter-spacing:3px;color:#00ff7f;word-break:break-word}
</style>
</head>
<body>
<main class="card">
<h1>SHADOW MD</h1>
<p>Enter your WhatsApp number with country code, without +.</p>
<input id="number" inputmode="numeric" placeholder="923001234567">
<button onclick="pair()">GENERATE PAIR CODE</button>
<div id="out"></div>
<p>WhatsApp → Linked devices → Link with phone number instead.</p>
<script>
async function pair(){
 const n=document.querySelector('#number').value.replace(/\\D/g,'');
 const o=document.querySelector('#out');
 if(n.length<10||n.length>15){o.textContent='Enter a valid phone number';return}
 o.textContent='Generating...';
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(n));
  const t=await r.text();
  o.textContent=r.ok?t:'Error: '+t;
 }catch(e){o.textContent='Request failed. Try again.'}
}
</script>
</main>
</body>
</html>`));

app.get("/pair", async (req, res) => {
  const num = String(req.query.number || "").replace(/\D/g, "");

  if (num.length < 10 || num.length > 15) {
    return res.status(400).send("Enter a valid international phone number.");
  }

  if (Date.now() - (last.get(num) || 0) < 15000) {
    return res.status(429).send("Wait 15 seconds before retrying.");
  }

  if (active.has(num)) {
    return res.status(409).send("Pairing already in progress for this number.");
  }

  last.set(num, Date.now());
  active.set(num, true);

  const dir = path.join(ROOT, `pair-${num}`);
  let s;
  let finished = false;
  let responseSent = false;
  let timeout;
  let onUpdate;

  const sendError = (status, message) => {
    if (!res.headersSent) {
      responseSent = true;
      res.status(status).type("text").send(message);
    }
  };

  const cleanup = () => {
    clearTimeout(timeout);
    if (s && onUpdate) {
      s.ev.off("connection.update", onUpdate);
    }
    active.delete(num);
  };

  try {
    // Remove only this temporary pairing attempt.
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();

    s = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      logger,
      browser: Browsers.windows("Chrome"),
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false
    });

    s.ev.on("creds.update", saveCreds);

    let resolveConnection;
    let rejectConnection;

    const connectionReady = new Promise((resolve, reject) => {
      resolveConnection = resolve;
      rejectConnection = reject;
    });

    onUpdate = ({ connection, lastDisconnect }) => {
      if (connection === "open" && !finished) {
        resolveConnection();
      }

      if (connection === "close" && !finished) {
        const err = lastDisconnect?.error;
        const code = err?.output?.statusCode;

        console.error(
          "Pairing socket closed:",
          code || err?.message || "unknown"
        );

        rejectConnection(
          new Error(`WhatsApp connection closed (${code || "unknown"})`)
        );
      }
    };

    s.ev.on("connection.update", onUpdate);

    timeout = setTimeout(() => {
      rejectConnection(new Error("Pairing connection timed out"));
    }, 30000);

    // Wait for socket initialization before requesting pairing code.
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (finished) {
      throw new Error("Pairing attempt already ended");
    }

    const codePromise = s.requestPairingCode(num);

    const code = await Promise.race([
      codePromise,
      connectionReady.then(() => {
        throw new Error("WhatsApp connected before code generation");
      })
    ]);

    if (finished || res.destroyed) {
      throw new Error("Pairing request cancelled");
    }

    responseSent = true;
    res.type("text").send(
      String(code).match(/.{1,4}/g)?.join("-") || String(code)
    );

    console.log("Pairing code generated successfully.");

    // Keep this temporary socket alive for the user to link the device.
    // The open event below saves the session and transfers it to MAIN.
    timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        try {
          s.end(undefined);
        } catch {}
        sendError(504, "Pairing timed out. Please generate a new code.");
      }
    }, 120000);

    // Wait for the existing connection.update handler to report success.
    await connectionReady;

    if (finished) return;
    finished = true;
    cleanup();

    // Save the newly paired credentials without deleting existing
    // authentication until the new session files are ready.
    const tempMain = `${MAIN}-new`;

    fs.rmSync(tempMain, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(tempMain), { recursive: true });
    fs.cpSync(dir, tempMain, { recursive: true });

    const backup = `${MAIN}-backup`;
    fs.rmSync(backup, { recursive: true, force: true });

    if (fs.existsSync(MAIN)) {
      fs.renameSync(MAIN, backup);
    }

    try {
      fs.renameSync(tempMain, MAIN);
      fs.rmSync(backup, { recursive: true, force: true });
    } catch (err) {
      if (fs.existsSync(backup) && !fs.existsSync(MAIN)) {
        fs.renameSync(backup, MAIN);
      }
      throw err;
    }

    console.log("Pairing session saved to", MAIN);
    pairingEvents.emit("session-saved");

    setTimeout(() => {
      try {
        s.end(undefined);
      } catch {}
    }, 1000);

  } catch (err) {
    console.error("Pairing error:", err?.output?.statusCode || "", err?.message || err);

    if (!responseSent) {
      sendError(502, "Pairing failed. Check Railway logs and try again.");
    }

    finished = true;
    cleanup();

    try {
      s?.end(undefined);
    } catch {}
  }
});

app.listen(PORT, () => {
  console.log(`SHADOW MD pairing page listening on ${PORT}`);
});

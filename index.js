
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const qrcode = require('qrcode-terminal');
const config = require('./config');
const { load } = require('./lib/loader');
const { handleMessage, handleParticipants } = require('./lib/handler');

const { commands } = load();
console.log(`✅ ${config.botName}: ${new Set(commands.values()).size} commands loaded`);

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();
  const logger = pino({ level: 'silent' });

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.startedAt = Date.now();

  if (!sock.authState.creds.registered && config.pairingNumber) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(config.pairingNumber);
        console.log(
          `\n🔑 PAIRING CODE: ${code}\nWhatsApp > Linked Devices > Link with phone number\n`
        );
      } catch (e) {
        console.error('Pairing error:', e.message);
      }
    }, 3000);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr && !config.pairingNumber) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log(`🟢 ${config.botName} connected as ${sock.user.id}`);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;

      if (code === DisconnectReason.loggedOut) {
        console.log('🔴 Logged out. "session" folder delete karke dobara chalao.');
        process.exit(1);
      }

      console.log('🔄 Reconnecting...');
      setTimeout(start, 3000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
      handleMessage(sock, m, commands).catch((e) =>
        console.error('handler', e.message)
      );
    }
  });

  sock.ev.on('group-participants.update', (ev) =>
    handleParticipants(sock, ev).catch(() => {})
  );
}

process.on('unhandledRejection', (e) =>
  console.error('unhandledRejection', e?.message || e)
);

process.on('uncaughtException', (e) =>
  console.error('uncaughtException', e?.message || e)
);

start();

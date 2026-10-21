
const { jidNormalizedUser, normalizeMessageContent, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const config = require('../config');
const { data, save } = require('./db');
const { jidNum } = require('./utils');

const metaCache = new Map();

async function getMeta(sock, jid) {
  const c = metaCache.get(jid);
  if (c && Date.now() - c.t < 30000) return c.m;

  const m = await sock.groupMetadata(jid);
  metaCache.set(jid, { t: Date.now(), m });
  return m;
}

const idsOf = (p) =>
  [p.id, p.lid, p.phoneNumber].filter(Boolean).map(jidNum);

const isAdminIn = (meta, jids) => {
  const mine = jids.filter(Boolean).map(jidNum);
  return meta.participants.some(
    (p) => p.admin && idsOf(p).some((i) => mine.includes(i))
  );
};

function extractText(content) {
  if (!content) return '';

  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    content.buttonsResponseMessage?.selectedButtonId ||
    content.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  );
}

async function handleMessage(sock, msg, commands) {
  if (!msg.message || !msg.key || msg.key.remoteJid === 'status@broadcast') return;

  const content = normalizeMessageContent(msg.message);
  if (!content) return;

  const from = msg.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const botJid = jidNormalizedUser(sock.user.id);

  const sender = jidNormalizedUser(
    isGroup
      ? msg.key.participant || (msg.key.fromMe ? sock.user.id : '')
      : msg.key.fromMe
        ? sock.user.id
        : from
  );

  const senderNum = jidNum(sender);
  const isOwner = !!msg.key.fromMe || config.owners.includes(senderNum);
  const body = extractText(content).trim();
  const prefix = data.prefix || config.prefix;
  const mode = data.mode || config.mode;

  const ctxInfo =
    content.extendedTextMessage?.contextInfo ||
    content.imageMessage?.contextInfo ||
    content.videoMessage?.contextInfo ||
    {};

  const quoted = ctxInfo.quotedMessage
    ? normalizeMessageContent(ctxInfo.quotedMessage)
    : null;

  const quotedText = quoted ? extractText(quoted) : '';
  const mentioned = ctxInfo.mentionedJid || [];

  const reply = (text) =>
    sock.sendMessage(from, { text: String(text) }, { quoted: msg });

  let meta = null;

  if (isGroup) {
    try {
      meta = await getMeta(sock, from);
    } catch {}
  }

  // Anti-link
  if (
    isGroup &&
    meta &&
    data.antilink[from] &&
    /chat\.whatsapp\.com\/[A-Za-z0-9]/i.test(body) &&
    !isOwner
  ) {
    const senderAdmin = isAdminIn(meta, [sender]);
    const botAdmin = isAdminIn(meta, [
      botJid,
      sock.user.lid && jidNormalizedUser(sock.user.lid)
    ]);

    if (!senderAdmin && botAdmin) {
      await sock.sendMessage(from, { delete: msg.key }).catch(() => {});

      await sock.sendMessage(from, {
        text: `🚫 @${senderNum} group links allowed nahi hain!`,
        mentions: [sender]
      });

      await sock.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {});
      return;
    }
  }

  if (!body.startsWith(prefix)) return;

  const [rawName, ...args] = body.slice(prefix.length).trim().split(/\s+/);
  const name = (rawName || '').toLowerCase();
  const cmd = commands.get(name);

  if (!cmd) return;

  if (data.banned.includes(senderNum) && !isOwner) return;
  if (mode === 'self' && !isOwner) return;

  const senderAdmin = isGroup && meta ? isAdminIn(meta, [sender]) : false;

  const botAdmin =
    isGroup && meta
      ? isAdminIn(meta, [
          botJid,
          sock.user.lid && jidNormalizedUser(sock.user.lid)
        ])
      : false;

  if (cmd.owner && !isOwner)
    return reply('👑 Ye command sirf Owner ke liye hai.');

  if (cmd.group && !isGroup)
    return reply('👥 Ye command sirf Group me chalta hai.');

  if (cmd.admin && !(senderAdmin || isOwner))
    return reply('🛡️ Ye command sirf Group Admin ke liye hai.');

  if (cmd.botAdmin && !botAdmin)
    return reply('🤖 Pehle mujhe Group Admin banao.');

  const text = args.join(' ');
  const quotedSender = ctxInfo.participant
    ? jidNormalizedUser(ctxInfo.participant)
    : null;

  const getMedia = async () => {
    let holder = null;
    let m = null;

    const types = [
      'imageMessage',
      'videoMessage',
      'stickerMessage',
      'audioMessage',
      'documentMessage'
    ];

    for (const t of types) {
      if (content[t]) {
        m = content;
        holder = { key: msg.key, message: msg.message };
        break;
      }
    }

    if (!holder && quoted) {
      for (const t of types) {
        if (quoted[t]) {
          holder = {
            key: {
              remoteJid: from,
              id: ctxInfo.stanzaId,
              participant: ctxInfo.participant,
              fromMe: false
            },
            message: ctxInfo.quotedMessage
          };

          m = quoted;
          break;
        }
      }
    }

    if (!holder) return null;

    const type = types.find((t) => m[t]);

    const buffer = await downloadMediaMessage(
      holder,
      'buffer',
      {},
      {
        logger: pino({ level: 'silent' }),
        reuploadRequest: sock.updateMediaMessage
      }
    );

    return { buffer, type, mimetype: m[type].mimetype };
  };

  const ctx = {
    sock,
    msg,
    from,
    sender,
    senderNum,
    isGroup,
    isOwner,
    senderAdmin,
    botAdmin,
    meta,
    botJid,
    prefix,
    args,
    text,
    input: text || quotedText,
    quoted,
    quotedText,
    quotedSender,
    mentioned,
    stanzaId: ctxInfo.stanzaId,
    commands,
    reply,
    getMedia,
    target: mentioned[0] || quotedSender || null,
    send: (obj, opts) =>
      sock.sendMessage(from, obj, { quoted: msg, ...opts }),
    react: (e) =>
      sock.sendMessage(from, {
        react: { text: e, key: msg.key }
      }),
    refreshMeta: () => metaCache.delete(from)
  };

  try {
    await sock.sendPresenceUpdate('composing', from).catch(() => {});
    await cmd.run(ctx);
  } catch (e) {
    console.error(`[${name}]`, e.message);

    await reply(
      `⚠️ Error: ${String(e.message).slice(0, 150)}\nThodi der baad try karo.`
    );
  }
}

async function handleParticipants(sock, ev) {
  if (!data.welcome[ev.id]) return;

  let meta;
  try {
    meta = await getMeta(sock, ev.id);
  } catch {
    return;
  }

  for (const p of ev.participants) {
    const jid = typeof p === 'string' ? p : p.id || p.phoneNumber;
    const n = jidNum(jid);

    if (ev.action === 'add') {
      await sock.sendMessage(ev.id, {
        text: `👋 Welcome @${n} to *${meta.subject}*!\nRules follow karo aur enjoy karo 🎉`,
        mentions: [jid]
      });
    }

    if (ev.action === 'remove') {
      await sock.sendMessage(ev.id, {
        text: `😢 @${n} left the group. Goodbye!`,
        mentions: [jid]
      });
    }
  }

  metaCache.delete(ev.id);
}

module.exports = { handleMessage, handleParticipants, save };

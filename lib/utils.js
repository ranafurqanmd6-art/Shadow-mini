'use strict';
const { normalizeMessageContent, getContentType } = require('@whiskeysockets/baileys');

const jidNum = (jid) => String(jid || '').split('@')[0].split(':')[0];
const toJid = (num) => `${String(num).replace(/\D/g, '')}@s.whatsapp.net`;
const validNumber = (n) => /^[1-9]\d{7,14}$/.test(String(n || ''));

function extractText(message) {
  const m = normalizeMessageContent(message);
  if (!m) return '';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId ||
    ''
  );
}

function contextInfoOf(message) {
  const m = normalizeMessageContent(message);
  if (!m) return null;
  const t = getContentType(m);
  return (t && m[t] && m[t].contextInfo) || null;
}

/** The message being replied to (or null). */
function quotedOf(message) {
  const ci = contextInfoOf(message);
  if (!ci || !ci.quotedMessage) return null;
  const qm = normalizeMessageContent(ci.quotedMessage);
  return { id: ci.stanzaId, participant: ci.participant, message: qm, text: extractText(qm) };
}

const mentionedOf = (message) => (contextInfoOf(message) || {}).mentionedJid || [];

/** Target user: @mention -> replied message's author -> a number typed in args. */
function resolveTarget(message, args = []) {
  const men = mentionedOf(message);
  if (men.length) return men[0];
  const q = quotedOf(message);
  if (q && q.participant) return q.participant;
  for (const a of args) {
    const n = String(a).replace(/\D/g, '');
    if (validNumber(n)) return toJid(n);
  }
  return null;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

module.exports = { jidNum, toJid, validNumber, extractText, contextInfoOf, quotedOf, mentionedOf, resolveTarget, pick };

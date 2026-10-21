
require('dotenv').config();

const SETTINGS = {
  BOT_NAME: 'RANA MD',
  PREFIX: '.',
  OWNER_NUMBER: '923003719761',
  PAIRING_NUMBER: '923003719761',
  MODE: 'public',
};

const pick = (k) => process.env[k] || SETTINGS[k] || '';
const list = (s) => String(s).split(',').map((x) => x.replace(/\D/g, '')).filter(Boolean);

module.exports = {
  botName: pick('BOT_NAME') || 'RANA MD',
  prefix: pick('PREFIX') || '.',
  owners: list(pick('OWNER_NUMBER')),
  pairingNumber: String(pick('PAIRING_NUMBER')).replace(/\D/g, ''),
  mode: pick('MODE') || 'public',
  footer: '© RANA MD',
};
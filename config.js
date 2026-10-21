
require('dotenv').config();

const list = (s) =>
  (s || '')
    .split(',')
    .map((x) => x.replace(/\D/g, ''))
    .filter(Boolean);

module.exports = {
  botName: process.env.BOT_NAME || 'RANA MD',
  prefix: process.env.PREFIX || '.',
  owners: list(process.env.OWNER_NUMBER),
  pairingNumber: (process.env.PAIRING_NUMBER || '').replace(/\D/g, ''),
  mode: process.env.MODE || 'public',
  footer: '© RANA MD',
};


const axios = require('axios');

const get = async (url, opt = {}) =>
  (await axios.get(url, {
    timeout: 15000,
    headers: { 'User-Agent': 'RANA-MD/1.0' },
    ...opt
  })).data;

const buf = async (url) =>
  Buffer.from(await get(url, { responseType: 'arraybuffer' }));

const pick = (a) => a[Math.floor(Math.random() * a.length)];

const rnd = (a, b) =>
  Math.floor(Math.random() * (b - a + 1)) + a;

const jidNum = (jid) =>
  (jid || '').split('@')[0].split(':')[0];

const toJid = (n) =>
  String(n).replace(/\D/g, '') + '@s.whatsapp.net';

const runtime = (s) => {
  s = Math.floor(s);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;

  return `${d}d ${h}h ${m}m ${x}s`;
};

const seeded = (str, mod = 101) => {
  let h = 0;
  for (const c of str.toLowerCase()) {
    h = (h * 31 + c.charCodeAt(0)) >>> 0;
  }
  return h % mod;
};

module.exports = {
  get,
  buf,
  pick,
  rnd,
  jidNum,
  toJid,
  runtime,
  seeded
};

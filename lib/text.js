'use strict';
const SMALL = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
  n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ',
};

/** "Owner" -> "ᴏᴡɴᴇʀ" (non-letters are kept as they are). */
function smallCaps(str) {
  return Array.from(String(str)).map((ch) => SMALL[ch.toLowerCase()] || ch).join('');
}

function formatDuration(ms) {
  let s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  return [d && `${d}d`, (d || h) && `${h}h`, (d || h || m) && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}

const shift = (text, up, low, dig) => Array.from(text).map((ch) => {
  const c = ch.codePointAt(0);
  if (c >= 65 && c <= 90 && up) return String.fromCodePoint(up + c - 65);
  if (c >= 97 && c <= 122 && low) return String.fromCodePoint(low + c - 97);
  if (c >= 48 && c <= 57 && dig) return String.fromCodePoint(dig + c - 48);
  return ch;
}).join('');

/** Real Unicode text styles (each one produces a different result). */
const FONTS = {
  'Bold': (t) => shift(t, 0x1D5D4, 0x1D5EE, 0x1D7EC),
  'Italic': (t) => shift(t, 0x1D608, 0x1D622, 0),
  'Bold Italic': (t) => shift(t, 0x1D63C, 0x1D656, 0),
  'Monospace': (t) => shift(t, 0x1D670, 0x1D68A, 0x1D7F6),
  'Serif Bold': (t) => shift(t, 0x1D400, 0x1D41A, 0x1D7CE),
  'Bubble': (t) => shift(t, 0x24B6, 0x24D0, 0),
  'Fullwidth': (t) => Array.from(t).map((ch) => {
    const c = ch.codePointAt(0);
    if (c === 32) return '\u3000';
    return c >= 33 && c <= 126 ? String.fromCodePoint(0xFF01 + c - 33) : ch;
  }).join(''),
  'Small Caps': (t) => smallCaps(t),
};

module.exports = { smallCaps, formatDuration, FONTS };

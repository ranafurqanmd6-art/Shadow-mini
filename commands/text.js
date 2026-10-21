
const crypto = require('crypto');
const { pick, rnd } = require('../lib/utils');

const MORSE = { a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
const UNMORSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const FLIP = { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z', '?': '¿', '!': '¡', '.': '˙', ',': "'" };
const LEET = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7', b: '8', g: '9' };
const BOLD = (s) => [...s].map((ch) => { const c = ch.codePointAt(0); if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d5d4 + c - 65); if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d5ee + c - 97); return ch; }).join('');
const ITAL = (s) => [...s].map((ch) => { const c = ch.codePointAt(0); if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d608 + c - 65); if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d622 + c - 97); return ch; }).join('');
const MONO = (s) => [...s].map((ch) => { const c = ch.codePointAt(0); if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d670 + c - 65); if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d68a + c - 97); if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7f6 + c - 48); return ch; }).join('');
const BUBBLE = (s) => [...s].map((ch) => { const c = ch.codePointAt(0); if (c >= 65 && c <= 90) return String.fromCodePoint(0x24b6 + c - 65); if (c >= 97 && c <= 122) return String.fromCodePoint(0x24d0 + c - 97); return ch; }).join('');
const words = (s) => s.trim().split(/\s+/);
const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ');

module.exports = (add) => {
  const T = (name, desc, fn, opts = {}) => add(name, desc, async (c) => {
    if (!c.input) return c.reply(`❌ Text do ya kisi message ko reply karo.\nUse: ${c.prefix}${name} <text>`);
    return c.reply(String(await fn(c.input, c)));
  }, opts);

  T('reverse', 'Text ulta karo', (s) => [...s].reverse().join(''));
  T('upper', 'BADE AKSHAR', (s) => s.toUpperCase(), { alias: ['uppercase'] });
  T('lower', 'chote akshar', (s) => s.toLowerCase(), { alias: ['lowercase'] });
  T('capitalize', 'Pehla akshar bada', (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
  T('titlecase', 'Har word Title Case', (s) => s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()));
  T('length', 'Text ki length', (s) => `📏 Length: ${s.length}`, { alias: ['len'] });
  T('wordcount', 'Words gino', (s) => `📝 Words: ${words(s).length}`, { alias: ['wc'] });
  T('charcount', 'Characters (spaces ke bina)', (s) => `🔢 Characters: ${s.replace(/\s/g, '').length}`);
  T('base64', 'Base64 encode', (s) => Buffer.from(s).toString('base64'), { alias: ['b64'] });
  T('unbase64', 'Base64 decode', (s) => Buffer.from(s, 'base64').toString('utf8'), { alias: ['b64d'] });
  T('binary', 'Text to binary', (s) => [...s].map((x) => x.charCodeAt(0).toString(2).padStart(8, '0')).join(' '));
  T('unbinary', 'Binary to text', (s) => s.split(/\s+/).map((b) => String.fromCharCode(parseInt(b, 2))).join(''));
  T('hex', 'Text to hex', (s) => Buffer.from(s).toString('hex'));
  T('unhex', 'Hex to text', (s) => Buffer.from(s.replace(/\s/g, ''), 'hex').toString('utf8'));
  T('morse', 'Text to morse', (s) => [...s.toLowerCase()].map((x) => (x === ' ' ? '/' : MORSE[x] || x)).join(' '));
  T('unmorse', 'Morse to text', (s) => s.split(' ').map((x) => (x === '/' ? ' ' : UNMORSE[x] || x)).join(''));
  T('leet', '1337 speak', (s) => [...s.toLowerCase()].map((x) => LEET[x] || x).join(''));
  T('mock', 'mOcKiNg TeXt', (s) => [...s.toLowerCase()].map((x, i) => (i % 2 ? x.toUpperCase() : x)).join(''));
  T('randomcase', 'RaNdOm CaSe', (s) => [...s].map((x) => (Math.random() > 0.5 ? x.toUpperCase() : x.toLowerCase())).join(''));
  T('clap', 'Words ke beech 👏', (s) => words(s).join(' 👏 ') + ' 👏');
  T('spaced', 'S p a c e d', (s) => [...s].join(' '));
  T('slug', 'URL slug', (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  T('camel', 'camelCase', (s) => words(s.toLowerCase()).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join(''));
  T('snake', 'snake_case', (s) => words(s.toLowerCase()).join('_'));
  T('kebab', 'kebab-case', (s) => words(s.toLowerCase()).join('-'));
  T('palindrome', 'Palindrome check', (s) => { const x = s.toLowerCase().replace(/[^a-z0-9]/g, ''); return x && x === [...x].reverse().join('') ? '✅ Haan, palindrome hai!' : '❌ Palindrome nahi hai.'; });
  T('sortwords', 'Words sort karo', (s) => words(s).sort((a, b) => a.localeCompare(b)).join(' '));
  T('shuffle', 'Words mix karo', (s) => words(s).sort(() => Math.random() - 0.5).join(' '));
  T('flip', 'Upside down text', (s) => [...s.toLowerCase()].reverse().map((x) => FLIP[x] || x).join(''));
  T('md5', 'MD5 hash', (s) => crypto.createHash('md5').update(s).digest('hex'));
  T('sha1', 'SHA1 hash', (s) => crypto.createHash('sha1').update(s).digest('hex'));
  T('sha256', 'SHA256 hash', (s) => crypto.createHash('sha256').update(s).digest('hex'));
  T('rot13', 'ROT13 cipher', (s) => s.replace(/[a-z]/gi, (ch) => String.fromCharCode((ch <= 'Z' ? 90 : 122) >= (ch = ch.charCodeAt(0) + 13) ? ch : ch - 26)));
  T('caesar', 'Caesar cipher: .caesar 3 text', (s) => {
    const m = s.match(/^(-?\d+)\s+([\s\S]+)/); if (!m) return 'Use: .caesar <shift> <text>';
    const k = ((+m[1] % 26) + 26) % 26;
    return m[2].replace(/[a-z]/gi, (ch) => { const b = ch <= 'Z' ? 65 : 97; return String.fromCharCode(((ch.charCodeAt(0) - b + k) % 26) + b); });
  });
  T('urlencode', 'URL encode', (s) => encodeURIComponent(s));
  T('urldecode', 'URL decode', (s) => decodeURIComponent(s));
  T('nospace', 'Spaces hatao', (s) => s.replace(/\s+/g, ''));
  T('acronym', 'Pehle letters', (s) => words(s).map((w) => w[0].toUpperCase()).join(''), { alias: ['initials'] });
  T('vowels', 'Vowels gino', (s) => `🔠 Vowels: ${(s.match(/[aeiou]/gi) || []).length}`);
  T('removevowels', 'Vowels hatao', (s) => s.replace(/[aeiou]/gi, ''));
  T('uniquewords', 'Unique words', (s) => [...new Set(words(s.toLowerCase()))].join(' '));
  T('bold', 'Bold style text', (s) => BOLD(s));
  T('italic', 'Italic style text', (s) => ITAL(s));
  T('mono', 'Monospace style text', (s) => MONO(s));
  T('bubble', 'Bubble style text', (s) => BUBBLE(s));
  T('emojify', 'Text me emojis lagao', (s) => words(s).map((w) => w + ' ' + pick(['😂', '🔥', '😎', '✨', '💯', '🤩', '👌'])).join(' '));
  T('repeat', 'Repeat: .repeat 3 text', (s) => { const m = s.match(/^(\d+)\s+([\s\S]+)/); if (!m) return 'Use: .repeat <1-20> <text>'; return Array(Math.min(+m[1], 20)).fill(m[2]).join('\n'); });
  add('lorem', 'Lorem ipsum: .lorem 20', (c) => { const n = Math.min(+c.args[0] || 30, 200); c.reply(Array.from({ length: n }, () => pick(LOREM)).join(' ') + '.'); });
  T('strike', 'Strike-through text', (s) => `~${s}~`);
  T('tomono', 'WhatsApp monospace block', (s) => '```' + s + '```');
};

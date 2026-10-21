
const crypto = require('crypto');
const { rnd, pick } = require('../lib/utils');

const nums = (c) => c.args.map((x) => Number(String(x).replace(/,/g, ''))).filter((x) => !Number.isNaN(x));
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const isPrime = (n) => { if (n < 2 || !Number.isInteger(n)) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

module.exports = (add) => {
  // N: command needing n numbers
  const N = (name, desc, usage, need, fn, opts = {}) => add(name, desc, (c) => {
    const n = nums(c);
    if (n.length < need) return c.reply(`❌ Numbers do.\nUse: ${c.prefix}${name} ${usage}`);
    const r = fn(n, c);
    return c.reply(typeof r === 'number' ? `🧮 ${+r.toFixed(6)}` : r);
  }, opts);

  add('calc', 'Calculator: .calc 5*(3+2)', (c) => {
    const e = c.input.replace(/\^/g, '**').replace(/x/gi, '*');
    if (!e) return c.reply(`Use: ${c.prefix}calc 12*(5+3)/2`);
    if (!/^[0-9+\-*/().%\s*]+$/.test(e)) return c.reply('❌ Sirf numbers aur + - * / % ^ ( ) allowed hain.');
    let r; try { r = Function(`"use strict";return (${e})`)(); } catch { return c.reply('❌ Galat expression.'); }
    if (typeof r !== 'number' || !Number.isFinite(r)) return c.reply('❌ Result invalid.');
    c.reply(`🧮 ${c.input} = *${+r.toFixed(8)}*`);
  }, { alias: ['math', 'cal'] });

  N('percent', 'X ka Y%: .percent 20 500', '<percent> <number>', 2, ([p, n]) => `📊 ${n} ka ${p}% = *${(n * p) / 100}*`);
  N('percentof', 'X, Y ka kitna %', '<x> <y>', 2, ([x, y]) => `📊 ${x} is *${((x / y) * 100).toFixed(2)}%* of ${y}`);
  N('discount', 'Discount: .discount price percent', '<price> <percent>', 2, ([p, d]) => `🏷️ Discount: ${(p * d) / 100}\n💰 Final price: *${p - (p * d) / 100}*`);
  N('tip', 'Tip: .tip bill percent', '<bill> <percent>', 2, ([b, t]) => `💵 Tip: ${((b * t) / 100).toFixed(2)}\nTotal: *${(b + (b * t) / 100).toFixed(2)}*`);
  N('interest', 'Simple interest: p rate years', '<principal> <rate%> <years>', 3, ([p, r, t]) => `💹 Interest: *${((p * r * t) / 100).toFixed(2)}*\nTotal: ${(p + (p * r * t) / 100).toFixed(2)}`);
  N('compound', 'Compound interest: p rate years', '<principal> <rate%> <years>', 3, ([p, r, t]) => `💹 Amount: *${(p * Math.pow(1 + r / 100, t)).toFixed(2)}*`);
  N('bmi', 'BMI: .bmi kg cm', '<kg> <cm>', 2, ([kg, cm]) => {
    const b = kg / Math.pow(cm / 100, 2);
    const s = b < 18.5 ? 'Underweight' : b < 25 ? 'Normal ✅' : b < 30 ? 'Overweight' : 'Obese';
    return `⚖️ BMI: *${b.toFixed(1)}* — ${s}`;
  });
  add('age', 'Umar: .age 2000-05-21', (c) => {
    const d = new Date(c.args[0]);
    if (isNaN(d)) return c.reply(`Use: ${c.prefix}age YYYY-MM-DD`);
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear(), m = now.getMonth() - d.getMonth(), dd = now.getDate() - d.getDate();
    if (dd < 0) { m--; dd += 30; } if (m < 0) { y--; m += 12; }
    c.reply(`🎂 Age: *${y}* saal ${m} mahine ${dd} din\n📅 Total days: ${Math.floor((now - d) / 864e5)}`);
  });
  add('daysleft', 'Date tak kitne din: .daysleft 2026-12-31', (c) => {
    const d = new Date(c.args[0]);
    if (isNaN(d)) return c.reply(`Use: ${c.prefix}daysleft YYYY-MM-DD`);
    const n = Math.ceil((d - new Date()) / 864e5);
    c.reply(n >= 0 ? `⏳ ${n} din baaki hain.` : `📅 Ye date ${-n} din pehle guzar chuki.`);
  }, { alias: ['countdown'] });

  // conversions
  const conv = (name, desc, unit, f) => N(name, desc, '<value>', 1, ([v]) => `🔄 ${v} → *${+f(v).toFixed(4)}* ${unit}`);
  conv('c2f', 'Celsius to Fahrenheit', '°F', (v) => (v * 9) / 5 + 32);
  conv('f2c', 'Fahrenheit to Celsius', '°C', (v) => ((v - 32) * 5) / 9);
  conv('c2k', 'Celsius to Kelvin', 'K', (v) => v + 273.15);
  conv('km2mi', 'Km to Miles', 'mi', (v) => v * 0.621371);
  conv('mi2km', 'Miles to Km', 'km', (v) => v * 1.609344);
  conv('kg2lb', 'Kg to Pounds', 'lb', (v) => v * 2.20462);
  conv('lb2kg', 'Pounds to Kg', 'kg', (v) => v / 2.20462);
  conv('cm2in', 'Cm to Inch', 'in', (v) => v / 2.54);
  conv('in2cm', 'Inch to Cm', 'cm', (v) => v * 2.54);
  conv('m2ft', 'Meter to Feet', 'ft', (v) => v * 3.28084);
  conv('ft2m', 'Feet to Meter', 'm', (v) => v / 3.28084);
  add('dec2bin', 'Decimal to Binary', (c) => c.reply(Number.isInteger(+c.args[0]) ? (+c.args[0]).toString(2) : 'Use: .dec2bin 25'));
  add('bin2dec', 'Binary to Decimal', (c) => c.reply(/^[01]+$/.test(c.args[0] || '') ? String(parseInt(c.args[0], 2)) : 'Use: .bin2dec 11001'));
  add('dec2hex', 'Decimal to Hex', (c) => c.reply(Number.isInteger(+c.args[0]) ? (+c.args[0]).toString(16).toUpperCase() : 'Use: .dec2hex 255'));
  add('hex2dec', 'Hex to Decimal', (c) => c.reply(/^[0-9a-f]+$/i.test(c.args[0] || '') ? String(parseInt(c.args[0], 16)) : 'Use: .hex2dec FF'));
  add('dec2oct', 'Decimal to Octal', (c) => c.reply(Number.isInteger(+c.args[0]) ? (+c.args[0]).toString(8) : 'Use: .dec2oct 64'));

  // number tools
  N('sqrt', 'Square root', '<n>', 1, ([n]) => Math.sqrt(n));
  N('square', 'Square', '<n>', 1, ([n]) => n * n);
  N('cube', 'Cube', '<n>', 1, ([n]) => n ** 3);
  N('cuberoot', 'Cube root', '<n>', 1, ([n]) => Math.cbrt(n));
  N('power', 'Power: .power 2 10', '<base> <exp>', 2, ([a, b]) => a ** b, { alias: ['pow'] });
  N('abs', 'Absolute value', '<n>', 1, ([n]) => Math.abs(n));
  N('round', 'Round off', '<n>', 1, ([n]) => Math.round(n));
  N('log', 'Log base 10', '<n>', 1, ([n]) => Math.log10(n));
  N('ln', 'Natural log', '<n>', 1, ([n]) => Math.log(n));
  N('sin', 'Sine (degrees)', '<deg>', 1, ([n]) => Math.sin((n * Math.PI) / 180));
  N('cos', 'Cosine (degrees)', '<deg>', 1, ([n]) => Math.cos((n * Math.PI) / 180));
  N('tan', 'Tangent (degrees)', '<deg>', 1, ([n]) => Math.tan((n * Math.PI) / 180));
  N('gcd', 'HCF / GCD', '<a> <b>', 2, ([a, b]) => gcd(a, b), { alias: ['hcf'] });
  N('lcm', 'LCM', '<a> <b>', 2, ([a, b]) => Math.abs(a * b) / gcd(a, b));
  N('sum', 'Sum of numbers', '<n1> <n2> ...', 1, (n) => n.reduce((a, b) => a + b, 0));
  N('average', 'Average', '<n1> <n2> ...', 1, (n) => n.reduce((a, b) => a + b, 0) / n.length, { alias: ['avg', 'mean'] });
  N('max', 'Sabse bada', '<n1> <n2> ...', 1, (n) => Math.max(...n));
  N('min', 'Sabse chota', '<n1> <n2> ...', 1, (n) => Math.min(...n));
  N('median', 'Median', '<n1> <n2> ...', 1, (n) => { const s = [...n].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; });
  N('evenodd', 'Even ya Odd', '<n>', 1, ([n]) => `🔢 ${n} is *${n % 2 === 0 ? 'Even' : 'Odd'}*`, { alias: ['isodd'] });
  N('prime', 'Prime check', '<n>', 1, ([n]) => (isPrime(n) ? `✅ ${n} Prime hai` : `❌ ${n} Prime nahi hai`), { alias: ['isprime'] });
  N('factorial', 'Factorial (max 170)', '<n>', 1, ([n]) => {
    if (n < 0 || n > 170 || !Number.isInteger(n)) return '❌ 0 se 170 ke beech integer do.';
    let r = 1; for (let i = 2; i <= n; i++) r *= i; return `❗ ${n}! = *${r}*`;
  }, { alias: ['fact'] });
  N('fibonacci', 'Fibonacci series', '<count max 50>', 1, ([n]) => { const a = [0, 1]; while (a.length < Math.min(n, 50)) a.push(a.at(-1) + a.at(-2)); return a.slice(0, Math.min(n, 50)).join(', '); }, { alias: ['fib'] });
  N('primes', 'Primes upto n (max 1000)', '<n>', 1, ([n]) => { const r = []; for (let i = 2; i <= Math.min(n, 1000); i++) if (isPrime(i)) r.push(i); return r.join(', '); });
  N('factors', 'Factors of n', '<n>', 1, ([n]) => { const r = []; for (let i = 1; i <= Math.abs(n) && r.length < 200; i++) if (n % i === 0) r.push(i); return `🔢 ${r.join(', ')}`; });
  N('table', 'Pahada: .table 7', '<n>', 1, ([n]) => Array.from({ length: 10 }, (_, i) => `${n} × ${i + 1} = ${n * (i + 1)}`).join('\n'));
  N('roman', 'Number to Roman', '<1-3999>', 1, ([n]) => { if (n < 1 || n > 3999) return '❌ 1-3999 do.'; let r = ''; for (const [v, s] of ROMAN) while (n >= v) { r += s; n -= v; } return `🏛️ ${r}`; });
  N('circlearea', 'Circle area', '<radius>', 1, ([r]) => `⭕ Area: *${(Math.PI * r * r).toFixed(3)}*\nCircumference: ${(2 * Math.PI * r).toFixed(3)}`, { alias: ['circle'] });
  N('rectarea', 'Rectangle area', '<l> <w>', 2, ([l, w]) => `▭ Area: *${l * w}*\nPerimeter: ${2 * (l + w)}`);
  N('hypotenuse', 'Pythagoras', '<a> <b>', 2, ([a, b]) => Math.hypot(a, b), { alias: ['pythagoras'] });

  // randoms & generators
  add('random', 'Random number: .random 1 100', (c) => { const [a = 1, b = 100] = nums(c); c.reply(`🎲 ${rnd(Math.min(a, b), Math.max(a, b))}`); }, { alias: ['rand'] });
  add('dice', 'Dice roll', (c) => c.reply(`🎲 Dice: *${rnd(1, 6)}*`), { alias: ['roll'] });
  add('coin', 'Sikka uchalo', (c) => c.reply(`🪙 *${pick(['Heads (Chhaap)', 'Tails (Kaante)'])}*`), { alias: ['toss'] });
  add('password', 'Strong password: .password 16', (c) => {
    const n = Math.min(Math.max(+c.args[0] || 12, 6), 64);
    const set = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
    c.reply(`🔐 ${Array.from({ length: n }, () => set[crypto.randomInt(set.length)]).join('')}`);
  }, { alias: ['genpass'] });
  add('uuid', 'UUID banao', (c) => c.reply(crypto.randomUUID()));
  add('timestamp', 'Unix timestamp', (c) => c.reply(`🕒 ${Math.floor(Date.now() / 1000)}`), { alias: ['unix'] });
  add('date', 'Aaj ki date', (c) => c.reply(`📅 ${new Date().toDateString()}`));
  add('time', 'Abhi ka time (UTC)', (c) => c.reply(`🕒 ${new Date().toUTCString()}`));
  add('pickone', 'Options me se ek chuno: a | b | c', (c) => c.input ? c.reply(`🎯 ${pick(c.input.split('|').map((x) => x.trim()).filter(Boolean))}`) : c.reply('Use: .pickone pizza | burger | biryani'), { alias: ['choose'] });
  add('color', 'Random color', (c) => { const h = '#' + crypto.randomBytes(3).toString('hex'); c.reply(`🎨 ${h}`); });
};

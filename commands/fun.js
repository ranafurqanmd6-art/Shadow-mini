'use strict';
const { jidNum, pick } = require('../lib/utils');
const { getJson } = require('../lib/http');

const EIGHT = ['It is certain.', 'Without a doubt.', 'Yes, definitely.', 'You may rely on it.', 'Most likely.', 'Outlook good.', 'Yes.',
  'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.', 'Cannot predict now.',
  'Don\'t count on it.', 'My reply is no.', 'My sources say no.', 'Outlook not so good.', 'Very doubtful.'];
const JOKES = [
  'Why do programmers prefer dark mode? Because light attracts bugs.',
  'I told my computer I needed a break, and now it won\'t stop sending me Kit-Kat ads.',
  'Why did the scarecrow win an award? He was outstanding in his field.',
  'I would tell you a UDP joke, but you might not get it.',
  'Why don\'t skeletons fight each other? They don\'t have the guts.',
  'There are 10 kinds of people: those who understand binary and those who don\'t.',
  'Why was the math book sad? It had too many problems.',
  'What do you call fake spaghetti? An impasta.',
];
const FACTS = [
  'Octopuses have three hearts.',
  'Honey found in ancient Egyptian tombs was still edible after thousands of years.',
  'Bananas are botanically berries, but strawberries are not.',
  'A day on Venus is longer than a year on Venus.',
  'Sharks are older than trees: they appeared hundreds of millions of years before the first forests.',
  'Wombat droppings are cube-shaped.',
  'Sunlight takes about 8 minutes to reach the Earth.',
  'Adult humans have 206 bones, while babies are born with around 270 to 300.',
  'The Eiffel Tower can grow a few centimetres taller in summer because metal expands in heat.',
];
const ROASTS = [
  'you bring everyone so much joy... when you leave the room.',
  'you\'re the reason the shampoo bottle says "rinse and repeat" — and nobody knows when to stop.',
  'your WiFi signal has more personality than a lost sock.',
  'if you were a spice, you\'d be flour.',
  'you have a face for radio and a voice for silent films.',
  'you\'re proof that even autocorrect gives up sometimes.',
];
const COMPLIMENTS = [
  'you have a great sense of humour.', 'you make hard things look easy.', 'you are a genuinely kind person.',
  'your energy lifts everyone around you.', 'you\'re wiser than you give yourself credit for.', 'you light up every chat you join.',
];
const QUOTES = [
  'Small steps every day lead to big results.',
  'Do it with passion or not at all.',
  'Patience is bitter, but its fruit is sweet.',
  'The best time to start was yesterday. The next best time is now.',
  'A calm mind solves what a hurried mind cannot.',
  'Be the reason someone smiles today.',
  'Dream big, start small, act now.',
  'Hard work beats talent when talent doesn\'t work hard.',
];

const hash = (str) => { let h = 5381; for (const c of str) h = ((h << 5) + h + c.codePointAt(0)) >>> 0; return h; };

/** Mention-aware interaction (hug, kiss). Text only, no images. */
const interaction = (name, verb, emoji) => ({
  name, category: 'FUN', desc: `${verb[0].toUpperCase() + verb.slice(1)} someone (text)`, usage: `{prefix}${name} @user | reply`,
  async run(ctx) {
    const t = ctx.getTarget();
    if (!t) return ctx.reply(`Usage: ${ctx.prefix}${name} @user, or reply to someone.`);
    await ctx.sock.sendMessage(ctx.from, { text: `${emoji} @${ctx.senderNumber} ${verb}s @${jidNum(t)}`, mentions: [ctx.sender, t] }, { quoted: ctx.msg });
  },
});

const randomImage = (name, desc, url, pickUrl) => ({
  name, category: 'FUN', desc, cooldown: 3,
  async run(ctx) {
    let u;
    try { u = pickUrl(await getJson(url)); } catch (e) { return ctx.reply(`❌ ${e.message}`); }
    if (!u) return ctx.reply('❌ The image service returned no picture. Try again.');
    await ctx.sock.sendMessage(ctx.from, { image: { url: u } }, { quoted: ctx.msg });
  },
});

module.exports = [
  {
    name: '8ball', category: 'FUN', desc: 'Ask the magic 8-ball', usage: '{prefix}8ball <question>',
    async run(ctx) {
      if (!ctx.text) return ctx.reply(`Usage: ${ctx.prefix}8ball <question>`);
      await ctx.reply(`🎱 *${ctx.text}*\n\n${pick(EIGHT)}`);
    },
  },
  {
    name: 'ship', aliases: ['compatibility'], category: 'FUN', desc: 'Love-compatibility percentage for two names/users', usage: '{prefix}ship @user1 @user2  or  {prefix}ship Name1 | Name2',
    async run(ctx) {
      let names = ctx.text.split(/\s*(?:\||&|\band\b)\s*/i).filter(Boolean);
      if (names.length < 2) names = ctx.args.slice(0, 2);
      const mentions = [];
      if (names.length === 1) { names.unshift(`@${ctx.senderNumber}`); mentions.push(ctx.sender); }
      if (names.length < 2) return ctx.reply(`Usage: ${ctx.prefix}ship Name1 | Name2  (or mention two users)`);
      const [a, b] = names;
      const pct = hash([a, b].map((x) => x.toLowerCase()).sort().join('|')) % 101; // same pair -> same result
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      await ctx.sock.sendMessage(ctx.from, { text: `💘 *${a}* + *${b}*\n\n${bar} ${pct}%`, mentions: [...mentions, ...ctx.mentioned] }, { quoted: ctx.msg });
    },
  },
  { name: 'joke', category: 'FUN', desc: 'Random clean joke', async run(ctx) { await ctx.reply(`😂 ${pick(JOKES)}`); } },
  { name: 'fact', category: 'FUN', desc: 'Random fun fact', async run(ctx) { await ctx.reply(`🧠 *Did you know?*\n${pick(FACTS)}`); } },
  { name: 'quote', category: 'FUN', desc: 'Random motivational quote', async run(ctx) { await ctx.reply(`💬 _${pick(QUOTES)}_`); } },
  {
    name: 'roast', category: 'FUN', desc: 'A light-hearted roast', usage: '{prefix}roast [@user]',
    async run(ctx) {
      const t = ctx.getTarget();
      await ctx.sock.sendMessage(ctx.from, { text: `🔥 ${t ? `@${jidNum(t)}` : 'Hey'}, ${pick(ROASTS)}`, mentions: t ? [t] : [] }, { quoted: ctx.msg });
    },
  },
  {
    name: 'compliment', category: 'FUN', desc: 'Send a compliment', usage: '{prefix}compliment [@user]',
    async run(ctx) {
      const t = ctx.getTarget();
      await ctx.sock.sendMessage(ctx.from, { text: `🌹 ${t ? `@${jidNum(t)}` : 'Hey'}, ${pick(COMPLIMENTS)}`, mentions: t ? [t] : [] }, { quoted: ctx.msg });
    },
  },
  interaction('hug', 'hug', '🤗'),
  interaction('kiss', 'kiss', '😘'),
  randomImage('dog', 'Random dog picture (dog.ceo)', 'https://dog.ceo/api/breeds/image/random', (j) => j && j.status === 'success' && j.message),
  randomImage('cat', 'Random cat picture (thecatapi.com)', 'https://api.thecatapi.com/v1/images/search', (j) => Array.isArray(j) && j[0] && j[0].url),
];

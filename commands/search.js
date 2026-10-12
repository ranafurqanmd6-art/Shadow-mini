'use strict';
const { getJson } = require('../lib/http');

module.exports = [
  {
    name: 'define', aliases: ['dictionary'], category: 'SEARCH', desc: 'English dictionary definition (dictionaryapi.dev)', usage: '{prefix}define <word>', cooldown: 3,
    async run(ctx) {
      const word = ctx.args[0];
      if (!word) return ctx.reply(`Usage: ${ctx.prefix}define <word>`);
      let data;
      try { data = await getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`); }
      catch (e) { return ctx.reply(e.status === 404 ? `❌ No definition found for "${word}".` : `❌ ${e.message}`); }
      const entry = data[0];
      if (!entry) return ctx.reply(`❌ No definition found for "${word}".`);
      const lines = [`📖 *${entry.word}*${entry.phonetic ? `  ${entry.phonetic}` : ''}`];
      for (const m of (entry.meanings || []).slice(0, 3)) {
        const d = m.definitions && m.definitions[0];
        if (!d) continue;
        lines.push('', `*${m.partOfSpeech}*: ${d.definition}`);
        if (d.example) lines.push(`_e.g. ${d.example}_`);
      }
      await ctx.reply(lines.join('\n'));
    },
  },
];

'use strict';
/** Optional AI commands. They appear in the menu only when the matching API key is configured. */
const ai = require('../lib/ai');

function promptOf(ctx) { return ctx.text || (ctx.quoted && ctx.quoted.text) || ''; }

async function answer(ctx, provider) {
  const p = ai.PROVIDERS[provider];
  if (!ai.isConfigured(provider)) {
    return ctx.reply(`⚙️ ${p.label} is not configured. The bot owner must set the *${p.env}* environment variable and restart the bot.`);
  }
  const prompt = promptOf(ctx);
  if (!prompt) return ctx.reply(`Usage: ${ctx.prefix}${ctx.command} <your question>`);
  if (prompt.length > 4000) return ctx.reply('❌ Your message is too long (max 4000 characters).');
  await ctx.react('⏳').catch(() => {});
  try {
    await ctx.reply(await ai.ask(provider, prompt));
  } catch (e) {
    await ctx.reply(`❌ ${p.label} request failed: ${e.message}`);
  }
}

const provider = (name, key, desc) => ({
  name, category: 'AI', desc, usage: `{prefix}${name} <question>`, cooldown: 8,
  available: () => ai.isConfigured(key),
  run: (ctx) => answer(ctx, key),
});

module.exports = [
  {
    name: 'ai', category: 'AI', desc: 'Ask the default configured AI provider', usage: '{prefix}ai <question>', cooldown: 8,
    available: () => ai.anyConfigured(),
    async run(ctx) {
      const key = ai.defaultProvider();
      if (!key) return ctx.reply('⚙️ No AI provider is configured. Set OPENAI_API_KEY, GEMINI_API_KEY or DEEPSEEK_API_KEY and restart the bot.');
      return answer(ctx, key);
    },
  },
  provider('gpt', 'openai', 'Ask OpenAI (needs OPENAI_API_KEY)'),
  provider('gemini', 'gemini', 'Ask Google Gemini (needs GEMINI_API_KEY)'),
  provider('deepseek', 'deepseek', 'Ask DeepSeek (needs DEEPSEEK_API_KEY)'),
];

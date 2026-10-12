'use strict';
const config = require('../config');
const { formatDuration } = require('../lib/text');

async function sendImageOrText(ctx, caption) {
  try {
    await ctx.sock.sendMessage(ctx.from, { image: { url: config.botImage }, caption }, { quoted: ctx.msg });
  } catch (_) { await ctx.reply(caption); }
}

module.exports = [
  {
    name: 'ping2', category: 'MAIN', desc: 'Measure the real send round-trip time',
    async run(ctx) {
      const t0 = Date.now();
      const sent = await ctx.reply('🏓 Pinging...');
      const ms = Date.now() - t0;
      const text = `🏓 *Pong!*\n⏱️ Round trip: ${ms} ms`;
      try { await ctx.sock.sendMessage(ctx.from, { text, edit: sent.key }); }
      catch (_) { await ctx.reply(text); }
    },
  },
  {
    name: 'alive', category: 'MAIN', desc: 'Check that the bot is online',
    async run(ctx) {
      const s = ctx.settings;
      await sendImageOrText(ctx, [
        `✅ *${s.get('botName')}* is alive!`, '',
        `👑 Owner: ${s.get('ownerName')}`,
        `🚀 Runtime: ${formatDuration(process.uptime() * 1000)}`,
        `📝 Prefix: ${s.get('prefix')}`,
        `📢 Mode: ${s.get('mode')}`,
        `🤖 Version: ${config.version}`, '',
        `> ${config.menuCredit}`,
      ].join('\n'));
    },
  },
  {
    name: 'uptime', category: 'MAIN', desc: 'Show how long the bot has been running',
    async run(ctx) {
      await ctx.reply(`🚀 *Runtime:* ${formatDuration(process.uptime() * 1000)}`);
    },
  },
  {
    name: 'owner', category: 'MAIN', desc: 'Send the owner contact card',
    async run(ctx) {
      const name = ctx.settings.get('ownerName');
      const vcard = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${config.ownerName}`, `ORG:${config.botName};`,
        `TEL;type=CELL;type=VOICE;waid=${config.ownerNumber}:+${config.ownerNumber}`, 'END:VCARD'].join('\n');
      await ctx.sock.sendMessage(ctx.from, { contacts: { displayName: name, contacts: [{ vcard }] } }, { quoted: ctx.msg });
    },
  },
  {
    name: 'repo', category: 'MAIN', desc: 'Show the bot source repository',
    async run(ctx) {
      await ctx.reply([
        `📦 *${config.botName}* (v${config.version})`,
        `👑 Owner: ${config.ownerName}`,
        `🔗 Repo: ${config.github.url}`,
        `📢 Channel: ${config.channel.link}`,
        `👥 Group: ${config.group.link}`,
      ].join('\n'));
    },
  },
];

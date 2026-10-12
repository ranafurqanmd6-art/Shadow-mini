'use strict';
const { jidNum } = require('../lib/utils');
const { safeFetch } = require('../lib/http');
const { FONTS } = require('../lib/text');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clip = (s, n = 3500) => (s.length > n ? `${s.slice(0, n)}\n…(truncated)` : s);

module.exports = [
  {
    name: 'getpp', category: 'TOOLS', desc: 'Get a profile photo', usage: '{prefix}getpp [@user | reply | number]', cooldown: 5,
    async run(ctx) {
      const jid = ctx.getTarget() || (ctx.isGroup ? ctx.sender : ctx.from);
      let url;
      try { url = await ctx.sock.profilePictureUrl(jid, 'image'); } catch (_) { url = null; }
      if (!url) return ctx.reply('❌ No profile photo found (it may not exist or is hidden by privacy settings).');
      await ctx.sock.sendMessage(ctx.from, { image: { url }, caption: `🖼️ Profile photo of ${jidNum(jid)}` }, { quoted: ctx.msg });
    },
  },
  {
    name: 'getimage', category: 'TOOLS', desc: 'Download an image from a link and send it', usage: '{prefix}getimage <image url>', cooldown: 5,
    async run(ctx) {
      if (!ctx.args[0]) return ctx.reply(`Usage: ${ctx.prefix}getimage <image url>`);
      let r;
      try { r = await safeFetch(ctx.args[0], { maxBytes: 8 * 1024 * 1024 }); } catch (e) { return ctx.reply(`❌ ${e.message}`); }
      if (r.status !== 200 || !r.contentType.startsWith('image/')) return ctx.reply('❌ That link is not an image.');
      await ctx.sock.sendMessage(ctx.from, { image: r.buffer }, { quoted: ctx.msg });
    },
  },
  {
    name: 'fetch', category: 'TOOLS', desc: 'Fetch a web link (JSON, text, image, video, audio or file)', usage: '{prefix}fetch <url>', cooldown: 5,
    async run(ctx) {
      if (!ctx.args[0]) return ctx.reply(`Usage: ${ctx.prefix}fetch <url>`);
      let r;
      try { r = await safeFetch(ctx.args[0]); } catch (e) { return ctx.reply(`❌ ${e.message}`); }
      const info = `HTTP ${r.status} • ${r.contentType} • ${r.buffer.length} bytes`;
      const t = r.contentType;
      if (t.includes('json')) {
        let out; try { out = JSON.stringify(JSON.parse(r.buffer.toString('utf8')), null, 2); } catch (_) { out = r.buffer.toString('utf8'); }
        return ctx.reply(`${info}\n\n${clip(out)}`);
      }
      if (t.startsWith('text/') || t.includes('xml') || t.includes('javascript')) return ctx.reply(`${info}\n\n${clip(r.buffer.toString('utf8'))}`);
      if (t.startsWith('image/')) return ctx.sock.sendMessage(ctx.from, { image: r.buffer, caption: info }, { quoted: ctx.msg });
      if (t.startsWith('video/')) return ctx.sock.sendMessage(ctx.from, { video: r.buffer, caption: info }, { quoted: ctx.msg });
      if (t.startsWith('audio/')) return ctx.sock.sendMessage(ctx.from, { audio: r.buffer, mimetype: t }, { quoted: ctx.msg });
      const fileName = decodeURIComponent(new URL(r.url).pathname.split('/').filter(Boolean).pop() || 'file').slice(0, 80);
      await ctx.sock.sendMessage(ctx.from, { document: r.buffer, mimetype: t, fileName, caption: info }, { quoted: ctx.msg });
    },
  },
  {
    name: 'jid', aliases: ['id'], category: 'TOOLS', desc: 'Show the JID of this chat/user, or of a channel link',
    usage: '{prefix}jid [@user | reply | channel link]',
    async run(ctx) {
      const m = /whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/.exec(ctx.text);
      if (m) {
        if (typeof ctx.sock.newsletterMetadata !== 'function') return ctx.reply('❌ Channel lookup is not supported by the installed WhatsApp library.');
        const meta = await ctx.sock.newsletterMetadata('invite', m[1]);
        return ctx.reply(`📢 *${meta.name || 'Channel'}*\n🆔 ${meta.id}`);
      }
      const t = ctx.getTarget();
      const lines = [`💬 Chat: ${ctx.from}`, `👤 You: ${ctx.sender}`];
      if (t) lines.push(`🎯 Target: ${t}`);
      await ctx.reply(lines.join('\n'));
    },
  },
  {
    name: 'getlid', category: 'TOOLS', desc: 'Show raw WhatsApp IDs (including @lid privacy IDs) of you, a target and the bot',
    usage: '{prefix}getlid [@user | reply]',
    async run(ctx) {
      const t = ctx.getTarget(); const u = ctx.sock.user || {};
      const lines = ['🆔 *IDs as reported by WhatsApp*', `You: ${ctx.sender}`];
      if (t) lines.push(`Target: ${t}`);
      lines.push(`Bot: ${u.id || 'unknown'}`, `Bot LID: ${u.lid || 'not provided by this library version'}`,
        '', 'IDs ending in @lid are WhatsApp\'s privacy IDs; @s.whatsapp.net IDs contain the phone number.');
      await ctx.reply(lines.join('\n'));
    },
  },
  {
    name: 'repeat', category: 'TOOLS', desc: 'Repeat a text 1-5 times', usage: '{prefix}repeat <1-5> <text>', cooldown: 15,
    async run(ctx) {
      const n = Number(ctx.args[0]); const text = ctx.args.slice(1).join(' ');
      if (!Number.isInteger(n) || n < 1 || n > 5 || !text) return ctx.reply(`Usage: ${ctx.prefix}repeat <1-5> <text>`);
      for (let i = 0; i < n; i++) { await ctx.sock.sendMessage(ctx.from, { text }); if (i < n - 1) await sleep(800); }
    },
  },
  {
    name: 'font', category: 'TOOLS', desc: 'Convert text to different Unicode font styles', usage: '{prefix}font <text>',
    async run(ctx) {
      if (!ctx.text || ctx.text.length > 100) return ctx.reply(`Usage: ${ctx.prefix}font <text> (max 100 characters)`);
      await ctx.reply(Object.entries(FONTS).map(([name, fn]) => `*${name}:*\n${fn(ctx.text)}`).join('\n\n'));
    },
  },
];

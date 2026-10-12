'use strict';
const { getJson } = require('../lib/http');

const waifuPics = (name, kind) => ({
  name, category: 'ANIME', desc: `Random ${kind} picture (api.waifu.pics, SFW)`, cooldown: 3,
  async run(ctx) {
    let url;
    try { url = (await getJson(`https://api.waifu.pics/sfw/${kind}`)).url; } catch (e) { return ctx.reply(`❌ ${e.message}`); }
    if (!url) return ctx.reply('❌ The image service returned no picture. Try again.');
    await ctx.sock.sendMessage(ctx.from, { image: { url } }, { quoted: ctx.msg });
  },
});

module.exports = [waifuPics('waifu', 'waifu'), waifuPics('neko', 'neko')];

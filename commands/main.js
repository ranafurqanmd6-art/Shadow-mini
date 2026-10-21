const os = require('os');
const config = require('../config');
const { runtime } = require('../lib/utils');
const { byCategory } = require('../lib/loader');

const ICON = { main: '🏠', text: '🔤', math: '🧮', fun: '🎭', info: '🌐', group: '👥', owner: '👑', media: '🖼️' };

module.exports = (add) => {
  add('menu', 'Poori command list', async (c) => {
    const up = runtime((Date.now() - c.sock.startedAt) / 1000);
    const cat = (c.args[0] || '').toLowerCase();
    if (cat && byCategory[cat]) {
      return c.reply(`${ICON[cat] || '📂'} *${cat.toUpperCase()}* (${byCategory[cat].length})\n\n` + byCategory[cat].map((n) => `› ${c.prefix}${n} — ${c.commands.get(n).desc}`).join('\n'));
    }
    const total = Object.values(byCategory).reduce((a, b) => a + b.length, 0);
    let out = `╭━━━『 *${config.botName}* 』━━━╮\n┃ 👤 User: @${c.senderNum}\n┃ ⚙️ Prefix: ${c.prefix}\n┃ ⏱️ Uptime: ${up}\n┃ 📦 Commands: ${total}\n╰━━━━━━━━━━━━━━━━━━╯\n`;
    for (const k of Object.keys(byCategory)) {
      out += `\n${ICON[k] || '📂'} *${k.toUpperCase()}* (${byCategory[k].length})\n${byCategory[k].map((n) => c.prefix + n).join(' • ')}\n`;
    }
    out += `\n💡 Detail: ${c.prefix}menu <category>\nCategories: ${Object.keys(byCategory).join(', ')}\n\n${config.footer}`;
    await c.sock.sendMessage(c.from, { text: out, mentions: [c.sender] }, { quoted: c.msg });
  }, { alias: ['help', 'allmenu', 'commands'] });

  add('ping', 'Bot speed check', async (c) => {
    const t = Date.now();
    await c.reply('🏓 Pinging...');
    await c.reply(`🏓 Pong! ${Date.now() - t} ms`);
  }, { alias: ['speed'] });
  add('alive', 'Bot zinda hai?', (c) => c.reply(`✅ *${config.botName}* is alive!\n⏱️ Uptime: ${runtime((Date.now() - c.sock.startedAt) / 1000)}\nType ${c.prefix}menu`), { alias: ['bot'] });
  add('runtime', 'Bot uptime', (c) => c.reply(`⏱️ ${runtime((Date.now() - c.sock.startedAt) / 1000)}`), { alias: ['uptime'] });
  add('owner', 'Owner ka number', async (c) => {
    if (!config.owners.length) return c.reply('Owner set nahi hai (.env me OWNER_NUMBER).');
    const vcards = config.owners.map((n) => ({ vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${config.botName} Owner\nTEL;type=CELL;waid=${n}:+${n}\nEND:VCARD` }));
    await c.send({ contacts: { displayName: `${config.botName} Owner`, contacts: vcards } });
  }, { alias: ['creator'] });
  add('botinfo', 'Bot ki info', (c) => c.reply(`🤖 *${config.botName}*\nNode: ${process.version}\nPlatform: ${os.platform()} ${os.arch()}\nRAM: ${(process.memoryUsage().rss / 1048576).toFixed(0)} MB\nCommands: ${new Set(c.commands.values()).size}\nMode: ${require('../lib/db').data.mode || config.mode}`), { alias: ['info', 'about'] });
  add('cmdcount', 'Total commands', (c) => c.reply(`📦 Total commands: ${new Set(c.commands.values()).size}`), { alias: ['total'] });
  add('repo', 'Bot source', (c) => c.reply(`📂 *${config.botName}* — custom WhatsApp bot.\nOwner se contact karo for source.`), { alias: ['script'] });
  add('search', 'Command dhundo', (c) => {
    if (!c.text) return c.reply(`Use: ${c.prefix}search <word>`);
    const r = [...new Set(c.commands.values())].filter((x) => x.name.includes(c.text.toLowerCase()) || x.desc.toLowerCase().includes(c.text.toLowerCase()));
    c.reply(r.length ? r.slice(0, 25).map((x) => `› ${c.prefix}${x.name} — ${x.desc}`).join('\n') : '❌ Kuch nahi mila.');
  }, { alias: ['cmd'] });
  add('rules', 'Bot ke rules', (c) => c.reply('📜 *Rules*\n1. Spam mat karo\n2. Gaali galoch nahi\n3. Bot ko respect do\n4. Adult content nahi'));
};

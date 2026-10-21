
const { data, save } = require('../lib/db');
const { jidNum, toJid } = require('../lib/utils');
const O = { owner: true };

module.exports = (add) => {
  add('mode', 'public / self mode', (c) => {
    const v = (c.args[0] || '').toLowerCase();
    if (!['public', 'self'].includes(v)) return c.reply(`Use: ${c.prefix}mode public/self`);
    data.mode = v; save(); c.reply(`⚙️ Mode: *${v}*`);
  }, O);
  add('setprefix', 'Prefix badlo', (c) => {
    if (!c.args[0] || c.args[0].length > 3) return c.reply('Use: .setprefix <1-3 chars>');
    data.prefix = c.args[0]; save(); c.reply(`✅ Naya prefix: *${c.args[0]}*`);
  }, O);
  add('ban', 'User ko bot se ban karo', (c) => {
    const n = c.target ? jidNum(c.target) : (c.args[0] || '').replace(/\D/g, '');
    if (!n) return c.reply('Reply/mention/number do.');
    if (!data.banned.includes(n)) data.banned.push(n); save(); c.reply(`🚫 ${n} banned.`);
  }, O);
  add('unban', 'Ban hatao', (c) => {
    const n = c.target ? jidNum(c.target) : (c.args[0] || '').replace(/\D/g, '');
    data.banned = data.banned.filter((x) => x !== n); save(); c.reply(`✅ ${n} unbanned.`);
  }, O);
  add('banlist', 'Banned users', (c) => c.reply(data.banned.length ? '🚫 Banned:\n' + data.banned.map((n) => '• ' + n).join('\n') : 'Koi banned nahi.'), O);
  add('block', 'WhatsApp pe block', async (c) => {
    const j = c.target || (c.args[0] ? toJid(c.args[0]) : c.isGroup ? null : c.from);
    if (!j) return c.reply('Reply/mention/number do.');
    await c.sock.updateBlockStatus(j, 'block'); c.reply('🚫 Blocked.');
  }, O);
  add('unblock', 'WhatsApp pe unblock', async (c) => {
    const j = c.target || (c.args[0] ? toJid(c.args[0]) : null);
    if (!j) return c.reply('Reply/mention/number do.');
    await c.sock.updateBlockStatus(j, 'unblock'); c.reply('✅ Unblocked.');
  }, O);
  add('broadcast', 'Sab groups me msg bhejo', async (c) => {
    if (!c.input) return c.reply('Use: .broadcast <message>');
    const groups = Object.keys(await c.sock.groupFetchAllParticipating());
    let ok = 0;
    for (const g of groups) { try { await c.sock.sendMessage(g, { text: `📢 *Broadcast*\n\n${c.input}` }); ok++; } catch {} await new Promise((r) => setTimeout(r, 1500)); }
    c.reply(`✅ ${ok}/${groups.length} groups me bhej diya.`);
  }, { ...O, alias: ['bc'] });
  add('setbio', 'Bot ki bio badlo', async (c) => { if (!c.text) return c.reply('Use: .setbio <text>'); await c.sock.updateProfileStatus(c.text); c.reply('✅ Bio updated.'); }, O);
  add('setbotname', 'Bot WhatsApp name badlo', async (c) => { if (!c.text) return c.reply('Use: .setbotname <name>'); await c.sock.updateProfileName(c.text); c.reply('✅ Name updated.'); }, O);
  add('join', 'Group join: .join <invite link>', async (c) => {
    const m = (c.text || c.quotedText).match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    if (!m) return c.reply('Use: .join https://chat.whatsapp.com/xxxx');
    await c.sock.groupAcceptInvite(m[1]); c.reply('✅ Joined!');
  }, O);
  add('groups', 'Bot kin groups me hai', async (c) => {
    const g = Object.values(await c.sock.groupFetchAllParticipating());
    c.reply(`👥 *Groups: ${g.length}*\n\n${g.slice(0, 40).map((x, i) => `${i + 1}. ${x.subject} (${x.participants.length})`).join('\n')}`);
  }, O);
  add('restart', 'Bot restart', async (c) => { await c.reply('🔄 Restarting...'); setTimeout(() => process.exit(1), 1000); }, { ...O, alias: ['reboot'] });
  add('shutdown', 'Bot band', async (c) => { await c.reply('🔴 Shutting down...'); setTimeout(() => process.exit(0), 1000); }, { ...O, alias: ['off'] });
  add('say', 'Bot se kuch bulwao', (c) => c.input ? c.sock.sendMessage(c.from, { text: c.input }) : c.reply('Use: .say <text>'), O);
};

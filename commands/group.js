
const { data, save } = require('../lib/db');
const { jidNum, toJid } = require('../lib/utils');

const G = { group: true };
const GA = { group: true, admin: true };
const GAB = { group: true, admin: true, botAdmin: true };

module.exports = (add) => {
  const ids = (c) => c.meta.participants.map((p) => p.id);
  const adminIds = (c) => c.meta.participants.filter((p) => p.admin).map((p) => p.id);

  add('tagall', 'Sabko tag karo', async (c) => {
    const list = ids(c);
    c.send({ text: `📢 *${c.text || 'Attention everyone!'}*\n\n${list.map((j) => '› @' + jidNum(j)).join('\n')}`, mentions: list });
  }, { ...GA, alias: ['everyone', 'all'] });

  add('hidetag', 'Bina dikhe sabko tag', async (c) => {
    c.sock.sendMessage(c.from, { text: c.input || '📢', mentions: ids(c) });
  }, { ...GA, alias: ['tag', 'notify'] });

  add('tagadmins', 'Admins ko tag karo', (c) => {
    const a = adminIds(c);
    c.send({ text: `🛡️ *Admins*\n${c.text || ''}\n\n${a.map((j) => '› @' + jidNum(j)).join('\n')}`, mentions: a });
  }, { ...G, alias: ['admins', 'listadmins'] });

  add('kick', 'Member ko nikalo (reply/mention)', async (c) => {
    if (!c.target) return c.reply('Reply karo ya @mention karo.');
    await c.sock.groupParticipantsUpdate(c.from, [c.target], 'remove');
    c.refreshMeta(); c.send({ text: `👢 @${jidNum(c.target)} remove ho gaya.`, mentions: [c.target] });
  }, { ...GAB, alias: ['remove', 'ban2'] });

  add('add', 'Member add karo: .add 923001234567', async (c) => {
    const n = c.args[0]; if (!n) return c.reply('Use: .add <number with country code>');
    const r = await c.sock.groupParticipantsUpdate(c.from, [toJid(n)], 'add');
    c.refreshMeta(); c.reply(r?.[0]?.status === '200' ? '✅ Add ho gaya.' : `⚠️ Add nahi hua (status ${r?.[0]?.status}). Privacy settings ho sakti hain; invite link bhejo.`);
  }, GAB);

  add('promote', 'Admin banao', async (c) => {
    if (!c.target) return c.reply('Reply karo ya @mention karo.');
    await c.sock.groupParticipantsUpdate(c.from, [c.target], 'promote'); c.refreshMeta();
    c.send({ text: `⬆️ @${jidNum(c.target)} ab admin hai.`, mentions: [c.target] });
  }, GAB);

  add('demote', 'Admin hatao', async (c) => {
    if (!c.target) return c.reply('Reply karo ya @mention karo.');
    await c.sock.groupParticipantsUpdate(c.from, [c.target], 'demote'); c.refreshMeta();
    c.send({ text: `⬇️ @${jidNum(c.target)} ab admin nahi.`, mentions: [c.target] });
  }, GAB);

  add('link', 'Group invite link', async (c) => c.reply(`🔗 https://chat.whatsapp.com/${await c.sock.groupInviteCode(c.from)}`), { ...GAB, alias: ['grouplink', 'invite'] });

  add('revoke', 'Group link reset', async (c) => { await c.sock.groupRevokeInvite(c.from); c.reply('♻️ Link reset ho gaya.'); }, { ...GAB, alias: ['resetlink'] });

  add('mute', 'Group band (sirf admins msg)', async (c) => { await c.sock.groupSettingUpdate(c.from, 'announcement'); c.reply('🔇 Group mute: ab sirf admins message kar sakte hain.'); }, { ...GAB, alias: ['lock', 'close'] });

  add('unmute', 'Group khol do', async (c) => { await c.sock.groupSettingUpdate(c.from, 'not_announcement'); c.reply('🔊 Group unmute: sab message kar sakte hain.'); }, { ...GAB, alias: ['unlock', 'open'] });

  add('lockinfo', 'Group info edit lock', async (c) => { await c.sock.groupSettingUpdate(c.from, 'locked'); c.reply('🔒 Ab sirf admins group info badal sakte hain.'); }, GAB);

  add('unlockinfo', 'Group info edit unlock', async (c) => { await c.sock.groupSettingUpdate(c.from, 'unlocked'); c.reply('🔓 Sab group info badal sakte hain.'); }, GAB);

  add('setname', 'Group ka naam badlo', async (c) => { if (!c.text) return c.reply('Use: .setname <new name>'); await c.sock.groupUpdateSubject(c.from, c.text); c.reply('✅ Naam badal gaya.'); }, { ...GAB, alias: ['gname'] });

  add('setdesc', 'Group description badlo', async (c) => { if (!c.text) return c.reply('Use: .setdesc <text>'); await c.sock.groupUpdateDescription(c.from, c.text); c.reply('✅ Description badal gaya.'); }, { ...GAB, alias: ['gdesc'] });

  add('groupinfo', 'Group ki info', async (c) => {
    const m = c.meta;
    c.reply(`👥 *${m.subject}*\n🆔 ${m.id}\n👤 Members: ${m.participants.length}\n🛡️ Admins: ${adminIds(c).length}\n📅 Created: ${new Date(m.creation * 1000).toDateString()}\n📝 ${m.desc || 'No description'}\n🔗 Antilink: ${data.antilink[c.from] ? 'ON' : 'OFF'} | Welcome: ${data.welcome[c.from] ? 'ON' : 'OFF'}`);
  }, { ...G, alias: ['ginfo'] });

  add('members', 'Members count', (c) => c.reply(`👥 Total members: *${c.meta.participants.length}*`), { ...G, alias: ['count'] });

  add('gpp', 'Group profile photo', async (c) => {
    const url = await c.sock.profilePictureUrl(c.from, 'image').catch(() => null);
    url ? c.send({ image: { url }, caption: `🖼️ ${c.meta.subject}` }) : c.reply('❌ Group DP nahi hai.');
  }, G);

  const toggle = (name, desc, key, label) => add(name, desc, (c) => {
    const v = (c.args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(v)) return c.reply(`Use: ${c.prefix}${name} on/off\nAbhi: ${data[key][c.from] ? 'ON ✅' : 'OFF ❌'}`);
    if (v === 'on') data[key][c.from] = true; else delete data[key][c.from];
    save(); c.reply(`${label} ${v === 'on' ? 'ON ✅' : 'OFF ❌'}`);
  }, GA);

  toggle('antilink', 'Group link block on/off', 'antilink', '🔗 Anti-Link');
  toggle('welcome', 'Welcome/Goodbye msg on/off', 'welcome', '👋 Welcome');

  add('warn', 'Warning do (3 pe kick)', async (c) => {
    if (!c.target) return c.reply('Reply karo ya @mention karo.');
    const k = `${c.from}:${jidNum(c.target)}`; data.warns[k] = (data.warns[k] || 0) + 1; save();
    if (data.warns[k] >= 3) {
      delete data.warns[k]; save();
      await c.sock.groupParticipantsUpdate(c.from, [c.target], 'remove');
      return c.send({ text: `🚫 @${jidNum(c.target)} 3/3 warnings — remove!`, mentions: [c.target] });
    }
    c.send({ text: `⚠️ @${jidNum(c.target)} warning ${data.warns[k]}/3`, mentions: [c.target] });
  }, GAB);

  add('resetwarn', 'Warnings reset', (c) => { if (!c.target) return c.reply('Reply/mention karo.'); delete data.warns[`${c.from}:${jidNum(c.target)}`]; save(); c.reply('✅ Warnings reset.'); }, GA);

  add('warnings', 'Warnings dekho', (c) => c.reply(`⚠️ Warnings: ${data.warns[`${c.from}:${jidNum(c.target || c.sender)}`] || 0}/3`), G);

  add('del', 'Message delete (reply karo)', async (c) => {
    if (!c.stanzaId) return c.reply('Jis message ko delete karna hai usko reply karo.');
    await c.sock.sendMessage(c.from, { delete: { remoteJid: c.from, fromMe: jidNum(c.quotedSender) === jidNum(c.botJid), id: c.stanzaId, participant: c.quotedSender } });
  }, { ...GAB, alias: ['delete'] });

  add('poll', 'Poll: .poll Sawal | opt1 | opt2', async (c) => {
    const p = c.input.split('|').map((x) => x.trim()).filter(Boolean);
    if (p.length < 3) return c.reply('Use: .poll Best fruit? | Mango | Apple | Banana');
    await c.sock.sendMessage(c.from, { poll: { name: p[0], values: p.slice(1, 13), selectableCount: 1 } });
  }, G);

  add('leave', 'Bot group chhode', async (c) => { await c.reply('👋 Allah hafiz!'); await c.sock.groupLeave(c.from); }, { group: true, owner: true });

  add('groupid', 'Group ID', (c) => c.reply(c.from), G);
};

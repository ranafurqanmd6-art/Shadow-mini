'use strict';
const { jidNum, toJid, validNumber } = require('../lib/utils');

const protectedNumbers = (ctx) => new Set([...ctx.config.owners, ctx.session.number, jidNum(ctx.sock.user && ctx.sock.user.id)]);

const STATUS_TEXT = {
  200: '✅ done', 403: '⚠️ privacy settings prevent adding (send them the invite link instead)',
  408: '⚠️ left the group recently', 409: 'ℹ️ already in the group', 401: '⚠️ blocked the bot', 500: '❌ WhatsApp error',
};

async function participantsUpdate(ctx, jids, action, okText) {
  const res = await ctx.sock.groupParticipantsUpdate(ctx.from, jids, action);
  const lines = (res || []).map((r) => {
    const st = Number(r.status);
    return `• ${jidNum(r.jid || r.content?.attrs?.jid || '')}: ${st === 200 ? okText : STATUS_TEXT[st] || `failed (${r.status})`}`;
  });
  await ctx.reply(lines.length ? lines.join('\n') : '⚠️ WhatsApp returned no result.');
}

/** Single target for kick/promote/demote (mention, reply or number). */
function singleTarget(ctx, verb) {
  const jid = ctx.getTarget();
  if (!jid) { ctx.reply(`Usage: ${ctx.prefix}${verb} @user, or reply to the user's message.`); return null; }
  return jid;
}

const parseOnOff = (v) => ({ on: true, enable: true, off: false, disable: false })[String(v || '').toLowerCase()];

const groupToggle = (key, desc) => ({
  name: key, category: 'GROUP', desc, usage: `{prefix}${key} on|off`, groupOnly: true, adminOnly: true,
  async run(ctx) {
    const val = parseOnOff(ctx.args[0]);
    const cur = ctx.settings.group(ctx.from)[key];
    if (val === undefined) return ctx.reply(`⚙️ *${key}* is *${cur ? 'ON' : 'OFF'}* in this group.\nUsage: ${ctx.prefix}${key} on|off`);
    ctx.settings.setGroup(ctx.from, key, val);
    const extra = key === 'antilink' && val && !ctx.isBotAdmin ? '\n⚠️ Make me a group admin so I can delete links.' : '';
    await ctx.reply(`✅ *${key}* is now *${val ? 'ON' : 'OFF'}* in this group.${extra}`);
  },
});

module.exports = [
  {
    name: 'add', category: 'GROUP', desc: 'Add members by phone number', usage: '{prefix}add 923001234567',
    groupOnly: true, adminOnly: true, botAdmin: true,
    async run(ctx) {
      const nums = ctx.args.map((a) => a.replace(/\D/g, '')).filter(validNumber).slice(0, 5);
      if (!nums.length) return ctx.reply(`Usage: ${ctx.prefix}add 923001234567 (country code, no + or 0)`);
      await participantsUpdate(ctx, nums.map(toJid), 'add', '✅ added');
    },
  },
  {
    name: 'kick', aliases: ['remove'], category: 'GROUP', desc: 'Remove a member', usage: '{prefix}kick @user | reply',
    groupOnly: true, adminOnly: true, botAdmin: true,
    async run(ctx) {
      const jid = singleTarget(ctx, 'kick'); if (!jid) return;
      if (protectedNumbers(ctx).has(jidNum(jid))) return ctx.reply('❌ I will not remove the owner or myself.');
      await participantsUpdate(ctx, [jid], 'remove', '✅ removed');
    },
  },
  {
    name: 'promote', category: 'GROUP', desc: 'Make a member admin', usage: '{prefix}promote @user | reply',
    groupOnly: true, adminOnly: true, botAdmin: true,
    async run(ctx) {
      const jid = singleTarget(ctx, 'promote'); if (!jid) return;
      await participantsUpdate(ctx, [jid], 'promote', '✅ promoted to admin');
    },
  },
  {
    name: 'demote', category: 'GROUP', desc: 'Remove admin rights from a member', usage: '{prefix}demote @user | reply',
    groupOnly: true, adminOnly: true, botAdmin: true,
    async run(ctx) {
      const jid = singleTarget(ctx, 'demote'); if (!jid) return;
      await participantsUpdate(ctx, [jid], 'demote', '✅ demoted');
    },
  },
  {
    name: 'mute', aliases: ['close'], category: 'GROUP', desc: 'Only admins can send messages', groupOnly: true, adminOnly: true, botAdmin: true,
    async run(ctx) { await ctx.sock.groupSettingUpdate(ctx.from, 'announcement'); await ctx.reply('🔇 Group muted. Only admins can send messages.'); },
  },
  {
    name: 'unmute', aliases: ['open'], category: 'GROUP', desc: 'Everyone can send messages', groupOnly: true, adminOnly: true, botAdmin: true,
    async run(ctx) { await ctx.sock.groupSettingUpdate(ctx.from, 'not_announcement'); await ctx.reply('🔊 Group unmuted. Everyone can send messages.'); },
  },
  {
    name: 'del', aliases: ['delete'], category: 'GROUP', desc: 'Delete the message you reply to', usage: '{prefix}del (reply to a message)',
    groupOnly: true, adminOnly: true, botAdmin: true,
    async run(ctx) {
      const q = ctx.quoted;
      if (!q || !q.id) return ctx.reply('Reply to the message you want to delete.');
      const botIds = [ctx.sock.user && ctx.sock.user.id, ctx.sock.user && ctx.sock.user.lid].filter(Boolean).map(jidNum);
      const fromMe = q.participant ? botIds.includes(jidNum(q.participant)) : false;
      await ctx.sock.sendMessage(ctx.from, { delete: { remoteJid: ctx.from, fromMe, id: q.id, participant: q.participant } });
    },
  },
  {
    name: 'tag', category: 'GROUP', desc: 'Send a message that mentions everyone silently', usage: '{prefix}tag <text> | reply to a message',
    groupOnly: true, adminOnly: true,
    async run(ctx) {
      const text = ctx.text || (ctx.quoted && ctx.quoted.text);
      if (!text) return ctx.reply(`Usage: ${ctx.prefix}tag <text>, or reply to a text message.`);
      const mentions = ctx.groupMetadata.participants.map((p) => p.id);
      await ctx.sock.sendMessage(ctx.from, { text, mentions });
    },
  },
  {
    name: 'tagall', aliases: ['everyone'], category: 'GROUP', desc: 'Mention every member', usage: '{prefix}tagall [message]',
    groupOnly: true, adminOnly: true, cooldown: 30,
    async run(ctx) {
      const members = ctx.groupMetadata.participants.map((p) => p.id);
      const lines = members.map((j) => `• @${jidNum(j)}`);
      await ctx.sock.sendMessage(ctx.from, { text: `📢 *${ctx.text || 'Attention everyone'}*\n\n${lines.join('\n')}`, mentions: members });
    },
  },
  {
    name: 'link', aliases: ['grouplink'], category: 'GROUP', desc: 'Get the group invite link', groupOnly: true, adminOnly: true, botAdmin: true,
    async run(ctx) {
      const code = await ctx.sock.groupInviteCode(ctx.from);
      await ctx.reply(`🔗 *${ctx.groupMetadata.subject}*\nhttps://chat.whatsapp.com/${code}`);
    },
  },
  {
    name: 'revoke', category: 'GROUP', desc: 'Reset the group invite link', groupOnly: true, adminOnly: true, botAdmin: true,
    async run(ctx) {
      const code = await ctx.sock.groupRevokeInvite(ctx.from);
      await ctx.reply(`♻️ Invite link reset.\nNew link: https://chat.whatsapp.com/${code}`);
    },
  },
  {
    name: 'ginfo', aliases: ['groupinfo'], category: 'GROUP', desc: 'Show information about this group', groupOnly: true,
    async run(ctx) {
      const m = ctx.groupMetadata;
      const admins = m.participants.filter((p) => p.admin).length;
      const created = m.creation ? new Date(m.creation * 1000).toUTCString() : 'unknown';
      await ctx.reply([
        `👥 *${m.subject}*`, `🆔 ${m.id}`, `📅 Created: ${created}`,
        `👤 Members: ${m.participants.length} (admins: ${admins})`,
        `🔇 Only admins can send: ${m.announce ? 'yes' : 'no'}`,
        `🔒 Only admins can edit info: ${m.restrict ? 'yes' : 'no'}`,
        m.desc ? `\n📝 ${String(m.desc).slice(0, 500)}` : '',
      ].filter(Boolean).join('\n'));
    },
  },
  {
    name: 'poll', category: 'GROUP', desc: 'Create a poll', usage: '{prefix}poll Question | Option 1 | Option 2 ...',
    async run(ctx) {
      const parts = ctx.text.split('|').map((x) => x.trim()).filter(Boolean);
      const [name, ...values] = parts;
      if (!name || values.length < 2 || values.length > 12) return ctx.reply(`Usage: ${ctx.prefix}poll Question | Option 1 | Option 2 (2-12 options)`);
      if (name.length > 200 || values.some((v) => v.length > 100)) return ctx.reply('❌ Question or option is too long.');
      await ctx.sock.sendMessage(ctx.from, { poll: { name, values, selectableCount: 1 } });
    },
  },
  groupToggle('welcome', 'Greet new members'),
  groupToggle('goodbye', 'Say goodbye when members leave'),
  groupToggle('antilink', 'Delete links sent by non-admins (bot must be admin)'),
  {
    name: 'gcstatus', category: 'GROUP', desc: 'Show the bot features enabled in this group', groupOnly: true,
    async run(ctx) {
      const g = ctx.settings.group(ctx.from); const on = (v) => (v ? '✅ ON' : '❌ OFF');
      await ctx.reply(`📊 *${ctx.groupMetadata.subject}*\n\nwelcome: ${on(g.welcome)}\ngoodbye: ${on(g.goodbye)}\nantilink: ${on(g.antilink)}\nbot is admin: ${ctx.isBotAdmin ? 'yes' : 'no'}`);
    },
  },
  {
    name: 'gcsetting', category: 'GROUP', desc: 'Show or change who can send messages / edit group info',
    usage: '{prefix}gcsetting [open|close|lock|unlock]', groupOnly: true, adminOnly: true,
    async run(ctx) {
      const map = { open: 'not_announcement', close: 'announcement', lock: 'locked', unlock: 'unlocked' };
      const arg = (ctx.args[0] || '').toLowerCase();
      if (!arg) {
        const m = ctx.groupMetadata;
        return ctx.reply(`⚙️ *Group settings*\nMessages: ${m.announce ? 'admins only (closed)' : 'everyone (open)'}\nEdit info: ${m.restrict ? 'admins only (locked)' : 'everyone (unlocked)'}\n\nChange: ${ctx.prefix}gcsetting open|close|lock|unlock`);
      }
      if (!map[arg]) return ctx.reply(`Usage: ${ctx.prefix}gcsetting open|close|lock|unlock`);
      if (!ctx.isBotAdmin) return ctx.reply('🤖 I need to be a group admin to do that.');
      await ctx.sock.groupSettingUpdate(ctx.from, map[arg]);
      await ctx.reply(`✅ Group setting applied: *${arg}*`);
    },
  },
];

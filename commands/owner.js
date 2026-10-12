'use strict';
const { jidNum } = require('../lib/utils');

const PRIVACY_LABELS = { readreceipts: 'Read receipts', profile: 'Profile photo', status: 'About/status', online: 'Online', last: 'Last seen', groupadd: 'Add to groups', calladd: 'Calls' };

/** Target: mention / reply / number, or the current private chat. */
function target(ctx) {
  return ctx.getTarget() || (!ctx.isGroup ? ctx.from : null);
}

module.exports = [
  {
    name: 'block', category: 'OWNER', desc: 'Block a user', usage: '{prefix}block @user | reply | number', ownerOnly: true,
    async run(ctx) {
      const jid = target(ctx);
      if (!jid) return ctx.reply(`Usage: ${ctx.prefix}block @user, reply to a message, or give a number.`);
      if (ctx.config.owners.includes(jidNum(jid)) || jidNum(jid) === ctx.session.number) return ctx.reply('❌ I will not block the owner.');
      await ctx.sock.updateBlockStatus(jid, 'block');
      await ctx.reply(`🚫 Blocked ${jidNum(jid)}`);
    },
  },
  {
    name: 'unblock', category: 'OWNER', desc: 'Unblock a user', usage: '{prefix}unblock @user | reply | number', ownerOnly: true,
    async run(ctx) {
      const jid = target(ctx);
      if (!jid) return ctx.reply(`Usage: ${ctx.prefix}unblock @user, reply to a message, or give a number.`);
      await ctx.sock.updateBlockStatus(jid, 'unblock');
      await ctx.reply(`✅ Unblocked ${jidNum(jid)}`);
    },
  },
  {
    name: 'privacy', category: 'OWNER', desc: 'Show this account\'s WhatsApp privacy settings', ownerOnly: true, privateOnly: true,
    async run(ctx) {
      const p = await ctx.sock.fetchPrivacySettings(true);
      const lines = Object.entries(p || {}).map(([k, v]) => `• ${PRIVACY_LABELS[k] || k}: ${v}`);
      await ctx.reply(lines.length ? `🔒 *Privacy settings*\n\n${lines.join('\n')}` : 'Could not read the privacy settings.');
    },
  },
  {
    name: 'getbio', category: 'OWNER', desc: 'Get the About/bio text of a user', usage: '{prefix}getbio @user | reply | number', ownerOnly: true,
    async run(ctx) {
      const jid = target(ctx);
      if (!jid) return ctx.reply(`Usage: ${ctx.prefix}getbio @user, reply to a message, or give a number.`);
      const r = await ctx.sock.fetchStatus(jid);
      const first = Array.isArray(r) ? r[0] : r;
      const st = first && (typeof first.status === 'object' && first.status ? first.status.status : first.status);
      await ctx.reply(st ? `📝 *Bio of ${jidNum(jid)}:*\n${st}` : 'No bio found (the user may have hidden it).');
    },
  },
  {
    name: 'setname', category: 'OWNER', desc: 'Change the WhatsApp profile name of the bot account', usage: '{prefix}setname <name>', superOwnerOnly: true,
    async run(ctx) {
      if (!ctx.text || ctx.text.length > 25) return ctx.reply(`Usage: ${ctx.prefix}setname <name> (max 25 characters)`);
      await ctx.sock.updateProfileName(ctx.text);
      await ctx.reply(`✅ Profile name changed to *${ctx.text}*`);
    },
  },
  {
    name: 'updatebio', category: 'OWNER', desc: 'Change the WhatsApp About/bio of the bot account', usage: '{prefix}updatebio <text>', superOwnerOnly: true,
    async run(ctx) {
      if (!ctx.text || ctx.text.length > 139) return ctx.reply(`Usage: ${ctx.prefix}updatebio <text> (max 139 characters)`);
      await ctx.sock.updateProfileStatus(ctx.text);
      await ctx.reply('✅ Bio updated.');
    },
  },
  {
    name: 'sudo', category: 'OWNER', desc: 'Give a user owner-level command access', usage: '{prefix}sudo @user | reply | number', superOwnerOnly: true,
    async run(ctx) {
      const jid = target(ctx);
      if (!jid) return ctx.reply(`Usage: ${ctx.prefix}sudo @user, reply to a message, or give a number.`);
      const n = jidNum(jid); const list = ctx.settings.get('sudo') || [];
      if (list.includes(n)) return ctx.reply('ℹ️ That user is already a sudo user.');
      if (list.length >= 20) return ctx.reply('❌ The sudo list is full (20).');
      ctx.settings.set('sudo', [...list, n]);
      await ctx.reply(`✅ ${n} added as sudo.`);
    },
  },
  {
    name: 'delsudo', category: 'OWNER', desc: 'Remove a sudo user', usage: '{prefix}delsudo @user | reply | number', superOwnerOnly: true,
    async run(ctx) {
      const jid = target(ctx);
      if (!jid) return ctx.reply(`Usage: ${ctx.prefix}delsudo @user, reply to a message, or give a number.`);
      const n = jidNum(jid); const list = ctx.settings.get('sudo') || [];
      if (!list.includes(n)) return ctx.reply('ℹ️ That user is not a sudo user.');
      ctx.settings.set('sudo', list.filter((x) => x !== n));
      await ctx.reply(`✅ ${n} removed from sudo.`);
    },
  },
  {
    name: 'listsudo', category: 'OWNER', desc: 'List sudo users', ownerOnly: true,
    async run(ctx) {
      const list = ctx.settings.get('sudo') || [];
      await ctx.reply(list.length ? `👥 *Sudo users*\n\n${list.map((n, i) => `${i + 1}. ${n}`).join('\n')}` : 'No sudo users yet.');
    },
  },
];

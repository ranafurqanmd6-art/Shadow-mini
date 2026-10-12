'use strict';
const toggleKeys = {
  autoread: 'Mark incoming messages as read',
  autoreact: 'React to command messages with an emoji',
  anticall: 'Automatically reject incoming calls',
  autotyping: 'Show "typing..." while a command runs',
  online: 'Keep the account shown as online',
};

const parseOnOff = (v) => ({ on: true, enable: true, true: true, off: false, disable: false, false: false })[String(v || '').toLowerCase()];

const toggles = Object.entries(toggleKeys).map(([key, desc]) => ({
  name: key, category: 'SETTINGS', desc, usage: `{prefix}${key} on|off`, ownerOnly: true,
  async run(ctx) {
    const val = parseOnOff(ctx.args[0]);
    if (val === undefined) return ctx.reply(`⚙️ *${key}* is currently *${ctx.settings.get(key) ? 'ON' : 'OFF'}*\nUsage: ${ctx.prefix}${key} on|off`);
    ctx.settings.set(key, val);
    if (key === 'online') await ctx.sock.sendPresenceUpdate(val ? 'available' : 'unavailable').catch(() => {});
    await ctx.reply(`✅ *${key}* is now *${val ? 'ON' : 'OFF'}*`);
  },
}));

/** Text setting that anyone may read but only the real owner may change. */
const textSetting = (key, label, validate) => ({
  name: key.toLowerCase(), category: 'SETTINGS', desc: `Show or change the ${label}`, usage: `{prefix}${key.toLowerCase()} [new value]`,
  async run(ctx) {
    if (!ctx.text) return ctx.reply(`⚙️ Current ${label}: *${ctx.settings.get(key)}*`);
    if (!ctx.isSuperOwner) return ctx.reply('🚫 Only the bot owner can change this.');
    const err = validate(ctx.text);
    if (err) return ctx.reply(`❌ ${err}`);
    ctx.settings.set(key, ctx.text);
    await ctx.reply(`✅ ${label} changed to *${ctx.text}*`);
  },
});

module.exports = [
  ...toggles,
  {
    name: 'mode', category: 'SETTINGS', desc: 'Public: everyone can use commands. Private: owner/sudo only', usage: '{prefix}mode public|private', superOwnerOnly: true,
    async run(ctx) {
      const v = (ctx.args[0] || '').toLowerCase();
      if (!['public', 'private'].includes(v)) return ctx.reply(`📢 Current mode: *${ctx.settings.get('mode')}*\nUsage: ${ctx.prefix}mode public|private`);
      ctx.settings.set('mode', v);
      await ctx.reply(`✅ Mode set to *${v}*`);
    },
  },
  textSetting('prefix', 'prefix', (t) => (/^[^\s\p{L}\p{N}]{1,3}$/u.test(t) ? null : 'The prefix must be 1-3 symbols (no letters, numbers or spaces).')),
  textSetting('botName', 'bot name', (t) => (t.length <= 30 ? null : 'The name must be at most 30 characters.')),
  textSetting('ownerName', 'owner name', (t) => (t.length <= 30 ? null : 'The name must be at most 30 characters.')),
  {
    name: 'settings', category: 'SETTINGS', desc: 'Show all current bot settings', ownerOnly: true,
    async run(ctx) {
      const s = ctx.settings; const on = (k) => (s.get(k) ? '✅ ON' : '❌ OFF');
      await ctx.reply([
        `⚙️ *${s.get('botName')} settings*`, '',
        `📝 Prefix: ${s.get('prefix')}`, `📢 Mode: ${s.get('mode')}`,
        `👑 Owner name: ${s.get('ownerName')}`, `👥 Sudo users: ${(s.get('sudo') || []).length}`, '',
        `autoread: ${on('autoread')}`, `autoreact: ${on('autoreact')}`, `anticall: ${on('anticall')}`,
        `autotyping: ${on('autotyping')}`, `online: ${on('online')}`,
      ].join('\n'));
    },
  },
];

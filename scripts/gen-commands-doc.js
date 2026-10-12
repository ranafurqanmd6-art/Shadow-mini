'use strict';
// Regenerates COMMANDS.md from the real registry:  node scripts/gen-commands-doc.js
const fs = require('fs'); const path = require('path');
try { require.resolve('@whiskeysockets/baileys'); } catch (_) {
  const M = require('module'); const o = M._load; M._load = function (r, ...a) { return r === '@whiskeysockets/baileys' ? {} : o.call(this, r, ...a); };
}
const { Registry } = require('../lib/registry');
const reg = new Registry({ warn() {}, error() {} });
reg.register(require('../lib/core/menu'), 'core'); reg.loadDir(path.join(__dirname, '..', 'commands'));
const cats = new Map();
for (const p of reg.plugins) { if (!cats.has(p.category)) cats.set(p.category, []); cats.get(p.category).push(p); }
const order = require('../lib/registry').CATEGORY_ORDER;
const out = ['# Implemented commands', '', `Generated from the registry: **${reg.plugins.length}** commands (prefix \`.\` by default).`, '',
  'Commands marked *needs key* only appear in the menu when the API key is set.', ''];
for (const c of [...cats.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b))) {
  out.push(`## ${c} MENU`, '', '| Command | Aliases | Who | What it does |', '|---|---|---|---|');
  for (const p of cats.get(c).sort((a, b) => a.name.localeCompare(b.name))) {
    const who = [p.superOwnerOnly ? 'owner' : p.ownerOnly ? 'owner/sudo' : 'everyone', p.groupOnly && 'groups', p.adminOnly && 'admins', p.botAdmin && 'bot admin'].filter(Boolean).join(', ');
    out.push(`| \`.${p.name}\`${p.category === 'AI' ? ' *(needs key)*' : ''} | ${p.aliases.map((a) => '`.' + a + '`').join(' ') || '-'} | ${who} | ${p.desc} |`);
  }
  out.push('');
}
fs.writeFileSync(path.join(__dirname, '..', 'COMMANDS.md'), out.join('\n'));
console.log('COMMANDS.md written');

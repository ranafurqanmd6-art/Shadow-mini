'use strict';
/**
 * Menu builder (reference style). Generated from the commands that are really
 * registered and usable, so it never advertises something that does not exist.
 */
const { smallCaps, formatDuration } = require('./text');


function header(config, registry, settings) {
  const total = registry.visible().length;
  return [
    `╭┈───〔 ${settings.botName} 〕──┈─⊷`,
    `│ • 👑 ${smallCaps('owner')}: ${settings.ownerName}`,
    `│ • 📄 ${smallCaps('total commands')}: ${total}`,
    `│ • 🚀 ${smallCaps('runtime')}: ${formatDuration(process.uptime() * 1000)}`,
    `│ • 📝 ${smallCaps('prefix')}: ${settings.prefix}`,
    `│ • 📢 ${smallCaps('mode')}: ${settings.mode}`,
    `│ • 🤖 ${smallCaps('version')}: ${config.version}`,
    '╰────────────────┈─⊷',
  ].join('\n');
}

const footer = (config) => `\n> ${config.menuCredit}`;

/** settings = { botName, ownerName, prefix, mode } for the session asking for the menu. */
function buildMenu(config, registry, settings) {
  const cats = registry.categories();
  const parts = [header(config, registry, settings), ''];
  if (cats.size === 0) {
    parts.push('No commands are available yet.', '');
  } else {
    for (const [cat, list] of cats) {
      parts.push(`╭──〔 ${smallCaps(cat + ' menu')} 〕───⊷`);
      for (const p of list) parts.push(`┋  ● ${smallCaps(p.name)}`);
      parts.push('╰───────────────────⊷', '');
    }
    parts.push(`Tip: ${settings.prefix}menu <category> shows usage details, e.g. ${settings.prefix}menu ${[...cats.keys()][0].toLowerCase()}`);
  }
  parts.push(footer(config));
  return parts.join('\n');
}

/** Detailed view of one category (descriptions + usage). Returns null for an unknown category. */
function buildCategoryMenu(config, registry, settings, name) {
  const cats = registry.categories();
  const key = String(name || '').toUpperCase().replace(/\s*MENU$/, '');
  if (!cats.has(key)) return null;
  const lines = [`╭──〔 ${smallCaps(key + ' menu')} 〕───⊷`];
  for (const p of cats.get(key)) {
    lines.push(`┋  ● *${settings.prefix}${p.name}*`);
    if (p.aliases.length) lines.push(`┋     ↳ ${smallCaps('aliases')}: ${p.aliases.map((a) => settings.prefix + a).join(', ')}`);
    if (p.desc) lines.push(`┋     ↳ ${p.desc}`);
    if (p.usage) lines.push(`┋     ↳ ${smallCaps('usage')}: ${p.usage.replace(/\{prefix\}/g, settings.prefix)}`);
    const flags = [p.superOwnerOnly ? 'owner only' : p.ownerOnly && 'owner/sudo only', p.groupOnly && 'groups only', p.privateOnly && 'private chat only', p.adminOnly && 'admins only']
      .filter(Boolean);
    if (flags.length) lines.push(`┋     ↳ (${flags.join(', ')})`);
  }
  lines.push('╰───────────────────⊷', footer(config));
  return lines.join('\n');
}

module.exports = { buildMenu, buildCategoryMenu, formatUptime: formatDuration };

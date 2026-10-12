'use strict';
/**
 * Command registry. Loads every plugin from the commands/ folder (recursively).
 *
 *  - Files/folders starting with "_" are ignored (e.g. commands/_template.js).
 *  - A file may export one plugin object or an array of plugin objects.
 *  - Duplicate command names/aliases are rejected (the first one wins).
 *  - Invalid plugins are skipped with a clear log line, they never crash the bot.
 */
const fs = require('fs');
const path = require('path');

// Same order as the reference menu. Categories without commands are not shown.
const CATEGORY_ORDER = [
  'AI', 'ANIME', 'AUDIO', 'DOWNLOAD', 'FUN', 'GROUP', 'LOGO', 'MAIN', 'OTHER',
  'OWNER', 'SEARCH', 'SETTING', 'SETTINGS', 'SOUND', 'TOOLS', 'UTILITY',
];

class Registry {
  constructor(log = console) {
    this.log = log;
    this.commands = new Map(); // name or alias -> plugin
    this.plugins = [];         // unique plugins, in load order
  }

  register(plugin, source = 'unknown') {
    const err = (msg) => { this.log.warn(`[registry] skipped ${source}: ${msg}`); return false; };

    if (!plugin || typeof plugin !== 'object') return err('export is not an object');
    if (typeof plugin.name !== 'string' || !/^[a-z0-9_-]+$/i.test(plugin.name)) return err('missing or invalid "name"');
    if (typeof plugin.run !== 'function') return err(`"${plugin.name}" has no run(ctx) function`);

    const p = {
      name: plugin.name.toLowerCase(),
      aliases: (Array.isArray(plugin.aliases) ? plugin.aliases : []).map((a) => String(a).toLowerCase()),
      category: String(plugin.category || 'OTHER').toUpperCase(),
      desc: plugin.desc || '',
      usage: plugin.usage || '',
      ownerOnly: !!plugin.ownerOnly,
      groupOnly: !!plugin.groupOnly,
      privateOnly: !!plugin.privateOnly,
      adminOnly: !!plugin.adminOnly,
      botAdmin: !!plugin.botAdmin,
      superOwnerOnly: !!plugin.superOwnerOnly,
      needsGroupMeta: !!plugin.needsGroupMeta,
      cooldown: Number(plugin.cooldown) > 0 ? Number(plugin.cooldown) : 0, // seconds, per user and command
      available: typeof plugin.available === 'function' ? plugin.available : () => true,
      hidden: !!plugin.hidden,
      run: plugin.run,
      source,
    };

    const keys = [p.name, ...p.aliases];
    for (const k of keys) {
      if (!/^[a-z0-9_-]+$/.test(k)) return err(`invalid alias "${k}"`);
      if (this.commands.has(k)) {
        return err(`"${k}" is already registered by ${this.commands.get(k).source}`);
      }
    }
    if (new Set(keys).size !== keys.length) return err(`"${p.name}" lists a duplicate alias`);

    for (const k of keys) this.commands.set(k, p);
    this.plugins.push(p);
    return true;
  }

  /** Load all plugin files from a directory. Returns number of plugins registered. */
  loadDir(dir) {
    let count = 0;
    if (!fs.existsSync(dir)) return 0;
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        if (entry.name.startsWith('_') || entry.name === 'node_modules') continue;
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!entry.name.endsWith('.js')) continue;
        const rel = path.relative(dir, full);
        try {
          const mod = require(full);
          const list = Array.isArray(mod) ? mod : [mod];
          for (const plugin of list) if (this.register(plugin, `commands/${rel}`)) count++;
        } catch (e) {
          this.log.error(`[registry] failed to load commands/${rel}: ${e.message}`);
        }
      }
    };
    walk(dir);
    return count;
  }

  /** Commands that are advertised in the menu (not hidden and currently usable). */
  visible() {
    return this.plugins.filter((p) => {
      if (p.hidden) return false;
      try { return !!p.available(); } catch (_) { return false; }
    });
  }

  get(name) { return this.commands.get(String(name || '').toLowerCase()); }

  /** Menu-visible commands grouped by category, in a stable order. */
  categories() {
    const map = new Map();
    for (const p of this.visible()) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category).push(p);
    }
    const known = CATEGORY_ORDER.filter((c) => map.has(c));
    const extra = [...map.keys()].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    const out = new Map();
    for (const c of [...known, ...extra]) {
      out.set(c, map.get(c).slice().sort((a, b) => a.name.localeCompare(b.name)));
    }
    return out;
  }
}

module.exports = { Registry, CATEGORY_ORDER };

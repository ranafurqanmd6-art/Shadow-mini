'use strict';
/**
 * Per-session settings stored as a small JSON file (no database):
 *   <DATA_DIR>/settings/<number>.json
 * Writes are debounced and atomic (tmp file + rename).
 */
const fs = require('fs');
const path = require('path');

const GROUP_DEFAULTS = { welcome: false, goodbye: false, antilink: false };

class SettingsStore {
  constructor(dir, number, config, log) {
    this.log = log;
    this.file = path.join(dir, `${number}.json`);
    this.defaults = {
      mode: 'public', prefix: config.prefix, botName: config.botName, ownerName: config.ownerName,
      autoread: false, autoreact: false, anticall: false, autotyping: false, online: false,
      sudo: [], groups: {},
    };
    this.data = JSON.parse(JSON.stringify(this.defaults));
    this.timer = null;
    this.load();
  }

  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const k of Object.keys(this.defaults)) {
        if (raw[k] !== undefined && typeof raw[k] === typeof this.defaults[k]) this.data[k] = raw[k];
      }
      if (!['public', 'private'].includes(this.data.mode)) this.data.mode = 'public';
    } catch (e) {
      if (e.code !== 'ENOENT') this.log?.warn({ err: e.message }, 'settings file unreadable, using defaults');
    }
  }

  get(key) { return this.data[key]; }
  set(key, value) { this.data[key] = value; this.save(); }

  group(jid) {
    if (!this.data.groups[jid]) this.data.groups[jid] = { ...GROUP_DEFAULTS };
    return { ...GROUP_DEFAULTS, ...this.data.groups[jid] };
  }
  setGroup(jid, key, value) {
    this.data.groups[jid] = { ...this.group(jid), [key]: value };
    this.save();
  }

  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 300);
    this.timer.unref?.();
  }

  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true, mode: 0o700 });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
      fs.renameSync(tmp, this.file);
    } catch (e) { this.log?.error({ err: e.message }, 'could not save settings'); }
  }
}

module.exports = { SettingsStore };

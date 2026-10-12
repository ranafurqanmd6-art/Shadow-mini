'use strict';
/**
 * Offline self-check:  npm run check
 *  1. syntax-checks every .js file
 *  2. verifies the start script points at an existing file
 *  3. loads all command plugins and verifies the menu lists exactly those commands
 *  4. checks that required files and config values exist
 * Needs no network and no installed dependencies.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
let failed = 0;
const ok = (m) => console.log('  ok   ' + m);
const bad = (m) => { failed++; console.log('  FAIL ' + m); };

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'data' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

console.log('1. Syntax');
for (const f of walk(root)) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); ok(path.relative(root, f)); }
  catch (e) { bad(`${path.relative(root, f)}: ${String(e.stderr).split('\n')[0]}`); }
}

console.log('2. package.json');
const pkg = require('../package.json');
const m = /^node\s+(\S+)$/.exec(pkg.scripts && pkg.scripts.start || '');
if (m && fs.existsSync(path.join(root, m[1]))) ok(`start script -> ${m[1]}`); else bad('start script missing or entry file not found');
for (const d of ['express', '@whiskeysockets/baileys', 'pino', '@hapi/boom']) pkg.dependencies[d] ? ok(`dependency ${d}`) : bad(`missing dependency ${d}`);
for (const bannedDep of ['mongoose', 'mongodb']) pkg.dependencies[bannedDep] ? bad(`unwanted dependency ${bannedDep}`) : ok(`no ${bannedDep}`);

console.log('3. Commands and menu');
try { require.resolve('@whiskeysockets/baileys'); }
catch (_) { // dependencies not installed: stub the library just so plugins can be loaded and listed
  const Module = require('module'); const orig = Module._load;
  Module._load = function (req, ...r) { return req === '@whiskeysockets/baileys' ? {} : orig.call(this, req, ...r); };
  console.log('  note: dependencies are not installed, using a stub (run npm install for a full check)');
}
const { Registry } = require('../lib/registry');
const { buildMenu } = require('../lib/menu');
const { smallCaps } = require('../lib/text');
const config = require('../config');
const warnings = [];
const log = { warn: (m) => { warnings.push(m); console.log('  WARN ' + m); }, error: (m) => { bad(m); }, info() {}, debug() {} };
const reg = new Registry(log);
reg.register(require('../lib/core/menu'), 'lib/core/menu.js');
const n = reg.loadDir(path.join(root, 'commands'));
ok(`${n} command plugin(s) loaded, ${reg.plugins.length} total registered`);
reg.plugins.length >= 1 ? ok('registry not empty') : bad('no commands registered');
const view = { botName: config.botName, ownerName: config.ownerName, prefix: config.prefix, mode: 'public' };
const menuText = buildMenu(config, reg, view);
for (const p of reg.visible()) {
  menuText.includes(`● ${smallCaps(p.name)}\n`) ? ok(`menu lists ${p.name}`) : bad(`menu is missing ${p.name}`);
}
menuText.includes(`${smallCaps('total commands')}: ${reg.visible().length}`) ? ok('menu command count matches registry') : bad('menu command count is wrong');
menuText.includes(config.menuCredit) ? ok('menu footer credit') : bad('menu footer credit missing');
const { CATEGORY_ORDER } = require('../lib/registry');
for (const c of reg.categories().keys()) CATEGORY_ORDER.includes(c) ? ok(`category ${c}`) : bad(`category ${c} is not in the menu order`);
if (warnings.length) bad(`${warnings.length} registry warning(s) (duplicates or invalid plugins)`);

console.log('4. Files and config');
for (const f of ['public/index.html', 'public/app.js', 'public/style.css', 'railway.json', 'README.md', '.gitignore']) {
  fs.existsSync(path.join(root, f)) ? ok(f) : bad(`missing ${f}`);
}
const expect = {
  botName: 'SHADOW MD', ownerName: 'RANA FURQAN', ownerNumber: '923003719761',
};
for (const [k, v] of Object.entries(expect)) config[k] === v ? ok(`config.${k}`) : bad(`config.${k} is "${config[k]}"`);
if (!fs.existsSync(path.join(root, 'data'))) ok('no data/ (sessions) folder shipped'); else bad('data/ folder exists - remove before sharing');

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);

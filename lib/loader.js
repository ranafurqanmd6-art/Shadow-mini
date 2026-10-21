const fs = require('fs');
const path = require('path');

const commands = new Map();
const byCategory = {};

function load() {
  commands.clear();

  const dir = path.join(__dirname, '..', 'commands');

  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) {
    const category = f.replace('.js', '');
    byCategory[category] = [];

    const add = (name, desc, run, opts = {}) => {
      const cmd = { name, desc, run, category, ...opts };

      commands.set(name, cmd);
      byCategory[category].push(name);

      for (const a of opts.alias || []) {
        commands.set(a, cmd);
      }
    };

    require(path.join(dir, f))(add);
  }

  return { commands, byCategory };
}

module.exports = { load, commands, byCategory };
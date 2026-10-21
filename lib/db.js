
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'db.json');
let data = { mode: null, prefix: null, banned: [], antilink: {}, welcome: {}, warns: {} };
try { data = { ...data, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch {}
const save = () => { try { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error('db save', e.message); } };
module.exports = { data, save };

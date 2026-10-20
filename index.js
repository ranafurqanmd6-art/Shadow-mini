require('dotenv').config();
const { startBot } = require('./lib/bot');
const { startPairingSite } = require('./lib/pairing');
const port = Number(process.env.PORT || 3000);
startPairingSite(port);
startBot().catch(err => console.error('Bot startup error:', err?.stack || err));

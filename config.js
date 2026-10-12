'use strict';
/**
 * SHADOW MD - central configuration.
 * Edit the branding values below. Runtime options can be overridden with
 * environment variables (see .env.example). No secrets belong in this file.
 */
const path = require('path');
const env = process.env;

const digits = (v) => String(v || '').replace(/\D/g, '');

const config = {
  // ---- Branding -----------------------------------------------------------
  botName: 'SHADOW MD',
  ownerName: 'RANA FURQAN',
  ownerNumber: '923003719761',
  extraOwners: String(env.EXTRA_OWNERS || '').split(',').map(digits).filter(Boolean),

  github: {
    username: 'SHADOW-MD-MINI',
    repo: 'https://github.com/shadowmd2007/SHADOW-MD-MINI.git',
    url: 'https://github.com/shadowmd2007/SHADOW-MD-MINI',
  },

  channel: {
    name: '❤️دل کی دنیا❤️',
    jid: '120363412495477805@newsletter',
    link: 'https://whatsapp.com/channel/0029VbCiT0g8vd1P3dJZqm2J',
  },

  group: {
    name: 'RANA FURQAN',
    link: 'https://chat.whatsapp.com/FGW9EITclIg2obBhZkkVTn?s=cl&p=a&mlu=4&ilr=4',
  },

  botImage: 'https://i.ibb.co/LXZmrwt7/aac9612d34de.jpg',

  // ---- Behaviour ----------------------------------------------------------
  prefix: env.PREFIX || '.',
  autoFollowChannel: env.AUTO_FOLLOW_CHANNEL === 'true',

  // ---- Web server (pairing website + API) --------------------------------
  web: {
    host: '0.0.0.0',
    port: Number(env.PORT) || 3000, // Railway injects PORT
  },

  // ---- Storage (local files only, no database) ---------------------------
  paths: {
    dataDir: env.DATA_DIR ? path.resolve(env.DATA_DIR) : path.join(__dirname, 'data'),
  },

  // ---- Pairing ------------------------------------------------------------
  pairing: {
    attemptTtlMs: 120 * 1000,        // how long a pairing code is considered valid
    linkingGraceMs: 60 * 1000,       // extra time once WhatsApp accepted the code
    maxSessions: Number(env.MAX_SESSIONS) || 20,
    rateLimitPerMinute: 5,           // pairing requests per IP per minute
    attemptRetentionMs: 10 * 60 * 1000,
  },

  logLevel: env.LOG_LEVEL || 'info',
};

config.owners = Array.from(new Set([digits(config.ownerNumber), ...config.extraOwners]));
config.sessionsDir = path.join(config.paths.dataDir, 'sessions');
config.settingsDir = path.join(config.paths.dataDir, 'settings');
config.version = require('./package.json').version;
config.menuCredit = '© POWERED BY RANA FURQAN MD';

module.exports = config;

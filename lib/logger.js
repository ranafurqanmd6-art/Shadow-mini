'use strict';
const pino = require('pino');
const config = require('../config');

// App logger
const logger = pino({ level: config.logLevel, base: undefined });
// Baileys is very chatty, keep it silent unless debugging.
const baileysLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'silent' });

module.exports = { logger, baileysLogger };

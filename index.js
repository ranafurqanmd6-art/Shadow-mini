'use strict';
/**
 * SHADOW MD - entry point.
 * Starts: command registry -> session manager -> web server (pairing website + API).
 */
const path = require('path');
const config = require('./config');
const { logger } = require('./lib/logger');
const { Registry } = require('./lib/registry');
const { Handler } = require('./lib/handler');
const { SessionManager } = require('./lib/sessionManager');
const { createServer } = require('./lib/server');

process.on('unhandledRejection', (e) => logger.error({ err: e && e.message }, 'unhandledRejection'));
process.on('uncaughtException', (e) => logger.error({ err: e && e.message }, 'uncaughtException'));

async function main() {
  // 1. Commands (core first, so plugins can never override them)
  const registry = new Registry(logger);
  registry.register(require('./lib/core/menu'), 'lib/core/menu.js');
  const loaded = registry.loadDir(path.join(__dirname, 'commands'));
  logger.info({ plugins: loaded }, 'command plugins loaded');

  // 2. Sessions
  const manager = new SessionManager({ config, logger });
  manager.setHandler(new Handler({ config, registry, logger }));

  // 3. Web server (must bind to Railway's PORT)
  const app = createServer({ config, manager, logger });
  const server = app.listen(config.web.port, config.web.host, () => {
    logger.info(`${config.botName} web server listening on ${config.web.host}:${config.web.port}`);
  });

  // 4. Re-open previously linked accounts
  manager.restoreAll().catch((e) => logger.error({ err: e.message }, 'restoreAll failed'));

  const shutdown = (sig) => {
    logger.info(`${sig} received, shutting down`);
    manager.shutdown();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => { logger.error({ err: e.message }, 'fatal startup error'); process.exit(1); });

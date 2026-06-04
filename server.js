'use strict';

/**
 * Application entry point.
 *
 * Thin bootstrap: build the app, start listening, and register process-level
 * safety nets. All real configuration lives in `src/app.js` and `src/config`.
 */

const createApp = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`F1 Analytics Platform running at http://localhost:${config.port} (${config.env})`);
});

// Fail fast on unexpected errors rather than running in a corrupt state.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason);
});

process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  server.close(() => process.exit(0));
});

module.exports = server;

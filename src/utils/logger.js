'use strict';

/**
 * Tiny logging helper.
 *
 * Wrapping the console gives us a single place to later swap in a real logger
 * (winston, pino, ...) without touching call sites across the app.
 */

const timestamp = () => new Date().toISOString();

const logger = {
  info(message, ...args) {
    console.log(`[INFO]  ${timestamp()} ${message}`, ...args);
  },
  warn(message, ...args) {
    console.warn(`[WARN]  ${timestamp()} ${message}`, ...args);
  },
  error(message, ...args) {
    console.error(`[ERROR] ${timestamp()} ${message}`, ...args);
  },
};

module.exports = logger;

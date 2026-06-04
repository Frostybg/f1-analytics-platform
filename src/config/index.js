'use strict';

/**
 * Centralized application configuration.
 *
 * All environment variables are read here (and nowhere else) so the rest of
 * the codebase depends on a single, typed configuration object instead of
 * scattered `process.env` lookups. This keeps configuration easy to reason
 * about and trivial to extend in future phases.
 */

require('dotenv').config();

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 3000),

  openF1: {
    baseUrl: process.env.OPENF1_API_BASE_URL || 'https://api.openf1.org/v1',
    timeout: toInt(process.env.OPENF1_API_TIMEOUT, 10000),
  },
};

config.isProduction = config.env === 'production';
config.isDevelopment = !config.isProduction;

module.exports = config;

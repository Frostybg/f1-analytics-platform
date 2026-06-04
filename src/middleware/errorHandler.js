'use strict';

/**
 * Centralized error handling.
 *
 * `notFound` catches any request that didn't match a route and forwards a
 * 404 to the error handler. `errorHandler` is the single place that renders
 * error responses, so individual routes can simply `next(err)` and stay clean.
 */

const config = require('../config');
const logger = require('../utils/logger');

function notFound(req, res, next) {
  const error = new Error(`Not Found - ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

// eslint-disable-next-line no-unused-vars -- Express requires 4 args to detect an error handler.
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status >= 500) {
    logger.error(`${status} ${req.method} ${req.originalUrl} -> ${err.message}`, err.stack);
  } else {
    logger.warn(`${status} ${req.method} ${req.originalUrl} -> ${err.message}`);
  }

  res.status(status).render('errors/error', {
    title: `Error ${status}`,
    status,
    message: err.message || 'Something went wrong.',
    // Only leak stack traces in development.
    stack: config.isDevelopment ? err.stack : null,
  });
}

module.exports = { notFound, errorHandler };

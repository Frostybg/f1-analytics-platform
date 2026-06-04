'use strict';

/**
 * Express application factory.
 *
 * Builds and configures the Express app (view engine, middleware, static
 * assets, routes, error handling) but does NOT start listening. Keeping the
 * "build app" and "start server" concerns separate makes the app importable
 * for testing later and keeps `server.js` a thin entry point.
 */

const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  // --- View engine (EJS + layouts) ---------------------------------------
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');
  app.use(expressLayouts);
  app.set('layout', 'layouts/main');
  // Let layouts inject page-specific <head> content and scripts.
  app.set('layout extractScripts', true);
  app.set('layout extractStyles', true);

  // --- Core middleware ---------------------------------------------------
  app.use(morgan(config.isDevelopment ? 'dev' : 'combined'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // --- Static assets -----------------------------------------------------
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // --- View-wide locals --------------------------------------------------
  app.use((req, res, next) => {
    res.locals.appName = 'F1 Analytics';
    res.locals.year = new Date().getFullYear();
    res.locals.active = '';
    next();
  });

  // --- Routes ------------------------------------------------------------
  app.use('/', routes);

  // --- Error handling (must be last) ------------------------------------
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;

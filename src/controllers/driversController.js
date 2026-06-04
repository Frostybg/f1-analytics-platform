'use strict';

/**
 * Drivers controller.
 *
 * Two responsibilities, kept separate so the page can manage loading/error/
 * empty states on the client:
 *   - showDriversPage: renders the EJS shell (no data) instantly.
 *   - getDriversData:  JSON API the page fetches to populate the grid.
 *
 * All OpenF1 knowledge stays in openf1Service; this layer just orchestrates.
 */

const openf1Service = require('../services/openf1Service');
const logger = require('../utils/logger');

const driversController = {
  showDriversPage(req, res) {
    res.render('pages/drivers', {
      title: 'Drivers',
      active: 'drivers',
    });
  },

  async getDriversData(req, res) {
    try {
      const drivers = await openf1Service.getCurrentDrivers();
      res.json({ drivers });
    } catch (error) {
      // The page renders a friendly error state from this status/JSON, so we
      // respond here instead of forwarding to the HTML error handler.
      const status = error.status || 502;
      logger.error(`Drivers API failed: ${error.message}`);
      res.status(status).json({
        error: 'Unable to load driver data from OpenF1. Please try again.',
      });
    }
  },
};

module.exports = driversController;

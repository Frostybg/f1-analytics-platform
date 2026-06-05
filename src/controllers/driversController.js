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

  async showDriverDetails(req, res, next) {
    try {
      const driverNumber = Number.parseInt(req.params.driverNumber, 10);
      if (Number.isNaN(driverNumber)) {
        const error = new Error('Invalid driver number.');
        error.status = 404;
        return next(error);
      }

      const driver = await openf1Service.getDriverByNumber(driverNumber);
      if (!driver) {
        const error = new Error(`Driver #${driverNumber} could not be found.`);
        error.status = 404;
        return next(error);
      }

      // Season data (standing + recent sessions) is supplementary: a failure
      // still renders the page — those sections are simply hidden.
      let recentSessions = [];
      let standing = null;
      try {
        ({ recentSessions, standing } = await openf1Service.getDriverSeasonData(driverNumber));
      } catch (err) {
        logger.warn(`Season data unavailable for #${driverNumber}: ${err.message}`);
      }

      res.render('pages/driver-details', {
        title: driver.fullName,
        active: 'drivers',
        driver,
        recentSessions,
        standing,
      });
    } catch (error) {
      next(error);
    }
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

'use strict';

/**
 * Standings controller.
 *
 * Fetches the full driver and team championship standings for the current
 * season from openf1Service, then renders the standings page server-side.
 * Both standings tables are derived from the same set of API calls so the
 * total request count is kept as low as possible.
 */

const openf1Service = require('../services/openf1Service');
const logger = require('../utils/logger');

const standingsController = {
  async showStandingsPage(req, res, next) {
    try {
      const { driverStandings, teamStandings, year } = await openf1Service.getStandingsData();

      res.render('pages/standings', {
        title: 'Standings',
        active: 'standings',
        driverStandings,
        teamStandings,
        year,
      });
    } catch (error) {
      logger.error(`Standings page failed: ${error.message}`);
      next(error);
    }
  },
};

module.exports = standingsController;

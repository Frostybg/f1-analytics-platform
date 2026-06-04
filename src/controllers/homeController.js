'use strict';

/**
 * Home (dashboard) controller.
 *
 * Controllers translate an HTTP request into a service call and a rendered
 * view. They contain no API/URL knowledge (that lives in the service) and no
 * HTML (that lives in the views).
 *
 * Phase 1 note: the dashboard is intentionally a skeleton. We render static
 * placeholder stats plus a single demonstration chart. Live OpenF1 data will
 * be wired in during later phases.
 */

const homeController = {
  async showDashboard(req, res, next) {
    try {
      // Placeholder summary cards for the Phase 1 skeleton. In later phases
      // these will be derived from openf1Service calls.
      const summaryCards = [
        { label: 'Season', value: '2024', icon: 'calendar', accent: 'red' },
        { label: 'Grands Prix', value: '24', icon: 'flag', accent: 'amber' },
        { label: 'Drivers', value: '20', icon: 'user', accent: 'cyan' },
        { label: 'Data Source', value: 'OpenF1', icon: 'database', accent: 'green' },
      ];

      // Demonstration dataset for the example Chart.js component. This mimics
      // the shape of telemetry "speed over distance" data we'll later pull
      // from the OpenF1 car_data endpoint.
      const demoChart = {
        labels: ['0', '100', '200', '300', '400', '500', '600', '700', '800'],
        speed: [80, 180, 250, 295, 312, 280, 200, 150, 240],
      };

      res.render('pages/home', {
        title: 'Dashboard',
        active: 'home',
        summaryCards,
        demoChart,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = homeController;

'use strict';

/**
 * Route aggregator.
 *
 * Every feature gets its own router file and is mounted here under a clear
 * base path. Adding a future page (e.g. Drivers) is a two-line change:
 * require the router and `router.use('/drivers', driversRoutes)`.
 */

const express = require('express');
const homeRoutes = require('./homeRoutes');

const router = express.Router();

router.use('/', homeRoutes);

// Future phases (mount here as they are built):
// router.use('/drivers', driversRoutes);
// router.use('/calendar', calendarRoutes);
// router.use('/telemetry', telemetryRoutes);
// router.use('/compare', compareRoutes);
// router.use('/circuits', circuitRoutes);
// router.use('/about', aboutRoutes);

module.exports = router;

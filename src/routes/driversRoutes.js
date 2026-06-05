'use strict';

const express = require('express');
const driversController = require('../controllers/driversController');

const router = express.Router();

// GET /drivers      -> Drivers page (shell)
router.get('/', driversController.showDriversPage);

// GET /drivers/api  -> JSON list of current drivers (consumed by the page)
router.get('/api', driversController.getDriversData);

// GET /drivers/:driverNumber -> Driver details page
// Declared after literal routes so it doesn't capture "/api".
router.get('/:driverNumber', driversController.showDriverDetails);

module.exports = router;

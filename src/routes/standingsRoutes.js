'use strict';

const express = require('express');
const standingsController = require('../controllers/standingsController');

const router = express.Router();

router.get('/', standingsController.showStandingsPage);

module.exports = router;

'use strict';

const express = require('express');
const calendarController = require('../controllers/calendarController');

const router = express.Router();

// GET /calendar  -> Race calendar page (server-rendered)
router.get('/', calendarController.showCalendarPage);

module.exports = router;

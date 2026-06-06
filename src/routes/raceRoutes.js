'use strict';

const express = require('express');
const raceController = require('../controllers/raceController');

const router = express.Router();

// GET /race/:meetingKey/session/:sessionKey → JSON results (client-side fetch)
// Must be declared before the bare /:meetingKey route so Express doesn't
// accidentally treat "session" as a meetingKey.
router.get('/:meetingKey/session/:sessionKey', raceController.getSessionResultsData);

// GET /race/:meetingKey  → Race Details page (server-rendered)
router.get('/:meetingKey', raceController.showRacePage);

module.exports = router;

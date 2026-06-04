'use strict';

const express = require('express');
const homeController = require('../controllers/homeController');

const router = express.Router();

// GET / -> Home dashboard
router.get('/', homeController.showDashboard);

module.exports = router;

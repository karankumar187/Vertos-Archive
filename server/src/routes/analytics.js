const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Get homepage intelligence data
router.get('/homepage', analyticsController.getHomepageData);

module.exports = router;

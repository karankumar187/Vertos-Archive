const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');

// Get leaderboard and gamification stats
router.get('/', leaderboardController.getLeaderboard);

module.exports = router;

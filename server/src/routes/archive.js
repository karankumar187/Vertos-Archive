const express = require('express');
const router = express.Router();
const archiveController = require('../controllers/archiveController');
const { protect } = require('../middleware/auth');

router.get('/', protect, archiveController.getArchive);

module.exports = router;

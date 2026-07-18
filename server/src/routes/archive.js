const express = require('express');
const router = express.Router();
const archiveController = require('../controllers/archiveController');
const { protect } = require('../middleware/auth');

router.get('/', protect, archiveController.getArchive);
router.get('/download/:id', protect, archiveController.downloadDocument);

module.exports = router;

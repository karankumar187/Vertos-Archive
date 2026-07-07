const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, eventsController.getAllEvents);
router.post('/', protect, eventsController.createEvent);
router.post('/:id/interest', protect, eventsController.toggleInterest);

module.exports = router;

const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');
const { protect } = require('../middleware/auth');

router.get('/', protect, eventsController.getAllEvents);
router.post('/', protect, eventsController.createEvent);
router.post('/:id/register', protect, eventsController.registerForEvent);

module.exports = router;

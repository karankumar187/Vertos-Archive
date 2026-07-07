const express = require('express');
const router = express.Router();
const queriesController = require('../controllers/queriesController');
const { protect } = require('../middleware/auth');

router.get('/', protect, queriesController.getAllQueries);
router.post('/', protect, queriesController.createQuery);
router.post('/:id/answers', protect, queriesController.addAnswer);

module.exports = router;

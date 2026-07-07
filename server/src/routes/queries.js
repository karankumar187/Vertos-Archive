const express = require('express');
const router = express.Router();
const queriesController = require('../controllers/queriesController');
const { protect } = require('../middleware/auth');

router.get('/', protect, queriesController.getAllQueries);
router.post('/', protect, queriesController.createQuery);
router.post('/:id/answers', protect, queriesController.addAnswer);
router.delete('/:id/answers/:answerId', protect, queriesController.deleteAnswer);
router.delete('/:id', protect, queriesController.deleteQuery);

module.exports = router;

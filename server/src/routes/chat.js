const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// All chat routes require authentication
const { protect } = require('../middleware/auth');
router.use(protect);

router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.createConversation);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/message', chatController.sendMessage);
router.delete('/conversations/:id', chatController.deleteConversation);
router.patch('/conversations/:id/star', chatController.toggleStarConversation);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/auth');
const { getPendingUploads, approveUpload, rejectUpload, checkDuplicate, getLiveDocuments, deleteDocument } = require('../controllers/adminController');

// All admin routes are protected and require admin role
router.use(protect);
router.use(authorizeAdmin);

// Fetch moderation queue
router.get('/pending', getPendingUploads);

// Fetch live approved documents
router.get('/documents', getLiveDocuments);

// Permanently delete a live document
router.delete('/documents/:id', deleteDocument);

// Approve a document
router.post('/approve/:id', approveUpload);

// Reject a document
router.post('/reject/:id', rejectUpload);

// Check for duplicates
router.post('/check-duplicate', checkDuplicate);

module.exports = router;

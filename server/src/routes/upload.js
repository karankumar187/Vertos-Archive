const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { protect } = require('../middleware/auth');
const uploadController = require('../controllers/uploadController');

// All upload routes require authentication
router.use(protect);

// Upload a document
// The 'files' field should match the form-data key in the frontend
router.post('/', upload.array('files', 10), uploadController.uploadDocument);

// Get contributor statistics
router.get('/stats', uploadController.getContributorStats);

// Get my uploads
router.get('/my-uploads', uploadController.getMyUploads);

module.exports = router;

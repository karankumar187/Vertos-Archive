const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/auth');
const { getPendingUploads, approveUpload, rejectUpload, checkDuplicate, getLiveDocuments, deleteDocument, reprocessDocument, getUsers, updateUserRole, suspendUser, getAdminAnalytics, getActivityLogs } = require('../controllers/adminController');
const { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');

// All admin routes are protected and require admin role
router.use(protect);
router.use(authorizeAdmin);

// Fetch moderation queue
router.get('/pending', getPendingUploads);

// Fetch live approved documents
router.get('/documents', getLiveDocuments);

// Permanently delete a live document
router.delete('/documents/:id', deleteDocument);

// Reprocess a live document
router.post('/documents/:id/reprocess', reprocessDocument);

// Approve a document
router.post('/approve/:id', approveUpload);

// Reject a document
router.post('/reject/:id', rejectUpload);

// Check for duplicates
router.post('/check-duplicate', checkDuplicate);

// ─── Users ──────────────────────────────────────────────────────────────────
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/suspend', suspendUser);

// ─── Analytics & Logs ───────────────────────────────────────────────────────
router.get('/analytics', getAdminAnalytics);
router.get('/logs', getActivityLogs);

// ─── Announcements ──────────────────────────────────────────────────────────
router.get('/announcements', getAnnouncements);
router.post('/announcements', createAnnouncement);
router.put('/announcements/:id', updateAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);

module.exports = router;

const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    event: {
        type: String,
        required: true,
        enum: ['document_view', 'document_download', 'search_query', 'login', 'signup', 'upload_attempt']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // Optional because guests might trigger some events, though system currently focuses on auth'd users
    },
    metadata: {
        // Can store documentId, search query string, browser info, etc.
        type: mongoose.Schema.Types.Mixed,
    },
    userAgent: {
        type: String,
    },
    ipAddress: {
        type: String, // Optionally track IP for analytics (can be hashed)
    }
}, { timestamps: true });

module.exports = mongoose.model('Analytics', analyticsSchema);

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['bug', 'suggestion', 'content_issue', 'other'],
        required: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'resolved', 'closed'],
        default: 'pending',
    },
    adminNotes: {
        type: String,
        trim: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);

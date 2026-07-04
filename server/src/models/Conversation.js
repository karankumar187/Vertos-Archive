const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        default: 'New Conversation',
    },
    activeCourse: {
        type: String,
        default: null,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Conversation', conversationSchema);
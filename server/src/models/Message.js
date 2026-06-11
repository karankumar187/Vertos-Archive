const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    // Optional: store the source chunks used for this specific assistant message
    sources: [{
        chunkId: String,
        documentId: mongoose.Schema.Types.ObjectId,
        title: String,
        text: String,
        fileUrl: String,
        fileType: String,
        category: String,
        subject: String,
        files: [mongoose.Schema.Types.Mixed]
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
const mongoose = require("mongoose");

const pendingDocumentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    category: {
        type: String,
        enum: ["notes", "pyq", "syllabus", "placements", "faculty", "university"],
        required: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    semester: {
        type: Number,
    },
    uploaderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    fileUrl: {
        type: String,
        required: true,
    },
    fileSize: {
        type: Number, // size in bytes
    },
    fileType: {
        type: String, // MIME type e.g. application/pdf, image/jpeg
        default: '',
    },
    pageCount: {
        type: Number,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    reviewComment: {
        type: String,
        trim: true,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    reviewedAt: {
        type: Date,
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, { timestamps: true }); // Also keep standard timestamps for createdAt/updatedAt

module.exports = mongoose.model("PendingDocument", pendingDocumentSchema);
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        enum: ["notes", "pyq", "syllabus", "placements", "faculty", "university"],
        required: true,
    },
    source: {
        type: String,
        required: true,
        trim: true,
    },
    verified: {
        type: Boolean,
        default: false,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    uploaderID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    fileUrl: {
        type: String,
        required: true,
    },
    fileType: {
        type: String, // MIME type e.g. application/pdf, image/jpeg
        default: '',
    },
    pageCount: {
        type: Number,
        required: true,
    },
    indexed: {
        type: Boolean,
        default: false,
    }
} , { timestamps: true });

module.exports = mongoose.model("Document", documentSchema);
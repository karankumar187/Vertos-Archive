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
    extractedText: {
        type: String, // Pre-extracted text stored at upload time
        default: '',
    },
    files: [{
        url: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number, required: true }
    }],
    pageCount: {
        type: Number,
        required: true,
    },
    examType: {
        type: String,
        enum: ['ca', 'midterm', 'ete', 'etp', 'other', null],
        default: null,
    },
    units: {
        type: [Number],
        default: [],
    },
    year: {
        type: Number,
        default: null,
    },
    session: {
        type: String,
        trim: true,
        default: null,
    },
    indexed: {
        type: Boolean,
        default: false,
    }
} , { timestamps: true });

// Create text index for keyword search (Phase 6)
documentSchema.index({
    title: 'text',
    subject: 'text',
    category: 'text',
    examType: 'text'
}, {
    weights: {
        title: 10,
        subject: 5,
        category: 2,
        examType: 3
    },
    name: 'HybridSearchTextIndex'
});

const Document = mongoose.model("Document", documentSchema);

module.exports = Document;
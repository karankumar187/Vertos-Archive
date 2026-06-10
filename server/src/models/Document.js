const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        required: true,
        trim: true,
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
} , { timestamps: true });

module.exports = mongoose.model("Document", documentSchema);
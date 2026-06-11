const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
    },
    questions: {
        type: String,
    },
    topics: {
        type: String,
    }
});

module.exports = mongoose.model("Suggestion", suggestionSchema);
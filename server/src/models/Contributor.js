const mongoose = require('mongoose');

const contributorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    points: {
        type: Number,
        default: 0,
    },
    trustScore: {
        type: Number,
        default: 0,
    },
    badges: [{
        type: String,
    }],
}, { timestamps: true });

module.exports = {
    Contributor: mongoose.model('Contributor', contributorSchema),
    }
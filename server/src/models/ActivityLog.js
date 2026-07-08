const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // e.g. 'Approved Document', 'Rejected Document', etc.
    targetType: { type: String }, // 'Document', 'User', 'Announcement', 'Settings'
    targetName: { type: String }, // Human-readable name of the target
    targetId: { type: mongoose.Schema.Types.ObjectId },
    ipAddress: { type: String, default: 'N/A' },
    metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

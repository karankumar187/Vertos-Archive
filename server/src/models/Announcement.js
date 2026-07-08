const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    type: {
        type: String,
        enum: ['General', 'Exam', 'Placement', 'Event', 'Maintenance', 'Academic'],
        default: 'General'
    },
    audience: {
        type: String,
        enum: ['All Students', '1st Sem', '2nd Sem', '3rd Sem', '4th Sem', '5th Sem', '6th Sem', '7th Sem', '8th Sem'],
        default: 'All Students'
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'published'],
        default: 'draft'
    },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    eventDate: { type: Date },  // for type=Event, shown in calendar views
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);

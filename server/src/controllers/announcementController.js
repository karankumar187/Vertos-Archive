const Announcement = require('../models/Announcement');
const ActivityLog = require('../models/ActivityLog');

// @desc  Get all announcements
// @route GET /api/admin/announcements
exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: announcements });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc  Create announcement
// @route POST /api/admin/announcements
exports.createAnnouncement = async (req, res) => {
    try {
        const { title, content, type, audience, status, scheduledAt, eventDate, registrationLink } = req.body;
        const ann = await Announcement.create({
            title, content, type, audience, status,
            scheduledAt: scheduledAt || null,
            publishedAt: status === 'published' ? new Date() : null,
            eventDate: eventDate || null,
            registrationLink: registrationLink || null,
            createdBy: req.user._id
        });
        await ActivityLog.create({
            adminId: req.user._id,
            action: 'Created Announcement',
            targetType: 'Announcement',
            targetName: title,
            targetId: ann._id,
            ipAddress: req.ip || 'N/A'
        });

        if (status === 'published') {
            try {
                const io = req.app.get('io');
                if (io) {
                    io.emit('new_announcement', ann);
                }
            } catch (err) {
                console.error('[Socket] Failed to emit new_announcement:', err);
            }
        }

        res.status(201).json({ success: true, data: ann });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc  Update announcement
// @route PUT /api/admin/announcements/:id
exports.updateAnnouncement = async (req, res) => {
    try {
        const { title, content, type, audience, status, scheduledAt, eventDate, registrationLink } = req.body;
        const update = { title, content, type, audience, status, scheduledAt, eventDate: eventDate || null, registrationLink: registrationLink || null };
        if (status === 'published') update.publishedAt = new Date();
        const ann = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!ann) return res.status(404).json({ success: false, message: 'Not found' });
        await ActivityLog.create({
            adminId: req.user._id,
            action: 'Updated Announcement',
            targetType: 'Announcement',
            targetName: ann.title,
            targetId: ann._id,
            ipAddress: req.ip || 'N/A'
        });
        res.json({ success: true, data: ann });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc  Delete announcement
// @route DELETE /api/admin/announcements/:id
exports.deleteAnnouncement = async (req, res) => {
    try {
        const ann = await Announcement.findByIdAndDelete(req.params.id);
        if (!ann) return res.status(404).json({ success: false, message: 'Not found' });
        await ActivityLog.create({
            adminId: req.user._id,
            action: 'Deleted Announcement',
            targetType: 'Announcement',
            targetName: ann.title,
            ipAddress: req.ip || 'N/A'
        });
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc  Get published announcements (public)
// @route GET /api/auth/announcements (no admin required)
exports.getPublishedAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find({ status: 'published' })
            .sort({ createdAt: -1 })
            .select('title content type audience eventDate publishedAt createdAt registrationLink registeredUsers');
        res.json({ success: true, data: announcements });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc  Register for announcement event
// @route POST /api/auth/announcements/:id/register
exports.registerForAnnouncement = async (req, res) => {
    try {
        const ann = await Announcement.findById(req.params.id);
        if (!ann) return res.status(404).json({ success: false, message: 'Not found' });
        
        if (!ann.registeredUsers.includes(req.user._id)) {
            ann.registeredUsers.push(req.user._id);
            await ann.save();
        }
        
        res.json({ success: true, message: 'Registered successfully', registeredCount: ann.registeredUsers.length });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

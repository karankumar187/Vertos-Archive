const PendingDocument = require('../models/PendingDocument');
const Document = require('../models/Document');
const Contributor = require('../models/Contributor');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { processDocument } = require('../services/pipelineWorker');

// @desc    Get all pending documents
// @route   GET /api/admin/pending
// @access  Private/Admin
exports.getPendingUploads = async (req, res) => {
    try {
        const pendingDocs = await PendingDocument.find({ status: 'pending' })
            .populate('uploaderId', 'name email')
            .sort({ uploadedAt: 1 });
            
        res.status(200).json({ success: true, count: pendingDocs.length, data: pendingDocs });
    } catch (error) {
        console.error('Fetch pending error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching pending documents' });
    }
};

// @desc    Approve a pending document
// @route   POST /api/admin/approve/:id
// @access  Private/Admin
exports.approveUpload = async (req, res) => {
    try {
        const pendingDoc = await PendingDocument.findById(req.params.id);
        
        if (!pendingDoc) {
            return res.status(404).json({ success: false, message: 'Pending document not found' });
        }
        
        if (pendingDoc.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Document is already processed' });
        }

        // Admin may override metadata fields
        const { title, subject, category, reviewComment } = req.body;

        // Create main Document (use admin overrides if provided)
        const newDoc = new Document({
            title: title || pendingDoc.title,
            category: category || pendingDoc.category,
            source: 'User Upload',
            verified: true,
            subject: subject || pendingDoc.subject,
            uploaderID: pendingDoc.uploaderId,
            approvedBy: req.user._id,
            reviewComment: reviewComment || '',
            fileUrl: pendingDoc.fileUrl,
            fileType: pendingDoc.fileType || '',
            files: pendingDoc.files || [],
            extractedText: pendingDoc.extractedText || '',
            pageCount: pendingDoc.pageCount || 0,
            indexed: false
        });

        await newDoc.save();

        // Update PendingDocument status
        pendingDoc.status = 'approved';
        pendingDoc.reviewedAt = Date.now();
        pendingDoc.reviewedBy = req.user._id;
        pendingDoc.reviewComment = reviewComment || '';
        // Apply any admin metadata corrections to the pending doc too
        if (title) pendingDoc.title = title;
        if (subject) pendingDoc.subject = subject;
        if (category) pendingDoc.category = category;
        await pendingDoc.save();

        // Reward Contributor (Points: +10, Trust Score: +5)
        const contributor = await Contributor.findOne({ userId: pendingDoc.uploaderId });
        if (contributor) {
            contributor.approvedUploads += 1;
            contributor.points += 10;
            contributor.trustScore += 5;
            
            // Assign badges based on points
            if (contributor.points >= 50 && !contributor.badges.includes('Top Contributor')) {
                contributor.badges.push('Top Contributor');
            }
            if (contributor.points >= 100 && !contributor.badges.includes('Elite Verto')) {
                contributor.badges.push('Elite Verto');
            }
            
            await contributor.save();
        }

        // Respond immediately — pipeline runs async in background
        res.status(200).json({ success: true, message: 'Document approved. Processing pipeline started.', data: newDoc });

        // Trigger the document processing pipeline asynchronously (non-blocking)
        processDocument(newDoc._id).catch(err => {
            console.error(`[Pipeline] Background processing failed for doc ${newDoc._id}:`, err);
        });
    } catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ success: false, message: 'Server error during approval' });
    }
};

// @desc    Reject a pending document
// @route   POST /api/admin/reject/:id
// @access  Private/Admin
exports.rejectUpload = async (req, res) => {
    try {
        const { reviewComment } = req.body;
        const pendingDoc = await PendingDocument.findById(req.params.id);
        
        if (!pendingDoc) {
            return res.status(404).json({ success: false, message: 'Pending document not found' });
        }
        
        if (pendingDoc.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Document is already processed' });
        }

        // Update PendingDocument status
        pendingDoc.status = 'rejected';
        pendingDoc.reviewComment = reviewComment || 'Rejected by administrator.';
        pendingDoc.reviewedAt = Date.now();
        pendingDoc.reviewedBy = req.user._id;
        await pendingDoc.save();

        // Penalize Contributor (Trust Score: -2)
        const contributor = await Contributor.findOne({ userId: pendingDoc.uploaderId });
        if (contributor) {
            contributor.rejectedUploads += 1;
            contributor.trustScore = Math.max(0, contributor.trustScore - 2); // Prevent negative trust score
            await contributor.save();
        }

        res.status(200).json({ success: true, message: 'Document rejected successfully' });
    } catch (error) {
        console.error('Reject error:', error);
        res.status(500).json({ success: false, message: 'Server error during rejection' });
    }
};

// @desc    Check for duplicates using metadata similarity
// @route   POST /api/admin/check-duplicate
// @access  Private/Admin
exports.checkDuplicate = async (req, res) => {
    try {
        const { title, subject, category } = req.body;
        
        if (!title || !subject) {
            return res.status(400).json({ success: false, message: 'Title and subject are required' });
        }
        
        const regexTitle = new RegExp(title, 'i');
        const duplicates = await Document.find({
            $or: [
                { title: regexTitle, subject: subject },
                { title: regexTitle, category: category }
            ]
        }).limit(5);
        
        res.status(200).json({ 
            success: true, 
            isLikelyDuplicate: duplicates.length > 0,
            duplicates 
        });
    } catch (error) {
        console.error('Duplicate check error:', error);
        res.status(500).json({ success: false, message: 'Server error checking duplicates' });
    }
};

const { deleteDocumentEmbeddings } = require('../services/qdrant.service');
const { cloudinary } = require('../config/cloudinary');

// @desc    Get all live/approved documents
// @route   GET /api/admin/documents
// @access  Private/Admin
exports.getLiveDocuments = async (req, res) => {
    try {
        const docs = await Document.find({ verified: true })
            .populate('uploaderID', 'name email')
            .sort({ createdAt: -1 });
            
        res.status(200).json({ success: true, count: docs.length, data: docs });
    } catch (error) {
        console.error('Fetch live docs error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching live documents' });
    }
};

// @desc    Permanently delete a live document from Mongo, Cloudinary, and Qdrant
// @route   DELETE /api/admin/documents/:id
// @access  Private/Admin
exports.deleteDocument = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // 1. Delete from Cloudinary
        if (doc.fileUrl) {
            try {
                const parts = doc.fileUrl.split('/upload/');
                if (parts.length > 1) {
                    const pathWithVersion = parts[1];
                    const pathWithExt = pathWithVersion.replace(/^v\d+\//, ''); 
                    const pathWithoutExt = pathWithExt.split('.').slice(0, -1).join('.');
                    
                    // Try destroying as both raw and image to be safe
                    await cloudinary.uploader.destroy(pathWithExt, { resource_type: 'raw' }).catch(() => {});
                    await cloudinary.uploader.destroy(pathWithoutExt, { resource_type: 'image' }).catch(() => {});
                }
            } catch (err) {
                console.error('Error deleting from Cloudinary:', err);
            }
        }

        // 2. Delete from Qdrant
        try {
            await deleteDocumentEmbeddings(doc._id);
        } catch (err) {
            console.error('Error deleting from Qdrant:', err);
        }

        // 3. Deduct Points from Contributor (Penalize for deleted doc)
        if (doc.uploaderID) {
            const contributor = await Contributor.findOne({ userId: doc.uploaderID });
            if (contributor) {
                contributor.approvedUploads = Math.max(0, contributor.approvedUploads - 1);
                contributor.points = Math.max(0, contributor.points - 10);
                await contributor.save();
            }
        }

        // 4. Scrub source references from old chat messages so deleted docs don't appear as broken links
        try {
            const Message = require('../models/Message');
            await Message.updateMany(
                { 'sources.documentId': doc._id },
                { $pull: { sources: { documentId: doc._id } } }
            );
            console.log(`[Admin] Scrubbed source references for doc ${doc._id} from chat messages.`);
        } catch (err) {
            console.error('Error cleaning up message sources:', err);
        }

        // 5. Finally delete the Document itself
        await Document.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ success: true, message: 'Document permanently deleted' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ success: false, message: 'Server error deleting document' });
    }
};

// @desc    Manually trigger reprocessing of a document
// @route   POST /api/admin/documents/:id/reprocess
// @access  Private/Admin
exports.reprocessDocument = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Trigger pipeline asynchronously
        processDocument(doc._id).catch(err => {
            console.error(`[Pipeline] Background reprocessing failed for doc ${doc._id}:`, err);
        });

        res.status(200).json({ success: true, message: 'Reprocessing started in the background.' });
    } catch (error) {
        console.error('Reprocess document error:', error);
        res.status(500).json({ success: false, message: 'Server error triggering reprocessing' });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        
        // Also fetch contributors to merge points
        const contributors = await Contributor.find().select('userId points trustScore badges');
        const contribMap = {};
        contributors.forEach(c => {
            if (c.userId) contribMap[c.userId.toString()] = c;
        });

        const usersWithStats = users.map(u => ({
            ...u.toObject(),
            points: contribMap[u._id.toString()]?.points || 0,
            status: u.isSuspended ? 'Suspended' : 'Active'
        }));

        res.json({ success: true, data: usersWithStats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching users' });
    }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
exports.updateUserRole = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        
        user.role = req.body.role;
        await user.save();
        
        await ActivityLog.create({
            adminId: req.user._id, action: 'Changed User Role', targetType: 'User',
            targetName: user.name, targetId: user._id, metadata: { newRole: user.role },
            ipAddress: req.ip || 'N/A'
        });
        
        res.json({ success: true, message: 'Role updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Suspend/Activate User
// @route   PUT /api/admin/users/:id/suspend
exports.suspendUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        
        user.isSuspended = req.body.suspend; // boolean
        await user.save();
        
        await ActivityLog.create({
            adminId: req.user._id, action: user.isSuspended ? 'Suspended User' : 'Activated User',
            targetType: 'User', targetName: user.name, targetId: user._id,
            ipAddress: req.ip || 'N/A'
        });
        
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get admin analytics
// @route   GET /api/admin/analytics
exports.getAdminAnalytics = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isSuspended: { $ne: true } });
        const totalDocs = await Document.countDocuments({ verified: true });
        const pendingApprovals = await Document.countDocuments({ verified: false });
        
        const Message = require('../models/Message');
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const aiQueriesToday = await Message.countDocuments({ createdAt: { $gte: startOfToday } });
        const totalQueries = await Message.countDocuments();
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Document Upload Trend (last 30 days)
        const docAggregation = await Document.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { 
                $group: { 
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
                    count: { $sum: 1 } 
                } 
            },
            { $sort: { "_id": 1 } }
        ]);

        // Map into an array covering the last 30 days (filling missing dates with 0)
        const uploadTrend = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = d.toISOString().split('T')[0];
            const found = docAggregation.find(x => x._id === dateStr);
            uploadTrend.push({ date: dateStr, count: found ? found.count : 0 });
        }

        // User Growth (last 30 days)
        const userAggregation = await User.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { 
                $group: { 
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
                    count: { $sum: 1 } 
                } 
            },
            { $sort: { "_id": 1 } }
        ]);

        const userGrowth = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = d.toISOString().split('T')[0];
            const found = userAggregation.find(x => x._id === dateStr);
            userGrowth.push({ date: dateStr, count: found ? found.count : 0 });
        }

        // Top Subjects
        const topSubjectsRaw = await Document.aggregate([
            { $match: { verified: true } },
            { $group: { _id: "$subject", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 4 }
        ]);
        
        const topSubjects = topSubjectsRaw.map(s => ({ subject: s._id || 'Unknown', count: s.count }));
        
        res.json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                totalDocs,
                pendingApprovals,
                aiQueriesToday,
                totalQueries,
                uploadTrend,
                userGrowth,
                topSubjects
            }
        });
    } catch (err) {
        console.error('Analytics Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get activity logs
// @route   GET /api/admin/logs
exports.getActivityLogs = async (req, res) => {
    try {
        const logs = await ActivityLog.find()
            .populate('adminId', 'name avatar')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

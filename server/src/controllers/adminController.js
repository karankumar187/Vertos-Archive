const PendingDocument = require('../models/PendingDocument');
const Document = require('../models/Document');
const Contributor = require('../models/Contributor');
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

        // Create main Document
        const newDoc = new Document({
            title: pendingDoc.title,
            category: pendingDoc.category,
            source: 'User Upload',
            verified: true,
            subject: pendingDoc.subject,
            uploaderID: pendingDoc.uploaderId,
            approvedBy: req.user._id,
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
        
        // Simple metadata similarity: Check if a document exists with exact/similar title in same subject
        // For production, this should integrate with Qdrant vector search
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

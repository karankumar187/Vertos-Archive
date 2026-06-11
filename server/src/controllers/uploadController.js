const PendingDocument = require('../models/PendingDocument');
const Contributor = require('../models/Contributor');

exports.uploadDocument = async (req, res) => {
    try {
        const { title, description, category, subject, semester } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a file' });
        }

        const fileUrl = req.file.path; // Cloudinary URL
        const fileSize = req.file.size || req.file.bytes || 0;
        const fileType = req.file.mimetype || ''; // e.g. image/jpeg, application/pdf
        
        // Save to PendingDocument
        const pendingDoc = new PendingDocument({
            title,
            description,
            category: category ? category.toLowerCase() : category,
            subject,
            semester: semester ? Number(semester) : undefined,
            uploaderId: req.user._id,
            fileUrl,
            fileSize,
            fileType,
            status: 'pending',
            // pageCount can be extracted asynchronously later or by an admin
        });

        await pendingDoc.save();

        // Update or create Contributor profile
        let contributor = await Contributor.findOne({ userId: req.user._id });
        if (!contributor) {
            contributor = new Contributor({
                userId: req.user._id,
                totalUploads: 1,
            });
        } else {
            contributor.totalUploads += 1;
        }
        await contributor.save();

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully and is pending review.',
            document: pendingDoc
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: 'Server error during upload' });
    }
};

exports.getContributorStats = async (req, res) => {
    try {
        const contributor = await Contributor.findOne({ userId: req.user._id });
        
        // Find pending docs count
        const pendingCount = await PendingDocument.countDocuments({ uploaderId: req.user._id, status: 'pending' });
        
        if (!contributor) {
            return res.status(200).json({
                success: true,
                stats: {
                    totalUploads: 0,
                    approvedUploads: 0,
                    rejectedUploads: 0,
                    points: 0,
                    trustScore: 0,
                    badges: [],
                    pendingUploads: pendingCount
                }
            });
        }

        res.status(200).json({
            success: true,
            stats: {
                totalUploads: contributor.totalUploads,
                approvedUploads: contributor.approvedUploads,
                rejectedUploads: contributor.rejectedUploads,
                points: contributor.points,
                trustScore: contributor.trustScore,
                badges: contributor.badges,
                pendingUploads: pendingCount
            }
        });
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching stats' });
    }
};

exports.getMyUploads = async (req, res) => {
    try {
        const uploads = await PendingDocument.find({ uploaderId: req.user._id })
            .sort({ uploadedAt: -1 });
            
        res.status(200).json({
            success: true,
            uploads
        });
    } catch (error) {
        console.error('Fetch uploads error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching uploads' });
    }
};

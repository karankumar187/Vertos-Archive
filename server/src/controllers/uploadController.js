const PendingDocument = require('../models/PendingDocument');
const Contributor = require('../models/Contributor');
const { uploadBufferToCloudinary } = require('../config/cloudinary');
const { extractTextFromBuffer } = require('../services/documentParser');

exports.uploadDocument = async (req, res) => {
    try {
        const { title, description, category, subject, semester } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Please upload at least one file' });
        }

        console.log(`[Upload] Received ${req.files.length} files for document: ${title}`);
        
        let allExtractedText = '';
        const savedFiles = [];
        let totalSize = 0;

        // Process all files concurrently
        const uploadPromises = req.files.map(async (file, index) => {
            const buffer = file.buffer;
            const mimeType = file.mimetype;
            totalSize += file.size || 0;

            // 1. Upload buffer to Cloudinary
            console.log(`[Upload] Uploading file ${index + 1}/${req.files.length} (${mimeType})...`);
            const cloudinaryResult = await uploadBufferToCloudinary(buffer, mimeType);
            const fileUrl = cloudinaryResult.secure_url;
            
            savedFiles.push({
                url: fileUrl,
                type: mimeType,
                size: cloudinaryResult.bytes || file.size || 0
            });

            // 2. Extract text immediately from the buffer
            console.log(`[Upload] Extracting text from file ${index + 1}...`);
            try {
                const text = await extractTextFromBuffer(buffer, mimeType, fileUrl);
                if (text) {
                    allExtractedText += `\n\n--- Page/Section ${index + 1} ---\n\n` + text;
                }
            } catch (extractErr) {
                console.warn(`[Upload] Text extraction warning for file ${index + 1}: ${extractErr.message}`);
            }
        });

        await Promise.all(uploadPromises);
        console.log(`[Upload] All files processed. Total extracted text length: ${allExtractedText.length}`);

        // 3. Save to PendingDocument
        const pendingDoc = new PendingDocument({
            title,
            description,
            category: category ? category.toLowerCase() : category,
            subject,
            semester: semester ? Number(semester) : undefined,
            uploaderId: req.user._id,
            // Keep first file URL/type/size for backwards compatibility / simple views
            fileUrl: savedFiles[0].url,
            fileSize: totalSize,
            fileType: savedFiles[0].type,
            // New array
            files: savedFiles,
            extractedText: allExtractedText.trim(),
            status: 'pending',
        });

        await pendingDoc.save();

        // 4. Update or create Contributor profile
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

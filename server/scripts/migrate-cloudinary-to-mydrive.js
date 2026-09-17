const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const axios = require('axios');
const Document = require('../src/models/Document');
const PendingDocument = require('../src/models/PendingDocument');
const { uploadBufferToMyDrive } = require('../src/services/myDrive.service');

let cloudinary;
try {
    cloudinary = require('../src/config/cloudinary').cloudinary;
} catch {
    // optional
}

const MIME_MAP = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
};

/**
 * Downloads a file from Cloudinary (using direct download or signed URL fallback).
 */
async function downloadFromCloudinary(url) {
    // 1. Try direct download
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        if (response.status === 200 && response.data && response.data.length > 0) {
            return {
                buffer: Buffer.from(response.data),
                contentType: response.headers['content-type'],
            };
        }
    } catch (directErr) {
        // Continue to signed fallback
    }

    // 2. Try signed Cloudinary URL fallback for authenticated/raw resources
    if (cloudinary) {
        const match = url.match(/\/(raw|image|video)\/(upload|authenticated)\/(?:s--[a-zA-Z0-9_-]+--\/)?(?:v\d+\/)?(.+?)$/);
        if (match) {
            const resource_type = match[1];
            const type = match[2];
            const publicIdWithExt = match[3];

            let signedUrl;
            if (resource_type === 'image' || resource_type === 'video') {
                const extMatch = publicIdWithExt.match(/\.([a-z0-9]+)$/i);
                const format = extMatch ? extMatch[1] : undefined;
                const publicId = extMatch ? publicIdWithExt.slice(0, -extMatch[0].length) : publicIdWithExt;
                signedUrl = cloudinary.url(publicId, {
                    sign_url: true,
                    type,
                    resource_type,
                    ...(format ? { format } : {}),
                    secure: true,
                });
            } else {
                signedUrl = cloudinary.utils.private_download_url(publicIdWithExt, '', { type, resource_type });
            }

            const response = await axios.get(signedUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
            });
            return {
                buffer: Buffer.from(response.data),
                contentType: response.headers['content-type'],
            };
        }
    }

    throw new Error(`Unable to download file from ${url}`);
}

/**
 * Migrates a single file URL to myDrive.
 */
async function transferFile(url, title, index = 0, existingType = null) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return null; // Already migrated or not a Cloudinary file
    }

    const { buffer, contentType } = await downloadFromCloudinary(url);
    
    // Determine extension and MIME type
    const urlClean = url.split('?')[0];
    const rawExt = urlClean.split('.').pop().toLowerCase();
    const hasKnownExt = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'webp'].includes(rawExt);
    
    let ext = hasKnownExt ? rawExt : 'pdf';
    let mimeType = existingType || contentType || MIME_MAP[ext] || 'application/pdf';
    if (mimeType.includes(';')) mimeType = mimeType.split(';')[0].trim();

    const safeTitle = (title || 'doc').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const filename = `${safeTitle}_p${index + 1}.${ext}`;

    const myDriveResult = await uploadBufferToMyDrive(
        buffer,
        mimeType,
        filename,
        'vertos_archive_documents',
        ['migrated', 'vertos']
    );

    return {
        secure_url: myDriveResult.secure_url,
        public_id: myDriveResult.public_id,
        bytes: myDriveResult.bytes || buffer.length,
        type: mimeType,
    };
}

async function runMigration() {
    console.log('====================================================');
    console.log('   Vertos Archive: Cloudinary -> myDrive Migration   ');
    console.log('====================================================\n');

    if (!process.env.MONGODB_URI) {
        console.error('ERROR: MONGODB_URI missing from environment.');
        process.exit(1);
    }
    if (!process.env.MEDIA_API_KEY || !process.env.MEDIA_API_SECRET) {
        console.error('ERROR: MEDIA_API_KEY or MEDIA_API_SECRET missing in .env');
        process.exit(1);
    }

    console.log(`Connecting to MongoDB Atlas...`);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to MongoDB successfully.\n`);

    // 1. Migrate Live Documents
    const liveDocs = await Document.find({
        $or: [
            { fileUrl: { $regex: 'res\\.cloudinary\\.com' } },
            { 'files.url': { $regex: 'res\\.cloudinary\\.com' } }
        ]
    });

    console.log(`Found ${liveDocs.length} live document(s) on Cloudinary.\n`);

    let liveSuccessCount = 0;
    let liveFailCount = 0;

    for (let i = 0; i < liveDocs.length; i++) {
        const doc = liveDocs[i];
        console.log(`[Live ${i + 1}/${liveDocs.length}] Migrating: "${doc.title}" (ID: ${doc._id})...`);

        try {
            let primaryResult = null;
            if (doc.fileUrl && doc.fileUrl.includes('res.cloudinary.com')) {
                primaryResult = await transferFile(doc.fileUrl, doc.title, 0, doc.fileType);
            }

            const updatedFiles = [];
            if (Array.isArray(doc.files) && doc.files.length > 0) {
                for (let j = 0; j < doc.files.length; j++) {
                    const f = doc.files[j];
                    if (f.url && f.url.includes('res.cloudinary.com')) {
                        const fileRes = await transferFile(f.url, doc.title, j, f.type);
                        updatedFiles.push({
                            url: fileRes.secure_url,
                            type: fileRes.type,
                            size: fileRes.bytes,
                            publicId: fileRes.public_id,
                        });
                    } else {
                        updatedFiles.push(f);
                    }
                }
            } else if (primaryResult) {
                updatedFiles.push({
                    url: primaryResult.secure_url,
                    type: primaryResult.type,
                    size: primaryResult.bytes,
                    publicId: primaryResult.public_id,
                });
            }

            if (primaryResult) {
                doc.fileUrl = primaryResult.secure_url;
                doc.publicId = primaryResult.public_id;
                doc.fileType = primaryResult.type;
            } else if (updatedFiles.length > 0) {
                doc.fileUrl = updatedFiles[0].url;
                doc.publicId = updatedFiles[0].publicId || null;
                doc.fileType = updatedFiles[0].type;
            }

            doc.files = updatedFiles;
            await doc.save();

            liveSuccessCount++;
            console.log(`  -> SUCCESS: Stored in myDrive: ${doc.fileUrl}\n`);
        } catch (err) {
            liveFailCount++;
            console.error(`  -> FAILED for doc "${doc.title}":`, err.message, '\n');
        }
    }

    // 2. Migrate Pending Documents (if any)
    const pendingDocs = await PendingDocument.find({
        $or: [
            { fileUrl: { $regex: 'res\\.cloudinary\\.com' } },
            { 'files.url': { $regex: 'res\\.cloudinary\\.com' } }
        ]
    });

    console.log(`Found ${pendingDocs.length} pending document(s) on Cloudinary.\n`);

    let pendingSuccessCount = 0;
    let pendingFailCount = 0;

    for (let i = 0; i < pendingDocs.length; i++) {
        const doc = pendingDocs[i];
        console.log(`[Pending ${i + 1}/${pendingDocs.length}] Migrating: "${doc.title}"...`);

        try {
            let primaryResult = null;
            if (doc.fileUrl && doc.fileUrl.includes('res.cloudinary.com')) {
                primaryResult = await transferFile(doc.fileUrl, doc.title, 0, doc.fileType);
            }

            const updatedFiles = [];
            if (Array.isArray(doc.files) && doc.files.length > 0) {
                for (let j = 0; j < doc.files.length; j++) {
                    const f = doc.files[j];
                    if (f.url && f.url.includes('res.cloudinary.com')) {
                        const fileRes = await transferFile(f.url, doc.title, j, f.type);
                        updatedFiles.push({
                            url: fileRes.secure_url,
                            type: fileRes.type,
                            size: fileRes.bytes,
                            publicId: fileRes.public_id,
                        });
                    } else {
                        updatedFiles.push(f);
                    }
                }
            } else if (primaryResult) {
                updatedFiles.push({
                    url: primaryResult.secure_url,
                    type: primaryResult.type,
                    size: primaryResult.bytes,
                    publicId: primaryResult.public_id,
                });
            }

            if (primaryResult) {
                doc.fileUrl = primaryResult.secure_url;
                doc.publicId = primaryResult.public_id;
                doc.fileType = primaryResult.type;
            } else if (updatedFiles.length > 0) {
                doc.fileUrl = updatedFiles[0].url;
                doc.publicId = updatedFiles[0].publicId || null;
                doc.fileType = updatedFiles[0].type;
            }

            doc.files = updatedFiles;
            await doc.save();

            pendingSuccessCount++;
            console.log(`  -> SUCCESS: Stored in myDrive: ${doc.fileUrl}\n`);
        } catch (err) {
            pendingFailCount++;
            console.error(`  -> FAILED for pending doc "${doc.title}":`, err.message, '\n');
        }
    }

    console.log('====================================================');
    console.log('                 Migration Summary                  ');
    console.log('====================================================');
    console.log(`Live Docs:    ${liveSuccessCount} succeeded, ${liveFailCount} failed.`);
    console.log(`Pending Docs: ${pendingSuccessCount} succeeded, ${pendingFailCount} failed.`);
    console.log('Done!');

    await mongoose.disconnect();
}

runMigration().catch(err => {
    console.error('Fatal migration error:', err);
    process.exit(1);
});

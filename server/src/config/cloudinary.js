const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log("✅ Cloudinary configured");

/**
 * Uploads a file buffer to Cloudinary.
 * Returns the upload result (includes secure_url, public_id, resource_type, etc.)
 *
 * @param {Buffer} buffer    - The file buffer.
 * @param {string} mimeType  - MIME type of the file.
 * @param {string} folder    - Cloudinary folder to upload into.
 * @returns {Promise<Object>} Cloudinary upload result.
 */
const uploadBufferToCloudinary = (buffer, mimeType, folder = 'vertos_archive_documents') => {
    return new Promise((resolve, reject) => {
        // Determine resource_type
        const isImage = mimeType && mimeType.startsWith('image/');
        const resourceType = isImage ? 'image' : 'raw';

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: resourceType,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        uploadStream.end(buffer);
    });
};

// ── Multer: use memory storage so we can access buffer before/after upload ──
const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp',
];

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file format. Allowed: pdf, doc, docx, ppt, pptx, jpg, png, webp.'));
    }
};

const upload = multer({
    storage: multer.memoryStorage(), // Keep file in memory so we can read the buffer
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
    fileFilter,
});

module.exports = { cloudinary, upload, uploadBufferToCloudinary };
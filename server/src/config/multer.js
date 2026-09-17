const multer = require('multer');

// ── Allowed MIME types for student academic uploads ──
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

// Use memoryStorage so file buffers are passed directly to myDrive and text extraction
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
    fileFilter,
});

module.exports = { upload };

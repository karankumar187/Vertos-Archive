const axios = require('axios');
const pdfParse = require('pdf-parse');
const officeParser = require('officeparser');
// Reuse the shared openai client (already configured with the correct API key)
const { openaiClient } = require('./openai.service');
// Cloudinary SDK — used to generate authenticated download URLs for raw files
const { cloudinary } = require('../config/cloudinary');

// MIME type → category map
const MIME_TYPES = {
    pdf: ['application/pdf'],
    office: [
        'application/msword',                                                            // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',       // .docx
        'application/vnd.ms-powerpoint',                                                 // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',     // .pptx
    ],
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

/**
 * Determine the file category from a MIME type string, or fall back to URL extension.
 */
const getFileCategory = (mimeTypeOrUrl) => {
    if (!mimeTypeOrUrl) return 'unknown';

    const lower = mimeTypeOrUrl.toLowerCase();

    if (MIME_TYPES.pdf.includes(lower)) return 'pdf';
    if (MIME_TYPES.office.includes(lower)) return 'office';
    if (MIME_TYPES.image.some(t => lower.includes(t.split('/')[1]) || lower === t)) return 'image';

    // Fallback: try to guess from URL extension
    const ext = lower.split('.').pop().split('?')[0];
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) return 'office';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image';

    return 'unknown';
};

/**
 * Downloads a file buffer from Cloudinary using a short-lived signed URL.
 * This works for ALL resource types (raw/PDF/Office AND images) because
 * Cloudinary restricts direct access to non-public resources.
 *
 * It parses the resource_type directly from the stored Cloudinary URL, so
 * the signed URL is always generated with the correct type.
 *
 * @param {string} fileUrl - The Cloudinary URL stored in our DB.
 * @returns {Promise<Buffer>} - The file as a Buffer.
 */
const downloadFileBuffer = async (fileUrl) => {
    try {
        // --- Parse resource_type and public_id from the Cloudinary URL ---
        // URL format: https://res.cloudinary.com/<cloud>/<resource_type>/upload/[v<version>/]<public_id>
        // e.g. https://res.cloudinary.com/demo/raw/upload/v123/folder/file.pdf
        //      https://res.cloudinary.com/demo/image/upload/v123/folder/photo.jpg

        const uploadIndex = fileUrl.indexOf('/upload/');
        if (uploadIndex === -1) throw new Error('URL does not appear to be a Cloudinary URL (missing /upload/)');

        // Extract the segment before /upload/ to find resource_type
        const beforeUpload = fileUrl.substring(0, uploadIndex); // e.g. ".../demo/raw"
        const urlSegments = beforeUpload.split('/');
        const resourceType = urlSegments[urlSegments.length - 1]; // "raw" | "image" | "video"

        // Extract everything after /upload/ — strip optional version prefix (v123456/)
        let publicIdWithExt = fileUrl.substring(uploadIndex + '/upload/'.length);
        publicIdWithExt = publicIdWithExt.replace(/^v\d+\//, '');

        console.log(`[Parser] Cloudinary resource_type: "${resourceType}", public_id: "${publicIdWithExt}"`);

        // --- Generate a signed download URL valid for 5 minutes ---
        const signedUrl = cloudinary.url(publicIdWithExt, {
            resource_type: resourceType || 'raw',
            type: 'upload',
            sign_url: true,
            expires_at: Math.floor(Date.now() / 1000) + 300, // 5 min
        });

        const response = await axios.get(signedUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
        });

        console.log(`[Parser] Downloaded ${response.data.byteLength} bytes via signed Cloudinary URL.`);
        return Buffer.from(response.data);

    } catch (err) {
        throw new Error(`Failed to download file from Cloudinary: ${err.message}`);
    }
};

/**
 * Uses GPT-4o-mini vision (via OpenAI) to OCR an image URL.
 */
const extractTextFromImage = async (imageUrl) => {
    const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Please extract and transcribe ALL readable text content from this image. Include headings, body text, tables, labels, and any other written content. Output only the extracted text, nothing else.',
                    },
                    {
                        type: 'image_url',
                        image_url: { url: imageUrl },
                    },
                ],
            },
        ],
    });
    return completion.choices[0].message.content || '';
};

/**
 * Downloads a file from a URL and extracts its text content.
 *
 * @param {string} fileUrl   - The Cloudinary URL of the file.
 * @param {string} mimeType  - The MIME type (e.g. 'image/jpeg', 'application/pdf').
 *                             Falls back to URL extension if not provided.
 * @returns {Promise<string>} - The extracted text.
 */
exports.extractTextFromUrl = async (fileUrl, mimeType) => {
    try {
        const category = getFileCategory(mimeType || fileUrl);
        console.log(`[Parser] File category detected: ${category} (from: "${mimeType || fileUrl}")`);

        let extractedText = '';

        if (category === 'pdf') {
            const buffer = await downloadFileBuffer(fileUrl);
            const pdfData = await pdfParse(buffer);
            extractedText = pdfData.text;
        }
        else if (category === 'office') {
            const buffer = await downloadFileBuffer(fileUrl);
            extractedText = await officeParser.parseOfficeAsync(buffer);
        }
        else if (category === 'image') {
            console.log(`[Parser] Running OCR via GPT-4o-mini Vision on image URL...`);
            extractedText = await extractTextFromImage(fileUrl);
            console.log(`[Parser] OCR complete. Extracted ${extractedText.length} characters.`);
        }
        else {
            throw new Error(`Unsupported file type: "${mimeType}". Cannot extract text.`);
        }

        // Clean text
        extractedText = extractedText
            .replace(/\u0000/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return extractedText;
    } catch (error) {
        console.error('Text extraction failed:', error.message);
        throw new Error(`Failed to extract text: ${error.message}`);
    }
};

/**
 * Extracts text directly from an in-memory buffer.
 * Used during upload (before Cloudinary storage) so we never need to re-download.
 *
 * @param {Buffer} buffer        - The file buffer.
 * @param {string} mimeType      - MIME type of the file.
 * @param {string} [cloudinaryUrl] - The Cloudinary URL (needed for image OCR via Vision API).
 * @returns {Promise<string>}    - The extracted text.
 */
exports.extractTextFromBuffer = async (buffer, mimeType, cloudinaryUrl = null) => {
    try {
        const category = getFileCategory(mimeType);
        console.log(`[Parser] Extracting from buffer, category: ${category} (${mimeType})`);

        let extractedText = '';

        if (category === 'pdf') {
            const pdfData = await pdfParse(buffer);
            extractedText = pdfData.text;
        }
        else if (category === 'office') {
            extractedText = await officeParser.parseOfficeAsync(buffer);
        }
        else if (category === 'image') {
            if (!cloudinaryUrl) {
                throw new Error('cloudinaryUrl is required for image OCR');
            }
            console.log(`[Parser] Running OCR via GPT-4o-mini Vision on image URL...`);
            extractedText = await extractTextFromImage(cloudinaryUrl);
            console.log(`[Parser] OCR complete. Extracted ${extractedText.length} characters.`);
        }
        else {
            throw new Error(`Unsupported file type: "${mimeType}". Cannot extract text.`);
        }

        extractedText = extractedText
            .replace(/\u0000/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return extractedText;
    } catch (error) {
        console.error('[Parser] Buffer extraction failed:', error.message);
        // Return empty string — pipeline will warn but won't crash
        return '';
    }
};

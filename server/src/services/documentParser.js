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
 */
const downloadFileBuffer = async (fileUrl) => {
    try {
        const uploadIndex = fileUrl.indexOf('/upload/');
        if (uploadIndex === -1) throw new Error('URL does not appear to be a Cloudinary URL (missing /upload/)');

        const beforeUpload = fileUrl.substring(0, uploadIndex);
        const urlSegments = beforeUpload.split('/');
        const resourceType = urlSegments[urlSegments.length - 1];

        let publicIdWithExt = fileUrl.substring(uploadIndex + '/upload/'.length);
        publicIdWithExt = publicIdWithExt.replace(/^v\d+\//, '');

        console.log(`[Parser] Cloudinary resource_type: "${resourceType}", public_id: "${publicIdWithExt}"`);

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
 * OCR a PDF buffer using GPT-4o-mini Vision by sending the PDF as base64 data.
 *
 * GPT-4o natively supports PDF documents — it will process pages and extract text.
 * For large PDFs (>20 pages), we cap at a reasonable token budget to avoid API errors.
 *
 * @param {Buffer} buffer      - The raw PDF file buffer.
 * @param {number} pageCount   - Estimated page count stored in DB.
 * @returns {Promise<string>}  - The full OCR-extracted text.
 */
const ocrPdfBufferWithVision = async (buffer, pageCount = 0) => {
    console.log(`[Parser] Uploading PDF buffer to Cloudinary for Image Conversion...`);
    
    // 1. Upload the PDF buffer to Cloudinary as an 'image' to enable page-by-page JPG conversion
    const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: 'image', folder: 'temp_ocr_processing' },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });

    const totalPages = uploadResult.pages || pageCount || 1;
    const maxPages = Math.min(totalPages, 15); // Cap to 15 pages to save OpenAI tokens
    console.log(`[Parser] Uploaded temporary PDF to Cloudinary. Extracted ${totalPages} pages. Waiting 3 seconds for images to generate...`);

    // 2. Construct image URLs for each page
    const baseUrlParts = uploadResult.secure_url.split('/upload/');
    const baseBeforeUpload = baseUrlParts[0] + '/upload/';
    // Replace extension at the very end of the URL
    const baseAfterUpload = baseUrlParts[1].replace(/\.pdf$/i, '.jpg');

    const firstPageUrl = `${baseBeforeUpload}pg_1/${baseAfterUpload}`;
    console.log(`[Parser] Uploaded temporary PDF to Cloudinary. Extracted ${totalPages} pages. Waiting for Cloudinary to generate images...`);

    // Actively ping the first page image to ensure Cloudinary has finished processing it
    // before we pass the URLs to OpenAI.
    let isReady = false;
    for (let attempts = 0; attempts < 6; attempts++) {
        try {
            await axios.head(firstPageUrl);
            isReady = true;
            break;
        } catch (err) {
            // Wait 2.5 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2500));
        }
    }

    if (!isReady) {
        console.warn(`[Parser] Warning: Cloudinary images may not be fully ready after 15s wait.`);
    }
    
    const imageContents = [];
    for (let i = 1; i <= maxPages; i++) {
        const pageUrl = `${baseBeforeUpload}pg_${i}/${baseAfterUpload}`;
        imageContents.push({
            type: 'image_url',
            image_url: {
                url: pageUrl,
                detail: 'high',
            },
        });
    }

    // 3. Send to GPT-4o-mini Vision
    const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'This is a scanned or handwritten academic document. Please carefully extract and transcribe ALL readable text from every page. Include all headings, body text, bullet points, tables, diagram labels, question numbers, MCQ options, and any other written content exactly as it appears. Go page by page. Output ONLY the raw extracted text — no commentary, no summaries, no explanations.',
                    },
                    ...imageContents,
                ],
            },
        ],
        max_tokens: 8000,
    });

    // 4. Cleanup: Delete the temporary PDF from Cloudinary
    await cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: 'image' }).catch(err => console.error("Failed to cleanup temp OCR PDF:", err));

    const text = completion.choices[0].message.content || '';
    console.log(`[Parser] Vision OCR complete. Extracted ${text.length} characters.`);
    return text;
};

/**
 * Re-downloads a document from Cloudinary and runs Vision OCR on it.
 * Used as a fallback by the pipeline when normal parsing yields zero chunks
 * (e.g. scanned PDFs, handwritten notes, image-only Office files).
 *
 * @param {string} fileUrl    - The Cloudinary URL of the file.
 * @param {string} mimeType   - The MIME type.
 * @param {number} pageCount  - Page count stored in the Document (used for logging).
 * @returns {Promise<string>} - OCR extracted text.
 */
exports.extractTextWithOcrFallback = async (fileUrl, mimeType, pageCount = 0) => {
    const category = getFileCategory(mimeType || fileUrl);
    console.log(`[Parser] OCR Fallback triggered for "${category}" file (${pageCount} pages).`);

    try {
        if (category === 'image') {
            // Images already go through Vision — re-run on Cloudinary URL
            console.log(`[Parser] Re-running image OCR via Vision API on URL...`);
            return await extractTextFromImage(fileUrl);
        }

        if (category === 'pdf' || category === 'office') {
            // Download the buffer and send to GPT Vision for OCR
            const buffer = await downloadFileBuffer(fileUrl);
            return await ocrPdfBufferWithVision(buffer, pageCount);
        }

        console.warn(`[Parser] OCR Fallback: unsupported file type "${category}" — cannot OCR.`);
        return '';
    } catch (err) {
        console.error(`[Parser] OCR Fallback failed:`, err.message);
        return '';
    }
};

/**
 * Downloads a file from a URL and extracts its text content.
 *
 * @param {string} fileUrl   - The Cloudinary URL of the file.
 * @param {string} mimeType  - The MIME type (e.g. 'image/jpeg', 'application/pdf').
 * @returns {Promise<string>} - The extracted text.
 */
exports.extractTextFromUrl = async (fileUrl, mimeType) => {
    try {
        const category = getFileCategory(mimeType || fileUrl);
        console.log(`[Parser] File category detected: ${category} (from: "${mimeType || fileUrl}")`);

        let extractedText = '';

        let ext = '';
        if (mimeType) {
            if (mimeType.includes('presentationml')) ext = 'pptx';
            else if (mimeType.includes('wordprocessingml')) ext = 'docx';
            else if (mimeType.includes('spreadsheetml')) ext = 'xlsx';
            else if (mimeType.includes('msword')) ext = 'doc';
        }
        if (!ext && fileUrl) {
            const extMatch = fileUrl.match(/\.([a-zA-Z0-9]+)(\?|$)/);
            if (extMatch) ext = extMatch[1];
        }

        if (category === 'pdf') {
            const buffer = await downloadFileBuffer(fileUrl);
            const pdfData = await pdfParse(buffer);
            extractedText = pdfData.text;
        }
        else if (category === 'office') {
            const buffer = await downloadFileBuffer(fileUrl);
            const parsed = await officeParser.parseOffice(buffer, ext ? { fileType: ext } : {});
            extractedText = parsed.toText();
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
            let ext = '';
            if (mimeType) {
                if (mimeType.includes('presentationml')) ext = 'pptx';
                else if (mimeType.includes('wordprocessingml')) ext = 'docx';
                else if (mimeType.includes('spreadsheetml')) ext = 'xlsx';
                else if (mimeType.includes('msword')) ext = 'doc';
            }
            const parsed = await officeParser.parseOffice(buffer, ext ? { fileType: ext } : {});
            extractedText = parsed.toText();
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

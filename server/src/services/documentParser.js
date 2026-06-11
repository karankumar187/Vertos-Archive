const axios = require('axios');
const pdfParse = require('pdf-parse');
const officeParser = require('officeparser');
// Reuse the shared openai client (already configured with the correct API key)
const { openaiClient } = require('./openai.service');

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
            const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            const pdfData = await pdfParse(buffer);
            extractedText = pdfData.text;
        }
        else if (category === 'office') {
            const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
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

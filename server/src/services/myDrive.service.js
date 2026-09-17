const axios = require('axios');

/**
 * Returns the normalized media base URL.
 * e.g., 'https://drive-edge-cache.karan9302451907.workers.dev/api/v1/media'
 */
const getMediaBaseUrl = () => {
    let url = (process.env.MEDIA_API_URL || 'http://137.23.42.121:5000/api/v1/media').trim();
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!url.endsWith('/media')) {
        url = `${url}/media`;
    }
    return url;
};

/**
 * Uploads a file buffer directly to myDrive Media API.
 *
 * @param {Buffer} buffer - File data buffer
 * @param {string} mimeType - MIME type of the file (e.g. 'application/pdf', 'image/jpeg')
 * @param {string} [filename='document.pdf'] - Original or generated file name
 * @param {string} [folder='vertos_archive_documents'] - Storage folder in myDrive
 * @param {string[]} [tags=['vertos', 'academic']] - Tags for searching/organizing in myDrive
 * @returns {Promise<Object>} Upload response containing secure_url, public_id, bytes, etc.
 */
const uploadBufferToMyDrive = async (
    buffer,
    mimeType = 'application/pdf',
    filename = 'document.pdf',
    folder = 'vertos_archive_documents',
    tags = ['vertos', 'academic']
) => {
    const apiKey = process.env.MEDIA_API_KEY;
    const apiSecret = process.env.MEDIA_API_SECRET;

    if (!apiKey || !apiSecret) {
        throw new Error('myDrive credentials missing: MEDIA_API_KEY and MEDIA_API_SECRET must be set in .env');
    }

    const baseUrl = getMediaBaseUrl();
    const uploadUrl = `${baseUrl}/upload`;

    // Build standard multipart FormData using native Blob and FormData (Node 18+)
    const blob = new Blob([buffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('folder', folder);
    if (tags && tags.length > 0) {
        formData.append('tags', Array.isArray(tags) ? tags.join(',') : tags);
    }

    console.log(`[myDrive] Uploading ${filename} (${(buffer.length / 1024).toFixed(1)} KB) to ${uploadUrl}...`);

    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret,
        },
        body: formData,
    });

    if (!response.ok) {
        let errBody = '';
        try {
            errBody = await response.text();
        } catch {
            // ignore
        }
        throw new Error(`myDrive upload failed with HTTP ${response.status}: ${errBody || response.statusText}`);
    }

    const data = await response.json();
    if (data.secure_url && data.secure_url.includes('137.23.42.121.nip.io')) {
        data.secure_url = data.secure_url.replace(/https?:\/\/137\.23\.42\.121\.nip\.io\/api\/v1\/media/, 'https://drive-edge-cache.karan9302451907.workers.dev/api/v1/media');
    }
    if (data.url && data.url.includes('137.23.42.121.nip.io')) {
        data.url = data.url.replace(/https?:\/\/137\.23\.42\.121\.nip\.io\/api\/v1\/media/, 'https://drive-edge-cache.karan9302451907.workers.dev/api/v1/media');
    }
    console.log(`[myDrive] Upload succeeded: ${data.public_id} -> ${data.secure_url}`);
    return data;
};

/**
 * Permanently deletes an asset from myDrive by public ID.
 *
 * @param {string} publicId - e.g. "vertos_archive_documents/document_abc123"
 * @returns {Promise<Object>}
 */
const deleteFromMyDrive = async (publicId) => {
    const apiKey = process.env.MEDIA_API_KEY;
    const apiSecret = process.env.MEDIA_API_SECRET;

    if (!apiKey || !apiSecret || !publicId) {
        return { skipped: true };
    }

    const baseUrl = getMediaBaseUrl();
    // Clean publicId if needed
    const cleanId = publicId.replace(/^\//, '');
    const deleteUrl = `${baseUrl}/${cleanId}`;

    console.log(`[myDrive] Deleting asset ${cleanId} from ${deleteUrl}...`);

    const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret,
        },
    });

    if (!response.ok) {
        console.warn(`[myDrive] Deletion warning for ${cleanId} (HTTP ${response.status})`);
        return { deleted: false, status: response.status };
    }

    const data = await response.json();
    console.log(`[myDrive] Deleted asset: ${cleanId}`);
    return data;
};

module.exports = {
    uploadBufferToMyDrive,
    deleteFromMyDrive,
    getMediaBaseUrl,
};

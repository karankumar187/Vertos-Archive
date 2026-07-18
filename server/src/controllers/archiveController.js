const Document = require('../models/Document');
const https = require('https');
const http = require('http');

exports.getArchive = async (req, res) => {
  try {
    const { courseCode, category } = req.query;
    
    // Filter by approved status to only show live resources
    let filter = { verified: true };
    
    if (courseCode) {
      // Use regex for loose matching just like in search
      filter.subject = new RegExp(`^${courseCode.replace(/\s+/g, '[-_\\\\s]*')}$`, 'i');
    }
    
    if (category) {
      filter.category = category;
    }

    const documents = await Document.find(filter)
      .populate('uploaderID', 'name avatar')
      .sort({ createdAt: -1 });
      
    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Error fetching archive documents:', error);
    res.status(500).json({ success: false, message: 'Server error fetching archive' });
  }
};

/**
 * Proxy-downloads a document by its DB _id, streaming the file from Cloudinary
 * and injecting a Content-Disposition header so the browser saves it with the doc title.
 * Supports optional ?fileIndex=N to download a specific page from multi-file documents.
 */
exports.downloadDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || !doc.fileUrl) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Determine which file to serve: use fileIndex if provided, otherwise default to fileUrl
    const fileIndex = req.query.fileIndex !== undefined ? parseInt(req.query.fileIndex) : -1;
    let fileUrl = doc.fileUrl;
    let fileType = doc.fileType || 'application/octet-stream';

    if (fileIndex >= 0 && doc.files && doc.files[fileIndex]) {
      fileUrl = doc.files[fileIndex].url;
      fileType = doc.files[fileIndex].type || fileType;
    }

    // Build a safe filename, include page number if multi-page
    const totalFiles = (doc.files && doc.files.length) || 1;
    const ext = fileType ? ('.' + fileType.split('/').pop().split('+')[0]) : '.pdf';
    const safeTitle = doc.title.replace(/[^a-z0-9\s\-_]/gi, '').trim() || 'document';
    const pageLabel = totalFiles > 1 && fileIndex >= 0 ? ` - Page ${fileIndex + 1}` : '';
    const filename = `${safeTitle}${pageLabel}${ext}`;

    // Set headers before streaming
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', fileType);

    // Helper to get authenticated URL for files (raw, image, video)
    const getSafeTargetUrl = (u) => {
        const match = u.match(/\/(raw|image|video)\/(upload|authenticated)\/(?:s--[a-zA-Z0-9_-]+--\/)?(?:v\d+\/)?(.+?)$/);
        if (match) {
            const cloudinary = require('../config/cloudinary').cloudinary;
            const resource_type = match[1];
            const type = match[2];
            const publicIdWithExt = match[3];

            // Only sign 'authenticated' delivery type resources
            // Public 'upload' type resources can be fetched directly
            if (type === 'authenticated') {
                if (resource_type === 'image' || resource_type === 'video') {
                    const extMatch = publicIdWithExt.match(/\.([a-z0-9]+)$/i);
                    const format = extMatch ? extMatch[1] : undefined;
                    const publicId = extMatch ? publicIdWithExt.slice(0, -extMatch[0].length) : publicIdWithExt;
                    return cloudinary.url(publicId, {
                        sign_url: true,
                        type,
                        resource_type,
                        ...(format ? { format } : {}),
                        secure: true,
                    });
                } else {
                    // raw authenticated: keep full public ID with extension
                    return cloudinary.utils.private_download_url(publicIdWithExt, '', { type, resource_type });
                }
            }
        }
        return u; // Use original URL for public resources
    };

    const safeUrl = new URL(getSafeTargetUrl(fileUrl)).href;

    // Stream the file from Cloudinary through the backend
    const protocol = safeUrl.startsWith('https') ? https : http;
    protocol.get(safeUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (fileStream) => {
      // Follow redirect if Cloudinary responds with 302
      if ([301, 302, 307, 308].includes(fileStream.statusCode) && fileStream.headers.location) {
          const redirectUrl = new URL(fileStream.headers.location, safeUrl).href;
          protocol.get(redirectUrl, (redirectStream) => {
              redirectStream.pipe(res);
          });
          fileStream.resume();
          return;
      }

      if (fileStream.statusCode !== 200) {
        console.error(`[Archive Download] Cloudinary returned ${fileStream.statusCode} for ${safeUrl}`);
        return res.status(502).json({ success: false, message: 'Failed to fetch file from storage' });
      }
      fileStream.pipe(res);
    }).on('error', (err) => {
      console.error('[Download] Error streaming file:', err);
      res.status(500).json({ success: false, message: 'Error streaming file' });
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Returns all file URLs and metadata for a document so the frontend can show a gallery.
 */
exports.getDocumentFiles = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).select('title fileUrl fileType files');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const allFiles = (doc.files && doc.files.length > 0)
      ? doc.files.map((f, i) => ({ index: i, url: f.url, type: f.type }))
      : [{ index: 0, url: doc.fileUrl, type: doc.fileType }];

    res.json({ success: true, title: doc.title, files: allFiles });
  } catch (error) {
    console.error('Error fetching document files:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

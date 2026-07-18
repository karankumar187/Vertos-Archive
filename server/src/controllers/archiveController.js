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
 */
exports.downloadDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || !doc.fileUrl) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Derive a safe filename from the doc title
    const ext = doc.fileType
      ? ('.' + doc.fileType.split('/').pop().split('+')[0]) // e.g. application/pdf -> .pdf
      : '.pdf';
    const safeTitle = doc.title.replace(/[^a-z0-9\s\-_]/gi, '').trim() || 'document';
    const filename = `${safeTitle}${ext}`;

    // Set headers before streaming
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', doc.fileType || 'application/octet-stream');

    // Stream the file from Cloudinary through the backend
    const fileUrl = doc.fileUrl;
    const protocol = fileUrl.startsWith('https') ? https : http;
    protocol.get(fileUrl, (fileStream) => {
      if (fileStream.statusCode !== 200) {
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

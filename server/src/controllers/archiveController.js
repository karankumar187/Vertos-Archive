const Document = require('../models/Document');

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

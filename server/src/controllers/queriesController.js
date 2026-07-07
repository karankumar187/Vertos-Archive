const Query = require('../models/Query');
const User = require('../models/User');
const Contributor = require('../models/Contributor');

exports.getAllQueries = async (req, res) => {
  try {
    const queries = await Query.find()
      .populate('author', 'name avatar')
      .populate('answers.author', 'name avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: queries });
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ success: false, message: 'Server error fetching queries' });
  }
};

exports.createQuery = async (req, res) => {
  try {
    const { title, description, tags } = req.body;
    const authorId = req.user.id;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    const newQuery = new Query({
      title,
      description,
      tags: tags || [],
      author: authorId
    });

    await newQuery.save();

    res.status(201).json({ success: true, data: newQuery });
  } catch (error) {
    console.error('Error creating query:', error);
    res.status(500).json({ success: false, message: 'Server error creating query' });
  }
};

exports.addAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const authorId = req.user.id;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Answer content is required' });
    }

    const query = await Query.findById(id);
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    query.answers.push({
      author: authorId,
      content
    });

    await query.save();

    // Reward 2 points for participating in a discussion
    let contributor = await Contributor.findOne({ userId: authorId });
    if (!contributor) {
      contributor = new Contributor({
        userId: authorId,
        points: 2
      });
    } else {
      contributor.points = (contributor.points || 0) + 2;
    }

    // Check for badges
    if (contributor.points >= 50 && !contributor.badges.includes('Top Contributor')) {
      contributor.badges.push('Top Contributor');
    }
    if (contributor.points >= 100 && !contributor.badges.includes('Elite Verto')) {
      contributor.badges.push('Elite Verto');
    }
    await contributor.save();

    // Populate the newly added answer's author before returning
    await query.populate('answers.author', 'name avatar');

    res.status(201).json({ success: true, data: query });
  } catch (error) {
    console.error('Error adding answer:', error);
    res.status(500).json({ success: false, message: 'Server error adding answer' });
  }
};

exports.deleteQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = await Query.findById(id);
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    // Verify authorship or admin
    if (query.author.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this query' });
    }

    await Query.findByIdAndDelete(id);
    res.json({ success: true, message: 'Query deleted successfully' });
  } catch (error) {
    console.error('Error deleting query:', error);
    res.status(500).json({ success: false, message: 'Server error deleting query' });
  }
};

exports.deleteAnswer = async (req, res) => {
  try {
    const { id, answerId } = req.params;
    const userId = req.user.id;

    const query = await Query.findById(id);
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    const answer = query.answers.id(answerId);
    if (!answer) {
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    if (answer.author.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this answer' });
    }

    query.answers.pull(answerId);
    await query.save();

    res.json({ success: true, message: 'Answer deleted successfully' });
  } catch (error) {
    console.error('Error deleting answer:', error);
    res.status(500).json({ success: false, message: 'Server error deleting answer' });
  }
};

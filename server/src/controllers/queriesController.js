const Query = require('../models/Query');
const User = require('../models/User');
const Contributor = require('../models/Contributor');

exports.getAllQueries = async (req, res) => {
  try {
    const queries = await Query.find()
      .populate('author', 'name avatar')
      .populate('answers.author', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    // Build a userId -> badges map from Contributor collection
    const allUserIds = new Set();
    queries.forEach(q => {
      if (q.author?._id) allUserIds.add(q.author._id.toString());
      q.answers?.forEach(a => { if (a.author?._id) allUserIds.add(a.author._id.toString()); });
    });

    const contributors = await Contributor.find({ userId: { $in: [...allUserIds] } }).select('userId badges').lean();
    const badgeMap = {};
    contributors.forEach(c => { badgeMap[c.userId.toString()] = c.badges || []; });

    // Attach badges to each author
    const enriched = queries.map(q => ({
      ...q,
      author: q.author ? { ...q.author, badges: badgeMap[q.author._id?.toString()] || [] } : q.author,
      answers: q.answers?.map(a => ({
        ...a,
        author: a.author ? { ...a.author, badges: badgeMap[a.author._id?.toString()] || [] } : a.author,
      }))
    }));

    res.json({ success: true, data: enriched });
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

    // Reward 2 points ONLY for the user's FIRST reply in this discussion
    try {
      const alreadyParticipated = query.answers.filter(
        a => a.author.toString() === authorId.toString()
      ).length > 1; // > 1 because we just pushed the new one above

      console.log(`[Points] User ${authorId} replied. Already participated: ${alreadyParticipated}. Total answers from user: ${query.answers.filter(a => a.author.toString() === authorId.toString()).length}`);

      if (!alreadyParticipated) {
        let contributor = await Contributor.findOne({ userId: authorId });
        console.log(`[Points] Contributor found: ${!!contributor}, current points: ${contributor?.points}`);

        if (!contributor) {
          contributor = new Contributor({ userId: authorId, points: 2, badges: [] });
        } else {
          contributor.points = (contributor.points || 0) + 2;
        }

        if (!contributor.badges) {
            contributor.badges = [];
        }

        // Award badges at thresholds
        if (contributor.points >= 50 && !contributor.badges.includes('Top Contributor')) {
          contributor.badges.push('Top Contributor');
        }
        if (contributor.points >= 100 && !contributor.badges.includes('Elite Verto')) {
          contributor.badges.push('Elite Verto');
        }
        await contributor.save();
        console.log(`[Points] Saved! New points: ${contributor.points}`);
      }
    } catch (pointsErr) {
      // Don't fail the whole request just because points failed
      console.error('[Points] Failed to award discussion points:', pointsErr);
    }

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

const Document = require('../models/Document');
const Suggestion = require('../models/Suggestion');

// @desc    Get homepage analytics and intelligence data
// @route   GET /api/analytics/homepage
// @access  Public or Private (can be public for dashboard)
exports.getHomepageData = async (req, res) => {
    try {
        // 1. Popular Subjects (Top 4 subjects by document count)
        const popularSubjectsAgg = await Document.aggregate([
            { $match: { verified: true } },
            { $group: { _id: "$subject", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 4 }
        ]);
        const popularSubjects = popularSubjectsAgg.map(item => item._id);

        // 2. Recent Uploads (Latest 5 verified docs)
        const recentUploads = await Document.find({ verified: true })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title category subject source createdAt')
            .lean();

        // 3. Suggested Questions (Extract from recent Suggestions)
        // Fetch recent 10 suggestions to pull questions from
        const recentSuggestions = await Suggestion.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
        
        let allQuestions = [];
        let allTopics = [];

        recentSuggestions.forEach(sug => {
            if (sug.questions) {
                // Split by newline and filter valid questions (typically start with - or number or end with ?)
                const qLines = sug.questions.split('\n')
                    .map(q => q.replace(/^[-*0-9.]+\s*/, '').trim())
                    .filter(q => q.length > 10 && q.endsWith('?'));
                allQuestions.push(...qLines);
            }
            if (sug.topics) {
                const tLines = sug.topics.split('\n')
                    .map(t => t.replace(/^[-*0-9.]+\s*/, '').trim())
                    .filter(t => t.length > 3 && !t.includes('Topics:'));
                allTopics.push(...tLines);
            }
        });

        // Shuffle and pick top 4-5 questions
        const shuffledQuestions = allQuestions.sort(() => 0.5 - Math.random());
        const suggestedQuestions = shuffledQuestions.slice(0, 5);

        // 4. Trending Searches (Use some topics + popular subjects)
        const shuffledTopics = allTopics.sort(() => 0.5 - Math.random());
        const trendingSearches = [...new Set([...popularSubjects, ...shuffledTopics.slice(0, 5)])].slice(0, 6);

        res.status(200).json({
            success: true,
            data: {
                popularSubjects,
                recentUploads,
                suggestedQuestions,
                trendingSearches
            }
        });

    } catch (error) {
        console.error('Homepage Analytics Error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching homepage data' });
    }
};

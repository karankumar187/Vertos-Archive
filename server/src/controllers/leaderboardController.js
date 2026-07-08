const Contributor = require('../models/Contributor');
const Document = require('../models/Document');
const User = require('../models/User');
const Query = require('../models/Query');

// @desc    Get leaderboard rankings and global stats
// @route   GET /api/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
    try {
        // 0. Fetch admin user IDs to exclude them from the leaderboard
        const adminUsers = await User.find({ role: 'admin' }).select('_id');
        const adminIds = adminUsers.map(u => u._id);

        const period = req.query.period || 'All Time';
        let dateFilter = {};
        if (period === 'This Week') {
            const date = new Date();
            date.setDate(date.getDate() - 7);
            dateFilter = { createdAt: { $gte: date } };
        } else if (period === 'This Month') {
            const date = new Date();
            date.setMonth(date.getMonth() - 1);
            dateFilter = { createdAt: { $gte: date } };
        }

        let topContributors = [];
        const participationMap = {};

        if (period === 'All Time') {
            topContributors = await Contributor.find({ userId: { $nin: adminIds } })
                .sort({ points: -1 })
                .limit(100)
                .populate('userId', 'name reg_no avatar authProvider')
                .lean();

            const queryParticipations = await Query.aggregate([
                { $unwind: "$answers" },
                { $group: { _id: { author: "$answers.author", queryId: "$_id" } } },
                { $group: { _id: "$_id.author", count: { $sum: 1 } } }
            ]);
            queryParticipations.forEach(q => {
                if (q._id) participationMap[q._id.toString()] = q.count;
            });
        } else {
            const docs = await Document.find({ verified: true, ...dateFilter }).select('uploadedBy');
            
            // For answers we need to match the embedded document createdAt, but for simplicity
            // we'll fetch all queries that have answers matching the date and then filter in memory
            const queries = await Query.find({ "answers.createdAt": dateFilter.createdAt }).select('answers');

            const pointsMap = {};
            const docsMap = {};
            
            docs.forEach(d => {
                if (!d.uploadedBy) return;
                const uid = d.uploadedBy.toString();
                pointsMap[uid] = (pointsMap[uid] || 0) + 10;
                docsMap[uid] = (docsMap[uid] || 0) + 1;
            });

            queries.forEach(q => {
                const authors = new Set();
                q.answers.forEach(a => {
                    if (a.createdAt >= dateFilter.createdAt.$gte && a.author) {
                        authors.add(a.author.toString());
                    }
                });
                authors.forEach(author => {
                    pointsMap[author] = (pointsMap[author] || 0) + 2;
                    participationMap[author] = (participationMap[author] || 0) + 1;
                });
            });

            const userIds = Object.keys(pointsMap).filter(id => !adminIds.some(aid => aid.toString() === id));
            const users = await User.find({ _id: { $in: userIds } }).select('name reg_no avatar authProvider').lean();
            
            topContributors = users.map(u => {
                const uid = u._id.toString();
                return {
                    _id: uid, // Use string as id here
                    userId: u,
                    points: pointsMap[uid],
                    approvedUploads: docsMap[uid] || 0,
                    badges: [],
                    trustScore: 0
                };
            }).sort((a, b) => b.points - a.points).slice(0, 100);
        }

        let rank = 1;
        const leaderboard = topContributors.map((c, index) => {
            let badge = null;
            if (index === 0) badge = "🥇";
            else if (index === 1) badge = "🥈";
            else if (index === 2) badge = "🥉";

            const name = c.userId?.name || "Unknown User";

            return {
                id: c._id,
                rank: rank++,
                name: name,
                regNo: c.userId?.reg_no || 'N/A',
                points: c.points || 0,
                docs: c.approvedUploads || 0,
                discussions: participationMap[c.userId?._id?.toString()] || 0,
                avatar: c.userId?.avatar || null,
                badges: c.badges || [],
                trustScore: c.trustScore || 0,
                userId: c.userId?._id
            };
        });

        // 3. Global Stats
        const totalDocsAgg = await Document.countDocuments({ verified: true });
        
        const totalPointsAgg = await Contributor.aggregate([
            { $group: { _id: null, total: { $sum: "$points" } } }
        ]);
        const totalPoints = totalPointsAgg.length > 0 ? totalPointsAgg[0].total : 0;

        // Count anyone who has points as a contributor
        const totalContributors = await Contributor.countDocuments({ points: { $gt: 0 } });

        // Count active contributors this month (users who uploaded recently or got points)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Approximation: count documents verified this month to get active users
        const activeUsersThisMonth = await Document.distinct('uploadedBy', { 
            verified: true, 
            createdAt: { $gte: startOfMonth } 
        });

        const stats = [
            { label: "Total Contributors", value: totalContributors.toString(), icon: "👥" },
            { label: "Documents Shared", value: totalDocsAgg.toLocaleString(), icon: "📚" },
            { label: "Points Awarded", value: totalPoints.toLocaleString(), icon: "⭐" },
            { label: "Active This Month", value: activeUsersThisMonth.length.toString(), icon: "🔥" },
        ];

        res.status(200).json({
            success: true,
            leaderboard,
            stats
        });

    } catch (error) {
        console.error('Leaderboard Error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching leaderboard data' });
    }
};

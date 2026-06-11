const Contributor = require('../models/Contributor');
const Document = require('../models/Document');
const User = require('../models/User');

// @desc    Get leaderboard rankings and global stats
// @route   GET /api/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
    try {
        // 0. Fetch admin user IDs to exclude them from the leaderboard
        const adminUsers = await User.find({ role: 'admin' }).select('_id');
        const adminIds = adminUsers.map(u => u._id);

        // 1. Fetch top 100 contributors sorted by points, excluding admins
        const topContributors = await Contributor.find({ userId: { $nin: adminIds } })
            .sort({ points: -1 })
            .limit(100)
            .populate('userId', 'name reg_no avatar authProvider')
            .lean();

        // 2. Format the response
        let rank = 1;
        const leaderboard = topContributors.map((c, index) => {
            // Assign badges to top 3 if they don't have them in db dynamically
            let badge = null;
            if (index === 0) badge = "🥇";
            else if (index === 1) badge = "🥈";
            else if (index === 2) badge = "🥉";

            const name = c.userId?.name || "Unknown User";
            const avatar = c.userId?.avatar || name.charAt(0).toUpperCase();

            return {
                id: c._id,
                rank: rank++,
                name: name,
                regNo: c.userId?.reg_no || 'N/A',
                points: c.points,
                docs: c.approvedUploads,
                avatar: avatar,
                badge: badge || (c.badges && c.badges.length > 0 ? c.badges[0] : null),
                trustScore: c.trustScore,
                userId: c.userId?._id
            };
        });

        // 3. Global Stats
        const totalDocsAgg = await Document.countDocuments({ verified: true });
        
        const totalPointsAgg = await Contributor.aggregate([
            { $group: { _id: null, total: { $sum: "$points" } } }
        ]);
        const totalPoints = totalPointsAgg.length > 0 ? totalPointsAgg[0].total : 0;

        const totalContributors = await Contributor.countDocuments({ approvedUploads: { $gt: 0 } });

        // Count active contributors this month (users who uploaded recently)
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

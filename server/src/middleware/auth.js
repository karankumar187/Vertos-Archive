const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
    let token;

    if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
    ) {
    token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
    return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
    });
    }

    try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Select only fields needed for auth — never load password hash into req.user
    req.user = await User.findById(decoded.id).select('_id name email preferences authProvider');

    if (!req.user) {
        return res.status(401).json({
        success: false,
        message: 'User not found'
        });
    }

    next();
    } catch (error) {
    return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
    });
    }
};



const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { JWT_SECRET, JWT_EXPIRE, CLIENT_URL } = require('../config/config');
const User = require('../models/User');

const router = express.Router();

// ─── Helpers ───────────────────────────────────────────────────────────────
const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });

// ─── Validation Middleware ──────────────────────────────────────────────────
const registerValidation = [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }),
    body('email').trim().notEmpty().isEmail().withMessage('Valid email required'),
    body('password').notEmpty().isLength({ min: 8 }).withMessage('Password min 8 chars'),
];

const loginValidation = [
    body('email').trim().notEmpty().isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
];

const passwordValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').notEmpty().isLength({ min: 8 }).withMessage('New password min 8 chars'),
];

// ─── Brute-Force Rate Limiting ────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // 10 requests per window
    message: 'Too many authentication attempts, please try again after 15 minutes'
});

// ─── Local Auth Routes ──────────────────────────────────────────────────────
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, passwordValidation, changePassword);

// ─── Public Stats ───────────────────────────────────────────────────────────
router.get('/user-count', async (req, res) => {
    try {
        const count = await User.countDocuments();
        res.json({ success: true, count });
    } catch (err) {
        res.json({ success: false, count: 0 });
    }
});

// ─── Google OAuth Routes ────────────────────────────────────────────────────

// Step 1: Redirect to Google
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Step 2: Google redirects back here
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=google_failed` }),
    (req, res) => {
        // Issue JWT and redirect to frontend with token
        const token = generateToken(req.user._id);
        res.redirect(`${CLIENT_URL}/auth/callback?token=${token}`);
    }
);

module.exports = router;
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { JWT_SECRET, JWT_EXPIRE } = require('../config/config');

// ─── Helper ───────────────────────────────────────────────────────────────
const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });

const userPayload = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    reg_no: user.reg_no,
    avatar: user.avatar,
    role: user.role,
    authProvider: user.authProvider,
    createdAt: user.createdAt,
});

// ─── Register ─────────────────────────────────────────────────────────────
// @route POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, email, password, reg_no } = req.body;

        if (await User.findOne({ email })) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        if (!reg_no) {
            return res.status(400).json({ success: false, message: 'Registration number is required' });
        }

        const user = await User.create({
            name,
            email,
            reg_no: Number(reg_no),
            password,
            authProvider: 'local',
        });

        const token = generateToken(user._id);

        // Welcome notification (non-blocking)
        Notification.create({
            user: user._id,
            title: 'Welcome to Vertos Archive!',
            message: `Hi ${name}! Start exploring notes, papers and resources. Happy learning!`,
            type: 'info',
        }).catch(err => console.error('Notification error:', err));

        res.status(201).json({ success: true, token, user: userPayload(user) });
    } catch (err) {
        console.error('Error in register:', err);
        next(err);
    }
};

// ─── Login ────────────────────────────────────────────────────────────────
// @route POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Google-only account trying to use password login
        if (user.authProvider === 'google' && !user.password) {
            return res.status(400).json({
                success: false,
                message: 'This account uses Google sign-in. Please login with Google.',
            });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        res.status(200).json({ success: true, token, user: userPayload(user) });
    } catch (err) {
        console.error('Error in login:', err);
        next(err);
    }
};

// ─── Get Me ───────────────────────────────────────────────────────────────
// @route GET /api/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, user: userPayload(user) });
    } catch (err) {
        next(err);
    }
};

// ─── Update Profile ───────────────────────────────────────────────────────
// @route PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { name, reg_no, avatar } = req.body;

        if (name) user.name = name.trim();
        if (reg_no) user.reg_no = Number(reg_no);
        if (avatar !== undefined) user.avatar = avatar;

        // Use { validateBeforeSave: false } so we don't trigger password validation
        // when only updating profile fields. Password hook only fires on isModified('password').
        await user.save();

        res.status(200).json({ success: true, user: userPayload(user) });
    } catch (err) {
        next(err);
    }
};

// ─── Change Password ──────────────────────────────────────────────────────
// @route PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('+password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.authProvider === 'google' && !user.password) {
            return res.status(400).json({
                success: false,
                message: 'Google-authenticated accounts cannot change password here.',
            });
        }

        const { currentPassword, newPassword } = req.body;

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        next(err);
    }
};

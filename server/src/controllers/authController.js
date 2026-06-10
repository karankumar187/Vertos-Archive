const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { JWT_SECRET, JWT_EXPIRE } = require('../config/config');

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRE
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, email, password } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            reg_no,
            password
        });

        // Generate token
        const token = generateToken(user._id);

        // Welcome notification
        try {
            await Notification.create({
                user: user._id,
                title: 'Welcome to Vertos-Archive',
                message: `Hi ${name}! Start yours searching for your desired notes and resources. Happy learning!`,
                type: 'info'
            });
        } catch (notifErr) {
            console.error('Failed to create welcome notification:', notifErr);
        }

        res.status(201).json({
            success: true,
            token
        });
    }
    catch(err){
        console.error('Error in register:', err);
        next(err);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check for user
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            token
        });
    }
    catch(err){
        console.error('Error in login:', err);
        next(err);
    }
};

//@desc   Get current user
//@route  GET /api/auth/me
//@access Private
exports.getMe = async (req, res, next) => {
    try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
        success: true,
        user: {
        id: user._id,
        name: user.name,
        reg_no: user.reg_no,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt
        }
    });
    } catch (error) {
    next(error);
    }
};

//@desc   Update user
//@route  PUT /api/auth/profile
//@access Private
exports.updateProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { name, email, reg_no } = req.body;

        if (name) user.name = name;
        if (email) user.email = email;
        if (reg_no) user.reg_no = reg_no;

        await user.save();

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                reg_no: user.reg_no,
                avatar: user.avatar,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
exports.changePassword = async (req, res, next) => {
    try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
        });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Password updated successfully'
    });
    } catch (error) {
    next(error);
    }
};

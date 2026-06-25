const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Invalid email address');
            }
        }
    },
    reg_no: {
        type: Number,
        unique: true,
        sparse: true, // allows multiple nulls (Google users without reg_no)
    },
    password: {
        type: String,
        minlength: 8,
        select: false, // never returned in queries by default
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student',
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local',
    },
    googleId: {
        type: String,
        sparse: true,
    },
    avatar: {
        type: String,
        default: '',
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Hash password before saving — only for local auth, only when modified
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) return;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare passwords (used in login)
userSchema.methods.matchPassword = async function (candidatePassword) {
    if (!this.password) {
        throw new Error('This account uses Google sign-in. No password set.');
    }
    return await bcrypt.compare(candidatePassword, this.password);
};

// Alias for backward compatibility
userSchema.methods.comparePassword = userSchema.methods.matchPassword;

module.exports = mongoose.model('User', userSchema);
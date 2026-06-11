const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const config = require('./config');

const isGoogleConfigured =
    config.GOOGLE_CLIENT_ID &&
    config.GOOGLE_CLIENT_ID !== 'your_google_client_id_here';

if (isGoogleConfigured) {
    passport.use(new GoogleStrategy({
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
        scope: ['profile', 'email'],
        proxy: true,
    },
async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        const avatar = profile.photos?.[0]?.value;
        const name = profile.displayName;

        // Check if user already exists by googleId
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            // Update avatar in case it changed
            if (avatar && user.avatar !== avatar) {
                user.avatar = avatar;
                await user.save();
            }
            return done(null, user);
        }

        // Check if user exists with same email (local account — link it)
        user = await User.findOne({ email });
        if (user) {
            user.googleId = profile.id;
            user.authProvider = 'google';
            if (avatar) user.avatar = avatar;
            await user.save();
            return done(null, user);
        }

        // Create new user from Google profile
        user = await User.create({
            name,
            email,
            googleId: profile.id,
            authProvider: 'google',
            avatar: avatar || '',
            isVerified: true, // Google accounts are pre-verified
        });

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
    }));
} else {
    console.warn('⚠️  Google OAuth not configured. Add GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET to .env to enable Google login.');
}

// Minimal session serialisation (only store user id)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;

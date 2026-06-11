const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const passport = require('./src/config/passport');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth');
const config = require('./src/config/config');

// Load environment variables
dotenv.config();

const { initQdrant } = require('./src/services/qdrant.service');

// Connect to Database
connectDB().then(() => {
    console.log('MongoDB Connected successfully...');
    return initQdrant(); // Initialize Vector DB
}).catch(err => {
    console.error('Database connection error:', err);
});

const app = express();

// CORS — allow any localhost port (Vite increments ports)
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
        if (origin === process.env.CLIENT_URL) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session (needed for Passport OAuth flow)
app.use(session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
        secure: config.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
    },
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

const uploadRoutes = require('./src/routes/upload');
const adminRoutes = require('./src/routes/admin');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/', (req, res) => {
    res.send('Vertos Archive API is running...');
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
    });
});

const PORT = config.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running in ${config.NODE_ENV || 'development'} mode on port ${PORT}`);
});
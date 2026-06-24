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

// CORS — allow localhost (dev) + deployed frontend (production)
const allowedOrigins = [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,  // any localhost port
];
if (process.env.CLIENT_URL) {
    allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // allow server-to-server / health checks
        const allowed = allowedOrigins.some(p =>
            typeof p === 'string' ? p === origin : p.test(origin)
        );
        if (allowed) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust Render's reverse proxy for secure cookies and HTTPS resolution
app.set('trust proxy', 1);

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
const chatRoutes = require('./src/routes/chat');
const analyticsRoutes = require('./src/routes/analytics');
const leaderboardRoutes = require('./src/routes/leaderboard');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// File proxy: fetches a Cloudinary file and streams it with correct headers for browser viewing
app.get('/api/file/view', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing url parameter');
    
    // Only allow Cloudinary URLs
    if (!url.startsWith('https://res.cloudinary.com/')) {
        return res.status(403).send('Forbidden: Only Cloudinary URLs are allowed');
    }
    
    try {
        const https = require('https');
        const urlObj = new URL(url);
        const ext = urlObj.pathname.split('.').pop().toLowerCase();
        
        const mimeMap = {
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ppt: 'application/vnd.ms-powerpoint',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp'
        };
        const contentType = mimeMap[ext] || 'application/octet-stream';
        const isInlineable = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext);
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', isInlineable ? `inline; filename="${urlObj.pathname.split('/').pop()}"` : `attachment; filename="${urlObj.pathname.split('/').pop()}"`);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        https.get(url, (fileRes) => {
            if (fileRes.statusCode !== 200) {
                res.status(fileRes.statusCode).send('Failed to fetch file from Cloudinary');
                return;
            }
            fileRes.pipe(res);
        }).on('error', (err) => {
            console.error('[FileProxy] Error:', err.message);
            res.status(500).send('Error fetching file');
        });
    } catch (err) {
        console.error('[FileProxy] Error:', err.message);
        res.status(500).send('Error fetching file');
    }
});

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
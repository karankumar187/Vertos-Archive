const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const passport = require('./src/config/passport');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth');
const config = require('./src/config/config');

// Load environment variables
dotenv.config();

// Production Guard: Ensure secrets exist
if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || !process.env.SESSION_SECRET) {
        console.error('FATAL ERROR: JWT_SECRET or SESSION_SECRET is not defined in production.');
        process.exit(1);
    }
}

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

// Set security HTTP headers
app.use(helmet());

// Global Rate Limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 100, // Limit each IP to 100 requests per `window`
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parsers (limit to 10kb to mitigate DoS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL query injection
// In Express 5, req.query is read-only, so the default mongoSanitize() crashes. We use .sanitize() to mutate properties in-place.
app.use((req, res, next) => {
    if (req.body) mongoSanitize.sanitize(req.body);
    if (req.query) mongoSanitize.sanitize(req.query);
    if (req.params) mongoSanitize.sanitize(req.params);
    next();
});

// Data sanitization against XSS
const sanitizeObject = (obj) => {
    for (let key in obj) {
        if (typeof obj[key] === 'string') {
            obj[key] = xss(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
};
app.use((req, res, next) => {
    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
    next();
});

// Prevent parameter pollution
// app.use(hpp()); // Disabled: Incompatible with Express 5 (attempts to overwrite read-only req.query)

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
        sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
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

// File proxy: fetches a Cloudinary file and streams it with correct headers for browser viewing/download
app.get('/api/file/view', async (req, res) => {
    const { url, download } = req.query;
    if (!url) return res.status(400).send('Missing url parameter');
    
    // Only allow Cloudinary URLs
    if (!url.startsWith('https://res.cloudinary.com/')) {
        return res.status(403).send('Forbidden: Only Cloudinary URLs are allowed');
    }
    
    try {
        const https = require('https');
        const urlObj = new URL(url);
        const filename = urlObj.pathname.split('/').pop() || 'document';
        const urlExt = filename.split('.').pop().toLowerCase();
        const ext = req.query.ext || urlExt;
        
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
        const forceDownload = download === '1';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', (forceDownload || !isInlineable) ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Helper to fetch with redirect following
        const fetchAndPipe = (targetUrl, redirectCount = 0, retryWithPdf = false) => {
            if (redirectCount > 5) {
                res.status(500).send('Too many redirects');
                return;
            }
            
            // Ensure the URL is properly encoded before sending to https.get
            const safeUrl = new URL(targetUrl).href;
            
            https.get(safeUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (fileRes) => {
                if ([301, 302, 307, 308].includes(fileRes.statusCode) && fileRes.headers.location) {
                    // Follow redirect (handle relative URLs too)
                    const redirectUrl = new URL(fileRes.headers.location, safeUrl).href;
                    fetchAndPipe(redirectUrl, redirectCount + 1, retryWithPdf);
                    fileRes.resume();
                    return;
                }
                
                if (fileRes.statusCode !== 200) {
                    // If Cloudinary 404s on a raw URL that lacks an extension, try appending the correct extension
                    // (This fixes files uploaded without extensions due to earlier Cloudinary config)
                    const targetExtStr = `.${ext}`;
                    if (fileRes.statusCode === 404 && !retryWithPdf && ext && !safeUrl.toLowerCase().endsWith(targetExtStr)) {
                        console.log(`[FileProxy] 404 for ${safeUrl}, retrying with ${targetExtStr}...`);
                        fileRes.resume();
                        return fetchAndPipe(targetUrl + targetExtStr, 0, true);
                    }

                    console.error(`[FileProxy] Cloudinary returned ${fileRes.statusCode} for: ${safeUrl}`);
                    res.setHeader('Content-Type', 'text/html');
                    res.status(502).send(`
                        <div style="font-family: sans-serif; padding: 40px; text-align: center; color: #333;">
                            <h2>Document Not Found (404)</h2>
                            <p>The original file could not be fetched from the server. It may have been deleted or the URL is invalid.</p>
                            <p style="color: #666; font-size: 0.8em; margin-top: 20px;">Upstream URL: ${safeUrl}</p>
                        </div>
                    `);
                    return;
                }
                
                // If it succeeds on retry with an extension, we should make sure we're still sending as inline document
                if (retryWithPdf) {
                    res.setHeader('Content-Type', contentType);
                    res.setHeader('Content-Disposition', forceDownload ? `attachment; filename="document.${ext}"` : `inline; filename="document.${ext}"`);
                }
                
                fileRes.pipe(res);
            }).on('error', (err) => {
                console.error('[FileProxy] Error:', err.message);
                if (!res.headersSent) res.status(500).send('Error fetching file');
            });
        };
        
        // Start fetch with the sanitized href
        fetchAndPipe(urlObj.href);
    } catch (err) {
        console.error('[FileProxy] Error:', err.message);
        if (!res.headersSent) res.status(500).send('Error fetching file');
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
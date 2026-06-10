const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth');
const config = require('./src/config/config');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB().then(() => {
    console.log('MongoDB Connected successfully...');
}).catch(err => {
    console.error('Database connection error:', err);
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Basic Route
app.get('/', (req, res) => {
    res.send('Vertos Archive API is running...');
});

const PORT = config.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${config.NODE_ENV || 'development'} mode on port ${PORT}`);
});
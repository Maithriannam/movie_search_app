const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initDb } = require('./database/db');
const { seedInitialMovies } = require('./controllers/movieController');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve API route test
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'CineVerse AI API is running' });
});

// Import routers
const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes.js');
const favoritesRoutes = require('./routes/favoritesRoutes.js');
const reviewRoutes = require('./routes/reviewRoutes');
const quizRoutes = require('./routes/quizRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  // If the error is a body‑parser JSON syntax error, respond with 400 Bad Request
  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
    console.error('❗️ JSON parse error:', err.message);
    return res.status(400).json({
      message: 'Invalid JSON payload',
      error: process.env.NODE_ENV === 'development' ? err.message : {},
    });
  }

  // Default fallback – log and hide details in production
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong on the server',
    error: process.env.NODE_ENV === 'development' ? err.message : {},
  });
});

// Initialize DB and Start Server
const startServer = async () => {
  try {
    // 1. Initialize Postgres database schemas
    await initDb();
    
    // 2. Start listening
    app.listen(PORT, () => {
      console.log(`CineVerse Express server is running on port ${PORT}`);
      
      // 3. Asynchronously trigger seeder in the background so it doesn't block server startup
      seedInitialMovies();
    });
  } catch (error) {
    console.error('Failed to initialize database. Server cannot start:', error);
    process.exit(1);
  }
};

startServer();

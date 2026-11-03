const db = require('../database/db');
const { getOrCacheMovie } = require('./movieController');

// @desc    Get all reviews for a movie
// @route   GET /api/reviews/:imdbId
// @access  Public
const getMovieReviews = async (req, res) => {
  const { imdbId } = req.params;

  try {
    const movieResult = await db.query('SELECT id FROM movies WHERE imdb_id = $1', [imdbId]);
    if (movieResult.rows.length === 0) {
      // Return empty array if movie is not registered yet (has no reviews)
      return res.json([]);
    }

    const movieId = movieResult.rows[0].id;

    const reviewsResult = await db.query(
      `SELECT r.id, r.rating, r.review, r.created_at, COALESCE(u.name, u.full_name, 'Anonymous') as user_name, u.avatar as user_avatar
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.movie_id = $1
       ORDER BY r.created_at DESC`,
      [movieId]
    );

    res.json(reviewsResult.rows);
  } catch (error) {
    console.error('Error fetching movie reviews:', error);
    res.status(500).json({ message: 'Server error fetching reviews' });
  }
};

// @desc    Add or update a user review for a movie
// @route   POST /api/reviews
// @access  Private
const createOrUpdateReview = async (req, res) => {
  const { imdbId, rating, review } = req.body;

  if (!imdbId || !rating || !review) {
    return res.status(400).json({ message: 'imdbId, rating, and review content are required' });
  }

  const numericRating = parseInt(rating);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 10) {
    return res.status(400).json({ message: 'Rating must be an integer between 1 and 10' });
  }

  try {
    // 1. Get or cache movie in local DB
    const movie = await getOrCacheMovie(imdbId);

    // 2. Upsert review
    const upsertResult = await db.query(
      `INSERT INTO reviews (user_id, movie_id, rating, review)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, movie_id)
       DO UPDATE SET rating = EXCLUDED.rating, review = EXCLUDED.review
       RETURNING *`,
      [req.user.id, movie.id, numericRating, review]
    );

    // Create user notification
    await db.query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
      [
        req.user.id,
        'Review Submitted',
        `You rated "${movie.title}" a ${numericRating}/10.`
      ]
    );

    res.json(upsertResult.rows[0]);
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Server error submitting review', error: error.message });
  }
};

module.exports = {
  getMovieReviews,
  createOrUpdateReview,
};

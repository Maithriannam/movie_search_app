const pool = require('../config/database');

const getReviews = async (req, res) => {
  try {
    const { movieId } = req.params;
    const dbMovie = await pool.query('SELECT id FROM movies WHERE tmdb_id = $1', [movieId]);
    if (dbMovie.rows.length === 0) return res.json([]);

    const result = await pool.query(
      `SELECT r.id, r.rating, r.review, r.created_at,
              u.id as user_id, u.name, u.avatar
       FROM reviews r
       INNER JOIN users u ON r.user_id = u.id
       WHERE r.movie_id = $1
       ORDER BY r.created_at DESC`,
      [dbMovie.rows[0].id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

const addReview = async (req, res) => {
  try {
    const { movieId, rating, review } = req.body;
    const dbMovie = await pool.query('SELECT id FROM movies WHERE tmdb_id = $1', [movieId]);
    if (dbMovie.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found in database' });
    }

    const result = await pool.query(
      'INSERT INTO reviews (user_id, movie_id, rating, review) VALUES ($1, $2, $3, $4) RETURNING id, rating, review, created_at',
      [req.user.id, dbMovie.rows[0].id, rating, review]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
};

module.exports = { getReviews, addReview };
const db = require('../database/db');
const { getOrCacheMovie } = require('./movieController');

// @desc    Get user's favorite movies
// @route   GET /api/favorites
// @access  Private
const getFavorites = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
         f.id as favorite_id,
         f.created_at as added_at,
         m.imdb_id,
         m.title,
         m.rating,
         m.release_date,
         m.runtime,
         m.genre,
         m.poster
       FROM favorites f
       JOIN movies m ON f.movie_id = m.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Server error fetching favorites' });
  }
};

// @desc    Add movie to favorites
// @route   POST /api/favorites
// @access  Private
const addFavorite = async (req, res) => {
  const { imdbId } = req.body;

  if (!imdbId) {
    return res.status(400).json({ message: 'imdbId is required' });
  }

  try {
    // 1. Get or cache movie in local DB
    const movie = await getOrCacheMovie(imdbId);

    // 2. Insert into favorites
    const result = await db.query(
      `INSERT INTO favorites (user_id, movie_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, movie_id)
       DO NOTHING
       RETURNING *`,
      [req.user.id, movie.id]
    );

    // 3. Create notification
    await db.query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
      [
        req.user.id,
        'Added to Favorites',
        `"${movie.title}" was added to your favorites.`
      ]
    );

    res.status(201).json(result.rows[0] || { message: 'Movie already in favorites' });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ message: 'Server error adding to favorites', error: error.message });
  }
};

// @desc    Remove movie from favorites
// @route   DELETE /api/favorites/:imdbId
// @access  Private
const removeFavorite = async (req, res) => {
  const { imdbId } = req.params;

  if (!imdbId) {
    return res.status(400).json({ message: 'imdbId is required' });
  }

  try {
    // 1. Find movie local ID
    const movieResult = await db.query('SELECT id, title FROM movies WHERE imdb_id = $1', [imdbId]);
    if (movieResult.rows.length === 0) {
      return res.status(404).json({ message: 'Movie not found in cached movies' });
    }

    const movie = movieResult.rows[0];

    // 2. Delete from favorites
    const deleteResult = await db.query(
      'DELETE FROM favorites WHERE user_id = $1 AND movie_id = $2 RETURNING *',
      [req.user.id, movie.id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Movie not found in your favorites' });
    }

    // 3. Create notification
    await db.query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
      [
        req.user.id,
        'Removed from Favorites',
        `"${movie.title}" was removed from your favorites.`
      ]
    );

    res.json({ message: 'Removed from favorites successfully', item: deleteResult.rows[0] });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ message: 'Server error removing from favorites' });
  }
};

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
};

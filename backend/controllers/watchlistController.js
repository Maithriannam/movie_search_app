const db = require('../database/db');
const { getOrCacheMovie } = require('./movieController');

// @desc    Get user's watchlist
// @route   GET /api/watchlist
// @access  Private
const getWatchlist = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
         w.id as watchlist_id,
         w.status,
         w.progress,
         w.created_at as added_at,
         m.imdb_id,
         m.title,
         m.rating,
         m.release_date,
         m.runtime,
         m.genre,
         m.poster
       FROM watchlist w
       JOIN movies m ON w.movie_id = m.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ message: 'Server error fetching watchlist' });
  }
};

// @desc    Add or update movie in watchlist
// @route   POST /api/watchlist
// @access  Private
const saveWatchlist = async (req, res) => {
  const { imdbId, status, progress } = req.body;

  if (!imdbId) {
    return res.status(400).json({ message: 'imdbId is required' });
  }

  const movieStatus = status || 'Planned';
  const movieProgress = progress !== undefined ? parseInt(progress, 10) : 0;

  try {
    // 1. Get or cache movie in local DB
    const movie = await getOrCacheMovie(imdbId);

    // 2. Upsert watchlist record
    const result = await db.query(
      `INSERT INTO watchlist (user_id, movie_id, status, progress)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, movie_id)
       DO UPDATE SET status = EXCLUDED.status, progress = EXCLUDED.progress
       RETURNING *`,
      [req.user.id, movie.id, movieStatus, movieProgress]
    );

    // 3. Create notification
    await db.query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
      [
        req.user.id,
        'Watchlist Updated',
        `"${movie.title}" has been updated to "${movieStatus}" with ${movieProgress}% progress.`
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving watchlist:', error);
    res.status(500).json({ message: 'Server error saving watchlist', error: error.message });
  }
};

// @desc    Remove movie from watchlist
// @route   DELETE /api/watchlist/:imdbId
// @access  Private
const removeWatchlist = async (req, res) => {
  const { imdbId } = req.params;

  if (!imdbId) {
    return res.status(400).json({ message: 'imdbId is required' });
  }

  try {
    // 1. Find the movie by imdbId to get its local movie ID
    const movieResult = await db.query('SELECT id, title FROM movies WHERE imdb_id = $1', [imdbId]);
    if (movieResult.rows.length === 0) {
      return res.status(404).json({ message: 'Movie not found in cached movies' });
    }

    const movie = movieResult.rows[0];

    // 2. Delete from watchlist
    const deleteResult = await db.query(
      'DELETE FROM watchlist WHERE user_id = $1 AND movie_id = $2 RETURNING *',
      [req.user.id, movie.id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Movie not found in your watchlist' });
    }

    // 3. Create notification
    await db.query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
      [
        req.user.id,
        'Removed from Watchlist',
        `"${movie.title}" was removed from your watchlist.`
      ]
    );

    res.json({ message: 'Removed from watchlist successfully', item: deleteResult.rows[0] });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ message: 'Server error removing from watchlist' });
  }
};

module.exports = {
  getWatchlist,
  saveWatchlist,
  removeWatchlist,
};

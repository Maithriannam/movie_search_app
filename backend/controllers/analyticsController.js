const db = require('../database/db');

const parseRuntimeMinutes = (runtime) => {
  const match = String(runtime || '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const splitGenres = (value) => String(value || '')
  .split(',')
  .map((genre) => genre.trim())
  .filter(Boolean);

// @desc    Get user analytics
// @route   GET /api/analytics
// @access  Private
const getAnalytics = async (req, res) => {
  try {
    const watchlist = await db.query(
      `SELECT w.status, w.progress, w.created_at, m.genre, m.runtime
       FROM watchlist w
       JOIN movies m ON w.movie_id = m.id
       WHERE w.user_id = $1`,
      [req.user.id]
    );

    const reviews = await db.query(
      'SELECT rating, created_at FROM reviews WHERE user_id = $1',
      [req.user.id]
    );

    const favorites = await db.query(
      `SELECT m.genre
       FROM favorites f
       JOIN movies m ON f.movie_id = m.id
       WHERE f.user_id = $1`,
      [req.user.id]
    );

    const genreCounts = {};
    [...watchlist.rows, ...favorites.rows].forEach((row) => {
      splitGenres(row.genre).forEach((genre) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });

    const monthCounts = {};
    watchlist.rows.forEach((row) => {
      const date = new Date(row.created_at);
      const label = Number.isNaN(date.getTime())
        ? 'Unknown'
        : date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      monthCounts[label] = (monthCounts[label] || 0) + 1;
    });

    const watchedMinutes = watchlist.rows.reduce((total, row) => {
      const minutes = parseRuntimeMinutes(row.runtime);
      if (row.status === 'Completed') {
        return total + minutes;
      }
      return total + Math.round(minutes * ((row.progress || 0) / 100));
    }, 0);

    const ratingValues = reviews.rows.map((row) => Number(row.rating)).filter(Boolean);
    const averageRating = ratingValues.length
      ? Number((ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length).toFixed(1))
      : 0;

    res.json({
      totals: {
        watchlist: watchlist.rows.length,
        completed: watchlist.rows.filter((row) => row.status === 'Completed').length,
        favorites: favorites.rows.length,
        reviews: reviews.rows.length,
        hoursWatched: Number((watchedMinutes / 60).toFixed(1)),
        averageRating,
      },
      favoriteGenres: Object.entries(genreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      moviesPerMonth: Object.entries(monthCounts).map(([month, count]) => ({ month, count })),
      ratingsGiven: ratingValues.map((rating, index) => ({
        label: `Review ${index + 1}`,
        rating,
      })),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
};

module.exports = {
  getAnalytics,
};

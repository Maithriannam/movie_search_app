const express = require('express');
const router = express.Router();
const {
  searchMovies,
  getMovieByTitle,
  getMovieById,
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  getRecentlyAddedMovies,
  getGenres,
  getLibraryMovies,
  getAiRecommendations,
  getSimilarMovies,
} = require('../controllers/movieController');
const { protect } = require('../middleware/authMiddleware');

router.get('/search', searchMovies);
router.get('/trending', getTrendingMovies);
router.get('/popular', getPopularMovies);
router.get('/top-rated', getTopRatedMovies);
router.get('/upcoming', getUpcomingMovies);
router.get('/recently-added', getRecentlyAddedMovies);
router.get('/genres', getGenres);
router.get('/library', getLibraryMovies);
router.get('/recommendations', protect, getAiRecommendations);
router.get('/title/:title', getMovieByTitle);
router.get('/:imdbId/similar', getSimilarMovies);
router.get('/:imdbId', getMovieById);

module.exports = router;

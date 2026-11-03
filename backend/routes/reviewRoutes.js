const express = require('express');
const router = express.Router();
const {
  getMovieReviews,
  createOrUpdateReview,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:imdbId', getMovieReviews);
router.post('/', protect, createOrUpdateReview);

module.exports = router;

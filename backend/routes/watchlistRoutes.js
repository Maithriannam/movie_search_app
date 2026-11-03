const express = require('express');
const router = express.Router();
const {
  getWatchlist,
  saveWatchlist,
  removeWatchlist,
} = require('../controllers/watchlistController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getWatchlist)
  .post(saveWatchlist);

router.route('/:imdbId')
  .delete(removeWatchlist);

module.exports = router;

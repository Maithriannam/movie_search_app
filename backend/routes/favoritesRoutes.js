const express = require('express');
const router = express.Router();
const {
  getFavorites,
  addFavorite,
  removeFavorite,
} = require('../controllers/favoritesController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getFavorites)
  .post(addFavorite);

router.route('/:imdbId')
  .delete(removeFavorite);

module.exports = router;

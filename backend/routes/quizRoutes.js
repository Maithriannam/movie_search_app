const express = require('express');
const router = express.Router();
const {
  submitQuizScore,
  getQuizLeaderboard,
  getQuizHistory,
} = require('../controllers/quizController');
const { protect } = require('../middleware/authMiddleware');

router.post('/score', protect, submitQuizScore);
router.get('/leaderboard', getQuizLeaderboard);
router.get('/history', protect, getQuizHistory);

module.exports = router;

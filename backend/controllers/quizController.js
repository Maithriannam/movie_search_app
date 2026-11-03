const db = require('../database/db');

// @desc    Submit user's quiz score
// @route   POST /api/quiz/score
// @access  Private
const submitQuizScore = async (req, res) => {
  const { score, category } = req.body;

  if (score === undefined || !category) {
    return res.status(400).json({ message: 'Score and category are required' });
  }

  try {
    // Save quiz score
    const result = await db.query(
      'INSERT INTO quiz_scores (user_id, score, category) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, score, category]
    );

    // Check if this is a personal best in this category
    const bestResult = await db.query(
      'SELECT MAX(score) as max_score FROM quiz_scores WHERE user_id = $1 AND category = $2',
      [req.user.id, category]
    );

    const isHighScore = result.rows[0].score >= (parseInt(bestResult.rows[0].max_score) || 0);

    if (isHighScore) {
      await db.query(
        'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
        [
          req.user.id,
          'New High Score',
          `You achieved a new personal best score of ${score} in the "${category}" category!`
        ]
      );
    }

    res.status(201).json({
      scoreRecord: result.rows[0],
      isHighScore
    });
  } catch (error) {
    console.error('Error submitting quiz score:', error);
    res.status(500).json({ message: 'Server error saving quiz score' });
  }
};

// @desc    Get global quiz leaderboard
// @route   GET /api/quiz/leaderboard
// @access  Public
const getQuizLeaderboard = async (req, res) => {
  try {
    // Select highest score per user and category, joined with user profile
    const result = await db.query(
      `SELECT DISTINCT ON (q.user_id, q.category) q.id, q.score, q.category, q.created_at, u.name as user_name, u.avatar as user_avatar
       FROM quiz_scores q
       JOIN users u ON q.user_id = u.id
       ORDER BY q.category, q.user_id, q.score DESC, q.created_at ASC`
    );

    // Sort leaderboard by score DESC
    const sorted = result.rows.sort((a, b) => b.score - a.score);

    res.json(sorted);
  } catch (error) {
    console.error('Error fetching quiz leaderboard:', error);
    res.status(500).json({ message: 'Server error fetching leaderboard' });
  }
};

// @desc    Get user's quiz history
// @route   GET /api/quiz/history
// @access  Private
const getQuizHistory = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM quiz_scores WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    res.status(500).json({ message: 'Server error fetching quiz history' });
  }
};

module.exports = {
  submitQuizScore,
  getQuizLeaderboard,
  getQuizHistory,
};

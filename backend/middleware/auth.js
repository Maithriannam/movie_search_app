const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await pool.query('SELECT id, name, email, avatar, theme, created_at FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    return res.status(500).json({ error: 'Authentication error.' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [decoded.id]);
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }
  } catch (error) {
    // Optional auth, so just continue
  }
  next();
};

module.exports = { authenticate, optionalAuth };
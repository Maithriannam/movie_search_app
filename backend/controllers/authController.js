const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretcineversekey12345!', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password' });
  }

  try {
    // Check if user exists
    const userExist = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Default avatar
    const defaultAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

    // Insert user
    const newUser = await db.query(
      'INSERT INTO users (name, email, password, avatar, favorite_genres) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, avatar, bio, favorite_genres, created_at',
      [name, email.toLowerCase(), hashedPassword, defaultAvatar, '']
    );

    const user = newUser.rows[0];

    // Create a first welcome notification
    await db.query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
      [user.id, 'Welcome to CineVerse AI', `Hey ${name}, thank you for joining CineVerse AI. Start searching for your favorite movies, adding them to your watchlist, or take our movie trivia quizzes.`]
    );

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      favorite_genres: user.favorite_genres,
      created_at: user.created_at,
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    // Check user
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Match password — support both new 'password' and legacy 'password_hash' columns
    const storedPassword = user.password || user.password_hash;
    if (!storedPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, storedPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      id: user.id,
      name: user.name || user.full_name,
      email: user.email,
      avatar: user.avatar || user.profile_image,
      bio: user.bio,
      favorite_genres: user.favorite_genres,
      created_at: user.created_at,
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, avatar, bio, favorite_genres, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  const { name, avatar, bio, favorite_genres } = req.body;

  try {
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    const updatedName = name || user.name;
    const updatedAvatar = avatar || user.avatar;
    const updatedBio = bio !== undefined ? bio : user.bio;
    const updatedGenres = favorite_genres !== undefined ? favorite_genres : user.favorite_genres;

    const updatedUserResult = await db.query(
      'UPDATE users SET name = $1, avatar = $2, bio = $3, favorite_genres = $4 WHERE id = $5 RETURNING id, name, email, avatar, bio, favorite_genres, created_at',
      [updatedName, updatedAvatar, updatedBio, updatedGenres, req.user.id]
    );

    res.json(updatedUserResult.rows[0]);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
};

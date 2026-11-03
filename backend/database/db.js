const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'users_db',
  password: process.env.DB_PASSWORD || 'Vaishu@12345',
  port: parseInt(process.env.DB_PORT || '5433'),
});

pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected error on database client', err);
});

const initDb = async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar TEXT,
        bio TEXT DEFAULT '',
        favorite_genres TEXT, -- Comma-separated list of genres (e.g. "Action, Drama")
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        imdb_id VARCHAR(20) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'movie',
        poster TEXT,
        rating DECIMAL(3,1),
        genre VARCHAR(255),
        release_date VARCHAR(50),
        runtime VARCHAR(50),
        actors TEXT,
        director VARCHAR(255),
        writer TEXT,
        plot TEXT,
        language VARCHAR(100),
        awards TEXT,
        box_office VARCHAR(100),
        imdb_votes VARCHAR(100),
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watchlist (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'Planned',
        progress INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
        rating INT CHECK (rating >= 1 AND rating <= 10),
        review TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_id)
    );

    CREATE TABLE IF NOT EXISTS quiz_scores (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        score INT NOT NULL,
        category VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS search_history (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_genres TEXT;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    ALTER TABLE movies ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'movie';
    ALTER TABLE movies ADD COLUMN IF NOT EXISTS writer TEXT;
    ALTER TABLE movies ADD COLUMN IF NOT EXISTS box_office VARCHAR(100);
    ALTER TABLE movies ADD COLUMN IF NOT EXISTS imdb_votes VARCHAR(100);
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS parent_review_id INT REFERENCES reviews(id) ON DELETE CASCADE;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0;

    CREATE INDEX IF NOT EXISTS idx_movies_imdb_id ON movies(imdb_id);
    CREATE INDEX IF NOT EXISTS idx_movies_genre ON movies(genre);
    CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_movie ON reviews(movie_id);
  `;

  try {
    await pool.query(schema);

    // ── Legacy column migration ──
    // If the users table was created with old column names (full_name, password_hash,
    // profile_image), rename them to the names the app code expects (name, password, avatar).
    // Each migration step is wrapped in its own try/catch so it silently skips if
    // the column has already been renamed (or never existed with the old name).
    const migrations = [
      // Copy data from legacy columns to new columns (if legacy columns exist)
      `UPDATE users SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL`,
      `UPDATE users SET password = password_hash WHERE password IS NULL AND password_hash IS NOT NULL`,
      `UPDATE users SET avatar = profile_image WHERE avatar IS NULL AND profile_image IS NOT NULL`,
      // Relax NOT NULL on full_name if it still exists
      `ALTER TABLE users ALTER COLUMN full_name DROP NOT NULL`,
    ];

    for (const sql of migrations) {
      try {
        await pool.query(sql);
      } catch (_) {
        // Column doesn't exist or already migrated — safe to ignore
      }
    }

    console.log('Database tables verified/created successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initDb,
};

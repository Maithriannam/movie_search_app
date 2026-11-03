const pool = require('../config/database');

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(500) DEFAULT '',
        favorite_genres TEXT[] DEFAULT '{}',
        theme VARCHAR(50) DEFAULT 'dark',
        notifications_enabled BOOLEAN DEFAULT true,
        language VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Movies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        tmdb_id INTEGER UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        poster VARCHAR(500) DEFAULT '',
        backdrop VARCHAR(500) DEFAULT '',
        rating DECIMAL(3,1) DEFAULT 0,
        genre VARCHAR(255) DEFAULT '',
        release_date VARCHAR(20) DEFAULT '',
        overview TEXT DEFAULT '',
        runtime INTEGER DEFAULT 0,
        language VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Watchlist table
    await client.query(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'planned',
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_id)
      )
    `);

    // Favorites table
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_id)
      )
    `);

    // Reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 10),
        review TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Quiz Scores table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER DEFAULT 0,
        category VARCHAR(100) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT DEFAULT '',
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Search History table
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        query VARCHAR(500) NOT NULL,
        type VARCHAR(50) DEFAULT 'movie',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('All database tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { createTables };
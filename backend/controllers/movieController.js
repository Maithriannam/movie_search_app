const axios = require('axios');
const db = require('../database/db');
require('dotenv').config();

const OMDB_API_KEY = process.env.OMDB_API_KEY || 'c6688f8e';
const OMDB_BASE_URL = 'https://www.omdbapi.com/';

const cleanValue = (value) => (value && value !== 'N/A' ? value : null);
const cleanPoster = (poster) => (poster && poster !== 'N/A' ? poster : null);

// Helper function to fetch movie details from OMDb and cache in Postgres
const getOrCacheMovie = async (imdbId) => {
  try {
    // Check if movie already cached
    const result = await db.query('SELECT * FROM movies WHERE imdb_id = $1', [imdbId]);
    if (result.rows.length > 0) {
      // Movie exists, increment view count
      const movie = result.rows[0];
      const updated = await db.query(
        'UPDATE movies SET views = views + 1 WHERE imdb_id = $1 RETURNING *',
        [imdbId]
      );
      return updated.rows[0];
    }

    // Movie doesn't exist, fetch from OMDb
    const response = await axios.get(OMDB_BASE_URL, {
      params: {
        apikey: OMDB_API_KEY,
        i: imdbId,
        plot: 'full',
      },
    });

    if (response.data.Response === 'False') {
      throw new Error(response.data.Error || 'Movie not found in OMDb');
    }

    const m = response.data;

    // Parse Rating (Convert "7.8/10" or "7.8" to decimal)
    let parsedRating = 0.0;
    if (m.imdbRating && m.imdbRating !== 'N/A') {
      parsedRating = parseFloat(m.imdbRating);
    }

    // Insert into DB
    const insertResult = await db.query(
      `INSERT INTO movies 
       (imdb_id, title, type, poster, rating, genre, release_date, runtime, actors, director, writer, plot, language, awards, box_office, imdb_votes, views) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 1) 
       RETURNING *`,
      [
        imdbId,
        m.Title || 'Unknown Title',
        cleanValue(m.Type) || 'movie',
        cleanPoster(m.Poster),
        parsedRating,
        cleanValue(m.Genre),
        cleanValue(m.Released) || cleanValue(m.Year),
        cleanValue(m.Runtime),
        cleanValue(m.Actors),
        cleanValue(m.Director),
        cleanValue(m.Writer),
        cleanValue(m.Plot),
        cleanValue(m.Language),
        cleanValue(m.Awards),
        cleanValue(m.BoxOffice),
        cleanValue(m.imdbVotes),
      ]
    );

    return insertResult.rows[0];
  } catch (error) {
    console.error(`Error caching movie ${imdbId}:`, error.message);
    throw error;
  }
};

// Seeder logic for popular movies
const seedInitialMovies = async () => {
  // Check if movies already exist
  try {
    const check = await db.query('SELECT count(*) FROM movies');
    const count = parseInt(check.rows[0].count);
    if (count > 0) {
      console.log(`Movies table already has ${count} records. Skipping seeder.`);
      return;
    }

    console.log('Seeding initial popular movies from OMDb...');
    const popularTitles = [
      'Inception', 'The Dark Knight', 'Interstellar', 'The Matrix', 'Gladiator',
      'The Prestige', 'Avatar', 'Fight Club', 'Pulp Fiction', 'The Avengers',
      'Django Unchained', 'Spider-Man: Into the Spider-Verse', 'Whiplash', 'Parasite',
      'Avengers: Endgame', 'The Dark Knight Rises', 'Titanic', 'The Wolf of Wall Street'
    ];

    for (const title of popularTitles) {
      try {
        // First search for the movie to get the imdbID
        const searchRes = await axios.get(OMDB_BASE_URL, {
          params: {
            apikey: OMDB_API_KEY,
            t: title,
          },
        });

        if (searchRes.data && searchRes.data.imdbID) {
          // Cache the movie details in database
          await getOrCacheMovie(searchRes.data.imdbID);
        }
      } catch (err) {
        console.error(`Failed to seed movie title: "${title}":`, err.message);
      }
    }
    console.log('Popular movies seeding completed successfully.');
  } catch (error) {
    console.error('Error in movie database seeder:', error);
  }
};

// @desc    Search movies using OMDb
// @route   GET /api/movies/search
// @access  Public
const searchMovies = async (req, res) => {
  const { query, page = 1 } = req.query;

  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const response = await axios.get(OMDB_BASE_URL, {
      params: {
        apikey: OMDB_API_KEY,
        s: query,
        page: page,
      },
    });

    if (response.data.Response === 'False') {
      return res.json({
        results: [],
        totalResults: 0,
        message: response.data.Error || 'No movies found',
      });
    }

    // Map keys to cleaner format
    const results = response.data.Search.map((item) => ({
      imdb_id: item.imdbID,
      title: item.Title,
      year: item.Year,
      type: item.Type,
      poster: cleanPoster(item.Poster),
    }));

    res.json({
      results,
      totalResults: parseInt(response.data.totalResults || '0'),
    });
  } catch (error) {
    console.error('Error searching movies:', error.message);
    res.status(500).json({ message: 'Error querying movie database' });
  }
};

// @desc    Get detailed movie by title
// @route   GET /api/movies/title/:title
// @access  Public
const getMovieByTitle = async (req, res) => {
  const { title } = req.params;

  if (!title) {
    return res.status(400).json({ message: 'Movie title is required' });
  }

  try {
    const response = await axios.get(OMDB_BASE_URL, {
      params: {
        apikey: OMDB_API_KEY,
        t: title,
        plot: 'full',
      },
    });

    if (response.data.Response === 'False' || !response.data.imdbID) {
      return res.status(404).json({ message: response.data.Error || 'Movie not found' });
    }

    const movie = await getOrCacheMovie(response.data.imdbID);
    res.json(movie);
  } catch (error) {
    console.error('Error fetching movie by title:', error.message);
    res.status(500).json({ message: 'Error fetching movie by title' });
  }
};

// @desc    Get detailed movie by IMDB ID
// @route   GET /api/movies/:imdbId
// @access  Public
const getMovieById = async (req, res) => {
  const { imdbId } = req.params;

  try {
    const movie = await getOrCacheMovie(imdbId);
    res.json(movie);
  } catch (error) {
    res.status(404).json({ message: 'Movie details not found', error: error.message });
  }
};

// @desc    Get trending movies (Most Viewed)
// @route   GET /api/movies/trending
// @access  Public
const getTrendingMovies = async (req, res) => {
  try {
    // Sort by views
    const result = await db.query(
      'SELECT * FROM movies ORDER BY views DESC, rating DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    res.status(500).json({ message: 'Server error fetching trending movies' });
  }
};

// @desc    Get popular movies
// @route   GET /api/movies/popular
// @access  Public
const getPopularMovies = async (req, res) => {
  try {
    // Sort by views/rating
    const result = await db.query(
      'SELECT * FROM movies ORDER BY rating DESC, views DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    res.status(500).json({ message: 'Server error fetching popular movies' });
  }
};

// @desc    Get top rated movies
// @route   GET /api/movies/top-rated
// @access  Public
const getTopRatedMovies = async (req, res) => {
  try {
    // Sort by average local review rating, falling back to cached rating
    const queryStr = `
      SELECT m.*, COALESCE(AVG(r.rating), m.rating) as current_rating 
      FROM movies m 
      LEFT JOIN reviews r ON m.id = r.movie_id 
      GROUP BY m.id 
      ORDER BY current_rating DESC, views DESC 
      LIMIT 10
    `;
    const result = await db.query(queryStr);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching top rated movies:', error);
    res.status(500).json({ message: 'Server error fetching top rated movies' });
  }
};

// @desc    Get upcoming/recently added movies
// @route   GET /api/movies/upcoming
// @access  Public
const getUpcomingMovies = async (req, res) => {
  try {
    // Sort by created_at DESC (movies recently registered in CineVerse AI)
    const result = await db.query(
      'SELECT * FROM movies ORDER BY created_at DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching upcoming/recent movies:', error);
    res.status(500).json({ message: 'Server error fetching upcoming movies' });
  }
};

const getRecentlyAddedMovies = getUpcomingMovies;

// @desc    Get genres discovered from cached OMDb records
// @route   GET /api/movies/genres
// @access  Public
const getGenres = async (req, res) => {
  try {
    const result = await db.query('SELECT genre FROM movies WHERE genre IS NOT NULL');
    const genres = [...new Set(
      result.rows
        .flatMap((row) => String(row.genre || '').split(','))
        .map((genre) => genre.trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    res.json(genres);
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ message: 'Server error fetching genres' });
  }
};

// @desc    Get cached movie library with optional filters
// @route   GET /api/movies/library
// @access  Public
const getLibraryMovies = async (req, res) => {
  const { genre, query, limit = 48 } = req.query;

  try {
    const clauses = [];
    const params = [];

    if (genre && genre !== 'All') {
      params.push(`%${genre}%`);
      clauses.push(`genre ILIKE $${params.length}`);
    }

    if (query) {
      params.push(`%${query}%`);
      clauses.push(`(title ILIKE $${params.length} OR actors ILIKE $${params.length} OR director ILIKE $${params.length})`);
    }

    const cappedLimit = Math.min(Math.max(parseInt(limit, 10) || 48, 1), 100);
    let sql = 'SELECT * FROM movies';
    if (clauses.length) {
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }
    sql += ` ORDER BY views DESC, rating DESC, created_at DESC LIMIT ${cappedLimit}`;

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching movie library:', error);
    res.status(500).json({ message: 'Server error fetching movie library' });
  }
};

// @desc    Get dynamic AI recommendations based on user favorites & genres
// @route   GET /api/movies/recommendations
// @access  Private
const getAiRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's profile to find favorite genres
    const profileRes = await db.query('SELECT favorite_genres FROM users WHERE id = $1', [userId]);
    const userGenresStr = profileRes.rows[0]?.favorite_genres || '';
    const userGenres = userGenresStr.split(',').map(g => g.trim().toLowerCase()).filter(g => g);

    // Get user's favorites & watchlist to exclude from recommendations
    const excludedRes = await db.query(
      `SELECT movie_id FROM favorites WHERE user_id = $1
       UNION
       SELECT movie_id FROM watchlist WHERE user_id = $1`,
      [userId]
    );
    const excludedIds = excludedRes.rows.map(r => r.movie_id);

    let recommendations = [];

    if (userGenres.length > 0) {
      // Build a query with ILIKE matching user favorite genres
      const conditions = userGenres.map((genre, index) => `genre ILIKE $${index + 1}`).join(' OR ');
      const params = userGenres.map((genre) => `%${genre}%`);

      let queryStr = `SELECT * FROM movies WHERE (${conditions})`;
      if (excludedIds.length > 0) {
        queryStr += ` AND id NOT IN (${excludedIds.map((_, i) => `$${params.length + i + 1}`).join(',')})`;
        params.push(...excludedIds);
      }
      queryStr += ` ORDER BY rating DESC, views DESC LIMIT 10`;

      const result = await db.query(queryStr, params);
      recommendations = result.rows;
    }

    // If we have less than 6 recommendations, pad them with popular movies the user hasn't seen/favorited yet
    if (recommendations.length < 6) {
      let queryStr = `SELECT * FROM movies`;
      const params = [];
      if (excludedIds.length > 0) {
        queryStr += ` WHERE id NOT IN (${excludedIds.map((_, i) => `$${i + 1}`).join(',')})`;
        params.push(...excludedIds);
      }
      queryStr += ` ORDER BY rating DESC, views DESC LIMIT ${10 - recommendations.length}`;

      const padResult = await db.query(queryStr, params);
      
      // Merge list, avoiding duplicates
      const recIds = new Set(recommendations.map(m => m.id));
      for (const m of padResult.rows) {
        if (!recIds.has(m.id)) {
          recommendations.push(m);
        }
      }
    }

    // Divide recommendations into creative sections: "Recommended For You", "Hidden Gems", "Weekend Movies"
    const length = recommendations.length;
    res.json({
      recommendedForYou: recommendations.slice(0, Math.ceil(length * 0.4)),
      hiddenGems: recommendations.slice(Math.ceil(length * 0.4), Math.ceil(length * 0.7)),
      weekendMovies: recommendations.slice(Math.ceil(length * 0.7))
    });
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    res.status(500).json({ message: 'Server error generating recommendations' });
  }
};

// @desc    Get similar movies by genre overlap
// @route   GET /api/movies/:imdbId/similar
// @access  Public
const getSimilarMovies = async (req, res) => {
  const { imdbId } = req.params;

  try {
    // 1. Get the source movie
    const source = await db.query('SELECT * FROM movies WHERE imdb_id = $1', [imdbId]);
    if (source.rows.length === 0) {
      return res.status(404).json({ message: 'Source movie not found' });
    }

    const movie = source.rows[0];
    const genres = String(movie.genre || '')
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);

    if (genres.length === 0) {
      return res.json([]);
    }

    // 2. Find movies sharing at least one genre, excluding the source
    const conditions = genres.map((_, i) => `genre ILIKE $${i + 1}`).join(' OR ');
    const params = genres.map((g) => `%${g}%`);
    params.push(imdbId);

    const result = await db.query(
      `SELECT * FROM movies WHERE (${conditions}) AND imdb_id != $${params.length} ORDER BY rating DESC, views DESC LIMIT 12`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching similar movies:', error);
    res.status(500).json({ message: 'Server error fetching similar movies' });
  }
};

module.exports = {
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
  getOrCacheMovie,
  seedInitialMovies,
};

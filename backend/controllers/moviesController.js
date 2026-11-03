const pool = require('../config/database');
const tmdb = require('../utils/tmdb');

const getTrending = async (req, res) => {
  try {
    const timeWindow = req.query.timeWindow || 'week';
    const movies = await tmdb.getTrending(timeWindow);
    res.json(movies);
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ error: 'Failed to fetch trending movies' });
  }
};

const getPopular = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await tmdb.getPopular(page);
    res.json(data);
  } catch (error) {
    console.error('Popular error:', error);
    res.status(500).json({ error: 'Failed to fetch popular movies' });
  }
};

const getTopRated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await tmdb.getTopRated(page);
    res.json(data);
  } catch (error) {
    console.error('Top rated error:', error);
    res.status(500).json({ error: 'Failed to fetch top rated movies' });
  }
};

const getUpcoming = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await tmdb.getUpcoming(page);
    res.json(data);
  } catch (error) {
    console.error('Upcoming error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming movies' });
  }
};

const getMovieDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await tmdb.getMovieDetails(id);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Save to DB if not exists
    await pool.query(
      `INSERT INTO movies (tmdb_id, title, poster, backdrop, rating, genre, release_date, overview, runtime, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (tmdb_id) DO UPDATE SET
         title = EXCLUDED.title,
         poster = EXCLUDED.poster,
         backdrop = EXCLUDED.backdrop,
         rating = EXCLUDED.rating,
         genre = EXCLUDED.genre,
         release_date = EXCLUDED.release_date,
         overview = EXCLUDED.overview,
         runtime = EXCLUDED.runtime,
         language = EXCLUDED.language`,
      [movie.tmdb_id, movie.title, movie.poster, movie.backdrop, movie.rating, movie.genre, movie.release_date, movie.overview, movie.runtime, movie.language]
    );

    // Check user's watchlist/favorites if authenticated
    if (req.user) {
      const dbMovie = await pool.query('SELECT id FROM movies WHERE tmdb_id = $1', [id]);
      if (dbMovie.rows.length > 0) {
        const movieId = dbMovie.rows[0].id;
        const [watchlistRes, favRes] = await Promise.all([
          pool.query('SELECT id, status, progress FROM watchlist WHERE user_id = $1 AND movie_id = $2', [req.user.id, movieId]),
          pool.query('SELECT id FROM favorites WHERE user_id = $1 AND movie_id = $2', [req.user.id, movieId]),
        ]);
        movie.inWatchlist = watchlistRes.rows.length > 0;
        movie.watchlistStatus = watchlistRes.rows[0]?.status || null;
        movie.watchlistProgress = watchlistRes.rows[0]?.progress || 0;
        movie.watchlistEntryId = watchlistRes.rows[0]?.id || null;
        movie.isFavorite = favRes.rows.length > 0;
        movie.favoriteEntryId = favRes.rows[0]?.id || null;
      }
    }

    res.json(movie);
  } catch (error) {
    console.error('Movie details error:', error);
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
};

const searchMovies = async (req, res) => {
  try {
    const { query, page } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const data = await tmdb.searchMulti(query, parseInt(page) || 1);

    // Save search history if authenticated
    if (req.user) {
      await pool.query(
        'INSERT INTO search_history (user_id, query, type) VALUES ($1, $2, $3)',
        [req.user.id, query, 'movie']
      );
    }

    res.json(data);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search movies' });
  }
};

const discoverMovies = async (req, res) => {
  try {
    const params = {};
    if (req.query.genre) params.with_genres = req.query.genre;
    if (req.query.year) params.primary_release_year = req.query.year;
    if (req.query.language) params.with_original_language = req.query.language;
    if (req.query.rating) params['vote_average.gte'] = req.query.rating;
    if (req.query.sortBy) params.sort_by = req.query.sortBy;
    params.page = parseInt(req.query.page) || 1;

    const data = await tmdb.discoverMovies(params);
    res.json(data);
  } catch (error) {
    console.error('Discover error:', error);
    res.status(500).json({ error: 'Failed to discover movies' });
  }
};

const getGenres = async (req, res) => {
  try {
    const genres = await tmdb.getGenres();
    res.json(genres);
  } catch (error) {
    console.error('Genres error:', error);
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
};

const getMoviesByGenre = async (req, res) => {
  try {
    const { genreId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const data = await tmdb.getMoviesByGenre(genreId, page);
    res.json(data);
  } catch (error) {
    console.error('Genre movies error:', error);
    res.status(500).json({ error: 'Failed to fetch movies by genre' });
  }
};

const getTrailer = async (req, res) => {
  try {
    const { id } = req.params;
    const trailerUrl = await tmdb.getMovieTrailer(id);
    res.json({ trailerUrl });
  } catch (error) {
    console.error('Trailer error:', error);
    res.status(500).json({ error: 'Failed to fetch trailer' });
  }
};

const getRecommendations = async (req, res) => {
  try {
    if (!req.user) {
      // Return trending if not logged in
      const trending = await tmdb.getTrending('week');
      return res.json({ recommended: trending, hiddenGems: [], weekendMovies: [], similarContent: [] });
    }

    const userResult = await pool.query('SELECT favorite_genres FROM users WHERE id = $1', [req.user.id]);
    const favoriteGenres = userResult.rows[0]?.favorite_genres || [];

    // Get recommendations from watchlist and favorites
    const favMovies = await pool.query(
      `SELECT m.tmdb_id FROM movies m 
       INNER JOIN favorites f ON m.id = f.movie_id 
       WHERE f.user_id = $1 
       UNION 
       SELECT m.tmdb_id FROM movies m 
       INNER JOIN watchlist w ON m.id = w.movie_id 
       WHERE w.user_id = $1`,
      [req.user.id]
    );

    // Get recommendations from TMDB based on favorites
    let recommended = [];
    let hiddenGems = [];
    let weekendMovies = [];
    let similarContent = [];

    if (favMovies.rows.length > 0) {
      const randomFav = favMovies.rows[Math.floor(Math.random() * favMovies.rows.length)];
      const details = await tmdb.getMovieDetails(randomFav.tmdb_id);
      recommended = details.recommendations.slice(0, 10);
      similarContent = details.similar.slice(0, 10);
    }

    // Get some trending for weekend movies
    const trending = await tmdb.getTrending('week');
    weekendMovies = trending.slice(0, 10);

    // Hidden gems - top rated but less popular
    const topRated = await tmdb.getTopRated(3);
    hiddenGems = topRated.movies.filter(m => m.rating >= 8).slice(0, 10);

    res.json({ recommended, hiddenGems, weekendMovies, similarContent });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
};

module.exports = {
  getTrending,
  getPopular,
  getTopRated,
  getUpcoming,
  getMovieDetails,
  searchMovies,
  discoverMovies,
  getGenres,
  getMoviesByGenre,
  getTrailer,
  getRecommendations,
};
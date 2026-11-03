const axios = require('axios');

const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

const tmdbClient = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
    language: 'en-US',
  },
});

const fetchFromTMDB = async (endpoint, params = {}) => {
  try {
    const response = await tmdbClient.get(endpoint, { params });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error(`TMDB API Error [${endpoint}]:`, error.response?.data || error.message);
    throw new Error(`TMDB API request failed: ${error.response?.status || error.message}`);
  }
};

const transformMovieData = (movie) => ({
  tmdb_id: movie.id,
  title: movie.title || movie.name,
  poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
  backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : '',
  rating: movie.vote_average || 0,
  genre: (movie.genres ? movie.genres.map(g => g.name) : movie.genre_ids || []).join(', '),
  release_date: movie.release_date || movie.first_air_date || '',
  overview: movie.overview || '',
  runtime: movie.runtime || 0,
  language: movie.original_language || 'en',
});

const getTrending = async (timeWindow = 'week') => {
  const data = await fetchFromTMDB(`/trending/movie/${timeWindow}`);
  return data?.results?.map(transformMovieData) || [];
};

const getPopular = async (page = 1) => {
  const data = await fetchFromTMDB('/movie/popular', { page });
  return {
    movies: data?.results?.map(transformMovieData) || [],
    totalPages: data?.total_pages || 1,
    currentPage: page,
  };
};

const getTopRated = async (page = 1) => {
  const data = await fetchFromTMDB('/movie/top_rated', { page });
  return {
    movies: data?.results?.map(transformMovieData) || [],
    totalPages: data?.total_pages || 1,
    currentPage: page,
  };
};

const getUpcoming = async (page = 1) => {
  const data = await fetchFromTMDB('/movie/upcoming', { page });
  return {
    movies: data?.results?.map(transformMovieData) || [],
    totalPages: data?.total_pages || 1,
    currentPage: page,
  };
};

const getMovieDetails = async (movieId) => {
  const movie = await fetchFromTMDB(`/movie/${movieId}`, { append_to_response: 'videos,credits,similar,recommendations' });
  if (!movie) return null;
  return {
    ...transformMovieData(movie),
    videos: movie.videos?.results?.slice(0, 5) || [],
    cast: movie.credits?.cast?.slice(0, 20).map(actor => ({
      id: actor.id,
      name: actor.name,
      character: actor.character,
      profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w200${actor.profile_path}` : '',
    })) || [],
    similar: movie.similar?.results?.slice(0, 10).map(transformMovieData) || [],
    recommendations: movie.recommendations?.results?.slice(0, 10).map(transformMovieData) || [],
  };
};

const searchMulti = async (query, page = 1) => {
  const data = await fetchFromTMDB('/search/multi', { query, page });
  return {
    results: data?.results?.filter(r => r.media_type === 'movie' || r.media_type === 'tv' || r.media_type === 'person').map(r => ({
      ...(r.media_type === 'person' ? {
        tmdb_id: r.id,
        name: r.name,
        poster: r.profile_path ? `https://image.tmdb.org/t/p/w200${r.profile_path}` : '',
        known_for: r.known_for?.map(m => m.title || m.name) || [],
        type: 'person',
      } : transformMovieData(r)),
      media_type: r.media_type,
    })) || [],
    totalPages: data?.total_pages || 1,
  };
};

const discoverMovies = async (params = {}) => {
  const data = await fetchFromTMDB('/discover/movie', params);
  return {
    movies: data?.results?.map(transformMovieData) || [],
    totalPages: data?.total_pages || 1,
  };
};

const getGenres = async () => {
  const data = await fetchFromTMDB('/genre/movie/list');
  return data?.genres || [];
};

const getMoviesByGenre = async (genreId, page = 1) => {
  return discoverMovies({ with_genres: genreId, page });
};

const getMovieTrailer = async (movieId) => {
  const movie = await fetchFromTMDB(`/movie/${movieId}`, { append_to_response: 'videos' });
  const trailer = movie?.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  return trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;
};

module.exports = {
  getTrending,
  getPopular,
  getTopRated,
  getUpcoming,
  getMovieDetails,
  searchMulti,
  discoverMovies,
  getGenres,
  getMoviesByGenre,
  getMovieTrailer,
  transformMovieData,
};
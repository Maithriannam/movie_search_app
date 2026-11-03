import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('cineverse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const unwrap = (request) => request.then((response) => response.data);

export const api = {
  register: (payload) => unwrap(client.post('/auth/register', payload)),
  login: (payload) => unwrap(client.post('/auth/login', payload)),
  profile: () => unwrap(client.get('/auth/profile')),
  updateProfile: (payload) => unwrap(client.put('/auth/profile', payload)),

  searchMovies: (query, page = 1) => unwrap(client.get('/movies/search', { params: { query, page } })),
  movieDetails: (imdbId) => unwrap(client.get(`/movies/${imdbId}`)),
  movieByTitle: (title) => unwrap(client.get(`/movies/title/${encodeURIComponent(title)}`)),
  trending: () => unwrap(client.get('/movies/trending')),
  popular: () => unwrap(client.get('/movies/popular')),
  topRated: () => unwrap(client.get('/movies/top-rated')),
  recentlyAdded: () => unwrap(client.get('/movies/recently-added')),
  genres: () => unwrap(client.get('/movies/genres')),
  library: (params = {}) => unwrap(client.get('/movies/library', { params })),
  recommendations: () => unwrap(client.get('/movies/recommendations')),
  similarMovies: (imdbId) => unwrap(client.get(`/movies/${imdbId}/similar`)),

  watchlist: () => unwrap(client.get('/watchlist')),
  saveWatchlist: (payload) => unwrap(client.post('/watchlist', payload)),
  removeWatchlist: (imdbId) => unwrap(client.delete(`/watchlist/${imdbId}`)),

  favorites: () => unwrap(client.get('/favorites')),
  addFavorite: (payload) => unwrap(client.post('/favorites', payload)),
  removeFavorite: (imdbId) => unwrap(client.delete(`/favorites/${imdbId}`)),

  reviews: (imdbId) => unwrap(client.get(`/reviews/${imdbId}`)),
  saveReview: (payload) => unwrap(client.post('/reviews', payload)),

  analytics: () => unwrap(client.get('/analytics')),
  notifications: () => unwrap(client.get('/notifications')),
  readNotification: (id) => unwrap(client.patch(`/notifications/${id}/read`)),

  submitQuizScore: (payload) => unwrap(client.post('/quiz/score', payload)),
  leaderboard: () => unwrap(client.get('/quiz/leaderboard')),
  quizHistory: () => unwrap(client.get('/quiz/history')),
};

export const getApiError = (error) => (
  error?.response?.data?.message || error?.message || 'Something went wrong'
);

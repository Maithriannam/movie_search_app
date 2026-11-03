import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  NavLink,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Clapperboard,
  Compass,
  Film,
  Flame,
  Heart,
  Home,
  LogOut,
  Menu,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  User,
  X,
  Clock,
  Trophy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import { api, getApiError } from './api';

/* ─── Motion helpers ─── */
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
};

/* ─── Chart colors ─── */
const CHART_COLORS = ['#ff003c', '#e50914', '#ff4d6d', '#fb7185', '#fbbf24', '#2dd4bf', '#818cf8', '#a78bfa'];

/* ─── Navigation items ─── */
const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/trending', label: 'Trending', icon: Flame },
  { to: '/genres', label: 'Genres', icon: Clapperboard },
  { to: '/watchlist', label: 'Watchlist', icon: Bookmark },
  { to: '/favorites', label: 'Favorites', icon: Heart },
  { to: '/recommendations', label: 'AI Recommendations', icon: Sparkles },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/* ─── Data helpers ─── */
const getMovieId = (movie) => movie?.imdb_id || movie?.imdbID;
const getTitle = (movie) => movie?.title || movie?.Title || 'Untitled';
const getRating = (movie) => Number(movie?.current_rating || movie?.rating || movie?.imdbRating || 0);
const getYear = (movie) => {
  const value = movie?.year || movie?.Year || movie?.release_date || movie?.Released || '';
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : 'Unknown';
};
const getPoster = (movie) => movie?.poster || movie?.Poster || null;
const getGenres = (movie) => String(movie?.genre || movie?.Genre || '')
  .split(',')
  .map((genre) => genre.trim())
  .filter(Boolean);

/* ═══════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════ */
function App() {
  const [token, setToken] = useState(() => localStorage.getItem('cineverse_token'));
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('cineverse_theme') || 'dark');

  // Apply theme immediately on mount (before first render completes)
  if (typeof document !== 'undefined') {
    document.body.dataset.theme = theme;
  }
  const location = useLocation();

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(window.__cineverseToast);
    window.__cineverseToast = window.setTimeout(() => setToast(''), 3200);
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('cineverse_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    api.profile()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('cineverse_token');
        setToken(null);
        setUser(null);
      });
  }, [token]);

  const handleAuth = async (mode, payload) => {
    const result = mode === 'register'
      ? await api.register(payload)
      : await api.login(payload);
    localStorage.setItem('cineverse_token', result.token);
    setToken(result.token);
    setUser(result);
    notify(`Welcome ${result.name}`);
  };

  const logout = () => {
    localStorage.removeItem('cineverse_token');
    setToken(null);
    setUser(null);
    notify('Signed out');
  };

  const requireUser = () => {
    if (!token) {
      notify('Sign in to save movies and access your library');
      return false;
    }
    return true;
  };

  const addToWatchlist = async (imdbId, status = 'Planned', progress = 0) => {
    if (!requireUser()) return;
    await api.saveWatchlist({ imdbId, status, progress });
    notify('Watchlist updated');
  };

  const addFavorite = async (imdbId) => {
    if (!requireUser()) return;
    await api.addFavorite({ imdbId });
    notify('Favorite saved');
  };

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="main-panel">
        <Topbar
          user={user}
          token={token}
          onLogout={logout}
          onMenu={() => setMenuOpen(true)}
        />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Dashboard onFavorite={addFavorite} onWatchlist={addToWatchlist} />} />
            <Route path="/discover" element={<Discover onFavorite={addFavorite} onWatchlist={addToWatchlist} />} />
            <Route path="/trending" element={<TrendingPage onFavorite={addFavorite} onWatchlist={addToWatchlist} />} />
            <Route path="/genres" element={<GenresPage onFavorite={addFavorite} onWatchlist={addToWatchlist} />} />
            <Route path="/movie/:imdbId" element={<MovieDetails token={token} notify={notify} onFavorite={addFavorite} onWatchlist={addToWatchlist} />} />
            <Route path="/watchlist" element={<RequireAuth token={token}><WatchlistPage notify={notify} /></RequireAuth>} />
            <Route path="/favorites" element={<RequireAuth token={token}><FavoritesPage notify={notify} /></RequireAuth>} />
            <Route path="/recommendations" element={<RequireAuth token={token}><RecommendationsPage onFavorite={addFavorite} onWatchlist={addToWatchlist} /></RequireAuth>} />

            <Route path="/profile" element={<RequireAuth token={token}><ProfilePage user={user} setUser={setUser} notify={notify} /></RequireAuth>} />
            <Route path="/settings" element={<SettingsPage theme={theme} setTheme={setTheme} token={token} />} />
          </Routes>
        </AnimatePresence>
      </main>
      <AnimatePresence>
        {toast ? (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════ */
function Sidebar({ open, onClose }) {
  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Film size={22} /></div>
          <div>
            <strong>CineVerse AI</strong>
            <span>Discover Your Next Obsession</span>
          </div>
          <button className="icon-btn sidebar-close" type="button" onClick={onClose} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} onClick={onClose} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
      {open ? <button className="scrim" type="button" aria-label="Close navigation" onClick={onClose} /> : null}
    </>
  );
}

/* ═══════════════════════════════════════════
   TOPBAR
   ═══════════════════════════════════════════ */
function Topbar({ user, token, onLogout, onMenu }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const submit = (event) => {
    event.preventDefault();
    if (query.trim()) {
      navigate(`/discover?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="topbar">
      <button className="icon-btn mobile-menu" type="button" onClick={onMenu} aria-label="Open navigation">
        <Menu size={20} />
      </button>
      <form className="global-search" onSubmit={submit}>
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search movies, actors, directors..."
        />
      </form>
      <div className="topbar-actions">
        {token ? (
          <>
            <Link className="icon-btn" to="/settings" aria-label="Notifications">
              <Bell size={18} />
            </Link>
            <Link className="user-pill" to="/profile">
              {user?.avatar ? <img src={user.avatar} alt="" /> : <User size={18} />}
              <span>{user?.name || 'Profile'}</span>
            </Link>
            <button className="icon-btn" type="button" onClick={onLogout} aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <Link className="btn btn-primary" to="/profile">Sign In</Link>
        )}
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════
   REQUIRE AUTH WRAPPER
   ═══════════════════════════════════════════ */
function RequireAuth({ token, children }) {
  if (!token) {
    return (
      <motion.section className="page auth-page" {...fadeUp}>
        <div className="section-heading">
          <span className="eyebrow">Private Space</span>
          <h1>Sign in to continue</h1>
          <p>Your watchlist, favorites, analytics, profile, and recommendations are stored securely in PostgreSQL.</p>
        </div>
        <AuthPanel />
      </motion.section>
    );
  }
  return children;
}

/* ═══════════════════════════════════════════
   AUTH PANEL
   ═══════════════════════════════════════════ */
function AuthPanel() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (mode === 'register' && form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      const result = mode === 'register'
        ? await api.register({ name: form.name, email: form.email, password: form.password })
        : await api.login({ email: form.email, password: form.password });
      localStorage.setItem('cineverse_token', result.token);
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form className="auth-card" onSubmit={submit} {...scaleIn}>
      <div className="segmented">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
        <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
      </div>
      {mode === 'register' ? (
        <label>
          <span>Full Name</span>
          <input value={form.name} onChange={(event) => update('name', event.target.value)} required />
        </label>
      ) : null}
      <label>
        <span>Email</span>
        <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required />
      </label>
      <label>
        <span>Password</span>
        <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} required />
      </label>
      {mode === 'register' ? (
        <label>
          <span>Confirm Password</span>
          <input type="password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} required />
        </label>
      ) : (
        <label className="check-row">
          <input type="checkbox" />
          <span>Remember Me</span>
        </label>
      )}
      {error ? <p className="form-error">{error}</p> : null}
      <button className="btn btn-primary full" type="submit" disabled={loading}>
        {loading ? 'Working...' : mode === 'register' ? 'Create Account' : 'Login'}
      </button>
    </motion.form>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD (HOME)
   ═══════════════════════════════════════════ */
function Dashboard({ onFavorite, onWatchlist }) {
  const [state, setState] = useState({ loading: true, popular: [], trending: [], topRated: [], recent: [] });

  useEffect(() => {
    Promise.all([api.popular(), api.trending(), api.topRated(), api.recentlyAdded()])
      .then(([popular, trending, topRated, recent]) => setState({ loading: false, popular, trending, topRated, recent }))
      .catch(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  const hero = state.popular[0] || state.trending[0] || state.topRated[0];

  if (state.loading) return <SkeletonPage title="Loading CineVerse" />;

  return (
    <motion.section className="page" {...fadeUp}>
      {hero ? <Hero movie={hero} onFavorite={onFavorite} onWatchlist={onWatchlist} /> : <EmptyState title="No cached movies yet" body="Search OMDb to start filling your discovery library." />}
      <MovieRail title="🔥 Trending Now" movies={state.trending} onFavorite={onFavorite} onWatchlist={onWatchlist} />
      <MovieRail title="⭐ Popular Picks" movies={state.popular} onFavorite={onFavorite} onWatchlist={onWatchlist} />
      <MovieRail title="🏆 Top Rated" movies={state.topRated} onFavorite={onFavorite} onWatchlist={onWatchlist} />
      <MovieRail title="🕐 Recently Added" movies={state.recent} onFavorite={onFavorite} onWatchlist={onWatchlist} />
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════ */
function Hero({ movie, onFavorite, onWatchlist }) {
  const poster = getPoster(movie);
  const id = getMovieId(movie);
  return (
    <motion.section
      className="hero"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="hero-copy">
        <span className="eyebrow">Featured Movie</span>
        <h1>{getTitle(movie)}</h1>
        <div className="meta-row">
          <span><Star size={14} /> {getRating(movie).toFixed(1)}</span>
          <span>{getYear(movie)}</span>
          {movie.runtime ? <span><Clock size={14} /> {movie.runtime}</span> : null}
          {getGenres(movie).slice(0, 2).map((genre) => <span key={genre}>{genre}</span>)}
        </div>
        <p>{movie.plot || 'Explore details, reviews, watchlist actions, and recommendations powered by live OMDb metadata.'}</p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to={`/movie/${id}`}><Play size={18} /> View Details</Link>
          <button className="btn" type="button" onClick={() => onWatchlist(id)}><Bookmark size={18} /> Watchlist</button>
          <button className="btn" type="button" onClick={() => onFavorite(id)}><Heart size={18} /> Favorite</button>
        </div>
      </div>
      <motion.div
        className="hero-poster"
        whileHover={{ scale: 1.04, rotate: -1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        {poster ? <img src={poster} alt={`${getTitle(movie)} poster`} /> : <PosterPlaceholder title={getTitle(movie)} />}
      </motion.div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   DISCOVER (SEARCH)
   ═══════════════════════════════════════════ */
function Discover({ onFavorite, onWatchlist }) {
  const params = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(params.get('q') || 'matrix');
  const [debounced, setDebounced] = useState(query);
  const [movies, setMovies] = useState([]);
  const [genres, setGenresState] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.genres().then(setGenresState).catch(() => setGenresState([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 450);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (selectedGenre !== 'All') {
      setLoading(true);
      setMessage('');
      api.library({ genre: selectedGenre })
        .then(setMovies)
        .catch((err) => setMessage(getApiError(err)))
        .finally(() => setLoading(false));
      return;
    }

    if (!debounced.trim()) return;
    setLoading(true);
    setMessage('');
    api.searchMovies(debounced.trim())
      .then((data) => {
        setMovies(data.results || []);
        setMessage(data.message || '');
      })
      .catch((err) => setMessage(getApiError(err)))
      .finally(() => setLoading(false));
  }, [debounced, selectedGenre]);

  return (
    <motion.section className="page" {...fadeUp}>
      <PageTitle eyebrow="Live OMDb Search" title="Discover movies, shows & more" body="Search requests go through Express → OMDb API. User actions persist in PostgreSQL." />
      <div className="search-panel">
        <Search size={20} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Inception, Dune, Batman, Parasite..." />
        <SlidersHorizontal size={20} />
      </div>
      <ChipRow chips={['All', ...genres.slice(0, 12)]} active={selectedGenre} onChange={setSelectedGenre} />
      {loading ? <CardGridSkeleton /> : null}
      {!loading && message ? <EmptyState title={message} body="Try another title or actor name." /> : null}
      {!loading ? <MovieGrid movies={movies} onFavorite={onFavorite} onWatchlist={onWatchlist} /> : null}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   TRENDING PAGE
   ═══════════════════════════════════════════ */
function TrendingPage({ onFavorite, onWatchlist }) {
  const [sections, setSections] = useState(null);

  useEffect(() => {
    Promise.all([api.trending(), api.popular(), api.topRated(), api.recentlyAdded()])
      .then(([today, worldwide, topRated, discussed]) => {
        setSections([
          ['🔥 Trending Today', today],
          ['🌍 Popular Worldwide', worldwide],
          ['💎 Box Office Hits', topRated],
          ['💬 Most Discussed', discussed],
        ]);
      })
      .catch(() => setSections([]));
  }, []);

  if (!sections) return <SkeletonPage title="Calculating trends" />;

  return (
    <motion.section className="page" {...fadeUp}>
      <PageTitle eyebrow="PostgreSQL Aggregates" title="Trending & popular movies" body="Lists are calculated from cached movies, views, ratings, favorites, reviews, and watchlist activity." />
      {sections.map(([title, movies]) => <MovieRail key={title} title={title} movies={movies} onFavorite={onFavorite} onWatchlist={onWatchlist} />)}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   GENRES PAGE
   ═══════════════════════════════════════════ */
function GenresPage({ onFavorite, onWatchlist }) {
  const [genres, setGenresState] = useState([]);
  const [active, setActive] = useState('All');
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    Promise.all([api.genres(), api.library()])
      .then(([genreList, library]) => {
        setGenresState(genreList);
        setMovies(library);
      })
      .catch(() => {
        setGenresState([]);
        setMovies([]);
      });
  }, []);

  const filtered = active === 'All'
    ? movies
    : movies.filter((movie) => getGenres(movie).some((genre) => genre.toLowerCase() === active.toLowerCase()));

  return (
    <motion.section className="page" {...fadeUp}>
      <PageTitle eyebrow="Genre Browser" title="Explore by genre" body="Genres appear after movies are fetched and cached from OMDb." />
      <ChipRow chips={['All', ...genres]} active={active} onChange={setActive} />
      <MovieGrid movies={filtered} onFavorite={onFavorite} onWatchlist={onWatchlist} />
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   MOVIE DETAILS PAGE
   ═══════════════════════════════════════════ */
function MovieDetails({ token, notify, onFavorite, onWatchlist }) {
  const { imdbId } = useParams();
  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 8, review: '' });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.movieDetails(imdbId),
      api.reviews(imdbId),
      api.similarMovies(imdbId).catch(() => []),
    ])
      .then(([details, reviewList, similarList]) => {
        setMovie(details);
        setReviews(reviewList);
        setSimilar(similarList);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [imdbId]);

  const submitReview = async (event) => {
    event.preventDefault();
    if (!token) {
      notify('Sign in to review movies');
      return;
    }
    await api.saveReview({ imdbId, rating: reviewForm.rating, review: reviewForm.review });
    setReviewForm({ rating: 8, review: '' });
    notify('Review saved');
    load();
  };

  if (loading) return <SkeletonPage title="Loading details" />;
  if (!movie) return <EmptyState title="Movie not found" body="OMDb did not return details for this title." />;

  const cast = String(movie.actors || '').split(',').map((name) => name.trim()).filter(Boolean);
  const genres = getGenres(movie);

  return (
    <motion.section className="page details-page" {...fadeUp}>
      <div className="details-hero">
        <motion.div
          className="details-poster"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {getPoster(movie) ? <img src={getPoster(movie)} alt={`${getTitle(movie)} poster`} /> : <PosterPlaceholder title={getTitle(movie)} />}
        </motion.div>
        <motion.div
          className="details-copy"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span className="eyebrow">IMDb {movie.imdb_id}</span>
          <h1>{getTitle(movie)}</h1>
          <div className="meta-row">
            <span><Star size={14} /> {getRating(movie).toFixed(1)}</span>
            <span>{getYear(movie)}</span>
            {movie.runtime ? <span><Clock size={14} /> {movie.runtime}</span> : null}
            {movie.language ? <span>{movie.language}</span> : null}
          </div>
          <p>{movie.plot || 'No plot was returned by OMDb for this title.'}</p>
          <div className="chip-row static">
            {genres.map((genre) => <span className="chip active" key={genre}>{genre}</span>)}
          </div>
          <div className="hero-actions">
            <button className="btn btn-primary" type="button" onClick={() => onWatchlist(imdbId)}><Bookmark size={18} /> Watchlist</button>
            <button className="btn" type="button" onClick={() => onFavorite(imdbId)}><Heart size={18} /> Favorite</button>
          </div>
        </motion.div>
      </div>
      <div className="details-grid">
        <InfoPanel title="Movie Facts" items={[
          ['Director', movie.director],
          ['Writer', movie.writer],
          ['Actors', movie.actors],
          ['Awards', movie.awards],
          ['Box Office', movie.box_office],
          ['IMDb Votes', movie.imdb_votes],
        ]} />
        <section className="panel">
          <h2>Cast</h2>
          <div className="cast-strip">
            {cast.length ? cast.map((name) => (
              <motion.div className="cast-card" key={name} whileHover={{ y: -4, scale: 1.03 }}>
                <div className="avatar-fallback">{name.slice(0, 1)}</div>
                <strong>{name}</strong>
              </motion.div>
            )) : <p className="muted">No cast data returned by OMDb.</p>}
          </div>
        </section>
      </div>

      {/* Similar Movies */}
      {similar.length > 0 ? (
        <section className="similar-section">
          <MovieRail title="🎬 Similar Movies" movies={similar} onFavorite={onFavorite} onWatchlist={onWatchlist} />
        </section>
      ) : null}

      <section className="panel reviews-panel">
        <h2>User Reviews</h2>
        <form className="review-form" onSubmit={submitReview}>
          <input
            type="number"
            min="1"
            max="10"
            value={reviewForm.rating}
            onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}
          />
          <input
            value={reviewForm.review}
            onChange={(event) => setReviewForm((current) => ({ ...current, review: event.target.value }))}
            placeholder="Write your review..."
            required
          />
          <button className="btn btn-primary" type="submit"><Send size={16} /> Submit</button>
        </form>
        <div className="review-list">
          {reviews.length ? reviews.map((review) => (
            <motion.article
              className="review-card"
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <strong>{review.user_name}</strong>
                <span>{review.rating}/10</span>
              </div>
              <p>{review.review}</p>
            </motion.article>
          )) : <p className="muted">No reviews yet. Be the first!</p>}
        </div>
      </section>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   WATCHLIST PAGE
   ═══════════════════════════════════════════ */
function WatchlistPage({ notify }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.watchlist()
    .then(setItems)
    .catch((err) => { notify(getApiError(err)); setItems([]); })
    .finally(() => setLoading(false));
  useEffect(load, []);

  const updateItem = async (item, changes) => {
    try {
      await api.saveWatchlist({
        imdbId: item.imdb_id,
        status: changes.status ?? item.status,
        progress: changes.progress ?? item.progress,
      });
      notify('Watchlist updated');
      load();
    } catch (err) {
      notify(getApiError(err));
    }
  };

  const remove = async (imdbId) => {
    try {
      await api.removeWatchlist(imdbId);
      notify('Removed from watchlist');
      load();
    } catch (err) {
      notify(getApiError(err));
    }
  };

  if (loading) return <SkeletonPage title="Loading watchlist" />;

  return (
    <LibraryPage
      title="Your Watchlist"
      eyebrow="PostgreSQL Library"
      items={items}
      empty="Add movies from search or details to build your watchlist."
      renderActions={(item) => (
        <div className="library-actions">
          <select value={item.status} onChange={(event) => updateItem(item, { status: event.target.value })}>
            <option>Planned</option>
            <option>Watching</option>
            <option>Completed</option>
          </select>
          <input type="range" min="0" max="100" value={item.progress} onChange={(event) => updateItem(item, { progress: Number(event.target.value) })} />
          <button className="icon-btn danger" type="button" onClick={() => remove(item.imdb_id)} aria-label="Remove">
            <Trash2 size={16} />
          </button>
        </div>
      )}
    />
  );
}

/* ═══════════════════════════════════════════
   FAVORITES PAGE
   ═══════════════════════════════════════════ */
function FavoritesPage({ notify }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.favorites()
    .then(setItems)
    .catch((err) => { notify(getApiError(err)); setItems([]); })
    .finally(() => setLoading(false));
  useEffect(load, []);

  const remove = async (imdbId) => {
    try {
      await api.removeFavorite(imdbId);
      notify('Removed from favorites');
      load();
    } catch (err) {
      notify(getApiError(err));
    }
  };

  if (loading) return <SkeletonPage title="Loading favorites" />;

  return (
    <LibraryPage
      title="Favorites"
      eyebrow="Saved Permanently"
      items={items}
      empty="Favorite movies from search or details to see them here."
      renderActions={(item) => (
        <button className="icon-btn danger" type="button" onClick={() => remove(item.imdb_id)} aria-label="Remove">
          <Trash2 size={16} />
        </button>
      )}
    />
  );
}

/* ═══════════════════════════════════════════
   RECOMMENDATIONS PAGE
   ═══════════════════════════════════════════ */
function RecommendationsPage({ onFavorite, onWatchlist }) {
  const [sections, setSections] = useState(null);

  useEffect(() => {
    api.recommendations()
      .then((data) => setSections([
        ['✨ Recommended For You', data.recommendedForYou || []],
        ['💎 Hidden Gems', data.hiddenGems || []],
        ['🍿 Weekend Movies', data.weekendMovies || []],
      ]))
      .catch(() => setSections([]));
  }, []);

  if (!sections) return <SkeletonPage title="Generating recommendations" />;

  return (
    <motion.section className="page" {...fadeUp}>
      <PageTitle eyebrow="Recommendation Engine" title="Personalized picks for you" body="Recommendations use cached OMDb metadata plus your favorites, watchlist, reviews, and preferred genres." />
      {sections.map(([title, movies]) => <MovieRail key={title} title={title} movies={movies} onFavorite={onFavorite} onWatchlist={onWatchlist} />)}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   ANALYTICS PAGE (with Recharts)
   ═══════════════════════════════════════════ */
function AnalyticsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.analytics().then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <SkeletonPage title="Loading analytics" />;

  const maxGenre = Math.max(1, ...data.favoriteGenres.map((row) => row.count));

  // Prepare chart data
  const genrePieData = data.favoriteGenres.map((row) => ({ name: row.genre, value: row.count }));
  const monthBarData = data.moviesPerMonth;
  const ratingsLineData = data.ratingsGiven || [];

  return (
    <motion.section className="page" {...fadeUp}>
      <PageTitle eyebrow="Analytics Dashboard" title="Your movie habits" body="Stats are calculated from your watchlist, favorites, and reviews." />

      {/* Stat Cards */}
      <motion.div className="stat-grid" variants={staggerContainer} initial="initial" animate="animate">
        {Object.entries(data.totals).map(([key, value]) => (
          <motion.div className="stat-card" key={key} variants={staggerItem}>
            <span>{key.replace(/([A-Z])/g, ' $1')}</span>
            <strong>{value}</strong>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="two-col">
        {/* Genre Pie Chart */}
        <div className="chart-panel">
          <h2>Genre Distribution</h2>
          {genrePieData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={genrePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {genrePieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#181818', border: '1px solid #333', borderRadius: 8, color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="muted">Add movies to generate genre analytics.</p>}
        </div>

        {/* Movies Per Month Bar Chart */}
        <div className="chart-panel">
          <h2>Movies Per Month</h2>
          {monthBarData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="month" tick={{ fill: '#a0a0a0', fontSize: 12 }} />
                <YAxis tick={{ fill: '#a0a0a0', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#181818', border: '1px solid #333', borderRadius: 8, color: '#fff' }}
                />
                <Bar dataKey="count" fill="#ff003c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="muted">Your month-by-month history will appear here.</p>}
        </div>
      </div>

      {/* Ratings Line Chart */}
      {ratingsLineData.length > 0 ? (
        <div className="chart-panel" style={{ marginTop: 18 }}>
          <h2>Your Rating History</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={ratingsLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="label" tick={{ fill: '#a0a0a0', fontSize: 12 }} />
              <YAxis domain={[0, 10]} tick={{ fill: '#a0a0a0', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#181818', border: '1px solid #333', borderRadius: 8, color: '#fff' }}
              />
              <Line type="monotone" dataKey="rating" stroke="#ff003c" strokeWidth={2} dot={{ fill: '#ff003c', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Legacy Bar List fallback for genres */}
      <div className="two-col" style={{ marginTop: 18 }}>
        <section className="panel">
          <h2>Favorite Genres</h2>
          <div className="bar-list">
            {data.favoriteGenres.length ? data.favoriteGenres.map((row) => (
              <div className="bar-row" key={row.genre}>
                <span>{row.genre}</span>
                <div><i style={{ width: `${(row.count / maxGenre) * 100}%` }} /></div>
                <strong>{row.count}</strong>
              </div>
            )) : <p className="muted">Add movies to generate genre analytics.</p>}
          </div>
        </section>
        <section className="panel">
          <h2>Activity Summary</h2>
          <div className="bar-list">
            {data.moviesPerMonth.length ? data.moviesPerMonth.map((row) => (
              <div className="bar-row" key={row.month}>
                <span>{row.month}</span>
                <div><i style={{ width: `${Math.max(12, row.count * 20)}%` }} /></div>
                <strong>{row.count}</strong>
              </div>
            )) : <p className="muted">Your month-by-month history will appear here.</p>}
          </div>
        </section>
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   QUIZ PAGE
   ═══════════════════════════════════════════ */
function QuizPage({ token, notify }) {
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  useEffect(() => {
    Promise.all([api.popular(), api.topRated()])
      .then(([popular, topRated]) => setQuestions(buildQuizQuestions([...popular, ...topRated])))
      .catch(() => setQuestions([]));
  }, []);

  useEffect(() => {
    if (finished || !questions.length) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          answer(null);
          return 20;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finished, questions.length, index]);

  const answer = (choice) => {
    const current = questions[index];
    if (choice && current && choice === current.answer) {
      setScore((value) => value + 10);
    }
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setTimeLeft(20);
  };

  const submitScore = async () => {
    if (!token) {
      notify('Sign in to save quiz scores');
      return;
    }
    await api.submitQuizScore({ score, category: 'Movie Trivia' });
    notify('Quiz score saved');
  };

  if (!questions.length) {
    return (
      <motion.section className="page" {...fadeUp}>
        <PageTitle eyebrow="Quiz Center" title="Trivia from real movie data" body="Search and cache a few movies first, then the quiz will build questions from OMDb metadata." />
        <EmptyState title="Not enough movie data yet" body="Open the Discover page and view movie details to cache more OMDb records." />
      </motion.section>
    );
  }

  const current = questions[index];

  return (
    <motion.section className="page quiz-page" {...fadeUp}>
      <PageTitle eyebrow="Quiz Center" title="Movie Trivia Challenge" body="Questions are generated from cached OMDb movie metadata." />
      <motion.div className="quiz-card" layout>
        {finished ? (
          <motion.div {...scaleIn}>
            <span className="eyebrow">Final Score</span>
            <h2>{score} points</h2>
            <p>You answered {questions.length} live-data questions.</p>
            <button className="btn btn-primary" type="button" onClick={submitScore}><Trophy size={18} /> Save Score</button>
          </motion.div>
        ) : (
          <>
            <div className="quiz-top">
              <span>Question {index + 1} of {questions.length}</span>
              <strong>{timeLeft}s</strong>
            </div>
            <h2>{current.prompt}</h2>
            <div className="answer-grid">
              {current.options.map((option) => (
                <motion.button
                  key={option}
                  type="button"
                  onClick={() => answer(option)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {option}
                </motion.button>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   LEADERBOARD PAGE
   ═══════════════════════════════════════════ */
function LeaderboardPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.leaderboard().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <motion.section className="page" {...fadeUp}>
      <PageTitle eyebrow="Leaderboard" title="Top movie explorers & quiz champions" body="Scores are pulled from PostgreSQL quiz records." />
      <div className="leaderboard">
        {rows.length ? rows.slice(0, 30).map((row, idx) => (
          <motion.div
            className="leader-row"
            key={`${row.id}-${idx}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <span>{idx + 1}</span>
            {row.user_avatar ? <img src={row.user_avatar} alt="" /> : <div className="avatar-fallback">{row.user_name?.slice(0, 1) || 'U'}</div>}
            <strong>{row.user_name}</strong>
            <em>{row.category}</em>
            <b>{row.score}</b>
          </motion.div>
        )) : <EmptyState title="No quiz scores yet" body="Finish a quiz and save your score to join the leaderboard." />}
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   PROFILE PAGE
   ═══════════════════════════════════════════ */
function ProfilePage({ user, setUser, notify }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    avatar: user?.avatar || '',
    bio: user?.bio || '',
    favorite_genres: user?.favorite_genres || '',
  });

  useEffect(() => {
    setForm({
      name: user?.name || '',
      avatar: user?.avatar || '',
      bio: user?.bio || '',
      favorite_genres: user?.favorite_genres || '',
    });
  }, [user]);

  const submit = async (event) => {
    event.preventDefault();
    const updated = await api.updateProfile(form);
    setUser(updated);
    notify('Profile updated');
  };

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <motion.section className="page" {...fadeUp}>
      <PageTitle eyebrow="Profile" title="Your CineVerse identity" body="Favorite genres influence personalized recommendations." />
      <form className="settings-form" onSubmit={submit}>
        <label><span>Name</span><input value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
        <label><span>Avatar URL</span><input value={form.avatar} onChange={(event) => update('avatar', event.target.value)} /></label>
        <label><span>Bio</span><textarea value={form.bio} onChange={(event) => update('bio', event.target.value)} /></label>
        <label><span>Favorite Genres</span><input value={form.favorite_genres} onChange={(event) => update('favorite_genres', event.target.value)} placeholder="Action, Drama, Sci-Fi" /></label>
        <button className="btn btn-primary" type="submit">Save Profile</button>
      </form>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   SETTINGS PAGE
   ═══════════════════════════════════════════ */
function SettingsPage({ theme, setTheme, token }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (token) api.notifications().then(setNotifications).catch(() => setNotifications([]));
  }, [token]);

  return (
    <motion.section className="page" {...fadeUp}>
      <PageTitle eyebrow="Settings" title="Preferences & notifications" body="Choose your theme, language, and notification settings." />
      <div className="two-col">
        <section className="panel">
          <h2>Theme</h2>
          <div className="segmented wide">
            <button type="button" className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>Dark</button>
            <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>Light</button>
          </div>
          <label className="select-label">
            <span>Language</span>
            <select defaultValue="English">
              <option>English</option>
              <option>Telugu</option>
              <option>Hindi</option>
            </select>
          </label>
          <label className="check-row">
            <input type="checkbox" defaultChecked />
            <span>Enable notifications</span>
          </label>
        </section>
        <section className="panel">
          <h2>Notifications</h2>
          <div className="notification-list">
            {notifications.length ? notifications.map((item) => (
              <article key={item.id} className={item.read ? 'read' : ''}>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
              </article>
            )) : <p className="muted">Sign in and use the app to generate notifications.</p>}
          </div>
        </section>
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════ */

function LibraryPage({ title, eyebrow, items, empty, renderActions }) {
  return (
    <motion.section className="page" {...fadeUp}>
      <PageTitle eyebrow={eyebrow} title={title} body={`${items.length} saved movie${items.length === 1 ? '' : 's'}.`} />
      {items.length ? (
        <motion.div className="library-list" variants={staggerContainer} initial="initial" animate="animate">
          {items.map((item) => (
            <motion.article className="library-item" key={item.watchlist_id || item.favorite_id || item.imdb_id} variants={staggerItem}>
              <Link to={`/movie/${item.imdb_id}`} className="library-poster">
                {getPoster(item) ? <img src={getPoster(item)} alt={`${getTitle(item)} poster`} /> : <PosterPlaceholder title={getTitle(item)} />}
              </Link>
              <div>
                <Link to={`/movie/${item.imdb_id}`}><h3>{getTitle(item)}</h3></Link>
                <div className="meta-row">
                  <span><Star size={14} /> {getRating(item).toFixed(1)}</span>
                  <span>{getYear(item)}</span>
                  {item.runtime ? <span>{item.runtime}</span> : null}
                </div>
                <p>{item.genre}</p>
              </div>
              {renderActions(item)}
            </motion.article>
          ))}
        </motion.div>
      ) : <EmptyState title="Nothing saved yet" body={empty} />}
    </motion.section>
  );
}

function MovieRail({ title, movies, onFavorite, onWatchlist }) {
  if (!movies?.length) return null;
  return (
    <section className="rail-section">
      <div className="rail-heading">
        <h2>{title}</h2>
      </div>
      <div className="movie-rail">
        {movies.map((movie) => <MovieCard key={getMovieId(movie)} movie={movie} onFavorite={onFavorite} onWatchlist={onWatchlist} />)}
      </div>
    </section>
  );
}

function MovieGrid({ movies, onFavorite, onWatchlist }) {
  if (!movies?.length) return <EmptyState title="No movies to show" body="Search OMDb or select another filter." />;
  return (
    <motion.div className="movie-grid" variants={staggerContainer} initial="initial" animate="animate">
      {movies.map((movie) => <MovieCard key={getMovieId(movie)} movie={movie} onFavorite={onFavorite} onWatchlist={onWatchlist} />)}
    </motion.div>
  );
}

function MovieCard({ movie, onFavorite, onWatchlist }) {
  const id = getMovieId(movie);
  return (
    <motion.article className="movie-card" variants={staggerItem} whileHover={{ y: -6, scale: 1.02 }}>
      <Link to={`/movie/${id}`} className="poster-frame" aria-label={`View ${getTitle(movie)}`}>
        {getPoster(movie) ? <img src={getPoster(movie)} alt={`${getTitle(movie)} poster`} loading="lazy" /> : <PosterPlaceholder title={getTitle(movie)} />}
        <span className="rating-badge"><Star size={12} /> {getRating(movie).toFixed(1)}</span>
      </Link>
      <div className="movie-card-body">
        <Link to={`/movie/${id}`}><h3>{getTitle(movie)}</h3></Link>
        <p>{getYear(movie)}</p>
        <div className="card-actions">
          <button className="icon-btn" type="button" onClick={() => onWatchlist(id)} aria-label="Add to watchlist">
            <Plus size={15} />
          </button>
          <button className="icon-btn" type="button" onClick={() => onFavorite(id)} aria-label="Add favorite">
            <Heart size={15} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function PosterPlaceholder({ title }) {
  return (
    <div className="poster-placeholder">
      <Film size={32} />
      <span>{title}</span>
    </div>
  );
}

function PageTitle({ eyebrow, title, body }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {body ? <p>{body}</p> : null}
    </div>
  );
}

function ChipRow({ chips, active, onChange }) {
  return (
    <div className="chip-row">
      {chips.map((chip) => (
        <motion.button
          key={chip}
          className={`chip ${active === chip ? 'active' : ''}`}
          type="button"
          onClick={() => onChange(chip)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {chip}
        </motion.button>
      ))}
    </div>
  );
}

function InfoPanel({ title, items }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <dl className="info-list">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || 'Not provided by OMDb'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function EmptyState({ title, body }) {
  return (
    <motion.div className="empty-state" {...scaleIn}>
      <Film size={36} />
      <h2>{title}</h2>
      <p>{body}</p>
    </motion.div>
  );
}

function SkeletonPage({ title }) {
  return (
    <section className="page">
      <PageTitle eyebrow="Loading" title={title} body="Fetching live backend data..." />
      <CardGridSkeleton />
    </section>
  );
}

function CardGridSkeleton() {
  return (
    <div className="movie-grid">
      {Array.from({ length: 8 }).map((_, index) => <div className="movie-card skeleton" key={index} />)}
    </div>
  );
}

/* ═══════════════════════════════════════════
   QUIZ HELPERS
   ═══════════════════════════════════════════ */

function buildQuizQuestions(movies) {
  const unique = [...new Map(movies.filter(Boolean).map((movie) => [getMovieId(movie), movie])).values()];
  const directors = [...new Set(unique.map((movie) => movie.director).filter(Boolean))];
  const genres = [...new Set(unique.flatMap(getGenres))];

  const questions = [];
  unique.forEach((movie) => {
    if (movie.director && directors.length >= 4) {
      questions.push({
        prompt: `Who directed "${getTitle(movie)}"?`,
        answer: movie.director,
        options: shuffle([movie.director, ...directors.filter((name) => name !== movie.director).slice(0, 3)]),
      });
    }
    const firstGenre = getGenres(movie)[0];
    if (firstGenre && genres.length >= 4) {
      questions.push({
        prompt: `Which genre is listed for "${getTitle(movie)}"?`,
        answer: firstGenre,
        options: shuffle([firstGenre, ...genres.filter((genre) => genre !== firstGenre).slice(0, 3)]),
      });
    }
  });

  return questions.slice(0, 5);
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

export default App;

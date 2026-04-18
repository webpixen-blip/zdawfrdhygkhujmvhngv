import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../../firebase';
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FaPlus, FaGoogleDrive, FaSearch, FaArrowLeft, FaCheck } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../SEO';

const CONFIG = {
  API_KEY: import.meta.env.VITE_TMDB_API,
  BASE_URL: import.meta.env.VITE_BASE_URL,
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/original',
};

function AdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [tmdbId, setTmdbId] = useState('');
  const [mediaType, setMediaType] = useState('movie'); // 'movie' or 'tv'
  const [gdriveLink, setGdriveLink] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [movieData, setMovieData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' or 'error'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check isAdmin flag in Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().isAdmin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          // For initial set up, we might want to tell the user to wait for activation
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchTmdbInfo = async () => {
    if (!tmdbId) return;
    setIsFetching(true);
    setMovieData(null);
    try {
      const resp = await fetch(`${CONFIG.BASE_URL}/${mediaType}/${tmdbId}?api_key=${CONFIG.API_KEY}&language=en-US`);
      if (!resp.ok) throw new Error('Invalid TMDB ID or API error');
      const data = await resp.json();
      setMovieData(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!movieData || !gdriveLink) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'custom_movies'), {
        tmdbId: Number(tmdbId),
        title: movieData.title || movieData.name,
        overview: movieData.overview,
        poster_path: movieData.poster_path,
        backdrop_path: movieData.backdrop_path,
        release_date: movieData.release_date || movieData.first_air_date,
        media_type: mediaType,
        gdrive_url: gdriveLink,
        rating: movieData.vote_average,
        genres: movieData.genres?.map(g => g.name) || [],
        createdAt: new Date().toISOString(),
      });
      setSaveStatus('success');
      setTmdbId('');
      setGdriveLink('');
      setMovieData(null);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-400 mb-8 max-w-md">
          You don't have administrator privileges. Please sign in with an admin account or contact the owner.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full flex items-center gap-2 transition-all"
        >
          <FaArrowLeft /> Back to Home
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0a0c12] text-white p-4 sm:p-8 md:pt-12"
    >
      <SEO title="Admin Panel - WeFlix" description="Manage custom movies and TV series." />
      
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-1">
              Admin <span className="text-red-600">Panel</span>
            </h1>
            <p className="text-gray-500 text-sm">Upload new movies via Google Drive links</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <FaArrowLeft />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Form */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-xl">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <FaPlus className="text-red-500 text-sm" /> Add New Content
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Media Type Selection */}
                <div className="flex gap-2 p-1 bg-black/40 rounded-xl">
                  {['movie', 'tv'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMediaType(type)}
                      className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                        mediaType === type ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {type === 'movie' ? 'Movie' : 'TV Show'}
                    </button>
                  ))}
                </div>

                {/* TMDB ID & Fetch */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">TMDB ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 550"
                      value={tmdbId}
                      onChange={e => setTmdbId(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={fetchTmdbInfo}
                      disabled={isFetching || !tmdbId}
                      className="px-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all disabled:opacity-50"
                    >
                      {isFetching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaSearch />}
                    </button>
                  </div>
                </div>

                {/* Google Drive Link */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Google Drive Link</label>
                  <div className="relative">
                    <FaGoogleDrive className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="url"
                      placeholder="Paste GDrive share link..."
                      value={gdriveLink}
                      onChange={e => setGdriveLink(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSaving || !movieData || !gdriveLink}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                      movieData && gdriveLink 
                        ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20' 
                        : 'bg-white/5 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Publish to WeFlix'}
                  </button>
                </div>
              </form>

              <AnimatePresence>
                {saveStatus === 'success' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium rounded-xl flex items-center justify-center gap-2"
                  >
                    <FaCheck /> Movie published successfully!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-6">
            <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Preview Metadata</h2>
            
            {movieData ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl group"
              >
                {/* Backdrop */}
                <div className="aspect-video relative overflow-hidden">
                  <img 
                    src={`${CONFIG.IMAGE_BASE_URL}${movieData.backdrop_path}`} 
                    alt="Backdrop" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141820] via-transparent to-transparent" />
                </div>

                {/* Content */}
                <div className="p-6 relative">
                  <div className="flex gap-4">
                    <img 
                      src={`${CONFIG.IMAGE_BASE_URL}${movieData.poster_path}`} 
                      alt="Poster" 
                      className="w-24 aspect-[2/3] rounded-xl shadow-lg -mt-16 relative z-10 border-2 border-white/10"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold line-clamp-1">{movieData.title || movieData.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-red-600/20 text-red-500 px-2 py-0.5 rounded font-bold uppercase">
                          {mediaType}
                        </span>
                        <span className="text-xs text-gray-400">
                          {(movieData.release_date || movieData.first_air_date)?.split('-')[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-4 line-clamp-4 italic">
                    "{movieData.overview}"
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="h-64 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-600">
                <FaSearch className="text-3xl mb-3 opacity-20" />
                <p className="text-sm font-medium">Enter TMDB ID and search to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default AdminPanel;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../../firebase';
import { collection, addDoc, getDoc, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FaPlus, FaGoogleDrive, FaSearch, FaArrowLeft, FaCheck, FaBullhorn, FaLayerGroup, FaTrashAlt, FaToggleOn, FaToggleOff } from 'react-icons/fa';
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
  
  // Tab State
  const [activeTab, setActiveTab] = useState('content'); // 'content' or 'ads'
  const [contentSubTab, setContentSubTab] = useState('auto'); // 'auto' or 'manual' or 'list'
  
  // Custom Content State
  const [customMovies, setCustomMovies] = useState([]);
  const [manualForm, setManualForm] = useState({
    title: '',
    overview: '',
    posterUrl: '',
    backdropUrl: '',
    gdriveUrl: '',
    mediaType: 'movie'
  });

  // Ads State
  const [ads, setAds] = useState([]);
  const [globalAdsEnabled, setGlobalAdsEnabled] = useState(true);
  const [adForm, setAdForm] = useState({ title: '', imageUrl: '', targetUrl: '', placement: 'home_top' });
  const [isAdSaving, setIsAdSaving] = useState(false);

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

  // Sync Ads and Settings
  useEffect(() => {
    if (!isAdmin) return;

    // Listen to Site Settings
    const settingsRef = doc(db, 'site_settings', 'ads_config');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setGlobalAdsEnabled(docSnap.data().enabled ?? true);
      }
    });

    // Listen to Ads
    const adsRef = collection(db, 'internal_ads');
    const qAds = query(adsRef, orderBy('createdAt', 'desc'));
    const unsubscribeAds = onSnapshot(qAds, (snapshot) => {
      setAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to Custom Content
    const customRef = collection(db, 'custom_movies');
    const qCustom = query(customRef, orderBy('createdAt', 'desc'));
    const unsubscribeCustom = onSnapshot(qCustom, (snapshot) => {
      setCustomMovies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeSettings();
      unsubscribeAds();
      unsubscribeCustom();
    };
  }, [isAdmin]);

  const toggleGlobalAds = async () => {
    try {
      await setDoc(doc(db, 'site_settings', 'ads_config'), { enabled: !globalAdsEnabled });
    } catch (err) {
      console.error(err);
    }
  };

  const syncAdVisibility = async (adId, status) => {
    try {
      await setDoc(doc(db, 'internal_ads', adId), { isActive: !status }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAd = async (adId) => {
    if (!window.confirm('Delete this ad?')) return;
    try {
      await deleteDoc(doc(db, 'internal_ads', adId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdSubmit = async (e) => {
    e.preventDefault();
    setIsAdSaving(true);
    try {
      await addDoc(collection(db, 'internal_ads'), {
        ...adForm,
        isActive: true,
        createdAt: new Date().toISOString()
      });
      setAdForm({ title: '', imageUrl: '', targetUrl: '', placement: 'home_top' });
      alert('Ad added successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to add ad.');
    } finally {
      setIsAdSaving(false);
    }
  };

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
    const isManual = contentSubTab === 'manual';
    
    if (!isManual && (!movieData || !gdriveLink)) return;
    if (isManual && (!manualForm.title || !manualForm.gdriveUrl)) return;

    setIsSaving(true);
    try {
      const payload = isManual ? {
        tmdbId: Date.now(), // Generate unique numeric ID
        title: manualForm.title,
        overview: manualForm.overview,
        poster_path: manualForm.posterUrl,
        backdrop_path: manualForm.backdropUrl,
        release_date: new Date().toISOString().slice(0, 10),
        media_type: manualForm.mediaType,
        gdrive_url: manualForm.gdriveUrl,
        rating: 0,
        genres: ['Custom'],
        createdAt: new Date().toISOString(),
        isManual: true
      } : {
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
      };

      await addDoc(collection(db, 'custom_movies'), payload);
      setSaveStatus('success');
      
      // Reset forms
      if (isManual) {
        setManualForm({ title: '', overview: '', posterUrl: '', backdropUrl: '', gdriveUrl: '', mediaType: 'movie' });
      } else {
        setTmdbId('');
        setGdriveLink('');
        setMovieData(null);
      }
      
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCustomMovie = async (id) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;
    try {
      await deleteDoc(doc(db, 'custom_movies', id));
    } catch (err) {
      console.error(err);
      alert('Delete failed');
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-1">
              Admin <span className="text-red-600">Panel</span>
            </h1>
            <p className="text-gray-500 text-sm">Control WeFlix content and services</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Global Ads Toggle */}
            <button 
              onClick={toggleGlobalAds}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                globalAdsEnabled 
                ? 'bg-green-600/10 border-green-500/20 text-green-500' 
                : 'bg-red-600/10 border-red-500/20 text-red-500'
              }`}
            >
              {globalAdsEnabled ? <FaToggleOn className="text-sm" /> : <FaToggleOff className="text-sm" />}
              Ads: {globalAdsEnabled ? 'Enabled' : 'Disabled'}
            </button>

            <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <FaArrowLeft />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-4 border-b border-white/5 mb-8">
          {[
            { id: 'content', label: 'Content Manager', icon: FaLayerGroup },
            { id: 'ads', label: 'Ads Manager', icon: FaBullhorn },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-2 text-sm font-bold flex items-center gap-2 transition-all relative ${
                activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="text-xs" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="admin-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'content' ? (
            <motion.div 
              key="content-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Content Sub-Tabs */}
              <div className="flex gap-2 p-1 bg-black/40 rounded-2xl w-fit">
                {[
                  { id: 'auto', label: 'TMDB Sync', icon: FaSearch },
                  { id: 'manual', label: 'Manual Upload', icon: FaPlus },
                  { id: 'list', label: 'Manage Content', icon: FaLayerGroup },
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setContentSubTab(sub.id)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
                      contentSubTab === sub.id ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <sub.icon className="text-[10px]" />
                    {sub.label}
                  </button>
                ))}
              </div>

              {contentSubTab === 'auto' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-xl">
                      <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <FaSearch className="text-red-500 text-sm" /> Automated Import
                      </h2>
                      <form onSubmit={handleSave} className="space-y-4">
                        <div className="flex gap-2 p-1 bg-black/40 rounded-xl">
                          {['movie', 'tv'].map(type => (
                            <button key={type} type="button" onClick={() => setMediaType(type)} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${mediaType === type ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>{type === 'movie' ? 'Movie' : 'TV Show'}</button>
                          ))}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">TMDB ID</label>
                          <div className="flex gap-2">
                            <input type="text" placeholder="e.g. 550" value={tmdbId} onChange={e => setTmdbId(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors" />
                            <button type="button" onClick={fetchTmdbInfo} disabled={isFetching || !tmdbId} className="px-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all disabled:opacity-50">{isFetching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaSearch />}</button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Google Drive Link</label>
                          <div className="relative"><FaGoogleDrive className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="url" placeholder="Paste GDrive share link..." value={gdriveLink} onChange={e => setGdriveLink(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors" required /></div>
                        </div>
                        <div className="pt-4"><button type="submit" disabled={isSaving || !movieData || !gdriveLink} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${movieData && gdriveLink ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}>{isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Publish to WeFlix'}</button></div>
                      </form>
                      <AnimatePresence>{saveStatus === 'success' && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium rounded-xl flex items-center justify-center gap-2"><FaCheck /> Content published!</motion.div>)}</AnimatePresence>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Preview Metadata</h2>
                    {movieData ? (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl group"><div className="aspect-video relative overflow-hidden"><img src={`${CONFIG.IMAGE_BASE_URL}${movieData.backdrop_path}`} alt="Backdrop" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#141820] via-transparent to-transparent" /></div><div className="p-6 relative"><div className="flex gap-4"><img src={`${CONFIG.IMAGE_BASE_URL}${movieData.poster_path}`} alt="Poster" className="w-24 aspect-[2/3] rounded-xl shadow-lg -mt-16 relative z-10 border-2 border-white/10" /><div className="flex-1"><h3 className="text-xl font-bold line-clamp-1">{movieData.title || movieData.name}</h3><div className="flex items-center gap-2 mt-1"><span className="text-[10px] bg-red-600/20 text-red-500 px-2 py-0.5 rounded font-bold uppercase">{mediaType}</span><span className="text-xs text-gray-400">{(movieData.release_date || movieData.first_air_date)?.split('-')[0]}</span></div></div></div><p className="text-sm text-gray-400 mt-4 line-clamp-4 italic">"{movieData.overview}"</p></div></motion.div>
                    ) : (
                      <div className="h-64 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-600"><FaSearch className="text-3xl mb-3 opacity-20" /><p className="text-sm font-medium">Search for content to preview</p></div>
                    )}
                  </div>
                </div>
              )}

              {contentSubTab === 'manual' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-xl">
                      <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <FaPlus className="text-red-500 text-sm" /> Manual Content Entry
                      </h2>
                      <form onSubmit={handleSave} className="space-y-4">
                        <div className="flex gap-2 p-1 bg-black/40 rounded-xl">
                          {['movie', 'tv'].map(type => (
                            <button key={type} type="button" onClick={() => setManualForm({...manualForm, mediaType: type})} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${manualForm.mediaType === type ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>{type === 'movie' ? 'Movie' : 'TV Show'}</button>
                          ))}
                        </div>
                        <input type="text" placeholder="Movie/Show Title" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors" required />
                        <textarea placeholder="Overview/Description" rows="3" value={manualForm.overview} onChange={e => setManualForm({...manualForm, overview: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors" />
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Poster Image URL</label>
                          <input type="url" placeholder="https://..." value={manualForm.posterUrl} onChange={e => setManualForm({...manualForm, posterUrl: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Backdrop Image URL</label>
                          <input type="url" placeholder="https://..." value={manualForm.backdropUrl} onChange={e => setManualForm({...manualForm, backdropUrl: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Google Drive Link</label>
                          <input type="url" placeholder="Paste GDrive link..." value={manualForm.gdriveUrl} onChange={e => setManualForm({...manualForm, gdriveUrl: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors" required />
                        </div>
                        <div className="pt-4"><button type="submit" disabled={isSaving || !manualForm.title || !manualForm.gdriveUrl} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${manualForm.title && manualForm.gdriveUrl ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}>{isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Publish Custom Content'}</button></div>
                      </form>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Manual Preview</h2>
                    <div className="relative bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl group">
                      <div className="aspect-video relative overflow-hidden bg-black/50">
                        {manualForm.backdropUrl && <img src={manualForm.backdropUrl} alt="" className="w-full h-full object-cover" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141820] via-transparent to-transparent" />
                      </div>
                      <div className="p-6 relative">
                        <div className="flex gap-4">
                          <div className="w-24 aspect-[2/3] rounded-xl shadow-lg -mt-16 relative z-10 border-2 border-white/10 bg-black/50 overflow-hidden">
                            {manualForm.posterUrl && <img src={manualForm.posterUrl} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold line-clamp-1">{manualForm.title || 'Untitled Movie'}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] bg-red-600/20 text-red-500 px-2 py-0.5 rounded font-bold uppercase">{manualForm.mediaType}</span>
                              <span className="text-xs text-gray-400">Manual Entry</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 mt-4 line-clamp-4 italic">"{manualForm.overview || 'No overview provided.'}"</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {contentSubTab === 'list' && (
                <div className="space-y-4">
                  <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Manage Added Content ({customMovies.length})</h2>
                  {customMovies.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-white/5 rounded-3xl flex items-center justify-center text-gray-600 text-sm">No content added via Admin yet</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customMovies.map(item => (
                        <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 group">
                          <img src={item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w200${item.poster_path}`} alt="" className="w-12 aspect-[2/3] object-cover rounded-lg bg-black shadow-lg" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold truncate">{item.title}</h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{item.media_type} · {item.tmdbId}</p>
                          </div>
                          <button onClick={() => deleteCustomMovie(item.id)} className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                            <FaTrashAlt />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="ads-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Ad Creation Form */}
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-xl">
                  <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <FaBullhorn className="text-red-500 text-sm" /> Create New Ad
                  </h2>
                  <form onSubmit={handleAdSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Ad Title</label>
                      <input type="text" placeholder="e.g. Summer Promo" value={adForm.title} onChange={e => setAdForm({...adForm, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Banner Image URL</label>
                      <input type="url" placeholder="https://..." value={adForm.imageUrl} onChange={e => setAdForm({...adForm, imageUrl: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Target URL (Link)</label>
                      <input type="url" placeholder="https://..." value={adForm.targetUrl} onChange={e => setAdForm({...adForm, targetUrl: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Placement</label>
                      <select value={adForm.placement} onChange={e => setAdForm({...adForm, placement: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors appearance-none">
                        <option value="home_top">Home Top Banner</option>
                        <option value="player_bottom">Below Video Player</option>
                      </select>
                    </div>
                    <div className="pt-4">
                      <button type="submit" disabled={isAdSaving} className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50">
                        {isAdSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Ad'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Active Ads List */}
              <div className="space-y-4">
                <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Manage Ads ({ads.length})</h2>
                {ads.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-white/5 rounded-3xl flex items-center justify-center text-gray-600 text-sm">No ads created yet</div>
                ) : (
                  <div className="space-y-3">
                    {ads.map(ad => (
                      <div key={ad.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                        <img src={ad.imageUrl} alt="" className="w-16 h-10 object-cover rounded-md bg-black" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold truncate">{ad.title}</h4>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{ad.placement.replace('_', ' ')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => syncAdVisibility(ad.id, ad.isActive)} className={`p-2 rounded-lg transition-colors ${ad.isActive ? 'text-green-500 bg-green-500/10' : 'text-gray-500 bg-white/5'}`} title="Toggle Visibility">
                            {ad.isActive ? <FaToggleOn className="text-lg" /> : <FaToggleOff className="text-lg" />}
                          </button>
                          <button onClick={() => deleteAd(ad.id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                            <FaTrashAlt />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default AdminPanel;

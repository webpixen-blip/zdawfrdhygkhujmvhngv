import React, { useState } from 'react';
import { BiHomeAlt, BiMoviePlay, BiTv, BiSearch, BiBookmark, BiCategory } from 'react-icons/bi';
import { FaUserCircle, FaSignOutAlt, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { GENRES, SPECIAL_CATEGORIES } from './tmdb';

function MobileNav({ activePage, onNavigate, user, onLogout, onOpenAuthModal, selectedGenreId, onGenreSelect }) {
  const [isGenreMenuOpen, setIsGenreMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', icon: BiHomeAlt, label: 'Home' },
    { id: 'movies', icon: BiMoviePlay, label: 'Movies' },
    { id: 'series', icon: BiTv, label: 'TV' },
    { id: 'search', icon: BiSearch, label: 'Search' },
  ];

  const genreType = activePage === 'series' ? 'tv' : 'movie';
  const genres = [...GENRES[genreType], ...SPECIAL_CATEGORIES[genreType]].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      {/* Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-[#0a0c12]/90 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] flex items-center justify-around px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              onClick={() => {
                onNavigate(id);
                setIsGenreMenuOpen(false);
              }}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-90 ${
                isActive ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              <Icon className="text-2xl" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
              {isActive && <motion.div layoutId="mobile-nav-indicator" className="w-1 h-1 bg-red-500 rounded-full mt-0.5" />}
            </button>
          );
        })}

        {/* Categories Toggle */}
        {(activePage === 'movies' || activePage === 'series') && (
          <button
            onClick={() => setIsGenreMenuOpen(true)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
              isGenreMenuOpen ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            <BiCategory className="text-2xl" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Genres</span>
          </button>
        )}

        {/* Profile/Auth */}
        <button
          onClick={user ? onLogout : onOpenAuthModal}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
            user ? 'text-red-500/80' : 'text-gray-500'
          }`}
        >
          {user ? <FaSignOutAlt className="text-2xl" /> : <FaUserCircle className="text-2xl" />}
          <span className="text-[10px] font-bold uppercase tracking-wider">{user ? 'Exit' : 'User'}</span>
        </button>
      </nav>

      {/* Genre Menu Drawer */}
      <AnimatePresence>
        {isGenreMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGenreMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] md:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[80] bg-[#141820] rounded-t-[2.5rem] border-t border-white/10 p-6 md:hidden max-h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                  Browse <span className="text-red-500">Genres</span>
                </h3>
                <button 
                  onClick={() => setIsGenreMenuOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-8 hide-scrollbar">
                {genres.map((genre) => {
                  const isActive = selectedGenreId === genre.id;
                  return (
                    <button
                      key={genre.id}
                      onClick={() => {
                        onGenreSelect(genre.id);
                        setIsGenreMenuOpen(false);
                      }}
                      className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left border-2 ${
                        isActive 
                          ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/30' 
                          : 'bg-white/5 border-transparent text-gray-400 active:bg-white/10'
                      }`}
                    >
                      {genre.name}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default MobileNav;

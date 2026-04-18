import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ContentCard from './ContentCard';
import { toDetailPath } from './urlUtils';
import { FaPlay } from 'react-icons/fa';

function CustomMoviesRow() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'custom_movies'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMovies(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return null;
  if (movies.length === 0) return null;

  return (
    <div className="mb-8 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-red-600 rounded-full" />
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            Exclusive <span className="text-red-500">Releases</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600/20 text-red-500 border border-red-500/20 uppercase tracking-widest font-bold">New</span>
          </h2>
        </div>
      </div>

      <div className="relative group/row">
        <div 
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-1 px-1 scroll-smooth"
        >
          {movies.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="min-w-[140px] sm:min-w-[170px] max-w-[140px] sm:max-w-[170px]"
            >
              <ContentCard
                title={item.title}
                poster={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                rating={item.rating}
                releaseDate={item.release_date}
                mediaId={item.id}
                mediaType="movie"
                customPath={toDetailPath('movie', item.tmdbId, item.title)}
                isCustom={true}
                onClick={() => {
                  navigate(toDetailPath('movie', item.tmdbId, item.title), { state: { customMovie: item } });
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CustomMoviesRow;

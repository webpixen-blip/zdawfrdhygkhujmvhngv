import { useState, useEffect, memo } from 'react';
import { collection, query, where, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion, AnimatePresence } from 'framer-motion';

const AdBanner = ({ placement }) => {
  const [ad, setAd] = useState(null);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check Global Ads Toggle
    const settingsRef = doc(db, 'site_settings', 'ads_config');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setGlobalEnabled(docSnap.data().enabled ?? true);
      }
    });

    // 2. Fetch Ad for this placement
    const adsRef = collection(db, 'internal_ads');
    const q = query(
      adsRef, 
      where('placement', '==', placement),
      where('isActive', '==', true),
      limit(1)
    );

    const unsubscribeAd = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setAd({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setAd(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Ad fetch error:", err);
      setLoading(false);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeAd();
    };
  }, [placement]);

  if (loading || !globalEnabled || !ad) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full my-6 px-4 sm:px-0"
      >
        <a 
          href={ad.targetUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block relative group overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:border-red-500/30 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]"
        >
          {/* Label */}
          <div className="absolute top-3 right-4 z-20">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded bg-black/40 text-gray-500 border border-white/5 backdrop-blur-md">
              Sponsored
            </span>
          </div>

          {/* Banner Image */}
          <div className="relative aspect-[21/9] sm:aspect-[21/7] md:aspect-[21/5] w-full overflow-hidden">
            <img 
              src={ad.imageUrl} 
              alt={ad.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
          </div>

          {/* Glow effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-red-600/5 via-transparent to-blue-600/5 pointer-events-none" />
        </a>
      </motion.div>
    </AnimatePresence>
  );
};

export default memo(AdBanner);

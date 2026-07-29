import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export default function AnimeCard({ anime, onClick, index = 0 }) {
  const imageUrl = anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url;
  const score = anime.score ? anime.score.toFixed(1) : 'N/A';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ y: -10, scale: 1.02 }}
      onClick={() => onClick(anime)}
      className="relative group cursor-pointer bg-anime-card rounded-xl overflow-hidden border border-white/5 shadow-lg flex flex-col h-full"
    >
      <div className="relative pt-[140%] overflow-hidden">
        <img 
          src={imageUrl} 
          alt={anime.title} 
          className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Score Badge */}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm border border-white/10 px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-yellow-400">
          <Star size={12} fill="currentColor" /> {score}
        </div>
        
        {/* Overlay Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-anime-bg via-anime-bg/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-3 bg-gradient-to-t from-anime-bg via-anime-bg/95 to-transparent absolute bottom-0 w-full transform translate-y-8 group-hover:translate-y-0 transition-transform duration-300">
        <h3 className="font-semibold text-sm truncate text-white drop-shadow-md">
          {anime.title}
        </h3>
        <p className="text-xs text-slate-300 mt-1 drop-shadow">
          {anime.year || anime.aired?.prop?.from?.year || 'TBA'} • {anime.episodes ? `${anime.episodes} Eps` : 'Ongoing'}
        </p>
        
        {/* Deskripsi Singkat saat Hover */}
        <div className="overflow-hidden max-h-0 group-hover:max-h-20 transition-all duration-500 ease-in-out mt-0 group-hover:mt-2 opacity-0 group-hover:opacity-100">
          <p className="text-[10px] text-slate-400 line-clamp-3 leading-snug">
            {anime.synopsis ? anime.synopsis.replace(/<[^>]*>?/gm, '') : "Deskripsi belum tersedia."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

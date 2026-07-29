import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

export default function HeroSlider({ items, onOpenModal }) {
  if (!items || items.length === 0) return <div className="h-[70vh] bg-anime-bg animate-pulse" />;

  const validItems = items.filter(a => a.trailer?.images?.maximum_image_url || a.images?.webp?.large_image_url).slice(0, 10);

  return (
    <div className="relative h-[85vh] min-h-[600px] w-full bg-anime-bg">
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        loop={true}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        className="w-full h-full"
      >
        {validItems.map((anime) => {
          const bgImg = anime.trailer?.images?.maximum_image_url || anime.images.webp.large_image_url;
          return (
            <SwiperSlide key={anime.mal_id}>
              <div className="relative w-full h-full">
                {/* Background Image */}
                <img 
                  src={bgImg} 
                  alt={anime.title} 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* Gradient Overlays for readability and blending */}
                <div className="absolute inset-0 bg-gradient-to-r from-anime-bg via-anime-bg/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-anime-bg via-transparent to-transparent" />
                
                {/* Content */}
                <div className="absolute inset-0 flex items-center px-6 md:px-16 pt-32 pb-20">
                  <div className="max-w-3xl">
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-md text-xs font-bold tracking-widest uppercase shadow-lg shadow-red-600/30">
                          Top Trending
                        </span>
                        {anime.score && (
                          <span className="inline-flex items-center gap-1 text-yellow-400 font-bold text-sm drop-shadow-md">
                            ★ {anime.score}
                          </span>
                        )}
                        <span className="text-slate-300 text-sm font-semibold">{anime.year || 'TBA'}</span>
                        <span className="px-2 py-0.5 bg-white/10 text-slate-200 rounded text-xs font-bold border border-white/20">{anime.type || 'TV'}</span>
                      </div>
                      
                      <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] mb-6 drop-shadow-2xl">
                        {anime.title}
                      </h1>
                      
                      <p className="text-slate-300 text-sm md:text-lg line-clamp-3 mb-8 max-w-2xl drop-shadow-md leading-relaxed font-medium">
                        {anime.synopsis ? anime.synopsis.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') : "Sinopsis belum tersedia."}
                      </p>
                      
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => onOpenModal(anime)}
                          className="group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-xl font-extrabold text-lg hover:bg-anime-primary hover:text-white transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-anime-primary/50"
                        >
                          <Play size={24} fill="currentColor" className="group-hover:animate-pulse" />
                          Putar Trailer
                        </button>
                        <button 
                          onClick={() => onOpenModal(anime)}
                          className="flex items-center gap-3 bg-slate-800/80 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-700 backdrop-blur-md transition-all duration-300 border border-white/10"
                        >
                          ℹ️ Info Selengkapnya
                        </button>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}

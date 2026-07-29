import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Calendar, Tv, Bookmark, PlayCircle, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import axios from 'axios';

export function AnimeModal() {
  const { isModalOpen, selectedAnime, openModal, closeModal, watchlist, addToWatchlist, removeFromWatchlist } = useStore();
  const [characters, setCharacters] = useState([]);
  const [loadingChars, setLoadingChars] = useState(false);
  const [charError, setCharError] = useState(null);
  
  // State untuk sub-modal karakter
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [characterDetail, setCharacterDetail] = useState(null);
  const [loadingCharDetail, setLoadingCharDetail] = useState(false);
  
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // New states for Phase 1: Recommendations
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [loadingFullAnime, setLoadingFullAnime] = useState(false);

  const handleCharacterClick = async (char) => {
    setSelectedCharacter(char);
    setCharacterDetail(null);
    setLoadingCharDetail(true);
    
    try {
      // Coba pakai Jikan API (bisa kena rate limit)
      const res = await axios.get(`https://api.jikan.moe/v4/characters/${char.character.mal_id}`);
      setCharacterDetail(res.data.data);
    } catch (err) {
      // Fallback ke AniList GraphQL
      try {
        const query = `
          query ($search: String) {
            Character (search: $search) {
              description
            }
          }
        `;
        const charName = char.character.name.split(',').reverse().join(' ').trim();
        const anilistRes = await axios.post('https://graphql.anilist.co', {
          query,
          variables: { search: charName }
        });
        const anilistChar = anilistRes.data.data.Character;
        setCharacterDetail({
          about: anilistChar.description 
            ? anilistChar.description
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]*>?/gm, '')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/~!(.*?)!~/g, '')
                .replace(/[*_]/g, '')
            : "Deskripsi tidak tersedia."
        });
      } catch (fallbackErr) {
        setCharacterDetail({ about: "Gagal memuat deskripsi karakter dari server." });
      }
    }
    setLoadingCharDetail(false);
  };

  useEffect(() => {
    let isMounted = true;
    if (isModalOpen && selectedAnime) {
      document.body.style.overflow = 'hidden';
      setIsVideoLoading(true); // Mulai loading saat modal dibuka
      
      // Tirai bioskop terbuka setelah 3.5 detik (waktu yang cukup bagi YouTube untuk menyembunyikan tombol Pause-nya)
      const videoTimer = setTimeout(() => {
        if (isMounted) setIsVideoLoading(false);
      }, 3500);

      setCharacters([]); // <--- Clear previous characters immediately
      setSelectedCharacter(null); // Tutup sub-modal jika anime berganti
      setCharError(null);

      const fetchCharacters = async () => {
        setLoadingChars(true);
        try {
          const res = await axios.get(`https://api.jikan.moe/v4/anime/${selectedAnime.mal_id}/characters`);
          if (isMounted) {
             const mappedJikan = res.data.data.slice(0, 8).map(c => {
               const jpVa = c.voice_actors?.find(va => va.language === 'Japanese');
               return {
                 ...c,
                 voice_actor: jpVa ? { name: jpVa.person.name, image: jpVa.person.images?.jpg?.image_url } : null
               };
             });
             setCharacters(mappedJikan);
             setLoadingChars(false);
             setCharError(null);
          }
        } catch (err) {
          if (!isMounted) return;
          console.warn("Jikan API Rate Limit / Error. Beralih ke AniList API fallback...");
          try {
            const isAniListId = !!selectedAnime.anilist_id;
            const query = isAniListId 
              ? `query ($id: Int) { Media (id: $id, type: ANIME) { characters(sort: ROLE, perPage: 8) { edges { node { id name { full } image { large } } voiceActors(language: JAPANESE, sort: RELEVANCE) { id name { full } image { large } } } } } }`
              : `query ($idMal: Int) { Media (idMal: $idMal, type: ANIME) { characters(sort: ROLE, perPage: 8) { edges { node { id name { full } image { large } } voiceActors(language: JAPANESE, sort: RELEVANCE) { id name { full } image { large } } } } } }`;
            
            const variables = isAniListId 
              ? { id: selectedAnime.anilist_id }
              : { idMal: selectedAnime.mal_id };

            const anilistRes = await axios.post('https://graphql.anilist.co', {
              query,
              variables
            });

            const media = anilistRes.data.data.Media;
            if (!media || !media.characters || !media.characters.edges) {
               throw new Error("Tidak ditemukan di AniList");
            }

            const anilistChars = media.characters.edges.map(edge => ({
              character: {
                mal_id: edge.node.id,
                name: edge.node.name.full,
                images: { webp: { image_url: edge.node.image.large } }
              },
              voice_actor: edge.voiceActors && edge.voiceActors.length > 0 
                ? { name: edge.voiceActors[0].name.full, image: edge.voiceActors[0].image.large }
                : null
            }));

            if (isMounted) {
              setCharacters(anilistChars);
              setLoadingChars(false);
              setCharError(null);
            }
          } catch (fallbackErr) {
            if (isMounted) {
              setCharError("Gagal memuat karakter. Silakan coba lagi.");
              setLoadingChars(false);
            }
          }
        }
      };

      fetchCharacters();

      // Fetch Recommendations
      const fetchRecommendations = async () => {
        setLoadingRecs(true);
        setRecommendations([]);
        try {
          const res = await axios.get(`https://api.jikan.moe/v4/anime/${selectedAnime.mal_id}/recommendations`);
          if (isMounted) {
            setRecommendations(res.data.data.slice(0, 10)); // Take top 10
            setLoadingRecs(false);
          }
        } catch (err) {
          if (isMounted) setLoadingRecs(false);
        }
      };
      
      fetchRecommendations();

      return () => {
        isMounted = false;
        clearTimeout(videoTimer);
        document.body.style.overflow = 'auto';
      };
    }
  }, [isModalOpen, selectedAnime, retryTrigger]);

  // Function to handle clicking a recommended anime
  const handleRecommendationClick = async (recEntry) => {
    setLoadingFullAnime(true);
    try {
      const res = await axios.get(`https://api.jikan.moe/v4/anime/${recEntry.mal_id}`);
      // Mapping to match our format
      const fullAnime = {
        mal_id: res.data.data.mal_id,
        title: res.data.data.title,
        images: res.data.data.images,
        score: res.data.data.score,
        year: res.data.data.year,
        episodes: res.data.data.episodes,
        status: res.data.data.status,
        synopsis: res.data.data.synopsis,
        trailer: res.data.data.trailer,
        genres: res.data.data.genres
      };
      openModal(fullAnime);
    } catch (err) {
      console.error("Failed to load full anime details", err);
      alert("Gagal memuat detail anime. Silakan coba lagi nanti.");
    }
    setLoadingFullAnime(false);
  };

  if (!isModalOpen || !selectedAnime) return null;

  const isSaved = watchlist.some(a => a.mal_id === selectedAnime.mal_id);
  const handleSaveToggle = () => {
    if (isSaved) removeFromWatchlist(selectedAnime.mal_id);
    else addToWatchlist(selectedAnime);
  };

  const bgImg = selectedAnime.images?.webp?.large_image_url || selectedAnime.images?.jpg?.large_image_url;

  return (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={closeModal}
        >
          {loadingFullAnime && (
            <div className="absolute inset-0 z-[3000] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
              <Loader2 className="animate-spin text-anime-primary mb-4" size={48} />
              <p className="text-white font-bold animate-pulse">Berpindah Dimensi...</p>
            </div>
          )}

          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-anime-bg w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden relative my-auto border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 z-[200] p-2 bg-black/50 hover:bg-anime-primary rounded-full text-white transition-colors group backdrop-blur-md border border-white/10"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Sub-Modal Detail Karakter */}
            <AnimatePresence>
              {selectedCharacter && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm rounded-2xl flex items-center justify-center p-4 md:p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-full"
                  >
                    <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
                      <h4 className="font-bold text-lg text-white">Profil Karakter</h4>
                      <button onClick={() => setSelectedCharacter(null)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-6 overflow-y-auto flex flex-col md:flex-row gap-6">
                      <img src={selectedCharacter.character.images.webp.image_url} className="w-32 h-32 md:w-48 md:h-48 rounded-xl object-cover shadow-lg mx-auto md:mx-0 shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-2">{selectedCharacter.character.name.split(',').reverse().join(' ').trim()}</h3>
                        {loadingCharDetail ? (
                          <div className="flex items-center gap-2 text-anime-secondary text-sm mt-4">
                            <Loader2 size={16} className="animate-spin" /> Mengambil deskripsi dari database...
                          </div>
                        ) : (
                          <div className="text-slate-300 text-sm leading-relaxed mt-2 max-h-60 overflow-y-auto pr-2 whitespace-pre-line">
                            {characterDetail?.about || "Deskripsi tidak tersedia."}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header / Trailer */}
            <div className="relative w-full pt-[56.25%] md:pt-[45%] bg-black overflow-hidden rounded-t-2xl">
              {(() => {
                const rawUrl = selectedAnime.trailer?.embed_url;
                if (!rawUrl) return (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50">
                    <img src={bgImg} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    <PlayCircle size={64} className="mb-2" />
                    <p>Trailer Tidak Tersedia</p>
                  </div>
                );
                
                const ytId = selectedAnime.trailer?.youtube_id || rawUrl.split('/').pop().split('?')[0];
                const cleanUrl = rawUrl.split('?')[0];
                // Wmode transparent helps hide some UI artifacts on some browsers
                const finalUrl = `${cleanUrl}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&wmode=transparent`;
                
                return (
                  <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden bg-black">
                    <iframe 
                      src={finalUrl} 
                      allow="autoplay; fullscreen"
                      className="absolute inset-0 w-full h-[120%] -top-[10%] scale-105 border-none pointer-events-none select-none"
                      tabIndex="-1"
                    />
                    <div className="absolute inset-0 z-[100] w-full h-full bg-transparent pointer-events-auto" />
                  </div>
                );
              })()}
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-anime-bg via-anime-bg/40 to-transparent pointer-events-none" />
              <div className="absolute inset-0 z-10 bg-gradient-to-r from-anime-bg via-anime-bg/20 to-transparent pointer-events-none" />
              
              {/* Cinematic Video Curtain (Hides YouTube UI flash) */}
              <AnimatePresence>
                {isVideoLoading && (
                  <motion.div 
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                    className="absolute inset-0 z-20 bg-black pointer-events-none flex items-center justify-center"
                  >
                     {/* Show poster image as background while loading so it's not just pure black */}
                     <img src={bgImg} className="absolute inset-0 w-full h-full object-cover opacity-50 blur-md" />
                     <div className="w-12 h-12 border-4 border-anime-primary border-t-transparent rounded-full animate-spin z-10 drop-shadow-[0_0_10px_rgba(var(--color-anime-primary),0.8)]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Body */}
            <div className="p-4 md:p-10 relative -mt-16 md:-mt-48 z-10">
              <div className="flex flex-col md:flex-row gap-8">
                
                {/* Poster (Desktop only) */}
                <div className="hidden md:block w-56 shrink-0 relative z-10 group">
                  <img src={bgImg} className="w-full rounded-2xl shadow-2xl border-4 border-white/10 group-hover:border-anime-primary/50 transition-colors" />
                  
                  <button 
                    onClick={handleSaveToggle}
                    className={`mt-4 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isSaved ? 'bg-anime-primary text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                  >
                    <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
                    {isSaved ? "Tersimpan" : "My List"}
                  </button>
                </div>

                <div className="flex-1">
                  <h1 className="text-4xl md:text-6xl font-black mb-4 text-white leading-tight drop-shadow-2xl">
                    {selectedAnime.title}
                  </h1>
                  
                  <div className="flex flex-wrap gap-4 mb-6 text-sm font-bold tracking-wide">
                    <span className="flex items-center gap-1.5 text-yellow-400 bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-yellow-400/20 shadow-lg">
                      <Star size={18} fill="currentColor" /> {selectedAnime.score || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-300 bg-white/5 px-3 py-1 rounded-full">
                      <Calendar size={16} /> {selectedAnime.year || selectedAnime.aired?.prop?.from?.year || 'TBA'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-300 bg-white/5 px-3 py-1 rounded-full">
                      <Tv size={16} /> {selectedAnime.episodes ? `${selectedAnime.episodes} Eps` : 'Ongoing'}
                    </span>
                    <span className="flex items-center gap-1 text-anime-secondary bg-anime-secondary/10 px-3 py-1 rounded-full border border-anime-secondary/20">
                      {selectedAnime.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedAnime.genres?.map(g => (
                      <span key={g.mal_id} className="text-xs bg-white/10 px-2 py-1 rounded-md text-slate-300">
                        {g.name}
                      </span>
                    ))}
                  </div>

                  {/* Mobile save button */}
                  <div className="md:hidden mb-6">
                    <button 
                      onClick={handleSaveToggle}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isSaved ? 'bg-anime-primary text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                      <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
                      {isSaved ? "Tersimpan di My List" : "Simpan ke My List"}
                    </button>
                  </div>

                  <div className="mb-10">
                    <h3 className="text-2xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Sinopsis</h3>
                    <p className="text-slate-300 leading-relaxed text-base md:text-lg font-medium drop-shadow-md">
                      {selectedAnime.synopsis || "Sinopsis belum tersedia untuk anime ini."}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Karakter Utama & Pengisi Suara</h3>
                    {loadingChars ? (
                      <div className="flex flex-col items-center justify-center p-4 text-anime-secondary gap-2">
                        <Loader2 className="animate-spin" size={32} />
                        {charError && <span className="text-xs text-red-400 font-bold text-center">{charError}</span>}
                      </div>
                    ) : charError ? (
                      <div className="border border-red-500/30 bg-red-500/10 p-4 rounded-xl flex flex-col items-center gap-3">
                         <p className="text-red-400 text-sm font-bold text-center">{charError}</p>
                         <p className="text-slate-400 text-xs text-center">IP Anda mungkin sedang diblokir sementara oleh API Jikan. Tunggu 1-2 menit sebelum mencoba lagi.</p>
                         <button onClick={() => setRetryTrigger(prev => prev + 1)} className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-all hover:scale-105 shadow-lg shadow-red-500/20">Coba Manual</button>
                      </div>
                    ) : characters.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {characters.map(c => (
                          <div 
                            key={c.character.mal_id} 
                            onClick={() => handleCharacterClick(c)}
                            className="flex flex-col bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/5 hover:border-anime-primary/50 group hover:shadow-[0_0_20px_rgba(var(--color-anime-primary),0.3)] hover:-translate-y-1"
                          >
                            <div className="flex justify-between items-center bg-black/40 border-b border-white/5">
                              <img src={c.character.images.webp.image_url} className="w-1/2 h-32 md:h-40 object-cover object-top filter brightness-90 group-hover:brightness-110 transition-all" />
                              {c.voice_actor ? (
                                <img src={c.voice_actor.image} className="w-1/2 h-32 md:h-40 object-cover object-top filter brightness-90 group-hover:brightness-110 transition-all" />
                              ) : (
                                <div className="w-1/2 h-32 md:h-40 bg-slate-800 flex items-center justify-center text-xs text-slate-500 font-bold text-center p-2 uppercase tracking-widest">No VA</div>
                              )}
                            </div>
                            <div className="p-3 flex justify-between gap-3 h-full bg-gradient-to-t from-black/60 to-transparent">
                              <div className="flex flex-col flex-1">
                                <span className="text-sm font-black text-slate-100 line-clamp-1 group-hover:text-anime-primary transition-colors">{c.character.name.split(',').reverse().join(' ').trim()}</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Karakter</span>
                              </div>
                              <div className="flex flex-col flex-1 text-right">
                                <span className="text-sm font-black text-slate-100 line-clamp-1 group-hover:text-anime-secondary transition-colors">{c.voice_actor ? c.voice_actor.name.split(',').reverse().join(' ').trim() : '-'}</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Seiyuu</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">Data karakter dari API Jikan belum tersedia untuk anime ini.</p>
                    )}
                  </div>

                  {/* Recommendations Section (Phase 1 V6) */}
                  <div className="mt-12">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-l-4 border-anime-primary pl-3 text-white">
                      Mungkin Anda Suka
                    </h3>
                    {loadingRecs ? (
                      <div className="flex justify-center items-center h-40">
                         <Loader2 className="animate-spin text-anime-secondary" size={32} />
                      </div>
                    ) : recommendations.length > 0 ? (
                      <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar">
                        {recommendations.map((rec) => (
                          <div 
                            key={rec.entry.mal_id} 
                            onClick={() => handleRecommendationClick(rec.entry)}
                            className="min-w-[140px] md:min-w-[160px] snap-start flex flex-col bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/5 hover:border-anime-primary/50 group hover:-translate-y-2"
                          >
                            <div className="relative h-48 md:h-56 overflow-hidden">
                              <img src={rec.entry.images.webp.image_url} className="w-full h-full object-cover filter brightness-90 group-hover:brightness-110 transition-all duration-500 group-hover:scale-110" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                <span className="text-white text-xs font-bold w-full text-center bg-anime-primary/80 py-1 rounded-md">Lihat Detail</span>
                              </div>
                            </div>
                            <div className="p-3 bg-black/40 h-full flex items-center justify-center">
                              <span className="text-xs md:text-sm font-bold text-slate-200 line-clamp-2 text-center group-hover:text-anime-primary transition-colors">{rec.entry.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">Tidak ada rekomendasi yang tersedia untuk anime ini.</p>
                    )}
                  </div>
                  
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AnimeModal;

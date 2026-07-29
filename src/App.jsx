import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { Loader2, FolderOpen, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from './store/useStore';

import Navbar from './components/Navbar';
import HeroSlider from './components/HeroSlider';
import AnimeCard from './components/AnimeCard';
import AnimeModal from './components/AnimeModal';

const API_BASE = 'https://api.jikan.moe/v4';

function App() {
  const { activeTab, openModal, watchlist } = useStore();
  
  const [topAnime, setTopAnime] = useState([]);
  const [upcomingAnime, setUpcomingAnime] = useState([]);
  const [airingAnime, setAiringAnime] = useState([]);
  
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState(null);
  
  // Phase 4: Filter & Pagination State
  const [searchPage, setSearchPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    status: '',
    order_by: '',
    sort: 'desc'
  });
  
  // Phase 2: Schedule State
  const [scheduleAnime, setScheduleAnime] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [scheduleDay, setScheduleDay] = useState(() => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  });

  // Phase 3: Personalized Recommendations
  const [personalizedAnime, setPersonalizedAnime] = useState([]);
  const [loadingPersonalized, setLoadingPersonalized] = useState(false);
  const [personalizedError, setPersonalizedError] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let retryCount = 0;
    
    // Fungsi untuk menghapus duplikat berdasarkan mal_id
    const uniqueAnime = (list) => {
      const seen = new Set();
      return list.filter(anime => {
        if (seen.has(anime.mal_id)) return false;
        seen.add(anime.mal_id);
        return true;
      });
    };

    const fetchInitialData = async () => {
      try {
        if (retryCount === 0) setLoading(true);
        setError(null);

        const fetchWithDelay = async (url) => {
          const res = await axios.get(url);
          await new Promise(r => setTimeout(r, 1000));
          return uniqueAnime(res.data.data);
        };

        const airing = await fetchWithDelay(`${API_BASE}/seasons/now?limit=10`);
        setAiringAnime(airing);
        
        const top = await fetchWithDelay(`${API_BASE}/top/anime?limit=15`);
        setTopAnime(top);
        
        const upcoming = await fetchWithDelay(`${API_BASE}/seasons/upcoming?limit=15`);
        setUpcomingAnime(upcoming);
        
        setLoading(false);
      } catch (err) {
        console.error("Fetch Error:", err);
        if (err.response && err.response.status === 429 && retryCount < 3) {
          retryCount++;
          setError(`Terkena Rate Limit Jikan API. Menunggu dan mencoba lagi otomatis dalam 3 detik... (Percobaan ${retryCount}/3)`);
          setTimeout(fetchInitialData, 3000);
        } else {
          setError("Gagal memuat data dari Jikan API karena koneksi atau rate limit berulang. Silakan coba lagi nanti.");
          setLoading(false);
        }
      }
    };
    
    fetchInitialData();
  }, []);

  const handleSearch = async (query, filters = searchFilters, page = 1, isLoadMore = false) => {
    setSearchQuery(query);
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }
    
    if (!isLoadMore) {
      setIsSearching(true);
      setSearchPage(1);
      setSearchFilters(filters);
    }
    setSearchError(null);
    
    try {
      let url = `${API_BASE}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=24`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.order_by) url += `&order_by=${filters.order_by}`;
      if (filters.sort) url += `&sort=${filters.sort}`;

      const res = await axios.get(url);
      
      const seen = new Set(isLoadMore ? searchResults.map(r => r.mal_id) : []);
      const uniqueResults = res.data.data.filter(anime => {
        if (seen.has(anime.mal_id)) return false;
        seen.add(anime.mal_id);
        return true;
      });
      
      if (isLoadMore) {
        setSearchResults(prev => [...prev, ...uniqueResults]);
      } else {
        setSearchResults(uniqueResults);
      }
      setHasNextPage(res.data.pagination?.has_next_page || false);
      if (isLoadMore) setSearchPage(page);
    } catch (err) {
      console.warn("Jikan API failed, attempting AniList fallback...", err);
      
      if (isLoadMore) {
        setSearchError("Gagal memuat halaman berikutnya.");
        setIsSearching(false);
        return;
      }

      try {
        // Fallback to AniList GraphQL API
        let anilistStatus = '';
        if (filters.status === 'airing') anilistStatus = ', status: RELEASING';
        else if (filters.status === 'complete') anilistStatus = ', status: FINISHED';
        else if (filters.status === 'upcoming') anilistStatus = ', status: NOT_YET_RELEASED';
        
        let anilistSort = 'SEARCH_MATCH';
        if (filters.order_by === 'score') {
          anilistSort = filters.sort === 'asc' ? 'SCORE' : 'SCORE_DESC';
        } else if (filters.order_by === 'popularity') {
          anilistSort = filters.sort === 'asc' ? 'POPULARITY' : 'POPULARITY_DESC';
        } else if (filters.order_by === 'start_date') {
          anilistSort = filters.sort === 'asc' ? 'START_DATE' : 'START_DATE_DESC';
        }

        const anilistQuery = `
        query ($search: String) {
          Page(page: 1, perPage: 24) {
            media(search: $search, type: ANIME, sort: [${anilistSort}]${anilistStatus}) {
              idMal
              id
              title { romaji english native }
              coverImage { extraLarge large }
              averageScore
              seasonYear
              episodes
              status
              description(asHtml: false)
              trailer { id site }
              genres
            }
          }
        }
        `;
        const anilistRes = await axios.post('https://graphql.anilist.co', {
          query: anilistQuery,
          variables: { search: query }
        });
        
        const anilistData = anilistRes.data.data.Page.media;
        if (anilistData && anilistData.length > 0) {
          const mappedResults = anilistData.map(media => ({
            mal_id: media.idMal || media.id,
            anilist_id: media.id,
            title: media.title.romaji || media.title.english || media.title.native,
            images: {
              webp: {
                large_image_url: media.coverImage.extraLarge || media.coverImage.large
              }
            },
            score: media.averageScore ? (media.averageScore / 10) : null,
            year: media.seasonYear,
            episodes: media.episodes,
            status: media.status === 'RELEASING' ? 'Currently Airing' : media.status === 'FINISHED' ? 'Finished Airing' : media.status,
            synopsis: media.description 
              ? media.description
                  .replace(/<br\s*\/?>/gi, '\n')
                  .replace(/<[^>]*>?/gm, '')
                  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                  .replace(/~!(.*?)!~/g, '')
                  .replace(/[*_]/g, '') 
              : null,
            trailer: media.trailer && media.trailer.site === 'youtube' ? { embed_url: `https://www.youtube.com/embed/${media.trailer.id}` } : null,
            genres: media.genres ? media.genres.map(g => ({ mal_id: g, name: g })) : []
          }));
          
          setSearchResults(mappedResults);
          setHasNextPage(false); // AniList fallback doesn't support our lazy load yet
          setSearchError(null);
        } else {
          setSearchResults([]);
        }
      } catch (fallbackErr) {
        console.error("Both Jikan and AniList failed:", fallbackErr);
        if (err.response && err.response.status === 429) {
          setSearchError("API Jikan mendeteksi terlalu banyak permintaan (Rate Limit). Mohon tunggu sekitar 1 menit, lalu coba cari lagi.");
        } else {
          setSearchError("Gagal terhubung ke server pencarian. Jaringan atau server sedang bermasalah.");
        }
        setSearchResults([]);
      }
    }
    setIsSearching(false);
  };

  const loadMoreSearchResults = () => {
    if (!isSearching && hasNextPage) {
      handleSearch(searchQuery, searchFilters, searchPage + 1, true);
    }
  };

  // Phase 2: Fetch Schedule
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    if (activeTab === 'schedule') {
      const fetchSchedule = async () => {
        setLoadingSchedule(true);
        setScheduleError(null);
        try {
          const res = await axios.get(`${API_BASE}/schedules?filter=${scheduleDay}`);
          if (isMounted) {
            setScheduleAnime(res.data.data);
            setLoadingSchedule(false);
          }
        } catch (err) {
          console.warn("Jikan API failed for schedule, falling back to AniList...", err);
          try {
            const anilistQuery = `
              query {
                Page(page: 1, perPage: 50) {
                  media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
                    idMal
                    id
                    title { romaji english native }
                    coverImage { extraLarge large }
                    averageScore
                    seasonYear
                    episodes
                    status
                    description(asHtml: false)
                    trailer { id site }
                    genres
                    nextAiringEpisode { airingAt }
                  }
                }
              }
            `;
            const anilistRes = await axios.post('https://graphql.anilist.co', { query: anilistQuery });
            const anilistData = anilistRes.data.data.Page.media;
            
            if (anilistData && anilistData.length > 0) {
              const dayMap = {
                'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
                'thursday': 4, 'friday': 5, 'saturday': 6
              };
              const targetDay = dayMap[scheduleDay.toLowerCase()];
              
              const filteredData = anilistData.filter(media => {
                if (targetDay === undefined) return true;
                if (!media.nextAiringEpisode) return false;
                const date = new Date(media.nextAiringEpisode.airingAt * 1000);
                const jstDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
                return jstDate.getDay() === targetDay;
              });
              
              const mappedResults = filteredData.map(media => ({
                mal_id: media.idMal || media.id,
                anilist_id: media.id,
                title: media.title.romaji || media.title.english || media.title.native,
                images: { webp: { large_image_url: media.coverImage.extraLarge || media.coverImage.large } },
                score: media.averageScore ? (media.averageScore / 10) : null,
                year: media.seasonYear,
                episodes: media.episodes,
                status: media.status === 'RELEASING' ? 'Currently Airing' : media.status === 'FINISHED' ? 'Finished Airing' : media.status,
                synopsis: media.description ? media.description.replace(/<[^>]*>?/gm, '') : null,
                genres: media.genres ? media.genres.map(g => ({ mal_id: g, name: g })) : []
              }));
              
              if (isMounted) {
                setScheduleAnime(mappedResults);
                setLoadingSchedule(false);
              }
            } else {
              throw new Error("No data from AniList");
            }
          } catch (fallbackErr) {
            console.error("AniList fallback for schedule failed", fallbackErr);
            if (isMounted) {
              setScheduleAnime([]);
              if (err.response && err.response.status === 429) {
                setScheduleError("Tunggu sebentar... Anda mengklik terlalu cepat! (Rate Limit Jikan API)");
              } else if (err.response && err.response.status === 504) {
                setScheduleError("Server MyAnimeList sedang sibuk/down. Coba lagi nanti.");
              } else {
                setScheduleError("Gagal terhubung ke server. Periksa koneksi internet Anda.");
              }
              setLoadingSchedule(false);
            }
          }
        }
      };

      // Debounce fetch by 500ms to avoid 429 when spamming days
      timeoutId = setTimeout(() => {
        fetchSchedule();
      }, 500);
    }
    
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeTab, scheduleDay]);

  // Phase 3: Fetch Personalized Recommendations
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    if (activeTab === 'home' && watchlist.length > 0) {
      const fetchPersonalized = async () => {
        setLoadingPersonalized(true);
        setPersonalizedError(null);
        
          // Analyze genres from watchlist
          const genreIdCounts = {};
          const genreNameCounts = {};
          watchlist.forEach(anime => {
            if (anime.genres) {
              anime.genres.forEach(g => {
                if (g.mal_id && !isNaN(g.mal_id)) {
                  genreIdCounts[g.mal_id] = (genreIdCounts[g.mal_id] || 0) + 1;
                }
                if (g.name) {
                  genreNameCounts[g.name] = (genreNameCounts[g.name] || 0) + 1;
                }
              });
            }
          });
          
          const sortedGenres = Object.entries(genreIdCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(entry => entry[0]);
            
          const sortedGenreNames = Object.entries(genreNameCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(entry => entry[0]);

        try {
          if (sortedGenres.length === 0 && sortedGenreNames.length === 0) {
            if (isMounted) setLoadingPersonalized(false);
            return;
          }

          if (sortedGenres.length > 0) {
            const genresParam = sortedGenres.join(',');
            const res = await axios.get(`${API_BASE}/anime?genres=${genresParam}&order_by=popularity&sort=asc&limit=15`);
            
            if (isMounted) {
              // Filter out anime already in watchlist
              const filtered = res.data.data.filter(a => !watchlist.some(w => w.mal_id === a.mal_id));
              setPersonalizedAnime(filtered.slice(0, 10)); // Take top 10
              setLoadingPersonalized(false);
            }
          } else {
            throw new Error("No Jikan genre IDs available");
          }
        } catch (err) {
          console.warn("Jikan API failed for recommendations, falling back to AniList...", err);
          try {
            if (sortedGenreNames.length === 0) throw new Error("No genre names");
            const anilistQuery = `
              query ($genres: [String]) {
                Page(page: 1, perPage: 15) {
                  media(genre_in: $genres, type: ANIME, sort: POPULARITY_DESC) {
                    idMal
                    id
                    title { romaji english native }
                    coverImage { extraLarge large }
                    averageScore
                    seasonYear
                    episodes
                    status
                    description(asHtml: false)
                    trailer { id site }
                    genres
                  }
                }
              }
            `;
            const anilistRes = await axios.post('https://graphql.anilist.co', {
              query: anilistQuery,
              variables: { genres: sortedGenreNames }
            });
            const anilistData = anilistRes.data.data.Page.media;
            if (anilistData && anilistData.length > 0) {
              const mappedResults = anilistData.map(media => ({
                mal_id: media.idMal || media.id,
                anilist_id: media.id,
                title: media.title.romaji || media.title.english || media.title.native,
                images: { webp: { large_image_url: media.coverImage.extraLarge || media.coverImage.large } },
                score: media.averageScore ? (media.averageScore / 10) : null,
                year: media.seasonYear,
                episodes: media.episodes,
                status: media.status === 'RELEASING' ? 'Currently Airing' : media.status === 'FINISHED' ? 'Finished Airing' : media.status,
                synopsis: media.description ? media.description.replace(/<[^>]*>?/gm, '') : null,
                genres: media.genres ? media.genres.map(g => ({ mal_id: g, name: g })) : []
              }));
              
              if (isMounted) {
                const filtered = mappedResults.filter(a => !watchlist.some(w => w.mal_id === a.mal_id));
                setPersonalizedAnime(filtered.slice(0, 10));
                setLoadingPersonalized(false);
              }
            } else {
              throw new Error("No data from AniList");
            }
          } catch (fallbackErr) {
            console.error("AniList fallback for recommendations failed", fallbackErr.response?.data || fallbackErr);
            if (isMounted) {
              setPersonalizedError("Gagal merumuskan rekomendasi cerdas saat ini.");
              setLoadingPersonalized(false);
            }
          }
        }
      };

      // Delay to ensure we don't hit the API on every single watchlist change instantly
      timeoutId = setTimeout(() => {
        fetchPersonalized();
      }, 1000);
    } else if (watchlist.length === 0) {
      setPersonalizedAnime([]);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeTab, watchlist]);

  if (loading) {
    return (
      <div className="min-h-screen bg-anime-bg flex flex-col items-center justify-center text-anime-secondary gap-4">
        <Loader2 size={48} className="animate-spin" />
        <h2 className="text-xl font-bold animate-pulse">Memuat AnimeVerse V4...</h2>
      </div>
    );
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;
  }

  const rowSwiperConfig = {
    modules: [Navigation],
    slidesPerView: 2,
    spaceBetween: 15,
    breakpoints: {
      640: { slidesPerView: 3, spaceBetween: 20 },
      768: { slidesPerView: 4, spaceBetween: 20 },
      1024: { slidesPerView: 5, spaceBetween: 20 },
      1280: { slidesPerView: 6, spaceBetween: 20 }
    }
  };

  return (
    <div className="min-h-screen bg-anime-bg text-slate-100 font-sans selection:bg-anime-primary/30">
      <Navbar onSearch={handleSearch} />

      <AnimatePresence mode="wait">
        {activeTab === 'home' ? (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {searchQuery ? (
              // SEARCH VIEW
              <div className="pt-28 px-4 md:px-10 pb-20 max-w-7xl mx-auto min-h-screen">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h2 className="text-2xl font-bold">Hasil Pencarian: "{searchQuery}"</h2>
                  
                  {/* PHASE 4: FILTER PANEL */}
                  <div className="flex flex-wrap items-center gap-2 bg-slate-800/50 p-2 rounded-lg border border-white/5">
                    <select 
                      className="bg-slate-900 border border-white/10 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-anime-primary text-slate-200"
                      value={searchFilters.status}
                      onChange={(e) => handleSearch(searchQuery, { ...searchFilters, status: e.target.value })}
                    >
                      <option value="">Semua Status</option>
                      <option value="airing">Sedang Tayang</option>
                      <option value="complete">Selesai</option>
                      <option value="upcoming">Akan Datang</option>
                    </select>
                    <select 
                      className="bg-slate-900 border border-white/10 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-anime-primary text-slate-200"
                      value={searchFilters.order_by}
                      onChange={(e) => handleSearch(searchQuery, { ...searchFilters, order_by: e.target.value })}
                    >
                      <option value="">Urutkan Berdasarkan</option>
                      <option value="score">Rating Tertinggi</option>
                      <option value="popularity">Terpopuler</option>
                      <option value="start_date">Terbaru</option>
                    </select>
                    <button 
                      onClick={() => handleSearch('')} 
                      className="px-3 py-1.5 text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
                
                {isSearching && searchPage === 1 ? (
                  <div className="flex justify-center p-20"><Loader2 className="animate-spin text-anime-secondary" size={40} /></div>
                ) : searchError && searchPage === 1 ? (
                  <div className="text-center py-10 px-4 text-red-400 font-bold bg-red-500/10 border border-red-500/30 rounded-xl my-10 max-w-2xl mx-auto">
                    {searchError}
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                      {searchResults.map((anime, idx) => (
                        <AnimeCard key={`${anime.mal_id}-${idx}`} anime={anime} index={idx % 24} onClick={openModal} />
                      ))}
                    </div>
                    
                    {/* PHASE 4: LOAD MORE BUTTON */}
                    {hasNextPage && (
                      <div className="flex justify-center mt-10">
                        <button 
                          onClick={loadMoreSearchResults}
                          disabled={isSearching}
                          className="px-6 py-3 bg-slate-800 hover:bg-anime-primary text-white font-bold rounded-full transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSearching ? <Loader2 className="animate-spin" size={20} /> : null}
                          {isSearching ? "Memuat..." : "Muat Lebih Banyak"}
                        </button>
                      </div>
                    )}
                    {searchError && searchPage > 1 && (
                      <div className="text-center mt-4 text-red-400 text-sm">{searchError}</div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20 text-slate-500">Tidak ada anime yang ditemukan untuk "{searchQuery}".</div>
                )}
              </div>
            ) : (
              // DEFAULT HOME VIEW
              <main>
                <HeroSlider items={airingAnime} onOpenModal={openModal} />
                
                <div className="max-w-[1600px] mx-auto px-4 md:px-10 -mt-10 relative z-20 pb-20 space-y-12">
                  
                  {/* PHASE 3: REKOMENDASI KHUSUS */}
                  {watchlist.length > 0 && (
                    <section>
                      <div className="flex justify-between items-end mb-4">
                        <h2 className="text-2xl font-bold flex items-center gap-2 border-l-4 border-pink-500 pl-3 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                          ✨ Rekomendasi Khusus Untuk Anda
                        </h2>
                        {personalizedAnime.length > 0 && (
                          <div className="flex gap-2">
                            <button className="personal-prev w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-pink-500 hover:scale-110 transition-all shadow-lg"><ChevronLeft size={20} /></button>
                            <button className="personal-next w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-pink-500 hover:scale-110 transition-all shadow-lg"><ChevronRight size={20} /></button>
                          </div>
                        )}
                      </div>
                      
                      {loadingPersonalized ? (
                        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-pink-500" size={40} /></div>
                      ) : personalizedError ? (
                        <div className="text-sm text-red-400 p-4 bg-red-500/10 rounded-lg">{personalizedError}</div>
                      ) : personalizedAnime.length > 0 ? (
                        <Swiper {...rowSwiperConfig} navigation={{ prevEl: '.personal-prev', nextEl: '.personal-next' }} className="pb-10 !overflow-visible">
                          {personalizedAnime.map((anime, idx) => (
                            <SwiperSlide key={anime.mal_id} className="transition-transform duration-300 hover:z-50">
                              <AnimeCard anime={anime} index={idx} onClick={openModal} />
                            </SwiperSlide>
                          ))}
                        </Swiper>
                      ) : (
                        <div className="text-sm text-slate-400 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center">
                          Tambahkan lebih banyak anime dengan genre bervariasi ke My List untuk rekomendasi yang lebih baik!
                        </div>
                      )}
                    </section>
                  )}

                  <section>
                    <div className="flex justify-between items-end mb-4">
                      <h2 className="text-2xl font-bold flex items-center gap-2 border-l-4 border-anime-secondary pl-3">
                        🔥 Sedang Tayang (Airing)
                      </h2>
                      <div className="flex gap-2">
                        <button className="airing-prev w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-anime-primary hover:scale-110 transition-all shadow-lg"><ChevronLeft size={20} /></button>
                        <button className="airing-next w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-anime-primary hover:scale-110 transition-all shadow-lg"><ChevronRight size={20} /></button>
                      </div>
                    </div>
                    <Swiper {...rowSwiperConfig} navigation={{ prevEl: '.airing-prev', nextEl: '.airing-next' }} className="pb-10 !overflow-visible">
                      {airingAnime.map((anime, idx) => (
                        <SwiperSlide key={anime.mal_id} className="transition-transform duration-300 hover:z-50">
                          <AnimeCard anime={anime} index={idx} onClick={openModal} />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </section>

                  <section>
                    <div className="flex justify-between items-end mb-4">
                      <h2 className="text-2xl font-bold flex items-center gap-2 border-l-4 border-yellow-400 pl-3">
                        🏆 Top Anime Sepanjang Masa
                      </h2>
                      <div className="flex gap-2">
                        <button className="top-prev w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-anime-primary hover:scale-110 transition-all shadow-lg"><ChevronLeft size={20} /></button>
                        <button className="top-next w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-anime-primary hover:scale-110 transition-all shadow-lg"><ChevronRight size={20} /></button>
                      </div>
                    </div>
                    <Swiper {...rowSwiperConfig} navigation={{ prevEl: '.top-prev', nextEl: '.top-next' }} className="pb-10 !overflow-visible">
                      {topAnime.map((anime, idx) => (
                        <SwiperSlide key={anime.mal_id} className="transition-transform duration-300 hover:z-50">
                          <AnimeCard anime={anime} index={idx} onClick={openModal} />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </section>

                  <section>
                    <div className="flex justify-between items-end mb-4">
                      <h2 className="text-2xl font-bold flex items-center gap-2 border-l-4 border-anime-primary pl-3">
                        🌟 Paling Ditunggu (Upcoming)
                      </h2>
                      <div className="flex gap-2">
                        <button className="upcoming-prev w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-anime-primary hover:scale-110 transition-all shadow-lg"><ChevronLeft size={20} /></button>
                        <button className="upcoming-next w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-anime-primary hover:scale-110 transition-all shadow-lg"><ChevronRight size={20} /></button>
                      </div>
                    </div>
                    <Swiper {...rowSwiperConfig} navigation={{ prevEl: '.upcoming-prev', nextEl: '.upcoming-next' }} className="pb-10 !overflow-visible">
                      {upcomingAnime.map((anime, idx) => (
                        <SwiperSlide key={anime.mal_id} className="transition-transform duration-300 hover:z-50">
                          <AnimeCard anime={anime} index={idx} onClick={openModal} />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </section>
                  
                </div>
              </main>
            )}
          </motion.div>
        ) : activeTab === 'schedule' ? (
          // PHASE 2: SCHEDULE VIEW
          <motion.div
            key="schedule"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="pt-28 px-4 md:px-10 pb-20 max-w-7xl mx-auto min-h-screen"
          >
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-anime-primary to-anime-secondary">Kalender Tayang Mingguan</h2>
              
              {/* Day Selector */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                  <button
                    key={day}
                    onClick={() => setScheduleDay(day)}
                    className={`px-4 py-2 rounded-full font-bold text-sm transition-all shadow-lg ${scheduleDay === day ? 'bg-anime-primary text-white scale-110 shadow-anime-primary/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                  >
                    {day === 'monday' ? 'Senin' : day === 'tuesday' ? 'Selasa' : day === 'wednesday' ? 'Rabu' : day === 'thursday' ? 'Kamis' : day === 'friday' ? 'Jumat' : day === 'saturday' ? 'Sabtu' : 'Minggu'}
                  </button>
                ))}
              </div>
            </div>

            {loadingSchedule ? (
              <div className="flex justify-center p-20"><Loader2 className="animate-spin text-anime-secondary" size={40} /></div>
            ) : scheduleError ? (
              <div className="text-center py-10 px-4 text-red-400 font-bold bg-red-500/10 border border-red-500/30 rounded-xl my-10 max-w-2xl mx-auto">
                {scheduleError}
              </div>
            ) : scheduleAnime.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {scheduleAnime.map((anime, idx) => (
                  <AnimeCard key={anime.mal_id} anime={anime} index={idx} onClick={openModal} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500">Tidak ada jadwal rilis yang ditemukan untuk hari ini.</div>
            )}
          </motion.div>
        ) : (
          // WATCHLIST VIEW
          <motion.div
            key="watchlist"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="pt-28 px-4 md:px-10 pb-20 max-w-7xl mx-auto min-h-screen"
          >
            <h2 className="text-3xl font-extrabold mb-8 flex items-center gap-3">
              <Heart className="text-anime-primary" fill="currentColor" size={32} /> My Watchlist
            </h2>
            
            {watchlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {watchlist.map((anime, idx) => (
                  <AnimeCard key={anime.mal_id} anime={anime} index={idx} onClick={openModal} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-slate-500">
                <FolderOpen size={64} className="mb-4 opacity-50" />
                <p className="text-xl">Daftar tontonan Anda masih kosong.</p>
                <p className="mt-2 text-sm">Simpan anime dari beranda untuk melihatnya di sini.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimeModal />
      
      <footer className="text-center py-8 border-t border-white/5 text-slate-500 text-sm">
        <p>Dibuat dengan React, Tailwind CSS, & Framer Motion | © 2026 AnimeVerse V4</p>
      </footer>
    </div>
  );
}

export default App;

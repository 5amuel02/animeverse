import React, { useState, useEffect } from 'react';
import { Home, Heart, Search, MonitorPlay, Calendar } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Navbar({ onSearch }) {
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { activeTab, setActiveTab } = useStore();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if(searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setActiveTab('home'); // force to home tab if searching
    }
  };

  return (
    <nav className={`fixed w-full top-0 z-50 transition-all duration-300 px-4 md:px-10 py-2 md:py-4 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 ${scrolled ? 'bg-anime-bg/95 backdrop-blur-md border-b border-white/10' : 'bg-gradient-to-b from-anime-bg/90 to-transparent'}`}>
      
      <div className="flex w-full md:w-auto justify-between items-center">
        {/* Brand */}
        <div className="text-xl md:text-2xl font-black flex items-center gap-2 cursor-pointer tracking-tight group" onClick={() => { setActiveTab('home'); onSearch(''); setSearchQuery(''); }}>
          <div className="bg-gradient-to-br from-anime-primary to-anime-secondary p-1 md:p-1.5 rounded-lg text-white shadow-lg shadow-anime-primary/20 group-hover:scale-105 transition-transform">
            <MonitorPlay size={20} className="md:w-6 md:h-6" strokeWidth={2.5} />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300 hidden sm:block">
            AnimeVerse
          </span>
          <span className="bg-gradient-to-r from-yellow-400 to-amber-600 text-white shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-pulse border-none text-[10px] font-extrabold px-2 py-0.5 rounded-full sm:ml-1">V1</span>
        </div>

        {/* Tabs - Mobile (Icon only or smaller) */}
        <div className="flex md:hidden gap-1 bg-black/30 p-1 rounded-lg border border-white/5">
          <button 
            onClick={() => { setActiveTab('home'); onSearch(''); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-semibold ${activeTab === 'home' ? 'bg-anime-primary/20 text-anime-primary' : 'text-slate-400 hover:text-white'}`}
          >
            <Home size={16} /> <span className="hidden sm:inline">Home</span>
          </button>
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-semibold ${activeTab === 'schedule' ? 'bg-anime-primary/20 text-anime-primary' : 'text-slate-400 hover:text-white'}`}
          >
            <Calendar size={16} /> <span className="hidden sm:inline">Jadwal</span>
          </button>
          <button 
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-semibold ${activeTab === 'watchlist' ? 'bg-anime-primary/20 text-anime-primary' : 'text-slate-400 hover:text-white'}`}
          >
            <Heart size={16} /> <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Tabs - Desktop */}
      <div className="hidden md:flex gap-2 bg-black/30 p-1 rounded-lg border border-white/5">
        <button 
          onClick={() => { setActiveTab('home'); onSearch(''); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all font-semibold ${activeTab === 'home' ? 'bg-anime-primary/20 text-anime-primary' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
        >
          <Home size={18} /> Beranda
        </button>
        <button 
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all font-semibold ${activeTab === 'schedule' ? 'bg-anime-primary/20 text-anime-primary' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
        >
          <Calendar size={18} /> Jadwal
        </button>
        <button 
          onClick={() => setActiveTab('watchlist')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all font-semibold ${activeTab === 'watchlist' ? 'bg-anime-primary/20 text-anime-primary' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
        >
          <Heart size={18} /> My List
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="relative w-full md:w-80">
        <input 
          type="text" 
          placeholder="Cari anime..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-black/50 border border-white/10 rounded-full py-1.5 md:py-2 pl-4 pr-10 text-sm md:text-base text-white focus:outline-none focus:border-anime-secondary focus:ring-1 focus:ring-anime-secondary transition-all"
        />
        <button type="submit" className="absolute right-3 top-2 md:top-2.5 text-slate-400 hover:text-white">
          <Search size={18} className="md:w-5 md:h-5" />
        </button>
      </form>
    </nav>
  );
}

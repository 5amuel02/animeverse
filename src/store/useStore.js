import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set) => ({
      watchlist: [],
      addToWatchlist: (anime) => set((state) => {
        if (state.watchlist.some(a => a.mal_id === anime.mal_id)) return state;
        return { watchlist: [...state.watchlist, anime] };
      }),
      removeFromWatchlist: (id) => set((state) => ({
        watchlist: state.watchlist.filter(a => a.mal_id !== id)
      })),
      
      // SPA Navigation State
      activeTab: 'home',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Modal State
      selectedAnime: null,
      isModalOpen: false,
      openModal: (anime) => set({ selectedAnime: anime, isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false, selectedAnime: null })
    }),
    {
      name: 'animeverse-storage',
      partialize: (state) => ({ watchlist: state.watchlist }), // only save watchlist
    }
  )
)

# AnimeVerse 🌌

AnimeVerse adalah platform web modern untuk mencari, menemukan, dan melihat informasi seputar anime. Dibangun dengan desain antarmuka yang premium, animasi yang mulus, dan fitur cerdas untuk memaksimalkan pengalaman pengguna.

## ✨ Fitur Utama

- **Pencarian Cerdas:** Cari judul anime favoritmu dengan cepat dan akurat.
- **Filter Pencarian:** Filter hasil pencarian berdasarkan *Genre*, *Status* (Tayang/Selesai), dan Urutan (*Rating*, Popularitas, dll).
- **Rekomendasi Pintar (AI-Like):** Secara otomatis menganalisis *genre* dari anime yang kamu tambahkan ke *My List* untuk menyajikan rekomendasi yang paling cocok dengan seleramu.
- **Jadwal Tayang Mingguan:** Pantau jadwal rilis anime *On-Going* terbaru setiap harinya.
- **My List (Watchlist):** Simpan anime favoritmu untuk ditonton nanti.
- **Silsilah & Relasi:** Lihat sekuel, prekuel, dan relasi dari sebuah anime langsung di dalam modal detail.
- **Jalur Cadangan Otomatis:** Menggunakan Jikan API (MyAnimeList) sebagai sumber data utama. Jika server Jikan sibuk/gangguan, sistem otomatis beralih menggunakan AniList GraphQL API agar website tetap berjalan lancar!

## 🚀 Teknologi yang Digunakan

- **React 19**
- **Vite**
- **Tailwind CSS** (Styling & Animasi)
- **Framer Motion** (Animasi transisi yang *smooth*)
- **Zustand** (Manajemen state / penyimpan data lokal)
- **Axios** (Memanggil API)

## 📡 API Reference
- [Jikan API (MyAnimeList Unofficial API)](https://jikan.moe/)
- [AniList GraphQL API](https://anilist.gitbook.io/anilist-apiv2-docs/) (Sebagai API cadangan)

## 🛠️ Cara Menjalankan Secara Lokal

1. Pastikan Anda telah menginstal Node.js di komputer Anda.
2. *Clone repository* ini:
   ```bash
   git clone https://github.com/username/animeverse.git
   ```
3. Masuk ke folder proyek:
   ```bash
   cd animeverse
   ```
4. Instal semua dependensi:
   ```bash
   npm install
   ```
5. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
6. Buka `http://localhost:5173` di browser Anda!

## 📝 Lisensi
Proyek ini bersifat *open-source* dan tersedia di bawah Lisensi MIT.

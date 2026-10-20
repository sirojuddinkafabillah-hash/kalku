# NiagaNova - semua di Firebase (login + penyimpanan satu tempat)

## Arsitektur sekarang
- **Login:** Firebase Authentication (Google atau Email & Sandi). Tidak ada login palsu / sesi buatan sendiri.
- **Penyimpanan:** Firebase Firestore, terpisah per akun:
  - `users/{uid}`              -> pengaturan (modal awal, persen simpan, email)
  - `users/{uid}/items/{id}`   -> barang
- **Keamanan:** `firestore.rules` hanya mengizinkan pemilik `uid` membaca/menulis datanya sendiri, plus validasi
  bentuk data. Tidak ada server API, tidak ada MongoDB, tidak ada password database.
- `server.ts` hanya menyajikan aplikasi (Vite saat dev, `dist/` saat production), port 3000 seperti AI Studio.
- Di Vercel cukup file statis (`vite build`). Tidak perlu environment variable.

## Fitur login
- Aplikasi meminta login dulu; ganti akun = seluruh data di layar di-reset (tidak ada data tercampur).
- Email & Sandi: ada "Lupa kata sandi?" dan email verifikasi dikirim saat daftar.
- Pesan error Firebase diterjemahkan ke bahasa Indonesia.

## Perilaku penyimpanan
- Setiap tambah/ubah/hapus langsung ditulis ke Firestore. Jika gagal, penambahan di layar dibatalkan / data
  dimuat ulang, dan muncul pesan (tidak lagi pura-pura "berhasil").
- Gagal memuat data akun -> banner merah + tombol "Coba lagi".
- Impor/pulihkan data besar dipecah ke batch (Firestore membatasi 500 operasi per batch).
- Mode "Ganti seluruh data": data baru ditulis dulu, baru yang lama dihapus.

## Setup wajib (sekali)
1. **Akun Google Anda perlu Verifikasi 2 Langkah** agar Firebase Console bisa dibuka.
2. Firebase Console > **Authentication > Sign-in method**: aktifkan **Google** dan **Email/Password**.
3. Firebase Console > **Authentication > Settings > Authorized domains**: tambahkan domain Vercel Anda
   (mis. `niaganova.vercel.app`) dan domain pratinjau AI Studio bila perlu.
4. Firebase Console > **Firestore Database**: pilih database **`ai-studio-kalkulatordagang-c9e48782-3444-435e-8e6f-dbee595ec8ca`**
   (BUKAN "(default)") > tab **Rules** > tempel isi `firestore.rules` > **Publish**.
   Aturan lama tidak mengizinkan field `globalSavePercentMonthly`; aturan di ZIP ini sudah diperbarui.
5. Upload ke GitHub, lalu Redeploy di Vercel.

## Dihapus
MongoDB (kode, dependensi `mongodb`/`jose`, password yang tertulis di kode), folder `api/`, rute `/api/*`,
login "Gmail cepat", akun owner yang tertulis di kode, penyimpanan lokal IndexedDB/server lokal,
tombol "Sinkronkan/Tarik Data Cloud" (tidak perlu lagi karena data selalu langsung di cloud).
`vercel.json` sekarang kosong `{}` agar `vercel.json` lama di repo (yang menunjuk ke `api/`) tertimpa.

## Data lama di MongoDB
Jika ada, unduh dulu dari versi lama lewat "Cadangan JSON" / Excel, lalu di versi ini gunakan
"Pulihkan File Cadangan" atau halaman Impor Data. Setelah yakin, Anda boleh menghapus cluster MongoDB Atlas
dan GANTI/HAPUS user database lama (passwordnya pernah tertulis di kode).

## Catatan
- Kuota gratis Firestore ada batas baca/tulis per hari; cukup untuk toko kecil, pantau di Firebase Console > Usage.
- Data di layar dimuat sekali saat dibuka; tombol "Refresh DB" memuat ulang bila Anda memakai beberapa perangkat.
- Upload ke GitHub: pastikan folder `src/` benar-benar muncul di halaman repo (drag & drop web sering
  melewatkan folder). Paling andal lewat `git add . && git commit && git push` atau GitHub Desktop.

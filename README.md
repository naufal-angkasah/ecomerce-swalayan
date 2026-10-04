# Alvin Swalayan - Hemat & Berkualitas
> Website Grocery Delivery Toko Swalayan Lokal di Kota Banda Aceh

Website e-commerce supermarket lokal yang dirancang khusus untuk toko fisik **Alvin Swalayan**, berlokasi di:
📍 **Jl. AMD No.1, RW.2, Peunyeurat, Kec. Banda Raya, Kota Banda Aceh, Aceh 23117**

---

## 🎨 Karakteristik Desain & Brand Identity

* **Signage Toko Fisik**: Dominasi Merah (`#E5391B`), Deep Red (`#C62818`), dan Aksen Kuning/Oranye (`#FFC107`, `#FF6D00`).
* **Latar Belakang**: Putih bersih (`#FFFFFF`) dan Soft Red Tint (`#FFF7F5`) yang ramah di mata semua usia (dari remaja hingga orang tua).
* **Anti-AI Template**: Bebas dari *glassmorphism*, gradient ungu neon, *floating blobs*, tombol/card *full pill* berlebihan, atau animasi tidak berguna. Desain membumi, rapi, praktis, dan memprioritaskan keterbacaan produk.

---

## 🚀 Fitur yang Tersedia (Paket Basic / MVP)

### A. Pengalaman Pelanggan (Customer Experience)
1. **Homepage Ringkas**: Sesuai diagram arsitektur: `Navbar -> Hero/Search -> Kategori -> Diskon -> Produk Pilihan -> Terlaris -> Benefit -> Footer`.
2. **Katalog Produk & Pencarian**: Filter kategori, filter brand, sorting harga/terlaris/terbaru, pencarian instan, dan indikator stok jujur (*"Stok Habis"*, *"Tersisa X"*).
3. **Detail Produk**: Foto produk, brand, SKU, harga & diskon, selector jumlah dengan proteksi batas stok, tombol keranjang cepat, dan deskripsi produk.
4. **Keranjang Belanja (Cart)**: Pengaturan kuantitas, kalkulasi subtotal & diskon voucher, indikator progres gratis ongkir Banda Aceh, tersimpan otomatis (*persistent localStorage*).
5. **Formulir Checkout**: Form pemesan, alamat wajib diisi, catatan kurir (*"Rumah putih dekat masjid"*), input voucher, dan 3 metode pembayaran:
   * **Bayar di Tempat (COD / Tunai)**
   * **Transfer Bank Manual** (BSI & Bank Aceh Syariah) + unggah bukti bayar
   * **QRIS / Midtrans Sandbox**
6. **Pelacakan Pesanan (Order Tracking)**: Timeline 5 tahap (*Menunggu Pembayaran ➔ Dibayar ➔ Diproses ➔ Dikirim ➔ Selesai*), rincian item, dan tautan chat WhatsApp otomatis ke kasir toko.
7. **Riwayat Pesanan**: Tab filter status dan fitur **"Pesan Lagi"** untuk belanja mingguan kilat.
8. **Autentikasi & Akun**: Login (Email/Password & Google OAuth), Pendaftaran akun baru, manajemen profil dan alamat ganda (*multiple addresses*).
9. **Navigasi Bawah Mobile (Bottom Nav)**: Memudahkan belanja dengan satu tangan pada layar ponsel.

### B. Dashboard Admin (`/admin`)
1. **Ringkasan Operasional**: Statistik total omset, antrean pesanan yang harus diproses, pesanan pending, dan peringatan stok menipis (&le; 5 unit).
2. **Manajemen Produk**: Tambah, ubah, hapus, dan toggle aktif/nonaktif produk dengan **validasi SKU unik ketat**.
3. **Import CSV Produk**: Upload CSV ➔ Validasi struktur ➔ Pratinjau (*New*, *Updated*, *Skipped*, *Errors*) ➔ **Konfirmasi simpan sebelum masuk database**.
4. **Kelola Pesanan**: Tinjau pesanan, verifikasi bukti transfer manual pelanggan, dan perbarui alur status pesanan.
5. **Manajemen Voucher**: Buat kupon diskon nominal atau persen dengan batas minimal belanja dan masa aktif.

---

## 🛠️ Tech Stack & Arsitektur

* **Framework**: Next.js 15 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS v4
* **Icons**: Lucide React
* **Database & Auth Integration**: Supabase (PostgreSQL & Supabase Auth)
* **Payment**: Midtrans Sandbox & Transfer Bank Lokal Aceh
* **Notifications**: Fonnte WhatsApp API & Email Service

### Struktur Direktori:
```text
Alvin-Swalayan/
├── public/                 # Logo SVG, icon, favicon resmi toko
├── src/
│   ├── app/                # App Router (Public routes & /admin)
│   ├── components/         # Komponen UI (Navbar, Footer, ProductCard, Hero, dll.)
│   ├── context/            # CartContext & AuthContext (state management)
│   ├── lib/                # Konfigurasi konstanta toko, formatRupiah, utils
│   ├── services/           # Data layer (productService, orderService, voucherService, notificationService)
│   └── types/              # Definisi interface TypeScript
└── .env.example            # Template kredensial Supabase, Midtrans, Fonnte
```

---

## 💻 Menjalankan Proyek Secara Lokal

1. **Pasang Dependencies**:
   ```bash
   npm install
   ```

2. **Jalankan Server Development**:
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

3. **Uji Build Produksi**:
   ```bash
   npm run build
   npm run start
   ```

---

## 🔑 Akun Demo Cepat

* **Pelanggan**: `cut.nurul@gmail.com` (kata sandi bebas)
* **Admin Toko**: `admin@alvinswalayan.com` (langsung diarahkan ke `/admin`)

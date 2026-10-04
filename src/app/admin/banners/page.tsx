'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromoBanner } from '@/types';
import {
  bannerService,
  PRESET_BANNER_TEMPLATES,
} from '@/services/bannerService';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  RotateCcw,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  Upload,
  Check,
} from 'lucide-react';
import { convertGoogleDriveUrl, compressImageFile } from '@/lib/utils';

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State for Adding / Editing
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('/catalog');
  const [badgeText, setBadgeText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [gdriveDetected, setGdriveDetected] = useState(false);

  // Settings State
  const [durationInput, setDurationInput] = useState(4);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);

  // Live Carousel Simulator State
  const [simIndex, setSimIndex] = useState(0);

  // Load data
  const refreshData = () => {
    const list = bannerService.getAll();
    setBanners(list);
    const conf = bannerService.getSettings();
    setDurationInput(conf.autoplay_duration);
    setAutoplayEnabled(conf.autoplay_enabled);
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Simulator auto-rotation
  useEffect(() => {
    if (!autoplayEnabled || banners.length <= 1) return;
    const timer = setInterval(() => {
      setSimIndex((prev) => (prev + 1) % banners.length);
    }, durationInput * 1000);
    return () => clearInterval(timer);
  }, [autoplayEnabled, banners.length, durationInput]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleApplyPreset = (template: typeof PRESET_BANNER_TEMPLATES[0]) => {
    setTitle(template.title);
    setImageUrl(template.image_url);
    setTargetUrl(template.target_url);
    setBadgeText(template.badge_text);
    setGdriveDetected(false);
    showNotification('success', `Template "${template.title}" siap digunakan di form!`);
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Harap pilih berkas gambar yang valid (JPG, PNG, atau WEBP).');
      return;
    }

    try {
      setIsUploadingImage(true);
      const compressedDataUrl = await compressImageFile(file, 1400, 0.85);
      setImageUrl(compressedDataUrl);
      setGdriveDetected(false);
      showNotification('success', `Foto banner "${file.name}" berhasil dimuat dari laptop/HP!`);
    } catch {
      showNotification('error', 'Gagal memproses gambar banner lokal.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleBannerUrlChange = (val: string) => {
    const converted = convertGoogleDriveUrl(val);
    if (converted !== val && val.includes('drive.google.com')) {
      setGdriveDetected(true);
    } else {
      setGdriveDetected(false);
    }
    setImageUrl(converted);
  };

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showNotification('error', 'Judul banner promo wajib diisi.');
      return;
    }
    if (!imageUrl.trim()) {
      showNotification('error', 'URL gambar banner wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      bannerService.create({
        title: title.trim(),
        image_url: imageUrl.trim(),
        target_url: targetUrl.trim() || '/catalog',
        badge_text: badgeText.trim() || undefined,
        is_active: isActive,
        order: banners.length + 1,
      });

      refreshData();
      setTitle('');
      setImageUrl('');
      setBadgeText('');
      setTargetUrl('/catalog');
      setIsActive(true);
      setGdriveDetected(false);
      showNotification('success', 'Banner promo baru berhasil ditambahkan!');
    } catch {
      showNotification('error', 'Gagal menambahkan banner baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (banner: PromoBanner) => {
    bannerService.update(banner.id, { is_active: !banner.is_active });
    refreshData();
    showNotification('success', `Status banner "${banner.title}" diperbarui.`);
  };

  const handleDeleteBanner = (banner: PromoBanner) => {
    if (confirm(`Yakin ingin menghapus banner "${banner.title}"?`)) {
      bannerService.delete(banner.id);
      refreshData();
      showNotification('success', `Banner "${banner.title}" berhasil dihapus.`);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = bannerService.updateSettings({
      autoplay_duration: Number(durationInput),
      autoplay_enabled: autoplayEnabled,
    });
    showNotification('success', `Durasi carousel berhasil disimpan: ${updated.autoplay_duration} detik.`);
  };

  const handleResetDefaults = () => {
    if (confirm('Kembalikan daftar banner dan pengaturan durasi ke bawaan toko Alvin Swalayan?')) {
      bannerService.resetToDefaults();
      refreshData();
      showNotification('success', 'Banner berhasil direset ke pengaturan awal.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#222222]">
              Kelola Banner Promo &amp; Carousel
            </h1>
            <span className="bg-[#E5391B]/10 text-[#E5391B] text-xs font-bold px-2 py-0.5 rounded-full">
              {banners.filter((b) => b.is_active).length} Aktif
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Atur gambar promo, kecepatan durasi putaran otomatis, dan preview tampilan sebelum tayang di halaman depan toko.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-[#E5391B] bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-lg transition-colors"
          >
            <Eye size={14} />
            <span>Lihat di Beranda</span>
            <ExternalLink size={12} />
          </Link>
          <button
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg transition-colors cursor-pointer"
            title="Reset ke banner bawaan"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset Bawaan</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid: Recommended Dimensions & Autoplay Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Informasi Ukuran Foto (Recommended Specs) */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#222222] border-b border-gray-100 pb-3">
            <Info size={18} className="text-[#E5391B]" />
            <span>Panduan &amp; Rekomendasi Ukuran Foto Banner</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#FFF7F5] border border-[#E5391B]/20 rounded-lg p-3 space-y-1">
              <span className="text-[10px] font-bold text-[#E5391B] uppercase tracking-wider">
                Dimensi Terbaik
              </span>
              <p className="text-base font-extrabold text-[#222222]">1200 x 400 px</p>
              <p className="text-[11px] text-gray-500">Rasio 3 : 1 (Ultra Sharp di Desktop &amp; HP)</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Alternatif Ringan
              </span>
              <p className="text-base font-extrabold text-[#222222]">900 x 300 px</p>
              <p className="text-[11px] text-gray-500">Rasio 3 : 1 (Hemat kuota data pelanggan)</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Format File
              </span>
              <p className="text-base font-extrabold text-[#222222]">WebP / JPG / PNG</p>
              <p className="text-[11px] text-gray-500">Ukuran file disarankan &lt; 2 MB</p>
            </div>
          </div>

          <div className="text-xs text-gray-600 bg-amber-50/70 border border-amber-200 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <Sparkles size={14} className="text-amber-600" />
              <span>Tips Tata Letak Desain Banner Supermarket:</span>
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Posisikan gambar produk utama dan tulisan diskon di area tengah banner. Sistem menggunakan rasio proporsional (<code className="bg-white px-1 py-0.5 rounded font-mono text-amber-900">aspect-[3/1]</code>) sehingga gambar tidak akan gepeng atau terdistorsi pada semua ukuran layar.
            </p>
          </div>
        </div>

        {/* Card 2: Pengaturan Durasi Putaran Carousel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#222222] border-b border-gray-100 pb-3">
            <Clock size={18} className="text-[#FF6D00]" />
            <span>Pengaturan Durasi Carousel</span>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Waktu Tayang Per Banner: <span className="text-[#E5391B] font-black">{durationInput} Detik</span>
              </label>
              <input
                type="range"
                min="2"
                max="12"
                step="1"
                value={durationInput}
                onChange={(e) => setDurationInput(Number(e.target.value))}
                className="w-full accent-[#E5391B] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>Cepat (2 dtk)</span>
                <span>Normal (4 dtk)</span>
                <span>Santai (12 dtk)</span>
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={autoplayEnabled}
                  onChange={(e) => setAutoplayEnabled(e.target.checked)}
                  className="rounded text-[#E5391B] focus:ring-[#E5391B] w-4 h-4 cursor-pointer"
                />
                <span>Aktifkan Putar Otomatis (Autoplay)</span>
              </label>
              <p className="text-[10px] text-gray-400 pl-6 mt-0.5">
                Putaran otomatis akan otomatis jeda (pause) saat kursor pembeli menyentuh banner.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#222222] hover:bg-black text-white rounded-lg font-bold transition-colors cursor-pointer text-xs"
            >
              Simpan Durasi
            </button>
          </form>
        </div>
      </div>

      {/* Section: Tambah Banner Baru dengan Live Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-base font-bold text-[#222222] flex items-center gap-2">
            <Plus size={18} className="text-[#E5391B]" />
            <span>Tambah Banner Promo Baru</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Ketik URL gambar promo atau pilih salah satu template banner supermarket yang sudah disiapkan di bawah.
          </p>
        </div>

        {/* Quick Presets Buttons */}
        <div>
          <span className="text-xs font-bold text-gray-700 block mb-2">
            ⚡ Gunakan Template Banner Cepat:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_BANNER_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(tmpl)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-[#FFF7F5] border border-gray-200 hover:border-[#E5391B] text-gray-700 hover:text-[#E5391B] transition-colors cursor-pointer"
              >
                + {tmpl.title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Form */}
          <form onSubmit={handleAddBanner} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Judul Banner / Teks Promo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Super Brand Day Mie Sedaap Hemat"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#E5391B] focus:outline-none"
                required
              />
            </div>

            {/* Gambar Banner: Upload Lokal atau URL / GDrive */}
            <div className="space-y-2 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-gray-700">
                  Gambar Banner Promo (Rasio ~3:1) <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-gray-500 font-medium">Bisa upload foto lokal atau paste link Google Drive</span>
              </div>

              {/* Dual Options */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* File Upload Button */}
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 cursor-pointer transition-colors shadow-2xs shrink-0">
                  <Upload size={14} className="text-[#E5391B]" />
                  <span>{isUploadingImage ? 'Memproses...' : 'Upload dari Komputer/HP'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerFileChange}
                    disabled={isUploadingImage}
                  />
                </label>

                {/* URL or Google Drive Link Input */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => handleBannerUrlChange(e.target.value)}
                    placeholder="Atau tempel link gambar / Google Drive di sini..."
                    className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg focus:border-[#E5391B] focus:outline-none text-xs"
                    required
                  />
                </div>
              </div>

              {/* Google Drive detection hint */}
              {gdriveDetected && (
                <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-semibold">
                  <Check size={13} className="text-emerald-600 shrink-0" />
                  <span>Link Google Drive terdeteksi &amp; otomatis dikonversi ke gambar langsung! Pastikan file di Google Drive diatur ke &quot;Siapa saja yang memiliki link&quot;.</span>
                </p>
              )}

              {/* Live Preview */}
              {imageUrl && (
                <div className="pt-1.5 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-gray-700 text-[11px]">Pratinjau Banner:</p>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[10px] text-red-600 hover:underline cursor-pointer font-bold"
                    >
                      Hapus / Ganti Gambar
                    </button>
                  </div>
                  <div className="w-full h-24 rounded-lg border border-gray-200 overflow-hidden bg-white">
                    <img
                      src={imageUrl}
                      alt="Pratinjau Banner"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 truncate mt-1">
                    {imageUrl.startsWith('data:') ? 'Foto dari perangkat lokal (Base64)' : imageUrl}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Badge Label (Opsional)
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="Contoh: SUPER BRAND DAY"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#E5391B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Tautan Klik (Link Target)
                </label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="/catalog atau /catalog?category=sembako"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#E5391B] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-[#E5391B] focus:ring-[#E5391B] w-4 h-4 cursor-pointer"
                />
                <span>Langsung Aktifkan Banner di Toko</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-[#E5391B] hover:bg-[#C62818] active:bg-[#B71C1C] text-white font-bold rounded-lg shadow-md transition-colors text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                <span>Simpan &amp; Tayangkan Banner</span>
              </button>
            </div>
          </form>

          {/* Right: Live Preview Box ("Bisa lihat previewnya dulu") */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Eye size={16} className="text-[#E5391B]" />
                <span>Live Preview Tampilan Banner (Rasio 3:1)</span>
              </span>
              <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded font-mono text-gray-500">
                Ukuran Nyata
              </span>
            </div>

            <div className="relative aspect-[3/1] w-full rounded-xl overflow-hidden bg-gray-200 border border-gray-300 shadow-inner flex items-center justify-center">
              {imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt={title || 'Preview Banner'}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&h=400&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4 text-white">
                    {badgeText && (
                      <span className="inline-flex items-center gap-1 bg-[#E5391B] text-white text-[10px] font-black px-2 py-0.5 rounded-full w-max shadow-sm uppercase tracking-wider mb-1">
                        <Sparkles size={10} />
                        {badgeText}
                      </span>
                    )}
                    <h4 className="text-sm sm:text-base font-black line-clamp-1 drop-shadow-md">
                      {title || 'Judul Banner Promo Anda'}
                    </h4>
                    <span className="text-[10px] text-white/80 truncate">
                      Link: {targetUrl || '/catalog'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center p-4 text-gray-400 space-y-1">
                  <ImageIcon size={32} className="mx-auto text-gray-300" />
                  <p className="text-xs font-semibold">Preview Banner Belum Tersedia</p>
                  <p className="text-[10px]">
                    Masukkan URL gambar atau klik template untuk melihat preview langsung di sini.
                  </p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-500 text-center">
              Banner di atas disimulasikan sesuai tampilan yang akan dilihat oleh pembeli di toko.
            </p>
          </div>
        </div>
      </div>

      {/* Section: Live Simulator of Storefront Carousel */}
      {banners.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#222222] flex items-center gap-2">
                <Layers size={18} className="text-[#E5391B]" />
                <span>Simulasi Putaran Carousel Beranda Saat Ini</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Menampilkan putaran otomatis dengan durasi {durationInput} detik sesuai konfigurasi yang aktif.
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500">
              Slide {simIndex + 1} dari {banners.length}
            </span>
          </div>

          {/* Simulator Frame */}
          <div className="relative overflow-hidden rounded-xl bg-gray-100 border border-gray-200 aspect-[21/9] sm:aspect-[3/1] max-h-[260px]">
            {banners[simIndex] && (
              <div className="relative w-full h-full">
                <img
                  src={banners[simIndex].image_url}
                  alt={banners[simIndex].title}
                  className="w-full h-full object-cover object-center transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4 sm:p-5 text-white">
                  {banners[simIndex].badge_text && (
                    <span className="inline-flex items-center gap-1 bg-[#E5391B] text-white text-[10px] font-black px-2 py-0.5 rounded-full w-max shadow-sm uppercase tracking-wider mb-1">
                      <Sparkles size={10} />
                      {banners[simIndex].badge_text}
                    </span>
                  )}
                  <h4 className="text-sm sm:text-base font-black line-clamp-1 drop-shadow-md">
                    {banners[simIndex].title}
                  </h4>
                </div>
              </div>
            )}

            {/* Nav arrows in simulator */}
            <button
              onClick={() => setSimIndex((prev) => (prev - 1 + banners.length) % banners.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 text-gray-800 flex items-center justify-center shadow-md cursor-pointer hover:bg-white"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setSimIndex((prev) => (prev + 1) % banners.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 text-gray-800 flex items-center justify-center shadow-md cursor-pointer hover:bg-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Simulator Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSimIndex(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === simIndex ? 'w-6 h-2 bg-[#E5391B]' : 'w-2 h-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section: Daftar Banner Aktif & Kontrol Hapus */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#222222]">
              Daftar Semua Banner ({banners.length})
            </h2>
            <p className="text-xs text-gray-500">
              Kelola status tayang, urutan, atau hapus banner yang sudah selesai masa promonya.
            </p>
          </div>
        </div>

        {banners.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 space-y-2">
            <ImageIcon size={36} className="mx-auto text-gray-300" />
            <p className="font-bold text-gray-700">Belum Ada Banner Promo</p>
            <p>Gunakan tombol template di atas untuk menambahkan banner pertama Anda.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors"
              >
                {/* Banner Thumbnail & Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="relative w-28 sm:w-36 aspect-[3/1] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        Urutan #{index + 1}
                      </span>
                      {banner.badge_text && (
                        <span className="text-[10px] font-bold bg-[#E5391B]/10 text-[#E5391B] px-2 py-0.5 rounded">
                          {banner.badge_text}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          banner.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {banner.is_active ? 'Aktif Tayang' : 'Nonaktif'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {banner.title}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      Target Link: <span className="font-mono text-gray-700">{banner.target_url}</span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleToggleStatus(banner)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      banner.is_active
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-green-50 hover:bg-green-100 text-green-800 border border-green-200'
                    }`}
                  >
                    {banner.is_active ? 'Jeda Banner' : 'Aktifkan'}
                  </button>

                  <button
                    onClick={() => handleDeleteBanner(banner)}
                    className="p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                    title="Hapus banner"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

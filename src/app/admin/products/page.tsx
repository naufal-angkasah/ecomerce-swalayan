'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Product, ProductCategory } from '@/types';
import { productService, getPendingSyncsCount, retryPendingSyncs } from '@/services/productService';
import { formatRupiah, convertGoogleDriveUrl, compressImageFile } from '@/lib/utils';
import { CATEGORIES } from '@/lib/constants';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  Upload,
  Star,
  Flame,
  Tag,
  Sparkles,
  TrendingUp,
  Info,
  CopyCheck,
  CheckCircle2,
  Cloud,
  Loader2,
} from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('semua');
  const [sectionFilter, setSectionFilter] = useState<'all' | 'discount' | 'featured' | 'bestseller' | 'lowstock' | 'outstock'>('all');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('sembako');
  const [unit, setUnit] = useState('1 Pcs');
  const [price, setPrice] = useState<number>(0);
  const [discountPrice, setDiscountPrice] = useState<number | undefined>(undefined);
  const [stock, setStock] = useState<number>(10);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialEditProduct, setInitialEditProduct] = useState<Product | null>(null);
  const [gdriveDetected, setGdriveDetected] = useState(false);

  // Error & Feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Deduplication Modal State
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<{
    key: string;
    count: number;
    products: Product[];
    hasPriceDifference?: boolean;
    minPrice?: number;
    maxPrice?: number;
  }[]>([]);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  // Cloud Sync State
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [pendingSyncsCount, setPendingSyncsCount] = useState(0);
  const [isRetryingSync, setIsRetryingSync] = useState(false);

  const loadProducts = () => {
    setProducts(productService.getAll(false));
    setPendingSyncsCount(getPendingSyncsCount());
  };

  const handleSyncCloud = async () => {
    setIsSyncingCloud(true);
    setErrorMessage('');
    try {
      const res = await productService.syncFromSupabase();
      if (res.success) {
        loadProducts();
        setSuccessToast(`Berhasil menyinkronkan ${res.count} produk dari Supabase Database!`);
        setTimeout(() => setSuccessToast(''), 4000);
      } else {
        setErrorMessage(res.error || 'Gagal menyinkronkan produk dari Supabase.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat sinkronisasi cloud.');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleScanDuplicates = () => {
    const dups = productService.findExistingDuplicates();
    setDuplicateGroups(dups);
    setIsDuplicateModalOpen(true);
  };

  const handleSetPrimaryInGroup = (groupIndex: number, productIndex: number) => {
    setDuplicateGroups((prev) => {
      const next = [...prev];
      const targetGroup = { ...next[groupIndex] };
      const productsCopy = [...targetGroup.products];
      const [selected] = productsCopy.splice(productIndex, 1);
      productsCopy.unshift(selected);
      targetGroup.products = productsCopy;
      targetGroup.key = selected.name;
      next[groupIndex] = targetGroup;
      return next;
    });
  };

  const handleCleanDuplicates = async () => {
    setIsCleaningDuplicates(true);
    setErrorMessage('');
    try {
      const res = await productService.cleanDuplicates(duplicateGroups);
      loadProducts();
      setIsDuplicateModalOpen(false);
      if (res.removedCount > 0) {
        const cloudNote = res.cloudSynced
          ? 'dan berhasil disinkronkan & dihapus dari Database Supabase Cloud ☁️'
          : '(tersimpan di rak lokal toko)';
        setSuccessToast(
          `Berhasil membersihkan ${res.removedCount} produk duplikat ${cloudNote}! Sisa katalog: ${res.remainingCount} produk.`
        );
      } else {
        setSuccessToast('Tidak ditemukan produk duplikat di rak katalog.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat membersihkan duplikat.');
    } finally {
      setIsCleaningDuplicates(false);
    }
    setTimeout(() => setSuccessToast(''), 5000);
  };

  useEffect(() => {
    loadProducts();
    // Auto-sync live products from Supabase database in background
    productService.syncFromSupabase().then((res) => {
      if (res.success && res.count > 0) {
        setProducts(productService.getAll(false));
      }
      // Auto-retry any failed syncs from previous sessions
      const pending = getPendingSyncsCount();
      if (pending > 0) {
        setPendingSyncsCount(pending);
        retryPendingSyncs().then((retryRes) => {
          setPendingSyncsCount(getPendingSyncsCount());
          if (retryRes.succeeded > 0) {
            setSuccessToast(`☁️ ${retryRes.succeeded} perubahan yang tertunda berhasil disinkronkan ke cloud!`);
            setTimeout(() => setSuccessToast(''), 4000);
          }
        });
      }
    });
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setSku('');
    setName('');
    setBrand('');
    setCategory('sembako');
    setUnit('1 Pcs');
    setPrice(0);
    setDiscountPrice(undefined);
    setStock(10);
    setImageUrl('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80');
    setDescription('');
    setIsActive(true);
    setIsFeatured(false);
    setIsBestSeller(false);
    setGdriveDetected(false);
    setErrorMessage('');
    setInitialEditProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingId(prod.id);
    setInitialEditProduct(prod);
    setSku(prod.sku);
    setName(prod.name);
    setBrand(prod.brand || '');
    setCategory(prod.category as ProductCategory);
    setUnit(prod.unit);
    setPrice(prod.price);
    setDiscountPrice(prod.discount_price);
    setStock(prod.stock);
    setImageUrl(prod.image_url);
    setDescription(prod.description);
    setIsActive(prod.is_active ?? true);
    setIsFeatured(!!prod.is_featured);
    setIsBestSeller(!!prod.is_best_seller);
    setGdriveDetected(Boolean(prod.image_url && prod.image_url.includes('drive.google.com')));
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Harap pilih berkas gambar yang valid (JPG, PNG, atau WEBP).');
      return;
    }

    try {
      setIsUploadingImage(true);
      const compressedDataUrl = await compressImageFile(file, 900, 0.82);
      setImageUrl(compressedDataUrl);
      setGdriveDetected(false);
      setSuccessToast(`Foto "${file.name}" berhasil dimuat dari laptop/HP!`);
      setTimeout(() => setSuccessToast(''), 3000);
    } catch {
      setErrorMessage('Gagal memproses gambar lokal.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageUrlChange = (val: string) => {
    const converted = convertGoogleDriveUrl(val);
    if (converted !== val && val.includes('drive.google.com')) {
      setGdriveDetected(true);
    } else {
      setGdriveDetected(false);
    }
    setImageUrl(converted);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!sku.trim()) {
      setErrorMessage('SKU produk wajib diisi.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Nama produk wajib diisi.');
      return;
    }
    if (price <= 0) {
      setErrorMessage('Harga produk harus lebih dari 0.');
      return;
    }
    if (stock < 0) {
      setErrorMessage('Stok tidak boleh bernilai negatif.');
      return;
    }

    // Check if user clicked save on an existing product without making any changes
    if (editingId && initialEditProduct) {
      const currentDiscount = discountPrice && discountPrice > 0 ? discountPrice : undefined;
      const initialDiscount = initialEditProduct.discount_price && initialEditProduct.discount_price > 0 ? initialEditProduct.discount_price : undefined;

      const hasChanged =
        sku.trim() !== initialEditProduct.sku ||
        name.trim() !== initialEditProduct.name ||
        (brand.trim() || 'Alvin Swalayan') !== (initialEditProduct.brand || 'Alvin Swalayan') ||
        category !== initialEditProduct.category ||
        unit !== initialEditProduct.unit ||
        price !== initialEditProduct.price ||
        currentDiscount !== initialDiscount ||
        stock !== initialEditProduct.stock ||
        (imageUrl || '') !== (initialEditProduct.image_url || '') ||
        (description || '') !== (initialEditProduct.description || '') ||
        isActive !== (initialEditProduct.is_active ?? true) ||
        isFeatured !== !!initialEditProduct.is_featured ||
        isBestSeller !== !!initialEditProduct.is_best_seller;

      if (!hasChanged) {
        setIsModalOpen(false);
        setSuccessToast('Tidak ada perubahan data yang disimpan.');
        setTimeout(() => setSuccessToast(''), 3000);
        return;
      }
    }

    try {
      setIsSaving(true);

      if (editingId) {
        // Update
        const res = await productService.update(editingId, {
          sku: sku.trim(),
          name: name.trim(),
          brand: brand.trim() || 'Alvin Swalayan',
          category,
          unit,
          price,
          discount_price: discountPrice && discountPrice > 0 ? discountPrice : undefined,
          stock,
          image_url: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
          description,
          is_active: isActive,
          is_featured: isFeatured,
          is_best_seller: isBestSeller,
          is_discount: !!(discountPrice && discountPrice < price),
        });

        if (!res.success) {
          setErrorMessage(res.error || 'Gagal mengubah produk.');
          return;
        }

        setSuccessToast(
          res.cloudSynced
            ? `Produk "${name}" berhasil diperbarui & tersimpan ke Cloud ☁️✅`
            : `Produk "${name}" berhasil diperbarui ✅ (⚠️ Belum tersync cloud — akan dicoba ulang otomatis)`
        );
      } else {
        // Create new (with strict UNIQUE SKU check)
        const res = await productService.create({
          sku: sku.trim(),
          name: name.trim(),
          brand: brand.trim() || 'Alvin Swalayan',
          category,
          unit,
          price,
          discount_price: discountPrice && discountPrice > 0 ? discountPrice : undefined,
          stock,
          image_url: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
          description,
          is_active: isActive,
          is_featured: isFeatured,
          is_best_seller: isBestSeller,
          is_discount: !!(discountPrice && discountPrice < price),
        });

        if (!res.success) {
          setErrorMessage(res.error || 'Gagal menambahkan produk.');
          return;
        }

        setSuccessToast(
          res.cloudSynced
            ? `Produk baru "${name}" berhasil ditambahkan & tersimpan ke Cloud ☁️✅`
            : `Produk baru "${name}" berhasil ditambahkan ✅ (⚠️ Belum tersync cloud — akan dicoba ulang otomatis)`
        );
      }

      setIsModalOpen(false);
      loadProducts();
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan saat memproses data produk.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = (id: string) => {
    productService.toggleActive(id);
    loadProducts();
  };

  const handleToggleFeatured = (id: string, prodName: string) => {
    productService.toggleFeatured(id);
    loadProducts();
    const current = products.find((p) => p.id === id);
    const willBeFeatured = !current?.is_featured;
    setSuccessToast(
      willBeFeatured
        ? `"${prodName}" sekarang tampil di "Produk Pilihan Alvin" ⭐`
        : `"${prodName}" dihapus dari "Produk Pilihan Alvin"`
    );
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleToggleBestSeller = (id: string, prodName: string) => {
    productService.toggleBestSeller(id);
    loadProducts();
    const current = products.find((p) => p.id === id);
    const willBeBest = !current?.is_best_seller;
    setSuccessToast(
      willBeBest
        ? `"${prodName}" sekarang diprioritaskan di "Terlaris Minggu Ini" 🔥`
        : `"${prodName}" dinonaktifkan dari pin Terlaris`
    );
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleDelete = (id: string, prodName: string) => {
    if (confirm(`Yakin ingin menghapus produk "${prodName}" dari database toko?`)) {
      productService.delete(id);
      loadProducts();
      setSuccessToast(`Produk "${prodName}" dihapus.`);
      setTimeout(() => setSuccessToast(''), 3000);
    }
  };

  // Section counters for quick tabs
  const discountCount = products.filter(
    (p) => (p.discount_price && p.discount_price < p.price) || p.is_discount
  ).length;
  const featuredCount = products.filter((p) => p.is_featured).length;
  const bestSellerCount = products.filter((p) => p.is_best_seller).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outStockCount = products.filter((p) => p.stock === 0).length;

  const filtered = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];

    const list = products.filter((p) => {
      if (!p) return false;

      const matchesCategory =
        categoryFilter === 'semua' ||
        String(p.category || '').toLowerCase() === categoryFilter.toLowerCase();

      let matchesSection = true;
      if (sectionFilter === 'discount') {
        matchesSection = Boolean((p.discount_price && p.discount_price < p.price) || p.is_discount);
      } else if (sectionFilter === 'featured') {
        matchesSection = Boolean(p.is_featured);
      } else if (sectionFilter === 'bestseller') {
        matchesSection = Boolean(p.is_best_seller);
      } else if (sectionFilter === 'lowstock') {
        matchesSection = p.stock > 0 && p.stock <= 5;
      } else if (sectionFilter === 'outstock') {
        matchesSection = p.stock === 0;
      }

      if (!matchesCategory || !matchesSection) return false;

      if (!searchFilter.trim()) return true;

      // Smart safe multi-keyword search
      return productService.matchSearch(p, searchFilter) > 0;
    });

    // If searching, sort by search match relevance score descending
    if (searchFilter.trim()) {
      return [...list].sort(
        (a, b) => productService.matchSearch(b, searchFilter) - productService.matchSearch(a, searchFilter)
      );
    }

    return list;
  }, [products, searchFilter, categoryFilter, sectionFilter]);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#222222]">
            Katalog &amp; Manajemen Produk Toko
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Total {products.length} produk terdaftar di rak Alvin Swalayan
            {searchFilter.trim() && (
              <span className="ml-2 font-bold text-[#E5391B]">
                • Ditemukan {filtered.length} hasil untuk &quot;{searchFilter.trim()}&quot;
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncCloud}
            disabled={isSyncingCloud}
            className="border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Tarik & sinkronkan data produk terbaru dari Supabase Database"
          >
            <Cloud size={14} className={isSyncingCloud ? 'animate-spin text-blue-600' : 'text-blue-600'} />
            <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkron Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={handleScanDuplicates}
            className="border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Pindai produk duplikat yang ada di katalog rak toko"
          >
            <CopyCheck size={14} className="text-amber-700" />
            <span>Pindai Duplikat</span>
          </button>

          <Link
            href="/admin/products/import"
            className="border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Upload size={14} className="text-[#E5391B]" />
            <span>Upload File CSV</span>
          </Link>

          <button
            onClick={openAddModal}
            className="bg-[#E5391B] hover:bg-[#C62818] text-white px-4 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>Tambah Produk Baru</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-bold p-3 rounded-lg flex items-center gap-2">
          <Check size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Pending Cloud Sync Warning */}
      {pendingSyncsCount > 0 && (
        <div className="bg-orange-50 border border-orange-300 text-orange-900 text-xs p-3 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-orange-500 shrink-0" />
            <span>
              <b>⚠️ {pendingSyncsCount} perubahan belum tersinkronkan ke Cloud Database.</b>
              {' '}Mungkin karena koneksi internet terputus saat menyimpan. Akan dicoba ulang otomatis saat halaman ini dibuka.
            </span>
          </div>
          <button
            type="button"
            disabled={isRetryingSync}
            onClick={async () => {
              setIsRetryingSync(true);
              const res = await retryPendingSyncs();
              setPendingSyncsCount(getPendingSyncsCount());
              setIsRetryingSync(false);
              if (res.succeeded > 0) {
                setSuccessToast(`☁️ ${res.succeeded} perubahan berhasil disinkronkan ke cloud!`);
                setTimeout(() => setSuccessToast(''), 4000);
              } else {
                setSuccessToast('⚠️ Masih gagal sync. Cek koneksi internet lalu coba lagi.');
                setTimeout(() => setSuccessToast(''), 4000);
              }
            }}
            className="shrink-0 bg-orange-100 hover:bg-orange-200 border border-orange-300 text-orange-900 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {isRetryingSync ? 'Menyinkronkan...' : '↻ Coba Sync Ulang'}
          </button>
        </div>
      )}

      {/* Quick Filter Tabs for Homepage & Inventory */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-2.5 rounded-xl border border-[#E5E7EB] text-xs">
        <span className="text-gray-400 font-bold px-2 text-[11px]">Filter Cepat:</span>
        <button
          type="button"
          onClick={() => setSectionFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            sectionFilter === 'all'
              ? 'bg-[#222222] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Semua ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setSectionFilter('discount')}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
            sectionFilter === 'discount'
              ? 'bg-[#E5391B] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Tag size={13} className={sectionFilter === 'discount' ? 'text-white' : 'text-[#E5391B]'} />
          <span>Sedang Diskon ({discountCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setSectionFilter('featured')}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
            sectionFilter === 'featured'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Sparkles size={13} className={sectionFilter === 'featured' ? 'text-white' : 'text-amber-500'} />
          <span>⭐ Pilihan Alvin ({featuredCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setSectionFilter('bestseller')}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
            sectionFilter === 'bestseller'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Flame size={13} className={sectionFilter === 'bestseller' ? 'text-white' : 'text-orange-500'} />
          <span>🔥 Terlaris Minggu Ini ({bestSellerCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setSectionFilter('lowstock')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            sectionFilter === 'lowstock'
              ? 'bg-orange-100 text-orange-800 border border-orange-300'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          ⚠️ Menipis ({lowStockCount})
        </button>
        <button
          type="button"
          onClick={() => setSectionFilter('outstock')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            sectionFilter === 'outstock'
              ? 'bg-red-100 text-red-800 border border-red-300'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          ❌ Habis ({outStockCount})
        </button>
      </div>

      {/* Info Banner for Homepage Curation */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-extrabold text-amber-950">Pengaturan Produk di Beranda (Homepage):</span>
          <p className="mt-0.5 text-amber-800 text-[11px]">
            • <b>Sedang Diskon:</b> Otomatis aktif saat Anda mengisi <i>Harga Diskon</i> di bawah harga normal pada produk.
            <br />
            • <b>Produk Pilihan Alvin:</b> Klik tombol ⭐ pada baris produk di tabel untuk memajang barang di etalase rekomendasi toko.
            <br />
            • <b>Terlaris Minggu Ini:</b> Klik tombol 🔥 pada baris produk di tabel untuk memprioritaskan barang unggulan terlaris di posisi depan.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border-2 border-gray-200/90 p-4 flex flex-col sm:flex-row items-center gap-3 text-xs shadow-xs">
        <div className="relative flex-1 w-full">
          <label htmlFor="admin-product-search" className="sr-only">
            Cari Produk
          </label>
          <div className="relative flex items-center">
            <Search
              size={17}
              className="absolute left-3.5 text-gray-500 pointer-events-none transition-colors"
            />
            <input
              id="admin-product-search"
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Ketik untuk mencari produk (nama, SKU unik, atau brand)..."
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50/90 hover:bg-white focus:bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-[#E5391B] focus:ring-4 focus:ring-red-500/10 rounded-xl text-xs text-gray-800 placeholder-gray-400 transition-all font-medium focus:outline-none"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-3 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                title="Hapus kata kunci pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <label htmlFor="admin-category-select" className="text-gray-700 font-bold shrink-0 text-xs">
            Kategori:
          </label>
          <select
            id="admin-category-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border-2 border-gray-300 hover:border-gray-400 focus:border-[#E5391B] focus:ring-4 focus:ring-red-500/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none bg-gray-50/90 hover:bg-white focus:bg-white text-gray-800 w-full sm:w-auto transition-all cursor-pointer"
          >
            <option value="semua">Semua Kategori</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {(searchFilter || categoryFilter !== 'semua' || sectionFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchFilter('');
                setCategoryFilter('semua');
                setSectionFilter('all');
              }}
              className="px-3 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-600 hover:text-gray-900 font-bold text-xs transition-colors shrink-0 whitespace-nowrap"
              title="Reset semua filter"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Produk</th>
                <th className="py-3 px-3">SKU Unik</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Harga Normal</th>
                <th className="py-3 px-3">Harga Diskon</th>
                <th className="py-3 px-3 text-center">Stok Toko</th>
                <th className="py-3 px-3 text-center">Tampil di Beranda</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 px-4 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2.5 max-w-md mx-auto">
                      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <Search size={24} />
                      </div>
                      <p className="font-black text-gray-900 text-sm">
                        {searchFilter.trim()
                          ? `Tidak ditemukan produk dengan kata kunci "${searchFilter.trim()}"`
                          : 'Tidak ada produk pada filter ini'}
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {searchFilter.trim()
                          ? 'Pastikan ejaan sudah benar, atau coba cari sebagian kata (misal: "Good Day" atau "Cappuccino").'
                          : 'Coba pilih kategori lain atau reset filter untuk menampilkan semua produk di toko.'}
                      </p>
                      {(searchFilter || categoryFilter !== 'semua' || sectionFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchFilter('');
                            setCategoryFilter('semua');
                            setSectionFilter('all');
                          }}
                          className="mt-2 px-4 py-2 bg-[#E5391B] hover:bg-[#C62818] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                        >
                          Reset Pencarian &amp; Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => (
                  <tr
                    key={prod.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      !prod.is_active ? 'bg-gray-50/60 opacity-60' : ''
                    }`}
                  >
                    {/* Image & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-10 h-10 rounded object-cover border border-gray-200 bg-gray-50 shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <div className="min-w-0 max-w-xs">
                          <p className="font-bold text-[#222222] truncate">{prod.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {prod.brand || 'Alvin Swalayan'} • {prod.unit || '1 Pcs'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="py-3 px-3 font-mono font-bold text-gray-700">
                      {prod.sku || '-'}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 capitalize text-gray-600">
                      {String(prod.category || 'sembako').replace(/-/g, ' ')}
                    </td>

                    {/* Normal Price */}
                    <td className="py-3 px-3 font-bold text-gray-800">
                      {formatRupiah(prod.price)}
                    </td>

                    {/* Discount Price */}
                    <td className="py-3 px-3">
                      {prod.discount_price && prod.discount_price < prod.price ? (
                        <span className="font-extrabold text-[#E5391B]">
                          {formatRupiah(prod.discount_price)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-black text-xs ${
                          prod.stock === 0
                            ? 'bg-red-100 text-red-700'
                            : prod.stock <= 5
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {prod.stock}
                      </span>
                    </td>

                    {/* Homepage Placement Toggles */}
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* Featured Alvin Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(prod.id, prod.name)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                            prod.is_featured
                              ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-2xs'
                              : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50/50'
                          }`}
                          title={prod.is_featured ? '⭐ Aktif di Produk Pilihan Alvin (Klik untuk nonaktifkan)' : '☆ Klik untuk tampilkan di Produk Pilihan Alvin'}
                        >
                          <Star size={11} className={prod.is_featured ? 'fill-amber-500 text-amber-500' : 'text-gray-400'} />
                          <span>Pilihan</span>
                        </button>

                        {/* Best Seller Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleBestSeller(prod.id, prod.name)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                            prod.is_best_seller
                              ? 'bg-red-100 text-red-900 border-red-300 hover:bg-red-200 shadow-2xs'
                              : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-red-300 hover:text-red-600 hover:bg-red-50/50'
                          }`}
                          title={prod.is_best_seller ? '🔥 Aktif di Terlaris Minggu Ini (Klik untuk nonaktifkan)' : 'Klik untuk jadikan Terlaris Minggu Ini'}
                        >
                          <Flame size={11} className={prod.is_best_seller ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                          <span>Terlaris</span>
                        </button>

                        {/* Discount Indicator Badge */}
                        {prod.discount_price && prod.discount_price < prod.price ? (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] font-bold bg-[#E5391B]/10 text-[#E5391B] border border-[#E5391B]/20"
                            title={`Aktif di Sedang Diskon (${Math.round(((prod.price - prod.discount_price) / prod.price) * 100)}% OFF)`}
                          >
                            <Tag size={10} />
                            <span>Diskon</span>
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Status Toggle Button */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleActive(prod.id)}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                          prod.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title="Klik untuk mengubah status aktif/nonaktif di toko"
                      >
                        {prod.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(prod)}
                        className="p-1.5 text-gray-600 hover:text-[#E5391B] rounded hover:bg-gray-100"
                        title="Ubah Produk"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id, prod.name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                        title="Hapus Produk"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h2 className="text-base font-extrabold text-[#222222]">
                  {editingId ? 'Ubah Data Produk' : 'Tambah Produk Baru Alvin Swalayan'}
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Lengkapi data barang untuk rak etalase Alvin Swalayan
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Tutup popup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProduct} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
                {/* ERROR ALERT FOR DUPLICATE SKU OR VALIDATIONS */}
                {errorMessage && (
                  <div className="bg-red-50 border-2 border-red-300 p-3 rounded-lg text-xs text-red-700 font-bold flex items-start gap-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
                    <div>
                      <p className="font-extrabold">Peringatan Validasi Produk:</p>
                      <p className="font-medium mt-0.5">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* SKU Field (Required Unique) */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Kode SKU Unik <span className="text-[#E5391B]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      placeholder="Contoh: SBK-BRS-005"
                      className="w-full font-mono uppercase px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#E5391B] focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Harus unik untuk setiap jenis produk di toko.
                    </p>
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Merek / Brand</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Contoh: Bimoli, Indomie, Aqua"
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#E5391B] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Product Name */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Nama Lengkap Produk <span className="text-[#E5391B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Minyak Goreng Bimoli Klasik Pouch 2 Liter"
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#E5391B] focus:outline-none"
                  />
                </div>

                {/* Category & Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Kategori</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ProductCategory)}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#E5391B] focus:outline-none bg-white font-semibold"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Satuan / Kemasan</label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="Contoh: Pouch 2L, Karung 5kg, Bungkus 85g"
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#E5391B] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Price, Discount Price, Stock */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Harga Normal (Rp) <span className="text-[#E5391B]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={price || ''}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      placeholder="35000"
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#E5391B] focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Harga Diskon (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={discountPrice || ''}
                      onChange={(e) =>
                        setDiscountPrice(e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      placeholder="Kosongkan jika tdk diskon"
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#E5391B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Stok di Toko <span className="text-[#E5391B]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={stock}
                      onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#E5391B] focus:outline-none font-bold"
                    />
                  </div>
                </div>

                {/* Foto Produk: Upload Lokal atau URL / GDrive */}
                <div className="space-y-2 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-700">
                      Foto Produk <span className="text-[#E5391B]">*</span>
                    </label>
                    <span className="text-[10px] text-gray-500 font-medium">Bisa upload foto lokal atau paste link Google Drive</span>
                  </div>

                  {/* Dual Options: Upload Lokal & Link */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* File Upload Button */}
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 cursor-pointer transition-colors shadow-2xs shrink-0">
                      <Upload size={14} className="text-[#E5391B]" />
                      <span>{isUploadingImage ? 'Memproses...' : 'Upload dari Komputer/HP'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFileChange}
                        disabled={isUploadingImage}
                      />
                    </label>

                    {/* URL or Google Drive Link Input */}
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => handleImageUrlChange(e.target.value)}
                        placeholder="Atau tempel link foto / Google Drive di sini..."
                        className="w-full px-3 py-2 border border-[#E5E7EB] bg-white rounded-lg focus:border-[#E5391B] focus:outline-none text-xs"
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
                    <div className="flex items-center gap-3 pt-1 border-t border-gray-200">
                      <div className="w-14 h-14 rounded-lg border border-gray-200 overflow-hidden bg-white shrink-0 flex items-center justify-center">
                        <img
                          src={imageUrl}
                          alt="Pratinjau Foto"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                      </div>
                      <div className="text-[11px] text-gray-500 min-w-0">
                        <p className="font-bold text-gray-800">Pratinjau Foto Produk</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-xs">{imageUrl.startsWith('data:') ? 'Foto dari perangkat lokal (Base64)' : imageUrl}</p>
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="text-[10px] text-red-600 hover:underline mt-0.5 cursor-pointer font-bold"
                        >
                          Hapus / Ganti Foto
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Deskripsi Produk</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Informasi detail, kegunaan, atau komposisi produk..."
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#E5391B] focus:outline-none"
                  />
                </div>

                {/* Penempatan di Beranda / Homepage */}
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-2.5">
                  <p className="font-extrabold text-[#222222] text-xs flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Penempatan di Halaman Depan (Homepage)</span>
                  </p>
                  
                  <div className="space-y-2 pt-0.5">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isFeatured}
                        onChange={(e) => setIsFeatured(e.target.checked)}
                        className="accent-amber-500 w-4 h-4 rounded cursor-pointer mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-gray-800 text-xs">
                          ⭐ Tampilkan di &quot;Produk Pilihan Alvin&quot;
                        </span>
                        <p className="text-[11px] text-gray-500">
                          Produk akan tampil di section kurasi rekomendasi toko di halaman utama.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isBestSeller}
                        onChange={(e) => setIsBestSeller(e.target.checked)}
                        className="accent-[#E5391B] w-4 h-4 rounded cursor-pointer mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-gray-800 text-xs">
                          🔥 Prioritaskan di &quot;Terlaris Minggu Ini&quot;
                        </span>
                        <p className="text-[11px] text-gray-500">
                          Produk akan selalu diprioritaskan di baris terdepan bagian produk paling sering dibeli.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200/50 flex items-center gap-1.5">
                    <Tag size={12} className="text-[#E5391B] shrink-0" />
                    <span>
                      <b>Sedang Diskon:</b> Otomatis aktif jika Anda mengisi kolom <b>Harga Diskon</b> di atas.
                    </span>
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="activeToggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="accent-[#E5391B] w-4 h-4 rounded cursor-pointer"
                  />
                  <label htmlFor="activeToggle" className="font-bold text-gray-700 cursor-pointer select-none">
                    Produk Aktif &amp; Ditampilkan di Toko Online
                  </label>
                </div>
              </div>

              {/* Sticky Actions Footer */}
              <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-white transition-colors text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploadingImage}
                  className="px-5 py-2 bg-[#E5391B] hover:bg-[#C62818] active:bg-[#B71C1C] text-white rounded-lg font-black shadow-xs transition-colors text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>Menyimpan ke Cloud...</span>
                    </>
                  ) : (
                    editingId ? 'Simpan Perubahan' : 'Simpan Produk Baru'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deduplication Review & Clean Modal */}
      {isDuplicateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-200 shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                  <CopyCheck size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-gray-900">
                    Pindai &amp; Bersihkan Produk Duplikat
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Mendeteksi data ganda berdasarkan kesamaan nama produk atau SKU
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDuplicateModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {duplicateGroups.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={36} />
                  </div>
                  <h4 className="text-base font-black text-gray-900 mb-1">
                    Katalog Bersih &amp; Rapi!
                  </h4>
                  <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                    Tidak ditemukan produk duplikat di rak katalog Alvin Swalayan. Semua{' '}
                    <b>{products.length} produk</b> memiliki nama dan SKU yang unik.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsDuplicateModalOpen(false)}
                    className="mt-5 px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              ) : (
                <>
                  {/* Warning banner */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
                    <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <p className="font-extrabold text-amber-950">
                        Ditemukan {duplicateGroups.reduce((acc, g) => acc + (g.products.length - 1), 0)} salinan duplikat dari {duplicateGroups.length} kelompok produk!
                      </p>
                      <p className="text-amber-800 text-[11px] mt-1">
                        Pembersihan otomatis akan <b>mempertahankan 1 data produk utama</b> dan menghapus salinan berulang dari rak toko &amp; Supabase Database Cloud agar etalase pelanggan rapi.
                      </p>
                    </div>
                  </div>

                  {/* Duplicate Groups List */}
                  <div className="space-y-3">
                    {duplicateGroups.map((group, gIdx) => (
                      <div
                        key={gIdx}
                        className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                      >
                        <div className="bg-gray-50 px-3.5 py-2.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-800 capitalize">
                              {group.key}
                            </span>
                            {group.hasPriceDifference && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 font-bold rounded-md text-[10px] flex items-center gap-1">
                                <AlertTriangle size={11} className="text-rose-600" />
                                Beda Harga: {formatRupiah(group.minPrice || 0)} - {formatRupiah(group.maxPrice || 0)}
                              </span>
                            )}
                          </div>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px]">
                            {group.products.length} varian ditemukan
                          </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {group.products.map((p, pIdx) => (
                            <div
                              key={p.id}
                              className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                                pIdx === 0 ? 'bg-emerald-50/50 border-l-4 border-l-emerald-500' : 'bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-11 h-11 rounded-md border border-gray-200 overflow-hidden bg-white shrink-0">
                                  <img
                                    src={p.image_url}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 truncate">{p.name}</p>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500 mt-0.5">
                                    <span>
                                      SKU: <span className="font-mono font-medium text-gray-700">{p.sku}</span>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Stok: <b className={p.stock > 0 ? 'text-gray-800' : 'text-rose-600'}>{p.stock}</b>
                                    </span>
                                    <span>•</span>
                                    <span className="font-extrabold text-[#E5391B]">
                                      {p.discount_price && p.discount_price < p.price ? (
                                        <>
                                          {formatRupiah(p.discount_price)}{' '}
                                          <span className="line-through text-gray-400 font-normal text-[10px]">
                                            {formatRupiah(p.price)}
                                          </span>
                                        </>
                                      ) : (
                                        formatRupiah(p.price)
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                                {pIdx === 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Check size={12} /> Dipertahankan (Utama)
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                      <Trash2 size={11} /> Dihapus
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleSetPrimaryInGroup(gIdx, pIdx)}
                                      className="px-2.5 py-1 rounded-md text-[10px] font-black bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 hover:border-emerald-500 transition-colors cursor-pointer shadow-2xs"
                                      title="Jadikan data produk ini sebagai data utama yang disimpan"
                                    >
                                      Pilih Jadi Utama
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {duplicateGroups.length > 0 && (
              <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
                <span className="text-[11px] text-gray-500 font-medium">
                  {duplicateGroups.reduce((acc, g) => acc + (g.products.length - 1), 0)} data berulang akan dihapus permanen
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDuplicateModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-white transition-colors text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleCleanDuplicates}
                    disabled={isCleaningDuplicates}
                    className="px-4 py-2 bg-[#E5391B] hover:bg-[#C62818] active:bg-[#B71C1C] text-white rounded-lg font-black shadow-xs transition-colors text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>{isCleaningDuplicates ? 'Membersihkan...' : 'Bersihkan Semua Duplikat'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { categoryService } from '@/services/categoryService';
import { productService } from '@/services/productService';
import { CategoryInfo, Product } from '@/types';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Package,
  RotateCcw,
  X,
} from 'lucide-react';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('ShoppingBag');

  const loadData = () => {
    setCategories(categoryService.getAll());
    setProducts(productService.getAll(false));
  };

  useEffect(() => {
    loadData();
    // Sync latest products from Supabase so product counts match admin/products
    productService.syncFromSupabase().then((res) => {
      if (res.success && res.count > 0) {
        setProducts(productService.getAll(false));
      }
    });
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      // Normalize: lowercase and replace hyphens so "pet-care" matches slug "pet-care"
      const cat = String(p.category || '').toLowerCase().trim();
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, search]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setIconName('ShoppingBag');
    setModalOpen(true);
  };

  const handleOpenEditModal = (cat: CategoryInfo) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setIconName(cat.iconName || 'ShoppingBag');
    setModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    if (editingId) {
      const res = categoryService.update(editingId, {
        name: name.trim(),
        description: description.trim(),
        iconName,
      });
      if (res.success) {
        showToast('Kategori berhasil diperbarui!');
        loadData();
        setModalOpen(false);
      } else {
        showToast(res.error || 'Gagal memperbarui kategori', 'error');
      }
    } else {
      const res = categoryService.create({
        name: name.trim(),
        slug: slug.toLowerCase().replace(/\s+/g, '-').trim(),
        description: description.trim(),
        iconName,
      });
      if (res.success) {
        showToast('Kategori baru berhasil ditambahkan!');
        loadData();
        setModalOpen(false);
      } else {
        showToast(res.error || 'Gagal menambahkan kategori', 'error');
      }
    }
  };

  const handleDeleteCategory = (cat: CategoryInfo) => {
    const count = productCounts[cat.slug] || 0;
    if (count > 0) {
      showToast(
        `Kategori "${cat.name}" tidak dapat dihapus karena masih memiliki ${count} produk. Pindahkan produk terlebih dahulu!`,
        'error'
      );
      return;
    }

    if (window.confirm(`Yakin ingin menghapus kategori "${cat.name}"?`)) {
      const res = categoryService.delete(cat.id);
      if (res.success) {
        showToast(`Kategori "${cat.name}" telah dihapus.`);
        loadData();
      } else {
        showToast(res.error || 'Gagal menghapus kategori', 'error');
      }
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset semua kategori kembali ke 14 kategori resmi supermarket default?')) {
      categoryService.resetToInitial();
      loadData();
      showToast('Kategori berhasil direset ke 14 kategori supermarket resmi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#222222]">
              Manajemen 14 Kategori Supermarket
            </h1>
            <span className="bg-red-50 text-[#E5391B] font-bold text-xs px-2.5 py-0.5 rounded-full border border-red-200">
              {categories.length} Kategori
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Standarisasi lorong &amp; kategori e-commerce grocery Alvin Swalayan Banda Aceh
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleReset}
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Kembalikan ke susunan 14 kategori standar"
          >
            <RotateCcw size={14} />
            <span>Reset 14 Kategori</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="bg-[#E5391B] hover:bg-[#C62818] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>Tambah Kategori</span>
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in ${
            toast.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border-2 border-gray-200/90 p-4 flex items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={17} className="absolute left-3.5 top-3 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ketik untuk mencari kategori (nama atau slug)..."
            className="w-full pl-10 pr-9 py-2.5 bg-gray-50/90 hover:bg-white focus:bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-[#E5391B] focus:ring-4 focus:ring-red-500/10 rounded-xl text-xs text-gray-800 placeholder-gray-400 transition-all font-medium focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition-colors"
              title="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-xs text-gray-600 font-semibold hidden sm:inline">
          Menampilkan <span className="text-[#E5391B] font-bold">{filteredCategories.length}</span> dari {categories.length} kategori
        </span>
      </div>

      {/* Categories Grid Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Nama &amp; Slug</th>
                <th className="py-3 px-4">Deskripsi Lorong</th>
                <th className="py-3 px-4 text-center">Jumlah Produk</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Tidak ada kategori yang sesuai dengan pencarian &ldquo;{search}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat, index) => {
                  const count = productCounts[cat.slug] || 0;
                  return (
                    <tr key={cat.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-400 text-center w-12">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 text-sm">{cat.name}</div>
                        <div className="text-[11px] font-mono text-gray-400">{cat.slug}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs text-gray-500">
                        {cat.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/admin/products?category=${cat.slug}`}
                          className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-full font-bold text-[11px] transition-colors"
                          title="Lihat produk di kategori ini"
                        >
                          <Package size={12} />
                          <span>{count} Produk</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(cat)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ubah Kategori"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Kategori"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-[#222222]">
                {editingId ? 'Ubah Kategori Supermarket' : 'Tambah Kategori Baru'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Kategori</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingId) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^\w\s-]/g, '')
                          .replace(/\s+/g, '-')
                      );
                    }
                  }}
                  placeholder="Contoh: Kopi &amp; Teh Aceh"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] focus:outline-none bg-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Slug URL</label>
                <input
                  type="text"
                  required
                  disabled={!!editingId}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="kopi-teh-aceh"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] focus:outline-none bg-white disabled:bg-gray-100 font-mono text-[11px]"
                />
                {editingId && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Slug tidak dapat diubah agar tidak merusak tautan produk.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Deskripsi / Keterangan Lorong (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Aneka kopi robusta/arabika Gayo, teh celup, dan bubuk tradisional..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] focus:outline-none bg-white"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 bg-[#E5391B] hover:bg-[#C62818] text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
                >
                  {editingId ? 'Simpan Perubahan' : 'Tambah Kategori'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 border border-gray-300 py-2.5 rounded-xl font-semibold text-xs text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

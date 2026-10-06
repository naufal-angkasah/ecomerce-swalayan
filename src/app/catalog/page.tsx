'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Product } from '@/types';
import { productService } from '@/services/productService';
import { CATEGORIES } from '@/lib/constants';
import { ProductCard } from '@/components/common/ProductCard';
import { Filter, SlidersHorizontal, ArrowUpDown, X, Tag } from 'lucide-react';

function CatalogContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'semua';
  const initialSearch = searchParams.get('q') || '';
  const initialDiscount = searchParams.get('discount') === 'true';

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState<string>('semua');
  const [sortOption, setSortOption] = useState<'bestseller' | 'cheapest' | 'expensive' | 'newest'>('bestseller');
  const [onlyDiscount, setOnlyDiscount] = useState<boolean>(initialDiscount);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Available brands dynamically filtered by availability (stock > 0), category, promo, and search query
  const availableBrands = useMemo(() => {
    return productService.getAvailableBrandsWithCount(selectedCategory, onlyDiscount, initialSearch);
  }, [selectedCategory, onlyDiscount, initialSearch]);

  // Auto-reset selectedBrand if the selected brand is no longer available in the active filter
  useEffect(() => {
    if (selectedBrand !== 'semua') {
      const exists = availableBrands.some(
        (b) => b.name.toLowerCase() === selectedBrand.toLowerCase()
      );
      if (!exists) {
        setSelectedBrand('semua');
      }
    }
  }, [availableBrands, selectedBrand]);

  const loadCatalogProducts = React.useCallback(() => {
    let list = productService.search(
      initialSearch,
      selectedCategory !== 'semua' ? selectedCategory : undefined,
      selectedBrand !== 'semua' ? selectedBrand : undefined,
      undefined,
      undefined,
      sortOption
    );

    if (onlyDiscount) {
      list = list.filter((p) => p.is_discount || (p.discount_price && p.discount_price < p.price));
    }

    setProducts(list);
  }, [initialSearch, selectedCategory, selectedBrand, sortOption, onlyDiscount]);

  useEffect(() => {
    loadCatalogProducts();
  }, [loadCatalogProducts]);

  // Sync fresh product data from Supabase Cloud on mount
  useEffect(() => {
    productService.syncFromSupabase().then((res) => {
      if (res.success && res.count > 0) {
        loadCatalogProducts();
      }
    });
  }, [loadCatalogProducts]);

  // Subscribe to real-time cross-tab and storage updates
  useEffect(() => {
    const unsubscribe = productService.subscribe(() => {
      loadCatalogProducts();
    });
    return () => unsubscribe();
  }, [loadCatalogProducts]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb & Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#222222]">
          Katalog Produk Alvin Swalayan
        </h1>
        <p className="text-xs text-[#6B7280] mt-1">
          {initialSearch
            ? `Hasil pencarian untuk "${initialSearch}" (${products.length} produk ditemukan)`
            : `Menampilkan ${products.length} produk sembako dan kebutuhan harian terlengkap`}
        </p>
      </div>

      {/* Main Grid: Sidebar Filters + Products */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden flex items-center justify-between gap-2 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-lg border border-[#E5E7EB]">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-[#E5391B] border border-[#E5391B] px-2.5 sm:px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors shrink-0"
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Filter Kategori &amp; Brand</span>
            <span className="sm:hidden">Filter Produk</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#222222] min-w-0">
            <ArrowUpDown size={13} className="text-gray-500 shrink-0" />
            <select
              value={sortOption}
              onChange={(e) =>
                setSortOption(e.target.value as 'bestseller' | 'cheapest' | 'expensive' | 'newest')
              }
              className="border border-[#E5E7EB] rounded-md px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-medium focus:outline-none bg-white text-gray-800"
            >
              <option value="bestseller">Paling Laris</option>
              <option value="cheapest">Harga Termurah</option>
              <option value="expensive">Harga Termahal</option>
              <option value="newest">Produk Terbaru</option>
            </select>
          </div>
        </div>

        {/* Sidebar Filters (Desktop) */}
        <aside
          className={`lg:block ${
            mobileFilterOpen
              ? 'fixed inset-0 z-50 bg-black/50 flex justify-end p-0'
              : 'hidden'
          }`}
        >
          <div
            className={`bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-6 ${
              mobileFilterOpen
                ? 'w-80 h-full overflow-y-auto rounded-none shadow-2xl p-6'
                : ''
            }`}
          >
            {mobileFilterOpen && (
              <div className="flex items-center justify-between border-b pb-3">
                <span className="font-bold text-base text-[#222222]">Filter Produk</span>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Quick Promo Toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer bg-[#FFF7F5] p-3 rounded-lg border border-[#E5E7EB] hover:border-[#E5391B] transition-colors">
                <input
                  type="checkbox"
                  checked={onlyDiscount}
                  onChange={(e) => setOnlyDiscount(e.target.checked)}
                  className="accent-[#E5391B] w-4 h-4 rounded"
                />
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#E5391B]">
                  <Tag size={15} />
                  <span>Hanya Produk Diskon</span>
                </div>
              </label>
            </div>

            {/* Category Filter */}
            <div>
              <h3 className="font-bold text-sm text-[#222222] mb-3 flex items-center justify-between">
                <span>Kategori</span>
                {selectedCategory !== 'semua' && (
                  <button
                    onClick={() => setSelectedCategory('semua')}
                    className="text-[11px] text-[#E5391B] font-semibold hover:underline"
                  >
                    Reset
                  </button>
                )}
              </h3>
              <div className="space-y-1.5 text-xs">
                <button
                  onClick={() => {
                    setSelectedCategory('semua');
                    if (mobileFilterOpen) setMobileFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md font-semibold transition-colors flex items-center justify-between ${
                    selectedCategory === 'semua'
                      ? 'bg-[#E5391B] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>Semua Kategori</span>
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      if (mobileFilterOpen) setMobileFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md font-medium transition-colors flex items-center justify-between ${
                      selectedCategory === cat.id
                        ? 'bg-[#E5391B] text-white font-bold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Filter */}
            <div className="border-t border-gray-100 pt-5">
              <h3 className="font-bold text-sm text-[#222222] mb-3 flex items-center justify-between">
                <span>Merek / Brand</span>
                {selectedBrand !== 'semua' && (
                  <button
                    onClick={() => setSelectedBrand('semua')}
                    className="text-[11px] text-[#E5391B] font-semibold hover:underline"
                  >
                    Reset
                  </button>
                )}
              </h3>
              <div className="space-y-1 text-xs max-h-52 overflow-y-auto pr-1">
                <label className="flex items-center justify-between py-1 cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="brand"
                      checked={selectedBrand === 'semua'}
                      onChange={() => setSelectedBrand('semua')}
                      className="accent-[#E5391B]"
                    />
                    <span
                      className={`text-gray-700 group-hover:text-[#E5391B] transition-colors ${
                        selectedBrand === 'semua' ? 'font-bold text-[#E5391B]' : ''
                      }`}
                    >
                      Semua Brand
                    </span>
                  </div>
                </label>
                {availableBrands.map((b) => (
                  <label key={b.name} className="flex items-center justify-between py-1 cursor-pointer group">
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="radio"
                        name="brand"
                        checked={selectedBrand === b.name}
                        onChange={() => setSelectedBrand(b.name)}
                        className="accent-[#E5391B]"
                      />
                      <span
                        className={`text-gray-700 group-hover:text-[#E5391B] transition-colors truncate ${
                          selectedBrand === b.name ? 'font-bold text-[#E5391B]' : ''
                        }`}
                      >
                        {b.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium ml-1">
                      {b.count}
                    </span>
                  </label>
                ))}
                {availableBrands.length === 0 && (
                  <p className="text-[11px] text-gray-400 italic py-2">
                    Tidak ada merek dengan stok tersedia untuk filter ini.
                  </p>
                )}
              </div>
            </div>

            {/* Close Button for mobile */}
            {mobileFilterOpen && (
              <div className="pt-4 border-t">
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full bg-[#E5391B] text-white py-2.5 rounded-lg text-xs font-bold"
                >
                  Terapkan Filter ({products.length} Produk)
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="lg:col-span-3">
          {/* Desktop Sort Header */}
          <div className="hidden lg:flex items-center justify-between bg-white p-3 rounded-xl border border-[#E5E7EB] mb-4 text-xs">
            <span className="text-gray-500 font-medium">
              Menampilkan <b className="text-[#222222]">{products.length}</b> produk pilihan
            </span>

            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Urutkan:</span>
              <select
                value={sortOption}
                onChange={(e) =>
                  setSortOption(e.target.value as 'bestseller' | 'cheapest' | 'expensive' | 'newest')
                }
                className="border border-[#E5E7EB] rounded-md px-3 py-1.5 text-xs font-semibold text-[#222222] focus:border-[#E5391B] focus:outline-none bg-white cursor-pointer"
              >
                <option value="bestseller">Paling Laris (Terlaris)</option>
                <option value="cheapest">Harga Termurah</option>
                <option value="expensive">Harga Termahal</option>
                <option value="newest">Produk Terbaru</option>
              </select>
            </div>
          </div>

          {/* Empty State */}
          {products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-[#E5E7EB] p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <SlidersHorizontal size={30} />
              </div>
              <h3 className="font-bold text-base text-[#222222] mb-1">
                Produk Tidak Ditemukan
              </h3>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto mb-4">
                Maaf, tidak ada produk yang cocok dengan kriteria filter atau pencarian Anda saat ini.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('semua');
                  setSelectedBrand('semua');
                  setOnlyDiscount(false);
                }}
                className="bg-[#E5391B] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#C62818]"
              >
                Reset Semua Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-center text-xs text-gray-500">
          Memuat katalog Alvin Swalayan...
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}

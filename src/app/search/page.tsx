'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Product } from '@/types';
import { productService, SearchDetailedResult } from '@/services/productService';
import { CATEGORIES } from '@/lib/constants';
import { ProductCard } from '@/components/common/ProductCard';
import {
  Search, ArrowLeft, Sparkles, CheckCircle2, ArrowUpDown,
  Info, TrendingUp, ShoppingBag, LayoutGrid, ArrowRight,
} from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [sortOption, setSortOption] = useState<'bestseller' | 'cheapest' | 'expensive' | 'newest'>('bestseller');
  const [searchResult, setSearchResult] = useState<SearchDetailedResult | null>(null);
  const [popularKeywords, setPopularKeywords] = useState<string[]>([
    'Minyak Goreng',
    'Beras',
    'Kopi Ulee Kareng',
    'Indomie',
    'Gula Pasir',
    'Telur Ayam',
    'Royco',
    'Sunlight',
  ]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);

  // Load dynamic popular searches and bestseller products on initial client render
  useEffect(() => {
    setPopularKeywords(productService.getPopularSearches(8));
    // Load top 10 bestselling products for the discovery view
    const all = productService.search('', undefined, undefined, undefined, undefined, 'bestseller');
    setBestsellers(all.slice(0, 10));
  }, []);

  // Run search immediately from localStorage (fast), then re-run after Supabase sync
  useEffect(() => {
    if (query) {
      // Immediate result from local data
      const localRes = productService.searchDetailed(query, sortOption);
      setSearchResult(localRes);

      // Record query analytics if results were found, and refresh popular suggestions
      if (localRes.totalFound > 0) {
        productService.recordSearchQuery(query, localRes.totalFound);
        setPopularKeywords(productService.getPopularSearches(8));
      }

      // Sync from Supabase in background, re-run search if new products arrived
      productService.syncFromSupabase().then((res) => {
        if (res.success && res.count > 0) {
          const syncedRes = productService.searchDetailed(query, sortOption);
          setSearchResult(syncedRes);
          if (syncedRes.totalFound > 0) {
            productService.recordSearchQuery(query, syncedRes.totalFound);
            setPopularKeywords(productService.getPopularSearches(8));
          }
        }
      });
    } else {
      setSearchResult(null);
    }
  }, [query, sortOption]);

  // Subscribe to real-time cross-tab product updates (instantly reflect edited photos & prices)
  useEffect(() => {
    if (!query) return;
    const unsubscribe = productService.subscribe(() => {
      const liveRes = productService.searchDetailed(query, sortOption);
      setSearchResult(liveRes);
    });
    return () => unsubscribe();
  }, [query, sortOption]);

  const exactMatches = searchResult?.exactMatches || [];
  const relatedProducts = searchResult?.relatedProducts || [];
  const totalFound = exactMatches.length + relatedProducts.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Breadcrumbs & Search Info */}
      <div className="mb-6 border-b border-[#E5E7EB] pb-5">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E5391B] mb-2.5 hover:underline"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Semua Katalog</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-[#222222]">
                Hasil Pencarian: &ldquo;{query}&rdquo;
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
              {exactMatches.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  {exactMatches.length} produk langsung cocok
                </span>
              )}
              {relatedProducts.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                  <Sparkles size={12} className="text-amber-600" />
                  +{relatedProducts.length} pilihan relevan lainnya
                </span>
              )}
              {totalFound === 0 && query && (
                <span className="text-gray-500">Tidak ada produk yang cocok</span>
              )}
            </div>
          </div>

          {/* Sort Controls */}
          {totalFound > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <ArrowUpDown size={13} className="text-gray-400" />
                Urutkan:
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 font-bold focus:outline-none focus:ring-1 focus:ring-[#E5391B] cursor-pointer"
              >
                <option value="bestseller">Paling Laris</option>
                <option value="cheapest">Harga Terendah</option>
                <option value="expensive">Harga Tertinggi</option>
                <option value="newest">Produk Terbaru</option>
              </select>
            </div>
          )}
        </div>

        {/* Popular Keyword Suggestions (Dynamic Hybrid Option 3) */}
        <div className="flex items-center gap-2 text-xs text-gray-500 overflow-x-auto pb-1 mt-4 scrollbar-none">
          <div className="shrink-0 flex items-center gap-1 font-bold text-gray-500 text-[11px]">
            <TrendingUp size={12} className="text-[#E5391B]" />
            <span>Pencarian Populer:</span>
          </div>
          {popularKeywords.map((term) => {
            const isActive = query.toLowerCase() === term.toLowerCase();
            return (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                className={`shrink-0 border px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#E5391B] text-white border-[#E5391B] shadow-xs scale-102'
                    : 'bg-white hover:bg-[#FFF7F5] hover:text-[#E5391B] hover:border-red-200 border-gray-200 text-gray-700 shadow-2xs'
                }`}
              >
                {term}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {!query ? (
        /* Discovery Mode: Show useful browsing content when no search query */
        <div className="space-y-8">
          {/* Hero Banner */}
          <div className="bg-gradient-to-br from-[#FFF7F5] to-[#FFEDE8] border border-orange-200/60 rounded-2xl p-6 sm:p-8 text-center shadow-xs">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white border border-orange-200 flex items-center justify-center shadow-xs">
              <ShoppingBag size={26} className="text-[#E5391B]" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#222222] mb-1.5">
              Mau Belanja Apa Hari Ini?
            </h2>
            <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed mb-5">
              Ketik nama produk di kolom pencarian atau jelajahi kategori dan produk terlaris Alvin Swalayan di bawah ini.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1.5 bg-[#E5391B] hover:bg-[#C62818] text-white px-5 py-2.5 rounded-xl text-xs font-black transition-colors shadow-xs"
            >
              <LayoutGrid size={14} />
              <span>Lihat Semua Katalog Produk</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Category Quick Access Grid */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-5 bg-[#E5391B] rounded-full" />
              <h3 className="text-base font-black text-[#222222]">Jelajahi Kategori Belanja</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2.5">
              {CATEGORIES.filter((c) => c.is_active).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/catalog?category=${cat.slug}`}
                  className="group bg-white hover:bg-[#FFF7F5] border border-gray-200 hover:border-[#E5391B]/30 rounded-xl p-3 text-center transition-all shadow-2xs hover:shadow-xs"
                >
                  <div className="w-9 h-9 mx-auto mb-1.5 rounded-lg bg-red-50 group-hover:bg-[#E5391B]/10 flex items-center justify-center transition-colors">
                    <ShoppingBag size={16} className="text-[#E5391B]" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-800 group-hover:text-[#E5391B] line-clamp-2 leading-tight transition-colors">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Popular Search Keywords */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-[#E5391B]" />
              <h3 className="text-sm font-black text-[#222222]">Pencarian Populer</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularKeywords.map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="border border-gray-200 bg-white hover:bg-[#FFF7F5] hover:text-[#E5391B] hover:border-red-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-gray-700 transition-all shadow-2xs"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>

          {/* Bestseller Products */}
          {bestsellers.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-5 bg-orange-500 rounded-full" />
                  <h3 className="text-base font-black text-[#222222]">Produk Terlaris</h3>
                  <span className="bg-orange-100 text-orange-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-200">
                    Best Seller
                  </span>
                </div>
                <Link
                  href="/catalog"
                  className="text-xs font-bold text-[#E5391B] hover:underline flex items-center gap-1"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {bestsellers.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : totalFound === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-10 text-center max-w-lg mx-auto my-8 shadow-xs">
          <div className="w-16 h-16 mx-auto mb-3.5 rounded-full bg-red-50 flex items-center justify-center text-[#E5391B]">
            <Search size={28} />
          </div>
          <h3 className="font-extrabold text-base text-[#222222] mb-1">
            Produk &ldquo;{query}&rdquo; Tidak Ditemukan
          </h3>
          <p className="text-xs text-[#6B7280] mb-6 leading-relaxed">
            Periksa ejaan kata kunci Anda atau coba gunakan nama merek umum seperti <b>Royco</b>, <b>Masako</b>, <b>Kopi</b>, atau <b>Indomie</b>.
          </p>
          <Link
            href="/catalog"
            className="inline-block bg-[#E5391B] hover:bg-[#C62818] text-white px-5 py-2.5 rounded-lg text-xs font-black transition-colors shadow-xs"
          >
            Lihat Semua Produk di Swalayan
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {/* SECTION 1: Exact Matches */}
          {exactMatches.length > 0 ? (
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-5 bg-[#E5391B] rounded-full" />
                  <h2 className="text-base sm:text-lg font-black text-[#222222]">
                    Produk Utama: &ldquo;{query}&rdquo;
                  </h2>
                  <span className="text-xs text-gray-500 font-bold">
                    ({exactMatches.length} produk)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {exactMatches.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ) : (
            /* If no exact match but related products exist */
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
              <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold">
                  Produk persis dengan nama &ldquo;{query}&rdquo; belum ditemukan di katalog.
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Namun kami menampilkan rekomendasi produk serupa dan pilihan relevan lainnya berikut untuk Anda:
                </p>
              </div>
            </div>
          )}

          {/* SECTION 2: Related & Complementary Products */}
          {relatedProducts.length > 0 && (
            <div className="bg-gradient-to-br from-[#FFF9F6] to-[#FFF4EE] border border-orange-200/80 rounded-2xl p-4 sm:p-6 shadow-2xs">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="bg-orange-500 text-white p-1 rounded-md shadow-2xs">
                    <Sparkles size={14} />
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-gray-900">
                    {searchResult?.relatedSectionTitle || 'Pilihan Relevan Lainnya'}
                  </h3>
                  <span className="bg-orange-100 text-orange-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-200">
                    Rekomendasi
                  </span>
                </div>
                {searchResult?.relatedSectionSubtitle && (
                  <p className="text-xs text-gray-600 mt-1 pl-7 leading-relaxed">
                    {searchResult.relatedSectionSubtitle}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4">
                {relatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-gray-500 font-bold">
          Mencari produk di Alvin Swalayan...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

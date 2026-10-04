'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MEGA_CATEGORIES, MegaCategoryItem } from '@/lib/categoryMegaMenu';
import { ChevronRight, ArrowRight, Sparkles, X, LayoutGrid } from 'lucide-react';

interface CategoryMegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryMegaMenu({ isOpen, onClose }: CategoryMegaMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState<MegaCategoryItem>(MEGA_CATEGORIES[0]);

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on outside click (desktop)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleItemClick = (catId: string, query?: string) => {
    onClose();
    if (query) {
      router.push(`/catalog?category=${catId}&q=${encodeURIComponent(query)}`);
    } else {
      router.push(`/catalog?category=${catId}`);
    }
  };

  return (
    <>
      {/* ============================================================ */}
      {/* 1. MOBILE CATEGORY DRAWER / SHEET (< md)                      */}
      {/* Native App Style: 2-column touch rail, 100% responsive       */}
      {/* ============================================================ */}
      <div className="fixed inset-0 z-50 md:hidden bg-white flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Mobile Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E5391B] flex items-center justify-center">
              <LayoutGrid size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">
                Kategori Belanja
              </h2>
              <p className="text-[10px] text-gray-500">
                Pilih kebutuhan supermarket Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors"
            aria-label="Tutup menu kategori"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile Split Layout (Left Rail + Right Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Vertical Rail */}
          <div className="w-[90px] sm:w-[100px] bg-[#F8F9FA] border-r border-gray-200 overflow-y-auto py-1 shrink-0">
            {MEGA_CATEGORIES.map((cat) => {
              const isActive = activeCategory.id === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full flex flex-col items-center justify-center p-2 text-center transition-colors relative border-l-3 ${
                    isActive
                      ? 'bg-white text-[#E5391B] border-[#E5391B] shadow-xs'
                      : 'border-transparent text-gray-600 hover:bg-gray-100/70'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-gray-200 relative mb-1.5 shadow-2xs">
                    <Image
                      src={cat.thumbnail}
                      alt={cat.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                  <span
                    className={`text-[10px] leading-tight line-clamp-2 ${
                      isActive ? 'font-black text-[#E5391B]' : 'font-medium'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Content Panel */}
          <div className="flex-1 overflow-y-auto p-3.5 bg-white space-y-4">
            {/* Active Category Header Card */}
            <div className="p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100 flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-red-200 relative shrink-0">
                  <Image
                    src={activeCategory.thumbnail}
                    alt={activeCategory.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-gray-900 truncate">
                    {activeCategory.name}
                  </h3>
                  {activeCategory.badge && (
                    <span className="inline-block bg-[#E5391B] text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                      {activeCategory.badge}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleItemClick(activeCategory.id)}
                className="w-full py-1.5 px-3 bg-[#E5391B] hover:bg-[#C62818] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Lihat Semua {activeCategory.name}</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Subcategory Groups & Pill Chips */}
            <div className="space-y-4">
              {activeCategory.groups.map((group, idx) => (
                <div key={idx} className="space-y-2">
                  <div
                    onClick={() => handleItemClick(activeCategory.id, group.title)}
                    className="flex items-center justify-between cursor-pointer border-b border-gray-100 pb-1"
                  >
                    <span className="text-xs font-bold text-gray-900 hover:text-[#E5391B]">
                      {group.title}
                    </span>
                    <span className="text-[10px] text-[#E5391B] font-semibold">
                      Lihat →
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        type="button"
                        onClick={() =>
                          handleItemClick(activeCategory.id, item.query || item.name)
                        }
                        className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-[#E5391B] text-[11px] font-medium border border-gray-200 hover:border-red-200 transition-colors"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Promo Link */}
            <div className="pt-2">
              <Link
                href="/catalog?discount=true"
                onClick={onClose}
                className="block text-center p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold"
              >
                🔥 Cek Produk Sedang Diskon Hari Ini
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. DESKTOP & TABLET / IPAD MEGA MENU (>= md)                  */}
      {/* Floating Pristine Card Container                             */}
      {/* ============================================================ */}
      <div className="hidden md:block">
        {/* Backdrop overlay with full coverage */}
        <div
          className="fixed inset-0 top-[110px] bg-black/40 backdrop-blur-2xs z-30 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Floating Centered Container */}
        <div
          ref={menuRef}
          className="absolute top-full left-0 right-0 z-40 max-w-7xl mx-auto px-4 pt-2"
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden flex h-[470px] animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Left Column: Categories List (iPad & Desktop optimized) */}
            <div className="w-[220px] lg:w-[250px] bg-[#F8F9FA] border-r border-gray-200 overflow-y-auto py-2 shrink-0">
              <div className="px-3.5 py-1.5 mb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Kategori Pilihan
                </span>
                <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.2 rounded font-bold">
                  {MEGA_CATEGORIES.length}
                </span>
              </div>
              {MEGA_CATEGORIES.map((cat) => {
                const isActive = activeCategory.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onMouseEnter={() => setActiveCategory(cat)}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-left text-xs transition-all border-l-4 ${
                      isActive
                        ? 'bg-white text-[#E5391B] font-bold border-[#E5391B] shadow-xs'
                        : 'border-transparent text-gray-700 hover:bg-white hover:text-gray-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-gray-100 shrink-0 relative">
                        <Image
                          src={cat.thumbnail}
                          alt={cat.name}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <ChevronRight
                      size={14}
                      className={isActive ? 'text-[#E5391B]' : 'text-gray-400 opacity-50'}
                    />
                  </button>
                );
              })}
            </div>

            {/* Right Panel: Subcategories & Groups */}
            <div className="flex-1 p-5 lg:p-6 overflow-y-auto bg-white flex flex-col justify-between">
              <div>
                {/* Category Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-white border border-gray-200 relative shrink-0">
                      <Image
                        src={activeCategory.thumbnail}
                        alt={activeCategory.name}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900">
                          {activeCategory.name}
                        </h3>
                        {activeCategory.badge && (
                          <span className="bg-red-50 text-[#E5391B] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-200">
                            <Sparkles size={10} />
                            {activeCategory.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Pilihan {activeCategory.name.toLowerCase()} lengkap dan hemat di Alvin Swalayan Banda Aceh
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleItemClick(activeCategory.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#E5391B] bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 shrink-0"
                  >
                    <span>Lihat Semua Produk</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* Subcategory Groups Grid: Responsive for iPad (2-3 cols) & Desktop (4-5 cols) */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 pt-4">
                  {activeCategory.groups.map((group, idx) => (
                    <div key={idx} className="space-y-2">
                      <h4
                        onClick={() => handleItemClick(activeCategory.id, group.title)}
                        className="font-bold text-gray-900 text-xs sm:text-sm hover:text-[#E5391B] cursor-pointer transition-colors pb-1 border-b border-gray-100 truncate"
                        title={group.title}
                      >
                        {group.title}
                      </h4>
                      <ul className="space-y-1 text-xs">
                        {group.items.map((item, itemIdx) => (
                          <li key={itemIdx}>
                            <button
                              type="button"
                              onClick={() =>
                                handleItemClick(activeCategory.id, item.query || item.name)
                              }
                              className="text-gray-600 hover:text-[#E5391B] hover:translate-x-1 transition-all text-left block w-full py-0.5 truncate"
                              title={item.name}
                            >
                              {item.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Footer Info Bar */}
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Stok segar &amp; lengkap ready kirim langsung dari toko Banda Aceh</span>
                </span>
                <Link
                  href="/catalog?discount=true"
                  onClick={onClose}
                  className="text-[#FF6D00] font-bold hover:underline"
                >
                  Lihat Promo &amp; Diskon Hari Ini →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

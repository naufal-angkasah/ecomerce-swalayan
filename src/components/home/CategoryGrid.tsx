'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MEGA_CATEGORIES } from '@/lib/categoryMegaMenu';
import { ShoppingBag, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';

export function CategoryGrid() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="my-8">
      {/* Section Header (Klik Indomaret style) */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <ShoppingBag size={18} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#222222] leading-tight">
              Kategori Belanja
            </h2>
            <p className="text-[11px] sm:text-xs text-[#6B7280]">
              Pilih kebutuhan harian keluarga Anda sesuai kategori
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll Navigation Buttons for Desktop */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 transition-colors shadow-xs"
              aria-label="Scroll Kategori ke Kiri"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 transition-colors shadow-xs"
              aria-label="Scroll Kategori ke Kanan"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <Link
            href="/catalog"
            className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline ml-2"
          >
            Lihat Semua
          </Link>
        </div>
      </div>

      {/* Horizontal Scrollable Category Cards (Modern Supermarket Bento Layout) */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar scrollbar-none [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {MEGA_CATEGORIES.map((cat) => (
          <Link
            key={cat.id}
            href={`/catalog?category=${cat.id}`}
            className={`w-[126px] sm:w-[142px] md:w-[155px] h-[138px] sm:h-[152px] md:h-[162px] flex-shrink-0 bg-gradient-to-b ${
              cat.themeGradient || 'from-gray-50 to-white'
            } rounded-2xl border ${
              cat.borderColor || 'border-gray-200'
            } hover:border-[#E5391B] p-2.5 sm:p-3 relative flex flex-col justify-between group overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200`}
          >
            {/* Header: Title & Subtitle */}
            <div className="z-10 text-left pr-1">
              <span className="block text-xs sm:text-[13px] md:text-sm font-bold text-gray-900 leading-tight group-hover:text-[#E5391B] transition-colors line-clamp-1">
                {cat.name}
              </span>
              {cat.subtitle && (
                <span className="block text-[10px] text-gray-500 font-medium leading-tight mt-0.5 line-clamp-1">
                  {cat.subtitle}
                </span>
              )}
            </div>

            {/* Bottom: Prominent Framed Product Image */}
            <div className="relative w-full flex justify-end items-end mt-auto pt-1">
              <div className="relative w-[68px] h-[68px] sm:w-[80px] sm:h-[80px] md:w-[88px] md:h-[88px] rounded-xl overflow-hidden shadow-xs border border-white/70 bg-white/50 transition-transform duration-300 group-hover:scale-108 group-hover:-translate-y-0.5">
                <Image
                  src={cat.cardImage}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 640px) 70px, (max-width: 1024px) 80px, 90px"
                  className="object-cover"
                />
              </div>
            </div>
          </Link>
        ))}

        {/* Card 'Semua Kategori' at the end */}
        <Link
          href="/catalog"
          className="w-[126px] sm:w-[142px] md:w-[155px] h-[138px] sm:h-[152px] md:h-[162px] flex-shrink-0 bg-gradient-to-b from-red-50/80 via-orange-50/30 to-white rounded-2xl border border-dashed border-red-200 hover:border-[#E5391B] p-2.5 sm:p-3 relative flex flex-col justify-between group overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200"
        >
          <div className="z-10 text-left">
            <span className="block text-xs sm:text-[13px] md:text-sm font-bold text-gray-900 leading-tight group-hover:text-[#E5391B] transition-colors">
              Semua Kategori
            </span>
            <span className="block text-[10px] text-gray-500 font-medium leading-tight mt-0.5">
              100+ Pilihan
            </span>
          </div>

          <div className="relative w-full flex justify-end items-end mt-auto pt-1">
            <div className="w-[68px] h-[68px] sm:w-[80px] sm:h-[80px] md:w-[88px] md:h-[88px] rounded-xl bg-red-100 text-[#E5391B] flex flex-col items-center justify-center gap-1 group-hover:bg-[#E5391B] group-hover:text-white transition-all shadow-xs">
              <LayoutGrid size={22} />
              <span className="text-[10px] font-bold">Lihat Semua</span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { STORE_INFO } from '@/lib/constants';
import { ShoppingBag, ArrowRight, Truck, CheckCircle2, Shield } from 'lucide-react';

export function HeroBanner() {
  return (
    <section className="bg-gradient-to-r from-[#D32F2F] via-[#E5391B] to-[#C62818] text-white py-6 sm:py-8 px-4 sm:px-6 rounded-2xl shadow-md border border-red-500/30 my-4 overflow-hidden relative">
      {/* Subtle background pattern */}
      <div className="absolute -right-12 -bottom-12 opacity-10 text-white pointer-events-none">
        <svg width="280" height="280" viewBox="0 0 100 100" fill="currentColor">
          <circle cx="50" cy="50" r="48" />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        {/* Left Text */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-black/20 border border-white/20 px-3 py-1 rounded-full text-xs font-bold text-amber-300 shadow-2xs">
            <Truck size={14} />
            <span>Pengantaran Khusus Wilayah Banda Aceh</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white">
            {STORE_INFO.headline}
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-white/90 max-w-xl font-normal leading-relaxed">
            {STORE_INFO.subheadline}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 bg-[#FFC107] hover:bg-[#FFB300] active:bg-[#FFA000] text-[#222222] font-black px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm transition-all shadow-md hover:scale-102"
            >
              <ShoppingBag size={18} />
              <span>{STORE_INFO.ctaText}</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/catalog?discount=true"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm border border-white/30 transition-colors"
            >
              <span>Lihat Promo Hari Ini</span>
            </Link>
          </div>
        </div>

        {/* Right Info Box: Store Guarantee & Location badge */}
        <div className="shrink-0 bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-xs space-y-2.5 max-w-xs w-full text-left shadow-sm">
          <div className="font-bold text-white flex items-center gap-2 text-sm border-b border-white/20 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse"></span>
            <span>Toko Buka Hari Ini</span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <CheckCircle2 size={15} className="text-amber-300 shrink-0" />
            <span>07.30 - 22.30 WIB</span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <Shield size={15} className="text-[#FFC107] shrink-0" />
            <span>Garansi Barang Asli &amp; Segar</span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <Truck size={15} className="text-[#FFC107] shrink-0" />
            <span>Bisa Bayar di Tempat (COD)</span>
          </div>
        </div>
      </div>
    </section>
  );
}

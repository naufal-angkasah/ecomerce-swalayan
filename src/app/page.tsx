import React from 'react';
import { PromoCarousel } from '@/components/home/PromoCarousel';
import { HeroBanner } from '@/components/home/HeroBanner';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { DiscountSection } from '@/components/home/DiscountSection';
import { FeaturedSection } from '@/components/home/FeaturedSection';
import { BestSellerSection } from '@/components/home/BestSellerSection';
import { BenefitSection } from '@/components/home/BenefitSection';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      {/* 1. Promo Carousel Banner */}
      <PromoCarousel />

      {/* 2. Hero & Store Assurance Banner (Khusus Desktop/Laptop di atas) */}
      <div className="hidden md:block">
        <HeroBanner />
      </div>

      {/* 3. Kategori Section */}
      <CategoryGrid />

      {/* 4. Sedang Diskon (Langsung nampak produk di HP) */}
      <DiscountSection />

      {/* 5. Produk Pilihan Alvin */}
      <FeaturedSection />

      {/* 6. Terlaris Minggu Ini */}
      <BestSellerSection />

      {/* 7. Hero & Store Assurance Banner (Khusus Mobile/HP tampil di bawah sebelum Keuntungan Toko) */}
      <div className="md:hidden">
        <HeroBanner />
      </div>

      {/* 8. Kenapa Belanja di Alvin Swalayan (Benefit) */}
      <BenefitSection />
    </div>
  );
}

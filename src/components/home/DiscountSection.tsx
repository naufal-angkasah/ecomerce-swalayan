'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Product } from '@/types';
import { productService } from '@/services/productService';
import { ProductCard } from '@/components/common/ProductCard';
import { Tag, ArrowRight } from 'lucide-react';

export function DiscountSection() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = () => setProducts(productService.getDiscounts(10));
    load();
    const unsubscribe = productService.subscribe(load);
    return () => unsubscribe();
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="my-6 sm:my-8 md:my-10 bg-[#FFF7F5] border border-[#E5E7EB] p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-5">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#E5391B] text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5 sm:mt-0">
            <Tag size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-[#222222]">
                Sedang Diskon
              </h2>
              <span className="bg-[#E5391B] text-white text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap shrink-0 shadow-2xs">
                Hemat Hari Ini
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#6B7280] line-clamp-1 sm:line-clamp-none mt-0.5">
              Harga spesial potongan langsung untuk kebutuhan pokok Anda
            </p>
          </div>
        </div>

        <div className="flex justify-end shrink-0">
          <Link
            href="/catalog?discount=true"
            className="text-xs font-bold text-[#E5391B] hover:text-[#C62818] flex items-center gap-1 py-1 px-2 -mr-2 sm:mr-0 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <span>Lihat Semua Promo</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5 md:gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Product } from '@/types';
import { productService } from '@/services/productService';
import { ProductCard } from '@/components/common/ProductCard';
import { Sparkles, ArrowRight } from 'lucide-react';

export function FeaturedSection() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = () => setProducts(productService.getFeatured(5));
    load();
    const unsubscribe = productService.subscribe(load);
    return () => unsubscribe();
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="my-6 sm:my-8 md:my-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-5">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FF6D00] text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5 sm:mt-0">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#222222]">
              Produk Pilihan Alvin
            </h2>
            <p className="text-[11px] sm:text-xs text-[#6B7280] line-clamp-1 sm:line-clamp-none mt-0.5">
              Rekomendasi terbaik dan paling diminati pilihan staf toko Alvin Swalayan
            </p>
          </div>
        </div>

        <div className="flex justify-end shrink-0">
          <Link
            href="/catalog"
            className="text-xs font-bold text-[#E5391B] hover:text-[#C62818] flex items-center gap-1 py-1 px-2 -mr-2 sm:mr-0 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <span>Lihat Semua</span>
            <ArrowRight size={14} />
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

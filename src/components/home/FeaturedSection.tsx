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
    <section className="my-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FF6D00] text-white flex items-center justify-center shadow-xs">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-[#222222]">
              Produk Pilihan Alvin
            </h2>
            <p className="text-xs text-[#6B7280]">
              Rekomendasi terbaik dan paling diminati pilihan staf toko Alvin Swalayan
            </p>
          </div>
        </div>

        <Link
          href="/catalog"
          className="text-xs font-bold text-[#E5391B] hover:text-[#C62818] flex items-center gap-1"
        >
          <span>Lihat Semua</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

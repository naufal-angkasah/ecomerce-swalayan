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
    <section className="my-10 bg-[#FFF7F5] border border-[#E5E7EB] p-4 md:p-6 rounded-xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E5391B] text-white flex items-center justify-center shadow-xs">
            <Tag size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold text-[#222222]">
                Sedang Diskon
              </h2>
              <span className="bg-[#E5391B] text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                Hemat Hari Ini
              </span>
            </div>
            <p className="text-xs text-[#6B7280]">
              Harga spesial potongan langsung untuk kebutuhan pokok Anda
            </p>
          </div>
        </div>

        <Link
          href="/catalog?discount=true"
          className="text-xs font-bold text-[#E5391B] hover:text-[#C62818] flex items-center gap-1"
        >
          <span>Lihat Semua Promo</span>
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

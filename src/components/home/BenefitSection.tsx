'use client';

import React from 'react';
import { STORE_BENEFITS } from '@/lib/constants';
import { CheckCircle2, Tag, Store, Truck } from 'lucide-react';

export function BenefitSection() {
  const getIcon = (idx: number) => {
    switch (idx) {
      case 0:
        return <CheckCircle2 size={24} className="text-[#E5391B]" />;
      case 1:
        return <Tag size={24} className="text-[#FF6D00]" />;
      case 2:
        return <Store size={24} className="text-[#16A34A]" />;
      default:
        return <Truck size={24} className="text-[#E5391B]" />;
    }
  };

  return (
    <section className="my-12 py-8 px-4 rounded-xl border border-[#E5E7EB] bg-white">
      <div className="text-center max-w-xl mx-auto mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-[#222222]">
          Kenapa Belanja di Alvin Swalayan?
        </h2>
        <p className="text-xs md:text-sm text-[#6B7280] mt-1">
          Kenyamanan belanja supermarket lokal terpercaya langsung dari Peunyeurat, Banda Aceh
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STORE_BENEFITS.map((item, index) => (
          <div
            key={item.title}
            className="flex flex-col items-center sm:items-start text-center sm:text-left p-4 rounded-lg bg-[#FFF7F5] border border-[#E5E7EB]"
          >
            <div className="w-12 h-12 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center mb-3 shadow-xs">
              {getIcon(index)}
            </div>
            <h3 className="font-bold text-sm text-[#222222] mb-1.5 leading-snug">
              {item.title}
            </h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

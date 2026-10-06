'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Product } from '@/types';
import { formatRupiah, calculateDiscount } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ShoppingBag, Check, AlertCircle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const [errorToast, setErrorToast] = useState('');

  const discountPercent = calculateDiscount(product.price, product.discount_price);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    if (!user) {
      router.push('/login?redirect=/cart');
      return;
    }

    if (isAdmin) {
      setErrorToast('Akun Admin tidak dapat belanja.');
      setTimeout(() => setErrorToast(''), 3000);
      return;
    }

    const res = addToCart(product, 1);
    if (res.success) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
    } else {
      setErrorToast(res.message);
      setTimeout(() => setErrorToast(''), 2500);
    }
  };

  return (
    <div className="group relative bg-white rounded-lg border border-[#E5E7EB] hover:border-[#E5391B]/50 hover:shadow-md transition-all flex flex-col h-full overflow-hidden">
      {/* Discount Badge */}
      {discountPercent > 0 && (
        <div className="absolute top-2 sm:top-2.5 left-2 sm:left-2.5 z-10 bg-[#E5391B] text-white text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded sm:rounded-md shadow-xs border border-white/20 tracking-tight">
          -{discountPercent}%
        </div>
      )}

      {/* Stock warning ribbon if low stock */}
      {isLowStock && (
        <div className="absolute top-2 right-2 z-10 bg-[#FF6D00] text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-xs">
          Tersisa {product.stock}
        </div>
      )}

      {/* Product Image Link */}
      <Link
        href={`/products/${product.slug}`}
        className="block relative aspect-square bg-[#FFF7F5] overflow-hidden p-2.5 sm:p-3"
      >
        <img
          src={product.image_url}
          alt={product.name}
          className={`w-full h-full object-cover object-center rounded transition-transform duration-300 group-hover:scale-105 ${
            isOutOfStock ? 'opacity-50 grayscale' : ''
          }`}
          loading="lazy"
        />

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
            <span className="bg-gray-800 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded">
              Stok Habis
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-2.5 sm:p-3.5 flex flex-col flex-1">
        {/* Brand & Unit */}
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#6B7280] mb-1 font-medium">
          <span className="truncate max-w-[65%]">{product.brand}</span>
          <span className="text-gray-500 bg-gray-100 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px]">
            {product.unit}
          </span>
        </div>

        {/* Product Name */}
        <Link
          href={`/products/${product.slug}`}
          className="font-semibold text-xs sm:text-sm text-[#222222] hover:text-[#E5391B] line-clamp-2 leading-snug mb-1.5 sm:mb-2 min-h-[2rem] sm:min-h-[2.5rem] group-hover:underline"
          title={product.name}
        >
          {product.name}
        </Link>

        {/* Price Area */}
        <div className="mt-auto pt-1.5 sm:pt-2">
          {product.discount_price && product.discount_price < product.price ? (
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs text-[#6B7280] line-through leading-tight">
                {formatRupiah(product.price)}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[#E5391B] leading-tight">
                {formatRupiah(product.discount_price)}
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold text-[#222222] leading-tight">
                {formatRupiah(product.price)}
              </span>
            </div>
          )}
        </div>

        {/* Error notification if cart limit reached */}
        {errorToast && (
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-[#E5391B] bg-red-50 p-1 sm:p-1.5 rounded flex items-center gap-1 font-medium">
            <AlertCircle size={12} className="shrink-0" />
            <span className="truncate">{errorToast}</span>
          </div>
        )}

        {/* Add to Cart Button */}
        <div className="mt-2.5 sm:mt-3">
          {isOutOfStock ? (
            <button
              disabled
              className="w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded bg-gray-100 text-gray-400 text-[11px] sm:text-xs font-medium cursor-not-allowed text-center"
            >
              Stok Habis
            </button>
          ) : (
            <button
              onClick={handleAdd}
              disabled={justAdded}
              className={`w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors shadow-xs select-none ${
                justAdded
                  ? 'bg-[#16A34A] text-white'
                  : 'bg-[#E5391B] hover:bg-[#C62818] active:bg-[#B71C1C] text-white'
              }`}
            >
              {justAdded ? (
                <>
                  <Check size={13} className="sm:w-3.5 sm:h-3.5" />
                  <span>Ditambahkan!</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={13} className="sm:w-3.5 sm:h-3.5" />
                  <span>+ Keranjang</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

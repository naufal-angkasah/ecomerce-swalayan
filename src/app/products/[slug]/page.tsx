'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Product } from '@/types';
import { productService } from '@/services/productService';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatRupiah, calculateDiscount } from '@/lib/utils';
import { ProductCard } from '@/components/common/ProductCard';
import {
  ShoppingBag,
  Check,
  Truck,
  Store,
  Plus,
  Minus,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { user, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!slug) return;

    const loadProduct = () => {
      const found = productService.getBySlug(slug);
      if (found) {
        setProduct(found);
        // Find related products in same category
        const related = productService
          .getByCategory(found.category)
          .filter((p) => p.id !== found.id)
          .slice(0, 8);
        setRelatedProducts(related);
      }
    };

    loadProduct();

    // Background cloud sync in case product was updated on another device
    productService.syncFromSupabase().then((res) => {
      if (res.success && res.count > 0) {
        loadProduct();
      }
    });

    const unsubscribe = productService.subscribe(loadProduct);
    return () => unsubscribe();
  }, [slug]);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-[#222222] mb-2">Produk Tidak Ditemukan</h2>
        <p className="text-xs text-[#6B7280] mb-6">
          Produk yang Anda cari mungkin sudah tidak tersedia atau link salah.
        </p>
        <Link
          href="/catalog"
          className="bg-[#E5391B] text-white px-5 py-2.5 rounded-lg text-xs font-bold"
        >
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  const discountPercent = calculateDiscount(product.price, product.discount_price);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity((prev) => prev + 1);
      setErrorMessage('');
    } else {
      setErrorMessage(`Maksimal pembelian ${product.stock} sesuai stok toko.`);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
      setErrorMessage('');
    }
  };

  const handleAddToCart = () => {
    if (!user) {
      router.push(`/login?redirect=/products/${slug}`);
      return;
    }
    if (isAdmin) {
      setErrorMessage('Akun Admin bertugas mengelola operasional toko dan tidak dapat membuat pesanan belanja.');
      return;
    }
    if (isOutOfStock) return;
    const res = addToCart(product, quantity);
    if (res.success) {
      setAddedSuccess(true);
      setErrorMessage('');
      setTimeout(() => setAddedSuccess(false), 2000);
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }
    if (isAdmin) {
      setErrorMessage('Akun Admin bertugas mengelola operasional toko dan tidak dapat membuat pesanan belanja.');
      return;
    }
    if (isOutOfStock) return;
    const res = addToCart(product, quantity);
    if (res.success) {
      router.push('/checkout');
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#6B7280] mb-6">
        <Link href="/" className="hover:text-[#E5391B]">
          Beranda
        </Link>
        <span>/</span>
        <Link href="/catalog" className="hover:text-[#E5391B]">
          Katalog
        </Link>
        <span>/</span>
        <Link href={`/catalog?category=${product.category}`} className="hover:text-[#E5391B] capitalize">
          {product.category.replace('-', ' ')}
        </Link>
        <span>/</span>
        <span className="text-[#222222] font-semibold truncate max-w-[200px]">
          {product.name}
        </span>
      </nav>

      {/* Main Product Container */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: Product Image */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-[#FFF7F5] rounded-xl border border-[#E5E7EB] overflow-hidden p-6 flex items-center justify-center">
            {discountPercent > 0 && (
              <div className="absolute top-4 left-4 z-10 bg-[#E5391B] text-white text-sm sm:text-base font-black px-3.5 py-1.5 rounded-lg shadow-md border border-white/20 tracking-tight">
                Hemat {discountPercent}%
              </div>
            )}
            <img
              src={product.image_url}
              alt={product.name}
              className={`w-full h-full object-contain rounded-lg transition-transform duration-300 hover:scale-105 ${
                isOutOfStock ? 'opacity-50 grayscale' : ''
              }`}
            />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <span className="bg-gray-800 text-white text-sm font-bold px-4 py-1.5 rounded">
                  Stok Habis di Toko
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Product Info & Actions */}
        <div className="flex flex-col">
          {/* Brand & SKU */}
          <div className="flex items-center justify-between text-xs text-[#6B7280] mb-2 font-medium">
            <span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-700">
              Merek: {product.brand}
            </span>
            <span className="font-mono text-gray-400">SKU: {product.sku}</span>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-[#222222] leading-snug mb-3">
            {product.name}
          </h1>

          {/* Unit / Packaging */}
          <div className="text-xs text-gray-500 mb-4">
            Satuan / Kemasan: <span className="font-semibold text-gray-800">{product.unit}</span>
          </div>

          {/* Pricing Box */}
          <div className="bg-[#FFF7F5] p-4 rounded-lg border border-[#E5E7EB] mb-5">
            <div className="flex items-baseline gap-3">
              {product.discount_price && product.discount_price < product.price ? (
                <>
                  <span className="text-2xl sm:text-3xl font-black text-[#E5391B]">
                    {formatRupiah(product.discount_price)}
                  </span>
                  <span className="text-sm text-[#6B7280] line-through">
                    {formatRupiah(product.price)}
                  </span>
                  <span className="bg-[#E5391B]/10 text-[#E5391B] font-bold text-xs px-2 py-0.5 rounded">
                    Potongan {formatRupiah(product.price - product.discount_price)}
                  </span>
                </>
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-[#222222]">
                  {formatRupiah(product.price)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              *Harga sudah termasuk pajak toko swalayan
            </p>
          </div>

          {/* Stock Indicator */}
          <div className="mb-6">
            <span className="text-xs font-semibold text-gray-600 mr-2">Status Stok:</span>
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded">
                Stok Habis
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF6D00] bg-orange-50 px-2.5 py-1 rounded">
                Tersisa {product.stock} unit lagi!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#16A34A] bg-green-50 px-2.5 py-1 rounded">
                Tersedia ({product.stock} stok toko)
              </span>
            )}
          </div>

          {/* Quantity Selector & Action Buttons / Admin Mode */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            {isAdmin ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <ShieldAlert size={18} className="text-amber-600 shrink-0" />
                  <span>Mode Administrator Toko Aktif</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Akun Admin bertugas mengelola katalog dan persediaan stok toko. Fitur keranjang belanja dan checkout dinonaktifkan untuk akun administrator.
                </p>
                <div className="pt-1 flex flex-wrap gap-2">
                  <Link
                    href="/admin/products"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    <Store size={14} /> Kelola di Dashboard Admin
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {!isOutOfStock && (
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-[#222222]">Jumlah:</span>
                    <div className="flex items-center border-2 border-[#E5E7EB] rounded-lg overflow-hidden bg-white">
                      <button
                        onClick={handleDecrement}
                        disabled={quantity <= 1}
                        className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                        aria-label="Kurangi jumlah"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={product.stock}
                        value={quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1 && val <= product.stock) {
                            setQuantity(val);
                            setErrorMessage('');
                          }
                        }}
                        className="w-12 text-center text-sm font-bold text-[#222222] focus:outline-none"
                      />
                      <button
                        onClick={handleIncrement}
                        disabled={quantity >= product.stock}
                        className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                        aria-label="Tambah jumlah"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <span className="text-xs text-gray-500">
                      Subtotal:{' '}
                      <b className="text-[#222222]">
                        {formatRupiah((product.discount_price || product.price) * quantity)}
                      </b>
                    </span>
                  </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-1.5 font-medium">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock || addedSuccess}
                    className={`w-full py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                      addedSuccess
                        ? 'bg-[#16A34A] text-white'
                        : isOutOfStock
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-[#FFF7F5] border-2 border-[#E5391B] text-[#E5391B] hover:bg-[#E5391B] hover:text-white'
                    }`}
                  >
                    {addedSuccess ? (
                      <>
                        <Check size={18} />
                        <span>Berhasil Masuk Keranjang!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={18} />
                        <span>+ Tambah ke Keranjang</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleBuyNow}
                    disabled={isOutOfStock}
                    className={`w-full py-3 px-4 rounded-lg text-sm font-black transition-all shadow-sm ${
                      isOutOfStock
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#E5391B] hover:bg-[#C62818] active:bg-[#B71C1C] text-white'
                    }`}
                  >
                    Beli Sekarang
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Store Assurance Badges */}
          <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Store size={18} className="text-[#E5391B] shrink-0" />
              <span>Dipacking staf toko Alvin Swalayan</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-[#FF6D00] shrink-0" />
              <span>Antar langsung area Banda Aceh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Additional Info Tabs */}
      <div className="mt-8 bg-white rounded-xl border border-[#E5E7EB] p-6">
        <h2 className="text-base font-bold text-[#222222] border-b-2 border-[#E5391B] inline-block pb-1 mb-4">
          Deskripsi &amp; Informasi Produk
        </h2>
        <div className="text-sm text-[#222222] leading-relaxed space-y-3">
          <p>{product.description}</p>
          <div className="bg-gray-50 p-4 rounded-lg text-xs space-y-1.5 max-w-md mt-4 border border-gray-100">
            <p>
              <b className="text-gray-700">Kategori:</b>{' '}
              <span className="capitalize">{product.category.replace('-', ' ')}</span>
            </p>
            <p>
              <b className="text-gray-700">Merek Dagang:</b> {product.brand}
            </p>
            <p>
              <b className="text-gray-700">Satuan Jual:</b> {product.unit}
            </p>
            <p>
              <b className="text-gray-700">Ketersediaan Fisik:</b> Tersedia di rak Alvin Swalayan, Peunyeurat
            </p>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-[#222222] mb-4">
            Produk Terkait Lainnya
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

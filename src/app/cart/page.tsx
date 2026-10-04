'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatRupiah } from '@/lib/utils';
import { STORE_INFO } from '@/lib/constants';
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Tag,
  Ticket,
  Check,
  ChevronRight,
  AlertCircle,
  Truck,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react';
import { VoucherSelectorModal } from '@/components/cart/VoucherSelectorModal';

export default function CartPage() {
  const router = useRouter();
  const { user, isAdmin, switchToCustomer } = useAuth();
  const {
    items,
    removeFromCart,
    updateQuantity,
    updateItemNote,
    subtotal,
    totalItems,
    appliedVoucher,
    discountAmount,
    applyVoucherCode,
    removeVoucher,
  } = useCart();

  const [voucherInput, setVoucherInput] = useState('');
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherFeedback, setVoucherFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [qtyError, setQtyError] = useState<{ [key: string]: string }>({});
  const [isReorderedBanner, setIsReorderedBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reordered') === 'true') {
        setIsReorderedBanner(true);
      }
    }
  }, []);

  const isFreeDelivery = subtotal >= STORE_INFO.freeDeliveryThreshold;
  const deliveryFee = items.length === 0 ? 0 : isFreeDelivery ? 0 : STORE_INFO.deliveryFeeFlat;
  const finalTotal = Math.max(0, subtotal - discountAmount + deliveryFee);

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherInput.trim()) return;
    const res = applyVoucherCode(voucherInput.trim());
    setVoucherFeedback(res);
  };

  const handleQuantityChange = (productId: string, newQty: number, maxStock: number) => {
    if (newQty > maxStock) {
      setQtyError((prev) => ({
        ...prev,
        [productId]: `Maksimal pembelian ${maxStock} unit.`,
      }));
      return;
    }
    setQtyError((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    updateQuantity(productId, newQty);
  };

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/cart');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-xs text-gray-500">
        Mengarahkan ke halaman masuk...
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-[#E5391B]">
          <ShieldAlert size={38} />
        </div>
        <div className="inline-block bg-[#E5391B]/10 text-[#E5391B] text-xs font-bold px-3 py-1 rounded-full mb-3">
          Akses Khusus Pengelola Toko
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-[#222222] mb-2">
          Akun Admin Tidak Dapat Belanja Mandiri
        </h1>
        <p className="text-xs text-[#6B7280] mb-6 max-w-md mx-auto leading-relaxed">
          Anda saat ini masuk sebagai <b>Admin Alvin Swalayan</b> (<span className="text-gray-800 font-mono">admin@alvinswalayan.com</span>). Akun admin bertugas untuk mengelola produk, rak stok, dan memproses pesanan masuk pelanggan di Dashboard Admin.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/admin"
            className="bg-[#E5391B] hover:bg-[#C62818] text-white px-6 py-2.5 rounded-lg text-xs font-bold shadow-md transition-colors"
          >
            Masuk Dashboard Admin
          </Link>
          <button
            onClick={() => {
              switchToCustomer();
            }}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Beralih ke Akun Pelanggan
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#FFF7F5] border border-[#E5391B]/20 flex items-center justify-center text-[#E5391B]">
          <ShoppingBag size={36} />
        </div>
        <h1 className="text-xl font-bold text-[#222222] mb-2">Keranjang Belanja Kosong</h1>
        <p className="text-xs text-[#6B7280] mb-6 max-w-sm mx-auto">
          Belum ada produk yang Anda tambahkan ke keranjang. Mari temukan kebutuhan dapur dan harian Anda di Alvin Swalayan!
        </p>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 bg-[#E5391B] hover:bg-[#C62818] text-white px-6 py-3 rounded-lg text-sm font-bold shadow-md transition-all"
        >
          <span>Mulai Belanja Sekarang</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Reorder Notification Banner */}
      {isReorderedBanner && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-extrabold text-sm text-emerald-900">
                Produk Pesanan Berhasil Dimasukkan ke Keranjang!
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Silakan tambah, kurangi (tombol + / -), atau hapus barang di bawah ini sesuai kebutuhan belanja Anda, lalu lanjutkan ke pembayaran.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsReorderedBanner(false)}
            className="text-emerald-600 hover:text-emerald-800 p-1 rounded-md transition-colors cursor-pointer shrink-0"
            title="Tutup pemberitahuan"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Title */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#222222]">
            Keranjang Belanja
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Total {totalItems} barang belanjaan dari toko Alvin Swalayan
          </p>
        </div>
        <Link
          href="/catalog"
          className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#E5391B] hover:underline"
        >
          <ArrowLeft size={14} />
          <span>Tambah Barang Lain</span>
        </Link>
      </div>

      {/* Guest Notice */}
      {!user && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-[#FF6D00] shrink-0" />
            <span>
              Anda sedang melihat keranjang sebagai tamu. Masuk untuk kemudahan pengantaran langsung ke alamat Anda di Banda Aceh.
            </span>
          </div>
          <Link
            href="/login?redirect=/cart"
            className="inline-flex items-center justify-center px-4 py-1.5 bg-[#E5391B] text-white font-bold rounded-lg hover:bg-[#C62818] shrink-0 self-start sm:self-auto"
          >
            Masuk Sekarang
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Items List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Free Shipping Progress Indicator */}
          <div className="bg-[#FFF7F5] border border-[#E5391B]/20 p-4 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E5391B] text-white flex items-center justify-center shrink-0">
              <Truck size={18} />
            </div>
            <div className="flex-1 text-xs">
              {isFreeDelivery ? (
                <p className="font-bold text-[#16A34A]">
                  🎉 Selamat! Anda mendapatkan Gratis Ongkir Pengantaran Banda Aceh!
                </p>
              ) : (
                <p className="text-gray-700">
                  Tambah belanjaan sebesar{' '}
                  <b className="text-[#E5391B]">
                    {formatRupiah(STORE_INFO.freeDeliveryThreshold - subtotal)}
                  </b>{' '}
                  lagi untuk menikmati <b className="text-[#E5391B]">Gratis Ongkir</b> di Banda Aceh!
                </p>
              )}
            </div>
          </div>

          {/* Items Container */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] divide-y divide-gray-100 overflow-hidden">
            {items.map(({ product, quantity, note }) => {
              const itemPrice = product.discount_price || product.price;
              const itemSubtotal = itemPrice * quantity;
              const error = qtyError[product.id];

              return (
                <div key={product.id} className="p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Thumbnail & Name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0 bg-gray-50"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                          {product.brand}
                        </span>
                        <Link
                          href={`/products/${product.slug}`}
                          className="block font-semibold text-xs sm:text-sm text-[#222222] hover:text-[#E5391B] truncate"
                        >
                          {product.name}
                        </Link>
                        <span className="text-[11px] text-gray-500">
                          {product.unit} • {formatRupiah(itemPrice)}
                        </span>
                        {product.stock <= 5 && (
                          <p className="text-[10px] font-bold text-[#FF6D00] mt-0.5">
                            Tersisa {product.stock} di toko
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls & Subtotal */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                      {/* Controls */}
                      <div className="flex items-center border border-[#E5E7EB] rounded-lg bg-white">
                        <button
                          onClick={() => handleQuantityChange(product.id, quantity - 1, product.stock)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 transition-colors"
                          aria-label="Kurangi"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-[#222222]">
                          {quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(product.id, quantity + 1, product.stock)}
                          disabled={quantity >= product.stock}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                          aria-label="Tambah"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right min-w-[90px]">
                        <span className="text-xs sm:text-sm font-extrabold text-[#E5391B]">
                          {formatRupiah(itemSubtotal)}
                        </span>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                        title="Hapus dari keranjang"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Catatan Khusus Barang / Catatan Kesegaran */}
                  <div className="pt-2 border-t border-dashed border-gray-100 flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 shrink-0 flex items-center gap-1 font-medium">
                      <FileText size={13} className="text-[#E5391B]" />
                      <span>Catatan:</span>
                    </span>
                    <input
                      type="text"
                      value={note || ''}
                      onChange={(e) => updateItemNote(product.id, e.target.value)}
                      placeholder="Contoh: Pilihkan yang agak mengkal, jangan retak, atau potong 4 bagian..."
                      className="flex-1 bg-gray-50 hover:bg-white focus:bg-white text-xs border border-gray-200 focus:border-[#E5391B] rounded-md px-2.5 py-1 text-gray-800 placeholder:text-gray-400 focus:outline-none transition-colors"
                      maxLength={120}
                    />
                    {note && (
                      <button
                        type="button"
                        onClick={() => updateItemNote(product.id, '')}
                        className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors text-[10px]"
                        title="Hapus catatan barang"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Per-item error */}
                  {error && (
                    <div className="w-full text-[11px] text-red-600 bg-red-50 p-1.5 rounded flex items-center gap-1 font-medium">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Order Summary & Voucher */}
        <div className="space-y-4">
          {/* Voucher Box */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 sm:p-5">
            <h2 className="text-xs font-bold text-[#222222] mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag size={14} className="text-[#E5391B]" />
                <span>Gunakan Voucher Promo</span>
              </span>
              <span className="text-[10px] text-gray-400 font-normal">Maks. 1 voucher</span>
            </h2>

            {appliedVoucher ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-green-800 bg-white px-2 py-0.5 rounded border border-green-200 shadow-2xs">
                      {appliedVoucher.code}
                    </span>
                    <span className="text-xs font-bold text-green-800">
                      {appliedVoucher.discount_type === 'PERCENTAGE'
                        ? `Diskon ${appliedVoucher.discount_value}%`
                        : `Potongan ${formatRupiah(appliedVoucher.discount_value)}`}
                    </span>
                  </div>
                  <button
                    onClick={removeVoucher}
                    className="text-xs text-red-600 hover:underline font-semibold"
                  >
                    Hapus
                  </button>
                </div>

                {subtotal >= appliedVoucher.min_purchase ? (
                  <p className="text-xs text-green-700 font-extrabold flex items-center gap-1">
                    <Check size={14} />
                    <span>Hemat {formatRupiah(discountAmount)} untuk pesanan ini</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-800 font-semibold bg-amber-50 p-2 rounded-lg border border-amber-200">
                    Kurang {formatRupiah(appliedVoucher.min_purchase - subtotal)} lagi untuk mengaktifkan diskon ini
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(true)}
                  className="w-full bg-white hover:bg-green-100 text-green-800 text-xs font-bold py-1.5 px-3 rounded-lg border border-green-300 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                >
                  <Ticket size={13} />
                  <span>Ganti / Pilih Voucher Lain</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1-Click Voucher Selection Button */}
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(true)}
                  className="w-full group bg-gradient-to-r from-[#FFF5F2] to-white hover:from-[#FFEBE5] hover:to-[#FFF5F2] border border-[#E5391B]/30 hover:border-[#E5391B] rounded-xl p-3 text-left transition-all shadow-2xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E5391B]/10 text-[#E5391B] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <Ticket size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#222222] group-hover:text-[#E5391B] transition-colors">
                        Pilih Voucher Promo Tersedia
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Klik untuk melihat kupon diskon siap pakai
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#E5391B] bg-white px-2.5 py-1 rounded-md border border-[#E5391B]/20 group-hover:bg-[#E5391B] group-hover:text-white transition-all shadow-2xs">
                    Pilih
                  </span>
                </button>

                {/* Quick Manual Input */}
                <div className="pt-2 border-t border-gray-100">
                  <span className="block text-[10px] font-semibold text-gray-500 mb-1">
                    Atau ketik kode voucher manual:
                  </span>
                  <form onSubmit={handleApplyVoucher} className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={voucherInput}
                        onChange={(e) => {
                          setVoucherInput(e.target.value.toUpperCase());
                          if (voucherFeedback) setVoucherFeedback(null);
                        }}
                        placeholder="Contoh: PROMOBANDARAYA"
                        className="flex-1 uppercase border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-xs font-mono font-semibold focus:border-[#E5391B] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!voucherInput.trim()}
                        className="bg-[#222222] hover:bg-black disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Pasang
                      </button>
                    </div>
                    {voucherFeedback && (
                      <p
                        className={`text-[11px] font-medium ${
                          voucherFeedback.success ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {voucherFeedback.message}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 sm:p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#222222] border-b pb-2">
              Ringkasan Belanja
            </h2>

            <div className="space-y-2 text-xs text-[#6B7280]">
              <div className="flex justify-between">
                <span>Total Harga ({totalItems} barang)</span>
                <span className="font-semibold text-[#222222]">{formatRupiah(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-[#16A34A] font-semibold">
                  <span>Diskon Voucher</span>
                  <span>-{formatRupiah(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Biaya Pengantaran (Banda Aceh)</span>
                {deliveryFee === 0 ? (
                  <span className="text-[#16A34A] font-bold">GRATIS</span>
                ) : (
                  <span className="font-semibold text-[#222222]">{formatRupiah(deliveryFee)}</span>
                )}
              </div>
            </div>

            <div className="border-t pt-3 flex justify-between items-baseline">
              <div>
                <span className="text-xs font-bold text-[#222222] block">Total Pembayaran</span>
                <span className="text-[10px] text-gray-500">Termasuk pajak &amp; layanan</span>
              </div>
              <span className="text-xl font-black text-[#E5391B]">
                {formatRupiah(finalTotal)}
              </span>
            </div>

            {user && (!user.phone || !user.addresses || user.addresses.length === 0) && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                <span>Harap lengkapi No. WhatsApp &amp; Alamat saat checkout.</span>
              </div>
            )}

            <button
              onClick={() => {
                if (!user) {
                  router.push('/login?redirect=/checkout');
                } else {
                  router.push('/checkout');
                }
              }}
              className="w-full mt-4 bg-[#E5391B] hover:bg-[#C62818] active:bg-[#B71C1C] text-white py-3 rounded-lg text-sm font-black flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <span>Lanjut ke Pembayaran</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Voucher Selector Modal */}
      <VoucherSelectorModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        subtotal={subtotal}
        appliedVoucher={appliedVoucher}
        onApplyVoucher={(code) => {
          const res = applyVoucherCode(code);
          setVoucherFeedback(res);
          return res;
        }}
        onRemoveVoucher={removeVoucher}
      />
    </div>
  );
}

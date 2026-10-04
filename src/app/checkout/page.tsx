'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { orderService } from '@/services/orderService';
import { productService } from '@/services/productService';
import { settingsService } from '@/services/settingsService';
import { formatRupiah, compressImageFile, deduplicateAddresses } from '@/lib/utils';
import { STORE_INFO } from '@/lib/constants';
import { PaymentMethod, CustomerAddress } from '@/types';
import {
  MapPin,
  Phone,
  User,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  UploadCloud,
  CheckCircle2,
  ShieldAlert,
  Ticket,
  ChevronRight,
  Check,
  Plus,
} from 'lucide-react';
import { VoucherSelectorModal } from '@/components/cart/VoucherSelectorModal';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, discountAmount, appliedVoucher, applyVoucherCode, removeVoucher, clearCart } = useCart();
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const { user, isAdmin, switchToCustomer, updateProfile, addAddress } = useAuth();

  // Form State
  const cleanAddresses = React.useMemo(() => deduplicateAddresses(user?.addresses || []), [user?.addresses]);
  const defaultAddr = cleanAddresses.find((a) => a.is_primary) || cleanAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string>(defaultAddr?.id || '');
  const [isCustomAddress, setIsCustomAddress] = useState<boolean>(false);
  const [saveAddressToProfile, setSaveAddressToProfile] = useState<boolean>(true);

  const [customerName, setCustomerName] = useState(defaultAddr?.recipient_name || user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(defaultAddr?.phone || user?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState(defaultAddr?.full_address || '');
  const [deliveryNote, setDeliveryNote] = useState(defaultAddr?.delivery_notes || defaultAddr?.notes || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [simulatedProofName, setSimulatedProofName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [storeSettings, setStoreSettings] = useState(() => settingsService.get());

  useEffect(() => {
    setStoreSettings(settingsService.get());
  }, []);

  const applyAddress = (addr: CustomerAddress) => {
    setIsCustomAddress(false);
    setSelectedAddressId(addr.id);
    if (addr.recipient_name) setCustomerName(addr.recipient_name);
    if (addr.phone) setCustomerPhone(addr.phone);
    setDeliveryAddress(addr.full_address || '');
    setDeliveryNote(addr.delivery_notes || addr.notes || '');
  };

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }

    if (cleanAddresses.length > 0) {
      const primary = cleanAddresses.find((a) => a.is_primary) || cleanAddresses[0];
      if (!selectedAddressId || !cleanAddresses.some((a) => a.id === selectedAddressId)) {
        applyAddress(primary);
      }
    } else {
      if (!customerName && user.name) setCustomerName(user.name);
      if (!customerPhone && user.phone) setCustomerPhone(user.phone);
    }
  }, [user, cleanAddresses, router]);

  const freeThreshold = storeSettings.free_delivery_threshold || STORE_INFO.freeDeliveryThreshold;
  const flatShipping = storeSettings.shipping_fee || STORE_INFO.deliveryFeeFlat;
  const isFreeDelivery = subtotal >= freeThreshold;
  const deliveryFee = items.length === 0 ? 0 : isFreeDelivery ? 0 : flatShipping;
  const finalTotal = Math.max(0, subtotal - discountAmount + deliveryFee);

  const isCodEnabled = storeSettings.cod_enabled !== false;
  const codMaxLimit = storeSettings.cod_max_amount || 200000;
  const isCodExceeded = finalTotal > codMaxLimit;

  // Auto-switch payment method away from COD if COD is disabled or exceeds threshold
  useEffect(() => {
    if (paymentMethod === 'COD' && (!isCodEnabled || isCodExceeded)) {
      setPaymentMethod('TRANSFER_BANK');
    }
  }, [isCodEnabled, isCodExceeded, paymentMethod]);

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
          Akun Admin Tidak Dapat Membuat Pesanan
        </h1>
        <p className="text-xs text-[#6B7280] mb-6 max-w-md mx-auto leading-relaxed">
          Anda saat ini masuk sebagai <b>Admin {process.env.NEXT_PUBLIC_STORE_NAME || 'Swalayan Demo'}</b>. Pembuatan pesanan belanja hanya diperuntukkan bagi akun pelanggan.
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

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-xs text-gray-500">
        Mengarahkan ke halaman masuk...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-[#222222] mb-2">Keranjang Anda Kosong</h2>
        <p className="text-xs text-[#6B7280] mb-6">
          Silakan tambahkan barang ke keranjang terlebih dahulu sebelum melakukan pembayaran.
        </p>
        <Link
          href="/catalog"
          className="bg-[#E5391B] text-white px-5 py-2.5 rounded-lg text-xs font-bold"
        >
          Lihat Katalog Belanja
        </Link>
      </div>
    );
  }

  const handleSimulatedFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSimulatedProofName(file.name);
      try {
        const compressed = await compressImageFile(file, 1000, 0.85);
        setPaymentProofUrl(compressed);
      } catch {
        setPaymentProofUrl('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80');
      }
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (isAdmin) {
      setErrorMessage('Akun Admin bertugas mengelola toko dan tidak dapat membuat pesanan belanja.');
      return;
    }

    // Validations
    if (!customerName.trim()) {
      setErrorMessage('Nama pemesan wajib diisi.');
      return;
    }
    const cleanPhone = customerPhone.replace(/[\s-]/g, '');
    const phoneRegex = /^(?:\+62|62|0)8[1-9][0-9]{7,10}$/;
    if (!customerPhone.trim() || !phoneRegex.test(cleanPhone)) {
      setErrorMessage('Wajib melengkapi Nomor WhatsApp / HP aktif yang valid (contoh: 081234567890) sebelum pesanan dapat diproses.');
      return;
    }

    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 8) {
      setErrorMessage('Wajib melengkapi Alamat Pengiriman lengkap di Banda Aceh (minimal nama jalan/gampong) sebelum pesanan dapat diproses.');
      return;
    }

    // Real-time stock availability check
    for (const item of items) {
      const currentProd = productService.getById(item.product.id);
      if (!currentProd || !currentProd.is_active || currentProd.stock < item.quantity) {
        setErrorMessage(
          `Maaf, stok produk "${item.product.name}" tidak mencukupi (Tersedia: ${
            currentProd ? currentProd.stock : 0
          }). Silakan sesuaikan jumlah di keranjang.`
        );
        return;
      }
    }

    if (paymentMethod === 'COD') {
      if (!isCodEnabled) {
        setErrorMessage('Metode pembayaran Bayar di Tempat (COD) sedang dinonaktifkan oleh toko. Silakan pilih Transfer Bank atau QRIS.');
        return;
      }
      if (isCodExceeded) {
        setErrorMessage(
          `Total belanja Anda (${formatRupiah(finalTotal)}) melebihi batas maksimal COD toko (${formatRupiah(
            codMaxLimit
          )}). Silakan gunakan Transfer Bank atau QRIS.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const orderItems = items.map((i) => ({
        id: `ord-item-${Date.now()}-${Math.random()}`,
        product_id: i.product.id,
        product_name: i.product.name,
        sku: i.product.sku,
        product_sku: i.product.sku,
        product_image: i.product.image_url,
        unit: i.product.unit,
        price: i.product.discount_price || i.product.price,
        quantity: i.quantity,
        subtotal: (i.product.discount_price || i.product.price) * i.quantity,
        note: i.note ? i.note.trim() : undefined,
      }));

      const isCod = paymentMethod === 'COD';
      const initialStatus = isCod ? 'DIPROSES' : 'MENUNGGU_PEMBAYARAN';
      const initialPaymentStatus = isCod ? 'PENDING' : paymentProofUrl ? 'VERIFIKASI_MANUAL' : 'PENDING';

      const newOrder = await orderService.create({
        user_id: user?.id,
        customer_name: customerName.trim(),
        customer_phone: cleanPhone,
        delivery_address: deliveryAddress.trim(),
        delivery_note: deliveryNote.trim() || undefined,
        items: orderItems,
        subtotal,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        voucher_code: appliedVoucher?.code,
        total_amount: finalTotal,
        payment_method: paymentMethod,
        payment_status: initialPaymentStatus,
        payment_proof_url: paymentProofUrl || undefined,
        order_status: initialStatus,
      });

      // Persist newly provided phone and address to user profile
      if (user) {
        if (!user.phone || user.phone.trim() === '') {
          updateProfile({ phone: cleanPhone });
        }
        if (
          saveAddressToProfile &&
          deliveryAddress.trim() &&
          (isCustomAddress || cleanAddresses.length === 0)
        ) {
          const normDeliv = deliveryAddress.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
          const alreadyExists = cleanAddresses.some((a) => {
            const normA = (a.full_address || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
            return normA === normDeliv;
          });

          if (!alreadyExists) {
            addAddress({
              label: 'Alamat Rumah',
              recipient_name: customerName.trim(),
              phone: cleanPhone,
              full_address: deliveryAddress.trim(),
              area_district: 'Kec. Banda Raya',
              city: 'Banda Aceh',
              postal_code: '23117',
              delivery_notes: deliveryNote.trim() || undefined,
              is_primary: cleanAddresses.length === 0,
            });
          }
        }
      }

      // Clear cart
      clearCart();

      // Redirect to Order Detail / Tracking Page
      router.push(`/orders/${newOrder.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat pesanan.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#222222]">
          Formulir Pemesanan &amp; Pengantaran
        </h1>
        <p className="text-xs text-[#6B7280] mt-0.5">
          Pesanan akan dipacking staf Alvin Swalayan dan dikirim langsung ke alamat Anda di Banda Aceh
        </p>
      </div>

      <form onSubmit={handleSubmitOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Columns: Customer Info & Payment Methods */}
          <div className="lg:col-span-2 space-y-6">
            {/* Alert if Phone or Address is Missing in User Profile */}
            {(!user?.phone && !customerPhone) && (!user?.addresses || user.addresses.length === 0) && (
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-extrabold text-sm text-amber-950">
                    Lengkapi Nomor WhatsApp &amp; Alamat Pengiriman
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    Akun Anda ({user?.email}) belum memiliki Nomor WhatsApp aktif dan Alamat Pengiriman di Banda Aceh. 
                    Silakan isi formulir di bawah ini agar pesanan dapat diproses dan diantar oleh kurir toko.
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Customer Information */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-sm font-bold text-[#222222] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#E5391B] text-white text-[11px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <span>Informasi Penerima &amp; Alamat Pengiriman</span>
                </h2>
                <Link
                  href="/profile"
                  className="text-[11px] font-bold text-[#E5391B] hover:underline flex items-center gap-1"
                >
                  <MapPin size={13} />
                  <span>Kelola Alamat di Profil</span>
                </Link>
              </div>

              {/* Saved Address Cards Selector */}
              {cleanAddresses.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-800">
                      Pilih Alamat Pengiriman Tersimpan:
                    </label>
                    <span className="text-[11px] text-gray-500 font-medium">
                      {cleanAddresses.length} alamat tersedia
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cleanAddresses.map((addr) => {
                      const isSelected = !isCustomAddress && selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => applyAddress(addr)}
                          className={`relative p-3.5 rounded-xl border-2 transition-all cursor-pointer text-xs ${
                            isSelected
                              ? 'border-[#E5391B] bg-[#FFF8F6] shadow-2xs'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-[#E5391B] bg-[#E5391B]' : 'border-gray-300'
                                }`}
                              >
                                {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                              </span>
                              <span className="font-bold text-gray-900">{addr.label}</span>
                              {addr.is_primary && (
                                <span className="bg-red-100 text-[#E5391B] text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  Utama
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="font-bold text-gray-900 truncate">
                            {addr.recipient_name}
                            {addr.phone && (
                              <span className="text-gray-500 font-normal ml-1">({addr.phone})</span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5 leading-relaxed">
                            {addr.full_address}{addr.area_district ? `, ${addr.area_district}` : ''}{addr.city ? `, ${addr.city}` : ''}
                          </p>
                          {addr.delivery_notes && (
                            <p className="text-[10px] text-amber-800 italic mt-1 bg-amber-50/80 px-2 py-0.5 rounded">
                              Patokan: {addr.delivery_notes}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {/* Option to use custom/new address */}
                    <div
                      onClick={() => {
                        setIsCustomAddress(true);
                        setSelectedAddressId('manual');
                      }}
                      className={`p-3.5 rounded-xl border-2 border-dashed transition-all cursor-pointer text-xs flex flex-col items-center justify-center text-center gap-1 min-h-[90px] ${
                        isCustomAddress
                          ? 'border-[#E5391B] bg-[#FFF8F6]'
                          : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
                      }`}
                    >
                      <Plus size={16} className={isCustomAddress ? 'text-[#E5391B]' : 'text-gray-400'} />
                      <span className={`font-bold ${isCustomAddress ? 'text-[#E5391B]' : 'text-gray-700'}`}>
                        + Gunakan Alamat Lain / Tulis Baru
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rincian Formulir Penerima & Alamat */}
              <div className="pt-2 border-t border-gray-100 space-y-4">
                <p className="text-xs font-bold text-gray-800">
                  {cleanAddresses.length > 0 && !isCustomAddress
                    ? 'Rincian Pengiriman Alamat Terpilih:'
                    : 'Formulir Alamat Pengiriman:'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nama Penerima <span className="text-[#E5391B]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Contoh: Cut Nurul Fadhilah"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E5E7EB] focus:border-[#E5391B] focus:outline-none text-xs text-[#222222]"
                      />
                      <User size={15} className="absolute left-3 top-2.5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nomor WhatsApp / HP Aktif <span className="text-[#E5391B]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Contoh: 081269008899"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E5E7EB] focus:border-[#E5391B] focus:outline-none text-xs text-[#222222]"
                      />
                      <Phone size={15} className="absolute left-3 top-2.5 text-gray-400" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Contoh: 081269008899 atau 08xxxxxxxxxx (kurir menghubungi nomor ini saat pengantaran).
                    </p>
                  </div>
                </div>

                {/* Address Field */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Alamat Lengkap Pengiriman (Banda Aceh) <span className="text-[#E5391B]">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      required
                      rows={3}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Tuliskan nama jalan, nomor rumah, RT/RW, gampong/desa, dan kecamatan di Banda Aceh..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E5E7EB] focus:border-[#E5391B] focus:outline-none text-xs text-[#222222]"
                    />
                    <MapPin size={15} className="absolute left-3 top-3 text-gray-400" />
                  </div>
                </div>

                {/* Delivery Note */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Catatan untuk Pesanan / Patokan Rumah
                  </label>
                  <input
                    type="text"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="Contoh: Rumah warna putih dekat masjid, pagar hitam samping kedai kelontong"
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] focus:border-[#E5391B] focus:outline-none text-xs text-[#222222]"
                  />
                </div>

                {/* Checkbox to save new address */}
                {(isCustomAddress || cleanAddresses.length === 0) && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={saveAddressToProfile}
                      onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                      className="rounded border-gray-300 text-[#E5391B] focus:ring-[#E5391B]"
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      Simpan alamat ini ke buku alamat saya untuk belanja berikutnya
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Step 2: Payment Methods */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#222222] flex items-center gap-2 border-b pb-2">
                <span className="w-5 h-5 rounded-full bg-[#E5391B] text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <span>Pilih Metode Pembayaran</span>
              </h2>

              <div className="space-y-3">
                {/* 1. Cash / COD */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all ${
                    !isCodEnabled || isCodExceeded
                      ? 'border-gray-200 bg-gray-50 opacity-80 cursor-not-allowed'
                      : paymentMethod === 'COD'
                      ? 'border-[#E5391B] bg-[#FFF7F5] cursor-pointer'
                      : 'border-[#E5E7EB] hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    disabled={!isCodEnabled || isCodExceeded}
                    checked={paymentMethod === 'COD'}
                    onChange={() => {
                      if (isCodEnabled && !isCodExceeded) {
                        setPaymentMethod('COD');
                      }
                    }}
                    className="accent-[#E5391B] mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Banknote size={16} className={!isCodEnabled || isCodExceeded ? 'text-gray-400' : 'text-[#16A34A]'} />
                      <span className={`font-bold text-xs ${!isCodEnabled || isCodExceeded ? 'text-gray-500' : 'text-[#222222]'}`}>
                        Bayar di Tempat (COD / Tunai)
                      </span>
                      {isCodEnabled && !isCodExceeded ? (
                        <span className="bg-green-100 text-green-800 text-[10px] font-semibold px-2 py-0.5 rounded">
                          Maks. {formatRupiah(codMaxLimit)}
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded">
                          {!isCodEnabled ? 'Nonaktif' : `Maksimal ${formatRupiah(codMaxLimit)}`}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {!isCodEnabled ? (
                        'Metode COD sedang dinonaktifkan oleh toko. Silakan gunakan Transfer Bank atau QRIS.'
                      ) : isCodExceeded ? (
                        <span className="text-amber-800 font-semibold">
                          Total belanja Anda ({formatRupiah(finalTotal)}) melebihi batas maksimal COD toko ({formatRupiah(codMaxLimit)}). Silakan gunakan Transfer Bank atau QRIS.
                        </span>
                      ) : (
                        `Bayar langsung ke kurir toko Alvin Swalayan saat pesanan tiba di rumah Anda (Maksimal belanja COD: ${formatRupiah(codMaxLimit)}). Siapkan uang pas.`
                      )}
                    </p>
                  </div>
                </label>

                {/* 2. Transfer Bank */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                    paymentMethod === 'TRANSFER_BANK'
                      ? 'border-[#E5391B] bg-[#FFF7F5]'
                      : 'border-[#E5E7EB] hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="TRANSFER_BANK"
                    checked={paymentMethod === 'TRANSFER_BANK'}
                    onChange={() => setPaymentMethod('TRANSFER_BANK')}
                    className="accent-[#E5391B] mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-[#E5391B]" />
                      <span className="font-bold text-xs text-[#222222]">
                        Transfer Bank Manual (BSI / Bank Aceh Syariah)
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Transfer ke rekening resmi Alvin Swalayan, lalu unggah foto resi / bukti transfer.
                    </p>

                    {paymentMethod === 'TRANSFER_BANK' && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 space-y-2 text-xs">
                        <p className="font-bold text-[#222222]">Rekening Resmi Toko:</p>
                        {STORE_INFO.bankAccounts.map((b) => (
                          <div key={b.bank} className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center justify-between gap-3">
                            <div>
                              <span className="font-semibold text-gray-800 block text-xs">{b.bank}</span>
                              <span className="font-mono font-bold text-[#E5391B] text-sm">{b.accountNumber}</span>
                              <span className="text-[10px] text-gray-500 block">a.n {b.accountName}</span>
                            </div>
                            <div className="shrink-0 bg-white px-2 py-1 rounded border border-gray-200">
                              <img
                                src={b.bank.includes('BSI') ? '/images/payments/bsi.png' : '/images/payments/bank-aceh.png'}
                                alt={b.bank}
                                className="h-5 w-auto object-contain"
                              />
                            </div>
                          </div>
                        ))}

                        {/* Upload Proof */}
                        <div className="pt-2">
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Unggah Bukti Transfer Sekarang (Opsional / bisa di halaman tracking):
                          </label>
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer bg-white border border-[#E5E7EB] hover:border-[#E5391B] px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5">
                              <UploadCloud size={14} className="text-[#E5391B]" />
                              <span>Pilih File Gambar</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleSimulatedFileUpload}
                                className="hidden"
                              />
                            </label>
                            {simulatedProofName ? (
                              <span className="text-[11px] text-green-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 size={13} />
                                <span>{simulatedProofName}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">
                                Format JPG/PNG (Maks 5MB)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                {/* 3. QRIS / Midtrans Sandbox */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                    paymentMethod === 'MIDTRANS_QRIS'
                      ? 'border-[#E5391B] bg-[#FFF7F5]'
                      : 'border-[#E5E7EB] hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="MIDTRANS_QRIS"
                    checked={paymentMethod === 'MIDTRANS_QRIS'}
                    onChange={() => setPaymentMethod('MIDTRANS_QRIS')}
                    className="accent-[#E5391B] mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <QrCode size={16} className="text-[#E5391B]" />
                      <span className="font-bold text-xs text-[#222222]">
                        QRIS (Pembayaran Instan Online)
                      </span>
                      <img
                        src="/images/payments/qris.png"
                        alt="QRIS"
                        className="h-3.5 w-auto object-contain ml-1"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Pindai kode QRIS menggunakan GoPay, OVO, DANA, ShopeePay, LinkAja, BCA, atau m-Banking Anda.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Items Summary & Submit */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#222222] border-b pb-2">
                Rincian Pesanan
              </h2>

              {/* Items List */}
              <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1">
                {items.map(({ product, quantity, note }) => {
                  const price = product.discount_price || product.price;
                  return (
                    <div key={product.id} className="py-2.5 flex items-center justify-between text-xs gap-2.5">
                      <div className="flex items-center gap-2.5 pr-2 min-w-0">
                        <img
                          src={product.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80'}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-gray-50 shrink-0 shadow-2xs"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{product.name}</p>
                          <p className="text-[11px] text-gray-500">
                            {quantity}x @ {formatRupiah(price)}
                          </p>
                          {note && (
                            <p className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded mt-0.5 font-medium inline-block truncate max-w-full">
                              📝 {note}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-gray-800 shrink-0">
                        {formatRupiah(price * quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Voucher Selector Row */}
              <div className="border-t pt-3 pb-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Ticket size={14} className="text-[#E5391B]" />
                    <span>Voucher Promo</span>
                  </span>
                  {appliedVoucher ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[11px] bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 rounded shadow-2xs">
                        {appliedVoucher.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsVoucherModalOpen(true)}
                        className="text-[11px] text-[#E5391B] hover:underline font-bold"
                      >
                        Ganti
                      </button>
                      <button
                        type="button"
                        onClick={removeVoucher}
                        className="text-[11px] text-red-600 hover:underline font-semibold"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsVoucherModalOpen(true)}
                      className="text-xs font-bold text-[#E5391B] hover:text-[#C62818] flex items-center gap-1 bg-[#FFF5F2] hover:bg-[#FFEBE5] px-2.5 py-1 rounded-md border border-[#E5391B]/20 transition-colors"
                    >
                      <Ticket size={13} />
                      <span>Pilih Voucher</span>
                      <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="space-y-2 border-t pt-3 text-xs text-[#6B7280]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-800">{formatRupiah(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#16A34A] font-semibold">
                    <span>Diskon ({appliedVoucher?.code})</span>
                    <span>-{formatRupiah(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Ongkir Pengantaran</span>
                  {deliveryFee === 0 ? (
                    <span className="text-[#16A34A] font-bold">GRATIS</span>
                  ) : (
                    <span className="font-semibold text-gray-800">{formatRupiah(deliveryFee)}</span>
                  )}
                </div>

                <div className="border-t pt-2 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-[#222222]">Total Akhir</span>
                  <span className="text-lg font-black text-[#E5391B]">
                    {formatRupiah(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Error Toast */}
              {errorMessage && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-center gap-1.5 font-medium">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#E5391B] hover:bg-[#C62818] active:bg-[#B71C1C] text-white py-3.5 rounded-lg text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Sedang Memproses...</span>
                ) : (
                  <>
                    <span>Konfirmasi &amp; Buat Pesanan</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="pt-2 flex items-center gap-2 text-[11px] text-gray-500 justify-center">
                <ShieldCheck size={14} className="text-[#16A34A]" />
                <span>Transaksi Terlindungi &amp; Dijamin Alvin Swalayan</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Voucher Selector Modal */}
      <VoucherSelectorModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        subtotal={subtotal}
        appliedVoucher={appliedVoucher}
        onApplyVoucher={(code) => {
          const res = applyVoucherCode(code);
          if (!res.success) {
            setErrorMessage(res.message);
          } else {
            setErrorMessage('');
          }
          return res;
        }}
        onRemoveVoucher={removeVoucher}
      />
    </div>
  );
}

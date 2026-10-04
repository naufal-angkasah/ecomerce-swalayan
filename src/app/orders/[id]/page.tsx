'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Order, OrderStatus, Product } from '@/types';
import { orderService } from '@/services/orderService';
import { productService } from '@/services/productService';
import { useCart } from '@/context/CartContext';
import { formatRupiah, formatDateIndo, getOrderStatusMeta, compressImageFile, slugify } from '@/lib/utils';
import { STORE_INFO } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  CreditCard,
  QrCode,
  Banknote,
  UploadCloud,
  FileCheck,
  ArrowLeft,
  MessageCircle,
  XCircle,
  AlertOctagon,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

const ORDER_STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  {
    status: 'MENUNGGU_PEMBAYARAN',
    label: 'Menunggu Pembayaran',
    desc: 'Pesanan dibuat di sistem toko',
  },
  {
    status: 'DIBAYAR',
    label: 'Dibayar',
    desc: 'Pembayaran telah dikonfirmasi kasir',
  },
  {
    status: 'DIPROSES',
    label: 'Diproses',
    desc: 'Barang sedang dipacking dari rak toko',
  },
  {
    status: 'DIKIRIM',
    label: 'Dikirim',
    desc: 'Kurir sedang mengantar ke alamat Anda',
  },
  {
    status: 'SELESAI',
    label: 'Selesai',
    desc: 'Barang telah diterima dengan baik',
  },
];

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { isAdmin } = useAuth();
  const { addMultipleToCart } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofUploadedMessage, setProofUploadedMessage] = useState('');
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  const handleReorder = () => {
    if (!order || !order.items || order.items.length === 0) {
      alert('Tidak ada rincian barang pada pesanan ini.');
      return;
    }

    const itemsToAdd: { product: Product; quantity: number; note?: string }[] = [];

    order.items.forEach((item) => {
      let prod = productService.findProduct({
        id: item.product_id,
        sku: item.sku,
        name: item.product_name,
      });

      if (!prod) {
        prod = {
          id: item.product_id || item.sku || `reord-${Date.now()}-${Math.random()}`,
          category: 'lainnya',
          sku: item.sku || 'SKU-REORDER',
          name: item.product_name || 'Produk Belanja',
          slug: slugify(item.product_name || 'produk-belanja'),
          description: item.product_name || '',
          price: item.price,
          stock: 999,
          unit: item.unit || 'pcs',
          image_url: item.product_image || item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      itemsToAdd.push({
        product: prod,
        quantity: item.quantity > 0 ? item.quantity : 1,
        note: item.note,
      });
    });

    const res = addMultipleToCart(itemsToAdd);
    if (res.success) {
      router.push('/cart?reordered=true');
    } else {
      alert(res.message);
    }
  };

  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedBank(label);
      setTimeout(() => setCopiedBank(null), 2000);
    } catch {
      // fallback
    }
  };

  // Cancellation states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ingin mengubah rincian barang belanjaan');
  const [customReason, setCustomReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Midtrans Payment states
  const [isProcessingMidtrans, setIsProcessingMidtrans] = useState(false);
  const [midtransPayUrl, setMidtransPayUrl] = useState<string | null>(null);

  const handlePayWithMidtrans = async () => {
    if (!order) return;
    setIsProcessingMidtrans(true);
    try {
      const res = await fetch('/api/payments/midtrans/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      const data = await res.json();
      if (res.ok && data.redirect_url) {
        setMidtransPayUrl(data.redirect_url);
        window.open(data.redirect_url, '_blank');
      } else {
        alert(data.error || 'Gagal memuat link pembayaran Midtrans.');
      }
    } catch {
      alert('Terjadi kesalahan saat memproses pembayaran Midtrans.');
    } finally {
      setIsProcessingMidtrans(false);
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const orderNumberRef = useRef<string | undefined>(order?.order_number);

  useEffect(() => {
    if (order?.order_number) {
      orderNumberRef.current = order.order_number;
    }
  }, [order?.order_number]);

  useEffect(() => {
    if (!id) return;

    // Helper: apply latest order to state and ref
    const applyOrder = (o?: Order) => {
      if (o) {
        orderNumberRef.current = o.order_number;
        setOrder({ ...o });
        setIsLoading(false);
      }
    };

    const fetchCurrentOrder = () => {
      return (
        orderService.getById(id) ||
        (orderNumberRef.current ? orderService.getByOrderNumber(orderNumberRef.current) : undefined)
      );
    };

    // 1. Initial check from local cache
    const initialFound = fetchCurrentOrder();
    if (initialFound) {
      applyOrder(initialFound);
    }

    // 2. Initial fetch/sync from Supabase Cloud
    orderService
      .syncFromCloud()
      .then(() => {
        const cloudFound = fetchCurrentOrder();
        if (cloudFound) applyOrder(cloudFound);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // 3. Same-window CustomEvent listener (fired within current window)
    const handleLocalUpdate = () => {
      const refreshed = fetchCurrentOrder();
      if (refreshed) applyOrder(refreshed);
    };

    window.addEventListener('alvin:orders_updated', handleLocalUpdate);
    window.addEventListener('alvin:payment_rejected', handleLocalUpdate);
    window.addEventListener('alvin:order_paid', handleLocalUpdate);

    // 4. Cross-tab BroadcastChannel listener (instant 0ms same-device sync between tabs)
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('alvin_orders_channel');
        bc.onmessage = (event) => {
          const incoming = event.data?.order;
          if (incoming) {
            const isMatch =
              incoming.id === id ||
              incoming.order_number === id ||
              (orderNumberRef.current && incoming.order_number === orderNumberRef.current) ||
              (incoming as any).local_id === id;
            if (isMatch) {
              applyOrder(incoming);
              return;
            }
          }
          // Fallback refresh
          const refreshed = fetchCurrentOrder();
          if (refreshed) applyOrder(refreshed);
        };
      } catch (err) {
        console.warn('BroadcastChannel error on order page:', err);
      }
    }

    // 5. Cross-tab localStorage storage event listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'alvin_orders_v1') {
        const refreshed = fetchCurrentOrder();
        if (refreshed) applyOrder(refreshed);
      }
    };
    window.addEventListener('storage', handleStorage);

    // 6. Supabase Realtime WebSocket listener (instant cross-device sync from Admin PC to Customer Phone)
    const supabaseClient = getSupabaseClient();
    let realtimeChannel: any = null;
    if (supabaseClient) {
      try {
        realtimeChannel = supabaseClient
          .channel(`realtime_order_page_${id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            (payload) => {
              const row = (payload.new || payload.old) as any;
              const isMatch =
                !row ||
                row.id === id ||
                row.order_number === id ||
                (orderNumberRef.current && row.order_number === orderNumberRef.current);
              if (isMatch) {
                orderService.syncFromCloud().then(() => {
                  const cloudFound = fetchCurrentOrder();
                  if (cloudFound) applyOrder(cloudFound);
                });
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase Realtime subscription error on order detail:', err);
      }
    }

    // 7. Auto-refresh when tab is focused or becomes visible (e.g. customer returns from WA / banking app)
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        orderService.syncFromCloud().then(() => {
          const cloudFound = fetchCurrentOrder();
          if (cloudFound) applyOrder(cloudFound);
        });
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    }
    window.addEventListener('focus', handleVisibilityOrFocus);

    // 8. Gentle background polling interval (every 4s while order is awaiting payment or processing)
    const pollInterval = setInterval(() => {
      const current = fetchCurrentOrder();
      if (current && current.order_status !== 'SELESAI' && current.order_status !== 'DIBATALKAN') {
        orderService.syncFromCloud().then(() => {
          const cloudFound = fetchCurrentOrder();
          if (cloudFound) applyOrder(cloudFound);
        });
      }
    }, 4000);

    return () => {
      window.removeEventListener('alvin:orders_updated', handleLocalUpdate);
      window.removeEventListener('alvin:payment_rejected', handleLocalUpdate);
      window.removeEventListener('alvin:order_paid', handleLocalUpdate);
      window.removeEventListener('storage', handleStorage);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      }
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (bc) bc.close();
      if (supabaseClient && realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
      }
      clearInterval(pollInterval);
    };
  }, [id]);

  if (isLoading && !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="w-10 h-10 border-3 border-[#E5391B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-gray-700">Memuat detail pesanan...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-[#222222] mb-2">Pesanan Tidak Ditemukan</h2>
        <p className="text-xs text-[#6B7280] mb-6">
          Nomor pesanan yang Anda cari tidak terdaftar di sistem Alvin Swalayan.
        </p>
        <Link
          href="/orders"
          className="bg-[#E5391B] text-white px-5 py-2.5 rounded-lg text-xs font-bold"
        >
          Lihat Semua Pesanan Saya
        </Link>
      </div>
    );
  }

  const meta = getOrderStatusMeta(order.order_status);
  const isCancellable =
    order.order_status !== 'DIKIRIM' &&
    order.order_status !== 'SELESAI' &&
    order.order_status !== 'DIBATALKAN';

  // Determine current step index (0 to 4)
  const currentStepIndex = ORDER_STEPS.findIndex((s) => s.status === order.order_status);

  const resolveItemImage = (item: any) => {
    if (item.product_image && !item.product_image.includes('placeholder.png')) {
      return item.product_image;
    }
    const found = productService.findProduct({
      id: item.product_id,
      sku: item.sku || item.product_sku,
      name: item.product_name,
    });
    return found?.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
  };

  const handleSimulatedProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Compress image to max 800px at 0.75 quality (~50-80KB) for fast, lightweight transfer & database storage
      const compressedUrl = await compressImageFile(file, 800, 0.75);

      // Optimistic instant UI update: immediately display preview thumbnail and status badge
      setOrder((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          payment_proof_url: compressedUrl,
          payment_status: 'VERIFIKASI_MANUAL',
        };
      });
      setProofUploadedMessage('Bukti transfer asli berhasil diunggah! Kasir akan segera memverifikasi.');

      // Call orderService with order.id, compressedUrl, AND order.order_number for guaranteed lookup
      const updated = orderService.uploadPaymentProof(order.id, compressedUrl, order.order_number);
      if (updated) {
        setOrder({ ...updated });
      }
    } catch (err) {
      console.error('Error uploading payment proof:', err);
      alert('Gagal memproses gambar bukti transfer. Silakan periksa kembali file foto Anda.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmCancel = () => {
    setCancelError('');
    setIsCancelling(true);
    const finalReason = cancelReason === 'Lainnya' ? customReason.trim() || 'Lainnya' : cancelReason;

    const res = orderService.cancelOrder(order.id, finalReason);
    setIsCancelling(false);

    if (res.success && res.order) {
      setOrder({ ...res.order });
      setShowCancelModal(false);
    } else {
      setCancelError(res.message);
    }
  };


  const waOrderText = encodeURIComponent(
    `Halo Alvin Swalayan, saya ingin menanyakan pesanan saya dengan nomor *${order.order_number}* atas nama *${order.customer_name}*.`
  );

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back button */}
        <Link
          href={isAdmin ? '/admin/orders' : '/orders'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E5391B] mb-3 hover:underline"
        >
          <ArrowLeft size={14} />
          <span>{isAdmin ? 'Kembali ke Kelola Pesanan Admin' : 'Kembali ke Daftar Pesanan'}</span>
        </Link>

        {/* Admin Context Banner */}
        {isAdmin && (
          <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#E5391B] shrink-0" />
              <span>
                <b>Pratinjau Mode Pelanggan:</b> Anda melihat pesanan <b>{order.order_number}</b> sebagai Admin Toko.
              </span>
            </div>
            <Link
              href="/admin/orders"
              className="px-3 py-1.5 bg-[#222222] hover:bg-black text-white text-[11px] font-bold rounded-lg shrink-0 text-center transition-colors shadow-2xs"
            >
              Kembali ke Panel Admin Pesanan →
            </Link>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 mb-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#222222]">
                  {order.order_number}
                </h1>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${meta.color}`}>
                  {meta.label}
                </span>
                {order.payment_method === 'COD' && order.order_status !== 'DIBATALKAN' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    COD (Bayar Tunai saat Terima)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1">
                <Clock size={13} />
                <span>Dipesan pada {formatDateIndo(order.created_at)}</span>
              </p>
            </div>

            {/* Action buttons: Cancel, Chat WA */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {/* Cancel Order Button */}
              {isCancellable && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-[#E5391B] border border-red-200 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Batalkan Pesanan Ini"
                >
                  <XCircle size={15} />
                  <span>Batalkan</span>
                </button>
              )}

              {/* Pesan Lagi for Completed or Cancelled Order */}
              {(order.order_status === 'SELESAI' || order.order_status === 'DIBATALKAN') && (
                <button
                  type="button"
                  onClick={handleReorder}
                  className="inline-flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-[#E5391B] border border-orange-200 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Pesan ulang seluruh barang dari pesanan ini"
                >
                  <RefreshCw size={14} />
                  <span>Pesan Lagi</span>
                </button>
              )}

              {/* WA Chat */}
              <a
                href={`https://wa.me/${STORE_INFO.whatsapp}?text=${waOrderText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#16A34A] hover:bg-green-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-colors"
              >
                <MessageCircle size={15} />
                <span>Chat WA Toko</span>
              </a>
            </div>
          </div>

          {/* If Cancelled: Show prominent cancel alert box */}
          {order.order_status === 'DIBATALKAN' ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-5 flex items-start gap-3 text-xs text-red-900">
              <AlertOctagon size={22} className="text-[#E5391B] shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-bold text-sm text-red-700">Pesanan Telah Dibatalkan</p>
                <p className="text-red-800 leading-relaxed">
                  Pesanan ini telah dibatalkan dan seluruh stok produk belanjaan telah dikembalikan ke sistem toko Alvin Swalayan.
                </p>
                {order.status_timeline?.find((t) => t.status === 'DIBATALKAN')?.note && (
                  <p className="text-[11px] text-red-600 font-medium">
                    Keterangan: {order.status_timeline?.find((t) => t.status === 'DIBATALKAN')?.note}
                  </p>
                )}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReorder}
                    className="inline-flex items-center gap-1.5 bg-[#E5391B] hover:bg-[#C62818] text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>Pesan Lagi (Buka &amp; Sesuaikan di Keranjang)</span>
                  </button>
                  <Link
                    href="/catalog"
                    className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                  >
                    Belanja di Katalog
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* 5-Step Visual Timeline Tracker */
            <div className="py-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Pelacakan Status Pengantaran
                </h2>
                {order.payment_method === 'COD' && order.order_status === 'DIPROSES' && (
                  <span className="text-[11px] font-semibold text-[#16A34A] bg-green-50 px-2 py-0.5 rounded border border-green-200">
                    COD: Langsung diproses toko, bayar ke kurir saat barang tiba
                  </span>
                )}
              </div>

              <div className="grid grid-cols-5 relative">
                {/* Background connecting line */}
                <div className="absolute top-4 left-6 right-6 h-1 bg-gray-200 -z-0">
                  <div
                    className="h-full bg-[#E5391B] transition-all duration-500"
                    style={{
                      width: `${Math.max(0, (currentStepIndex / (ORDER_STEPS.length - 1)) * 100)}%`,
                    }}
                  />
                </div>

                {ORDER_STEPS.map((step, idx) => {
                  const isPassed = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div key={step.status} className="flex flex-col items-center text-center relative z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                          isPassed
                            ? 'bg-[#E5391B] border-[#FFC107] text-white shadow-xs'
                            : 'bg-white border-gray-300 text-gray-400'
                        }`}
                      >
                        {isPassed ? <CheckCircle2 size={16} /> : idx + 1}
                      </div>
                      <span
                        className={`text-[11px] mt-2 font-bold leading-tight ${
                          isCurrent
                            ? 'text-[#E5391B]'
                            : isPassed
                            ? 'text-[#222222]'
                            : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="text-[9px] text-gray-500 hidden sm:block mt-0.5 max-w-[90px] leading-tight">
                        {step.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status Event Logs */}
          <div className="mt-4 pt-4 border-t border-gray-100 bg-[#FFF7F5] p-3 rounded-lg text-xs space-y-1.5">
            <p className="font-bold text-[#222222]">Riwayat &amp; Catatan Pesanan:</p>
            {(order.status_timeline || []).slice(-4).reverse().map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-gray-700 text-[11px]">
                <span className="font-mono text-gray-500 shrink-0">
                  {new Date(t.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </span>
                <span>• {t.note}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Products List & Payment Info */}
          <div className="md:col-span-2 space-y-6">
            {/* 1. Payment Details & Status (DI ATAS Daftar Belanjaan, DI BAWAH Riwayat) */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-[#222222] flex items-center gap-2">
                  <CreditCard size={17} className="text-[#E5391B]" />
                  <span>Instruksi &amp; Status Pembayaran</span>
                </h2>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border self-start sm:self-auto ${
                    order.payment_status === 'PAID' ||
                    (order.payment_method !== 'COD' && ['DIBAYAR', 'DIPROSES', 'DIKIRIM', 'SELESAI'].includes(order.order_status)) ||
                    (order.payment_method === 'COD' && order.order_status === 'SELESAI')
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : order.payment_status === 'FAILED'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : order.payment_status === 'VERIFIKASI_MANUAL'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : order.payment_method === 'COD'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-red-50 text-[#E5391B] border-red-200'
                  }`}
                >
                  {order.payment_status === 'PAID' ||
                  (order.payment_method !== 'COD' && ['DIBAYAR', 'DIPROSES', 'DIKIRIM', 'SELESAI'].includes(order.order_status)) ||
                  (order.payment_method === 'COD' && order.order_status === 'SELESAI')
                    ? '✓ Sudah Dibayar (Lunas)'
                    : order.payment_status === 'FAILED'
                    ? '❌ Bukti Ditolak (Harap Unggah Ulang)'
                    : order.payment_status === 'VERIFIKASI_MANUAL'
                    ? '🔍 Bukti Sedang Diverifikasi Kasir'
                    : order.payment_method === 'COD'
                    ? 'Bayar saat Terima (COD)'
                    : '⏳ Belum Ditransfer (Menunggu Pembayaran)'}
                </span>
              </div>

              {/* KONDISI A: SUDAH DIBAYAR / SUDAH DITRANSFER (LUNAS) */}
              {order.payment_status === 'PAID' ||
              (order.payment_method !== 'COD' && ['DIBAYAR', 'DIPROSES', 'DIKIRIM', 'SELESAI'].includes(order.order_status)) ||
              (order.payment_method === 'COD' && order.order_status === 'SELESAI') ? (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-green-200 p-4 rounded-xl text-xs space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 size={22} />
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="font-black text-sm text-green-950">
                        Pembayaran Terverifikasi &amp; Lunas
                      </p>
                      <p className="text-green-800 leading-relaxed text-[11px]">
                        Pesanan ini <b>sudah dibayar</b> via{' '}
                        <b className="text-green-950 underline decoration-green-400">
                          {order.payment_method === 'TRANSFER_BANK'
                            ? 'Transfer Rekening Bank Toko (Diverifikasi Kasir)'
                            : order.payment_method === 'MIDTRANS_QRIS'
                            ? 'Pembayaran Online Midtrans (QRIS / E-Wallet)'
                            : 'Tunai di Tempat (COD)'}
                        </b>.
                      </p>
                      <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-green-700 font-semibold">
                        <span>Total Dibayar: <b className="text-green-950">{formatRupiah(order.total_amount)}</b></span>
                        <span>• Status: <b className="text-green-900">LUNAS</b></span>
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail Bukti Transfer jika ada */}
                  {order.payment_proof_url && (
                    <div className="pt-2 border-t border-green-200/70 flex items-center gap-3 bg-white/80 p-2.5 rounded-lg">
                      <img
                        src={order.payment_proof_url}
                        alt="Bukti Transfer Lunas"
                        className="w-14 h-14 object-cover rounded border border-green-300 shrink-0"
                      />
                      <div className="text-[11px] text-gray-700">
                        <p className="font-bold text-gray-900 flex items-center gap-1">
                          <FileCheck size={14} className="text-green-600" />
                          <span>Bukti transfer telah diverifikasi kasir toko</span>
                        </p>
                        <a
                          href={order.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#E5391B] hover:underline font-bold mt-0.5 inline-block"
                        >
                          Buka Gambar Bukti Transfer ↗
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* KONDISI B: BELUM DIBAYAR / BELUM DITRANSFER */
                <div className="space-y-4 text-xs">
                  {/* Alert Banner: Status Pembayaran Sesuai Metode */}
                  <div
                    className={`border-l-4 p-3.5 rounded-r-xl text-xs space-y-1 ${
                      order.payment_method === 'COD'
                        ? 'bg-amber-50/90 border-amber-500 text-amber-950'
                        : order.payment_method === 'MIDTRANS_QRIS'
                        ? 'bg-blue-50/90 border-blue-500 text-blue-950'
                        : 'bg-red-50/80 border-[#E5391B] text-red-950'
                    }`}
                  >
                    <p
                      className={`font-extrabold flex items-center gap-1.5 ${
                        order.payment_method === 'COD'
                          ? 'text-amber-900 text-[13px]'
                          : order.payment_method === 'MIDTRANS_QRIS'
                          ? 'text-blue-800'
                          : 'text-[#E5391B]'
                      }`}
                    >
                      {order.payment_method === 'COD' ? (
                        <>
                          <Banknote size={16} className="text-amber-700" />
                          <span>Pesanan Belum Dibayar Secara Tunai (Bayar saat Kurir Tiba)</span>
                        </>
                      ) : order.payment_method === 'MIDTRANS_QRIS' ? (
                        <>
                          <Clock size={15} className="text-blue-600" />
                          <span>Menunggu Pembayaran Online (QRIS / E-Wallet)</span>
                        </>
                      ) : order.payment_status === 'FAILED' ? (
                        <>
                          <AlertCircle size={15} className="text-red-600" />
                          <span className="text-red-700">Bukti Transfer Ditolak Kasir (Perlu Unggah Ulang)</span>
                        </>
                      ) : (
                        <>
                          <Clock size={15} />
                          <span>Pesanan Belum Ditransfer (Menunggu Pembayaran)</span>
                        </>
                      )}
                    </p>
                    <p className="leading-relaxed text-[11px]">
                      {order.payment_method === 'COD'
                        ? `Pesanan COD Anda sedang dipersiapkan dan akan segera diantarkan ke alamat Anda. Harap siapkan uang tunai pas sejumlah ${formatRupiah(order.total_amount)} saat kurir tiba.`
                        : order.payment_method === 'MIDTRANS_QRIS'
                        ? 'Pesanan Anda saat ini belum dibayar. Silakan lakukan pembayaran online via Midtrans QRIS/E-Wallet di bawah ini.'
                        : order.payment_status === 'FAILED'
                        ? 'Bukti transfer Anda ditolak oleh kasir. Harap periksa catatan alasan kasir di bawah dan unggah foto bukti transfer yang baru agar pesanan dapat segera diproses.'
                        : 'Pesanan Anda saat ini belum dibayar. Harap segera lakukan transfer ke rekening toko di bawah ini agar pesanan dapat segera dipacking & diantar kurir.'}
                    </p>
                  </div>

                  {/* 1. JIKA TRANSFER BANK */}
                  {order.payment_method === 'TRANSFER_BANK' && (
                    <div className="space-y-4">
                      {/* Box Nominal Transfer */}
                      <div className="bg-[#FFF7F5] border border-[#E5391B]/20 p-3.5 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">
                            Total yang Harus Ditransfer:
                          </span>
                          <span className="text-lg font-black text-[#E5391B]">
                            {formatRupiah(order.total_amount)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(order.total_amount.toString(), 'nominal')}
                          className="text-[11px] font-bold text-[#E5391B] bg-white border border-[#E5391B]/30 hover:bg-[#FFF2F0] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-2xs"
                        >
                          {copiedBank === 'nominal' ? (
                            <>
                              <Check size={13} className="text-green-600" />
                              <span className="text-green-700">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Salin Nominal</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Rekening Toko */}
                      <div className="space-y-2">
                        <p className="font-bold text-[#222222] text-xs">
                          Silakan transfer ke salah satu rekening toko Alvin Swalayan:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {STORE_INFO.bankAccounts.map((b) => (
                            <div
                              key={b.bank}
                              className="bg-white p-3 rounded-xl border border-gray-200 hover:border-[#E5391B]/50 transition-colors shadow-2xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="bg-white px-1.5 py-0.5 rounded border border-gray-100 shrink-0">
                                    <img
                                      src={b.bank.includes('BSI') ? '/images/payments/bsi.png' : '/images/payments/bank-aceh.png'}
                                      alt={b.bank}
                                      className="h-4 w-auto object-contain"
                                    />
                                  </div>
                                  <span className="font-extrabold text-xs text-gray-800">{b.bank}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(b.accountNumber.replace(/[^0-9]/g, ''), b.bank)}
                                  className="text-[10px] font-bold text-gray-600 hover:text-[#E5391B] flex items-center gap-1 bg-gray-100 hover:bg-orange-50 px-2 py-0.5 rounded transition-colors"
                                >
                                  {copiedBank === b.bank ? (
                                    <>
                                      <Check size={11} className="text-green-600" />
                                      <span className="text-green-700">Tersalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={11} />
                                      <span>Salin No. Rek</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="font-mono font-black text-sm text-[#E5391B] tracking-wide">
                                {b.accountNumber}
                              </p>
                              <p className="text-[10px] text-gray-400">Atas Nama: {b.accountName}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Unggah Bukti Transfer */}
                      {order.payment_status === 'FAILED' ? (
                        /* KONDISI 1: BUKTI DITOLAK KASIR */
                        <div className="bg-red-50 border border-red-300 p-4 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-red-900 font-bold">
                              <AlertCircle size={17} className="text-red-600 shrink-0" />
                              <span>Bukti Transfer Ditolak Kasir</span>
                            </div>
                            <span className="text-[10px] font-bold bg-red-200 text-red-900 px-2.5 py-0.5 rounded-full">
                              Perlu Unggah Ulang
                            </span>
                          </div>

                          <p className="text-[11px] text-red-800 leading-relaxed">
                            Foto bukti transfer sebelumnya <b>belum dapat diverifikasi oleh kasir</b> (karena foto kurang jelas, buram, atau dana belum masuk ke mutasi rekening bank toko). Mohon unggah ulang foto bukti transfer yang valid dan jelas.
                          </p>

                          {order.payment_rejection_reason && (
                            <div className="bg-white/95 border border-red-200 rounded-lg p-3 text-[11px] shadow-2xs space-y-1">
                              <span className="text-[10px] font-extrabold uppercase text-red-700 tracking-wider block">
                                Catatan / Alasan dari Kasir:
                              </span>
                              <p className="text-red-950 font-bold leading-snug">
                                &ldquo;{order.payment_rejection_reason}&rdquo;
                              </p>
                            </div>
                          )}

                          {order.payment_proof_url && (
                            <div className="flex items-center gap-3 bg-white/90 p-2.5 rounded-lg border border-red-200 shadow-2xs">
                              <img
                                src={order.payment_proof_url}
                                alt="Foto Sebelumnya Ditolak"
                                className="w-14 h-14 object-cover rounded border border-red-300 shrink-0 opacity-70"
                              />
                              <div className="text-[11px]">
                                <span className="font-bold text-red-950 block">Foto Sebelumnya (Ditolak Kasir)</span>
                                <span className="text-gray-500 text-[10px]">Silakan unggah struk baru di bawah untuk menggantikan foto ini</span>
                              </div>
                            </div>
                          )}

                          <div className="pt-1">
                            <label className="inline-flex items-center gap-2 bg-[#E5391B] hover:bg-[#C62818] text-white px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs">
                              <UploadCloud size={16} />
                              <span>{uploading ? 'Mengunggah Bukti Baru...' : 'Unggah Foto Bukti Transfer Baru'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleSimulatedProofUpload}
                                disabled={uploading}
                                className="hidden"
                              />
                            </label>
                            {proofUploadedMessage && (
                              <p className="text-[11px] text-green-700 font-bold mt-2">
                                {proofUploadedMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : order.payment_proof_url ? (
                        /* KONDISI 2: BUKTI TERKIRIM & MENUNGGU VERIFIKASI KASIR */
                        <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-900 font-bold">
                              <FileCheck size={16} className="text-blue-600" />
                              <span>Bukti transfer telah dikirim</span>
                            </div>
                            <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
                              Menunggu Verifikasi Kasir
                            </span>
                          </div>
                          <p className="text-[11px] text-blue-700">
                            Kasir kami sedang mencocokkan mutasi bank. Pesanan akan segera diproses begitu dana terverifikasi.
                          </p>
                          <div className="flex items-center gap-3 pt-1">
                            <img
                              src={order.payment_proof_url}
                              alt="Bukti Transfer"
                              className="w-16 h-16 object-cover rounded-lg border border-blue-200 shrink-0"
                            />
                            <div>
                              <label className="text-xs text-[#E5391B] font-bold hover:underline cursor-pointer">
                                <span>Ganti / Unggah Ulang Bukti Transfer</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleSimulatedProofUpload}
                                  disabled={uploading}
                                  className="hidden"
                                />
                              </label>
                              {proofUploadedMessage && (
                                <p className="text-[11px] text-green-700 font-bold mt-1">
                                  {proofUploadedMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* KONDISI 3: BELUM UNGGAH BUKTI SAMA SEKALI */
                        order.order_status !== 'DIBATALKAN' && (
                          <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-center space-y-2.5 bg-gray-50/50">
                            <p className="font-bold text-gray-800">Sudah melakukan transfer?</p>
                            <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                              Unggah foto resi ATM atau tangkapan layar (screenshot) m-Banking Anda:
                            </p>
                            <div>
                              <label className="inline-flex items-center gap-2 bg-[#E5391B] text-white px-5 py-2.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-[#C62818] transition-colors shadow-xs">
                                <UploadCloud size={16} />
                                <span>{uploading ? 'Mengunggah...' : 'Unggah Bukti Transfer'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleSimulatedProofUpload}
                                  disabled={uploading}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            {proofUploadedMessage && (
                              <p className="text-xs text-green-600 font-bold mt-2">
                                {proofUploadedMessage}
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* 2. JIKA METODE MIDTRANS QRIS */}
                  {order.payment_method === 'MIDTRANS_QRIS' && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs space-y-3">
                      <div className="flex items-center gap-2 text-amber-950 font-bold">
                        <img src="/images/payments/qris.png" alt="QRIS" className="h-4 w-auto object-contain" />
                        <span>Pembayaran Online QRIS &amp; E-Wallet</span>
                      </div>
                      <p className="text-amber-800 text-[11px] leading-relaxed">
                        Selesaikan pembayaran menggunakan GoPay, OVO, ShopeePay, DANA, LinkAja, BCA, atau m-Banking Anda.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handlePayWithMidtrans}
                          disabled={isProcessingMidtrans}
                          className="bg-[#E5391B] hover:bg-[#C62818] text-white px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <ExternalLink size={14} />
                          <span>{isProcessingMidtrans ? 'Menyiapkan Midtrans...' : 'Buka Halaman Pembayaran Midtrans'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = orderService.updateStatusByOrderNumber(order.order_number, {
                              payment_status: 'PAID',
                              order_status: 'DIPROSES',
                              note: 'Simulasi pembayaran Midtrans Sandbox diselesaikan oleh pengguna.',
                            });
                            if (updated) setOrder({ ...updated });
                          }}
                          className="border border-amber-400 bg-white hover:bg-amber-100 text-amber-900 px-3 py-2 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                          title="Simulasikan pembayaran lunas di lingkungan uji coba Sandbox"
                        >
                          Simulasi Lunas (Sandbox)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. JIKA METODE COD */}
                  {order.payment_method === 'COD' && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs space-y-2">
                      <p className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Banknote size={16} />
                        <span>Bayar di Tempat (COD / Tunai saat Diterima)</span>
                      </p>
                      <p className="text-amber-800 leading-relaxed">
                        Siapkan uang pas sejumlah <b className="text-amber-950 font-black">{formatRupiah(order.total_amount)}</b> saat kurir Alvin Swalayan mengantarkan pesanan ke alamat Anda.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Order Items (Daftar Barang Belanjaan) */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4 shadow-2xs">
              <h2 className="text-sm font-bold text-[#222222] border-b pb-2 flex items-center gap-2">
                <Package size={16} className="text-[#E5391B]" />
                <span>Daftar Barang Belanjaan ({order.items.length})</span>
              </h2>

              <div className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveItemImage(item)}
                        alt={item.product_name}
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 bg-gray-50 shrink-0 shadow-2xs"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                          if (target.src !== fallback) {
                            target.src = fallback;
                          }
                        }}
                      />
                      <div>
                        <p className="font-semibold text-[#222222]">{item.product_name}</p>
                        <p className="text-[11px] text-gray-500">
                          {item.quantity} {item.unit} x {formatRupiah(item.price)}
                        </p>
                        {item.note && (
                          <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded mt-1 font-medium inline-block">
                            📝 Catatan: {item.note}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-[#222222]">{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Subtotal calculation */}
              <div className="border-t pt-3 space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal Barang</span>
                  <span className="font-semibold text-[#222222]">{formatRupiah(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-[#16A34A] font-semibold">
                    <span>Diskon Voucher ({order.voucher_code})</span>
                    <span>-{formatRupiah(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Ongkos Kirim Banda Aceh</span>
                  <span>{order.delivery_fee === 0 ? 'GRATIS' : formatRupiah(order.delivery_fee ?? 0)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between items-baseline font-bold text-sm text-[#222222]">
                  <span>Total Pembayaran</span>
                  <span className="text-lg font-black text-[#E5391B]">
                    {formatRupiah(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Delivery Information */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#222222] border-b pb-2 flex items-center gap-2">
                <Truck size={16} className="text-[#E5391B]" />
                <span>Info Pengiriman</span>
              </h2>

              <div className="space-y-3 text-xs text-[#222222]">
                <div>
                  <span className="text-[11px] text-gray-500 block">Penerima:</span>
                  <span className="font-bold">{order.customer_name}</span>
                  <span className="text-gray-600 block">{order.customer_phone}</span>
                </div>

                <div>
                  <span className="text-[11px] text-gray-500 block">Alamat Antar:</span>
                  <span className="font-medium text-gray-800 leading-relaxed block">
                    {order.delivery_address}
                  </span>
                </div>

                {order.delivery_note && (
                  <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">
                      Catatan untuk Kurir:
                    </span>
                    <span className="text-gray-700 italic">{order.delivery_note}</span>
                  </div>
                )}

                <div className="border-t pt-3 text-[11px] text-gray-500 space-y-1">
                  <p>📍 Toko Pengirim: Alvin Swalayan Peunyeurat, Banda Aceh</p>
                  <p>🕒 Jam Pengantaran: 08.00 - 22.00 WIB</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          CANCELLATION MODAL
      ======================================================== */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2 text-red-600">
                <AlertOctagon size={20} />
                <h3 className="font-extrabold text-sm text-[#222222]">Batalkan Pesanan Ini?</h3>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                aria-label="Tutup popup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <p className="text-gray-600 leading-relaxed">
                Seluruh barang belanjaan pesanan <b className="text-gray-900">{order.order_number}</b> akan segera dikembalikan ke rak stok toko Alvin Swalayan.
              </p>

              <div className="space-y-2">
                <label className="block font-bold text-gray-700">
                  Pilih Alasan Pembatalan:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:border-[#E5391B] focus:outline-none bg-white"
                >
                  <option value="Ingin mengubah rincian barang belanjaan">
                    Ingin mengubah rincian barang belanjaan
                  </option>
                  <option value="Ingin mengganti alamat pengantaran">
                    Ingin mengganti alamat pengantaran
                  </option>
                  <option value="Salah memilih metode pembayaran">
                    Salah memilih metode pembayaran
                  </option>
                  <option value="Waktu pengantaran tidak sesuai">
                    Waktu pengantaran tidak sesuai
                  </option>
                  <option value="Lainnya">Lainnya (Tulis alasan)</option>
                </select>

                {cancelReason === 'Lainnya' && (
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Tuliskan alasan pembatalan Anda..."
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:border-[#E5391B] focus:outline-none mt-2"
                  />
                )}
              </div>

              {cancelError && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg flex items-center gap-1.5 font-medium border border-red-200">
                  <AlertCircle size={14} />
                  <span>{cancelError}</span>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-white transition-colors text-xs cursor-pointer"
              >
                Kembali
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {isCancelling ? 'Membatalkan...' : 'Ya, Batalkan Pesanan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Order, Product } from '@/types';
import { orderService } from '@/services/orderService';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { productService } from '@/services/productService';
import { formatRupiah, formatDateIndo, getOrderStatusMeta, slugify } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  Package,
  Clock,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { addToCart, addMultipleToCart } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNPAID' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<{ [orderId: string]: boolean }>({});

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  useEffect(() => {
    const refreshList = () => {
      const all = orderService.getAll();
      if (user) {
        const cleanPhone = user.phone ? user.phone.replace(/\D/g, '') : '';
        const userOrders = all.filter((o) => {
          if (o.user_id && o.user_id === user.id) return true;
          if (cleanPhone && cleanPhone.length >= 8 && o.customer_phone) {
            return o.customer_phone.replace(/\D/g, '') === cleanPhone;
          }
          return false;
        });
        setOrders(userOrders);
      } else {
        setOrders([]);
      }
    };

    refreshList();
    orderService.syncFromCloud().then(refreshList);

    window.addEventListener('alvin:orders_updated', refreshList);
    window.addEventListener('alvin:payment_rejected', refreshList);
    window.addEventListener('alvin:order_paid', refreshList);

    // Cross-tab BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('alvin_orders_channel');
        bc.onmessage = () => {
          refreshList();
        };
      } catch (err) {
        console.warn('BroadcastChannel error on orders list:', err);
      }
    }

    // Storage event listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'alvin_orders_v1') refreshList();
    };
    window.addEventListener('storage', handleStorage);

    // Supabase Realtime listener
    const supabaseClient = getSupabaseClient();
    let realtimeChannel: any = null;
    if (supabaseClient) {
      try {
        realtimeChannel = supabaseClient
          .channel('realtime_customer_orders_list')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            () => {
              orderService.syncFromCloud().then(refreshList);
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription error on orders list:', err);
      }
    }

    // Focus & visibility change listener
    const handleFocusSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        orderService.syncFromCloud().then(refreshList);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleFocusSync);
    }
    window.addEventListener('focus', handleFocusSync);

    return () => {
      window.removeEventListener('alvin:orders_updated', refreshList);
      window.removeEventListener('alvin:payment_rejected', refreshList);
      window.removeEventListener('alvin:order_paid', refreshList);
      window.removeEventListener('storage', handleStorage);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleFocusSync);
      }
      window.removeEventListener('focus', handleFocusSync);
      if (bc) bc.close();
      if (supabaseClient && realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
      }
    };
  }, [user]);

  const handleSearchPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneSearch.trim()) {
      const found = orderService.getByCustomerPhone(phoneSearch.trim());
      setOrders(found);
    } else if (user) {
      const all = orderService.getAll();
      const cleanPhone = user.phone ? user.phone.replace(/\D/g, '') : '';
      const userOrders = all.filter((o) => {
        if (o.user_id && o.user_id === user.id) return true;
        if (cleanPhone && cleanPhone.length >= 8 && o.customer_phone) {
          return o.customer_phone.replace(/\D/g, '') === cleanPhone;
        }
        return false;
      });
      setOrders(userOrders);
    } else {
      setOrders([]);
    }
  };

  const handleReorder = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      alert('Tidak ada rincian barang pada pesanan ini.');
      return;
    }

    const itemsToAdd: { product: Product; quantity: number; note?: string }[] = [];

    order.items.forEach((item) => {
      // 1. Search existing product via ID, SKU, or Name
      let prod = productService.findProduct({
        id: item.product_id,
        sku: item.sku,
        name: item.product_name,
      });

      // 2. If not found in local catalog, build fallback Product object so nothing is lost
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

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'UNPAID') return o.order_status === 'MENUNGGU_PEMBAYARAN';
    if (activeTab === 'PROCESSING')
      return ['DIBAYAR', 'DIPROSES', 'DIKIRIM'].includes(o.order_status);
    if (activeTab === 'COMPLETED') return o.order_status === 'SELESAI';
    if (activeTab === 'CANCELLED') return o.order_status === 'DIBATALKAN';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Admin Mode Banner */}
      {isAdmin && (
        <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-[#E5391B] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-[#222222]">Anda sedang login sebagai Administrator Toko</p>
              <p className="text-gray-600 mt-0.5">
                Halaman ini adalah riwayat belanja akun pelanggan. Untuk melihat &amp; memproses seluruh pesanan toko, silakan buka menu <b>Kelola Pesanan Admin</b>.
              </p>
            </div>
          </div>
          <Link
            href="/admin/orders"
            className="px-4 py-2 bg-[#222222] hover:bg-black text-white font-bold rounded-lg text-xs shrink-0 text-center transition-colors shadow-2xs"
          >
            Buka Kelola Pesanan Admin →
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#222222]">
            Pesanan Saya
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Lacak status pengiriman dan riwayat belanja Anda di Alvin Swalayan
          </p>
        </div>

        {/* Quick Phone Search if not logged in */}
        <form onSubmit={handleSearchPhone} className="flex gap-2">
          <input
            type="text"
            value={phoneSearch}
            onChange={(e) => setPhoneSearch(e.target.value)}
            placeholder="Cari no. HP pesanan..."
            className="border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-xs text-[#222222] focus:border-[#E5391B] focus:outline-none"
          />
          <button
            type="submit"
            className="bg-[#222222] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] mb-6 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'ALL'
              ? 'border-[#E5391B] text-[#E5391B]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Semua ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('UNPAID')}
          className={`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'UNPAID'
              ? 'border-[#E5391B] text-[#E5391B]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Menunggu Pembayaran
        </button>
        <button
          onClick={() => setActiveTab('PROCESSING')}
          className={`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'PROCESSING'
              ? 'border-[#E5391B] text-[#E5391B]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Sedang Diproses &amp; Dikirim
        </button>
        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'COMPLETED'
              ? 'border-[#E5391B] text-[#E5391B]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Selesai
        </button>
        <button
          onClick={() => setActiveTab('CANCELLED')}
          className={`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'CANCELLED'
              ? 'border-[#E5391B] text-[#E5391B]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Dibatalkan
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <Package size={28} />
          </div>
          <h3 className="font-bold text-sm text-[#222222] mb-1">
            {isAdmin
              ? 'Tidak Ada Pesanan Belanja Pribadi Admin'
              : user
              ? 'Belum Ada Pesanan'
              : 'Silakan Masuk Terlebih Dahulu'}
          </h3>
          <p className="text-xs text-[#6B7280] mb-4">
            {isAdmin
              ? 'Akun administrator toko tidak memiliki riwayat pesanan belanja pribadi. Silakan buka menu Kelola Pesanan untuk memproses seluruh pesanan pembeli.'
              : user
              ? 'Anda belum memiliki riwayat pesanan dalam kategori ini.'
              : 'Masuk ke akun Anda untuk melihat daftar pesanan yang pernah Anda beli.'}
          </p>
          {isAdmin ? (
            <Link
              href="/admin/orders"
              className="inline-block bg-[#E5391B] hover:bg-[#C62818] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              Buka Kelola Pesanan Toko
            </Link>
          ) : user ? (
            <Link
              href="/catalog"
              className="inline-block bg-[#E5391B] hover:bg-[#C62818] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors"
            >
              Mulai Belanja
            </Link>
          ) : (
            <Link
              href="/login?redirect=/orders"
              className="inline-block bg-[#E5391B] hover:bg-[#C62818] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors"
            >
              Masuk ke Akun
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const meta = getOrderStatusMeta(order.order_status);

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

  return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-[#E5E7EB] p-4 sm:p-5 hover:border-[#E5391B]/40 transition-all space-y-4 shadow-2xs"
              >
                {/* Header Row: Order Number, Date, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-extrabold text-sm text-[#222222]">
                      {order.order_number}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={13} />
                      <span>{formatDateIndo(order.created_at)}</span>
                    </span>
                  </div>

                  <span
                    className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${meta.color} self-start sm:self-auto`}
                  >
                    {meta.label}
                  </span>
                </div>

                {/* Items Preview */}
                <div className="space-y-2">
                  {(expandedOrders[order.id] ? order.items : order.items.slice(0, 2)).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 text-xs">
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
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{item.product_name}</p>
                        <p className="text-[11px] text-gray-500">
                          {item.quantity} barang x {formatRupiah(item.price)}
                        </p>
                        {item.note && (
                          <p className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded mt-0.5 font-medium inline-block truncate max-w-full">
                            📝 {item.note}
                          </p>
                        )}
                      </div>
                      <span className="font-bold text-gray-800 shrink-0">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}

                  {order.items.length > 2 && (
                    <div className="pt-1">
                      {expandedOrders[order.id] ? (
                        <button
                          type="button"
                          onClick={() => toggleExpandOrder(order.id)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <ChevronUp size={14} />
                          <span>Sembunyikan {order.items.length - 2} produk lainnya</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleExpandOrder(order.id)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#E5391B] hover:text-[#C62818] bg-[#FFF5F2] hover:bg-[#FFEBE5] border border-[#E5391B]/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          <ChevronDown size={14} />
                          <span>+ {order.items.length - 2} produk lainnya (klik untuk melihat)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Row: Total & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                  <div>
                    <span className="text-[11px] text-gray-500 block">Total Pesanan:</span>
                    <span className="text-base font-black text-[#E5391B]">
                      {formatRupiah(order.total_amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReorder(order)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors flex-1 sm:flex-initial"
                      title="Masukkan semua barang ke keranjang lagi"
                    >
                      <RefreshCw size={13} />
                      <span>Pesan Lagi</span>
                    </button>

                    <Link
                      href={`/orders/${order.id}`}
                      className="px-4 py-1.5 rounded-lg bg-[#E5391B] hover:bg-[#C62818] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs flex-1 sm:flex-initial whitespace-nowrap"
                    >
                      <span>Lacak Pesanan</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

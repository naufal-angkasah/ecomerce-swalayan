'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { orderService } from '@/services/orderService';
import { productService } from '@/services/productService';
import { Order, Product } from '@/types';
import { formatRupiah, getOrderStatusMeta } from '@/lib/utils';
import {
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Clock,
  Image as ImageIcon,
  BarChart3,
  Calendar,
  Filter,
} from 'lucide-react';

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('today');

  useEffect(() => {
    // 1. Initial read
    setOrders(orderService.getAll());
    setProducts(productService.getAll(false));

    // 2. Fetch fresh orders from Supabase Cloud
    orderService.syncFromCloud().then((cloudOrders) => {
      setOrders([...cloudOrders]);
    });

    // 3. Listen for live incoming orders
    const handleOrdersUpdated = () => {
      setOrders(orderService.getAll());
    };

    window.addEventListener('alvin:orders_updated', handleOrdersUpdated);
    window.addEventListener('alvin:new_order', handleOrdersUpdated);

    return () => {
      window.removeEventListener('alvin:orders_updated', handleOrdersUpdated);
      window.removeEventListener('alvin:new_order', handleOrdersUpdated);
    };
  }, []);

  // Filter orders by selected time period
  const filteredOrders = useMemo(() => {
    if (period === 'all') return orders;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    return orders.filter((o) => {
      const orderDate = new Date(o.created_at);
      if (isNaN(orderDate.getTime())) return true;

      if (period === 'today') {
        return orderDate >= startOfToday;
      }
      if (period === 'week') {
        const past7Days = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
        return orderDate >= past7Days;
      }
      if (period === 'month') {
        const past30Days = new Date(startOfToday.getTime() - 29 * 24 * 60 * 60 * 1000);
        return orderDate >= past30Days;
      }
      return true;
    });
  }, [orders, period]);

  const periodLabel = useMemo(() => {
    switch (period) {
      case 'today':
        return 'Hari Ini';
      case 'week':
        return 'Mingguan (7 Hari)';
      case 'month':
        return 'Bulanan (30 Hari)';
      case 'all':
      default:
        return 'Semua Data';
    }
  }, [period]);

  const totalRevenue = filteredOrders
    .filter((o) => o.payment_status === 'PAID')
    .reduce((acc, curr) => acc + curr.total_amount, 0);

  const pendingOrders = filteredOrders.filter((o) => o.order_status === 'MENUNGGU_PEMBAYARAN').length;
  const processingOrders = filteredOrders.filter((o) => ['DIBAYAR', 'DIPROSES', 'DIKIRIM'].includes(o.order_status)).length;
  const lowStockProducts = products.filter((p) => p.stock <= 5);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#222222]">
            Ringkasan Operasional Alvin Swalayan
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Jl. AMD No.1 Peunyeurat, Kec. Banda Raya, Kota Banda Aceh
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/reports"
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <BarChart3 size={14} className="text-emerald-700" />
            <span>Laporan Penjualan</span>
          </Link>
          <Link
            href="/admin/banners"
            className="bg-[#FFF7F5] hover:bg-[#FFEBE5] text-[#E5391B] border border-[#E5391B]/30 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <ImageIcon size={14} />
            <span>Banner Promo</span>
          </Link>
          <Link
            href="/admin/products"
            className="bg-[#E5391B] hover:bg-[#C62818] text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            + Tambah Produk Baru
          </Link>
          <Link
            href="/admin/products/import"
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2 rounded-lg text-xs font-bold border border-gray-300 transition-colors"
          >
            Import File CSV
          </Link>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E5391B]/10 text-[#E5391B] flex items-center justify-center font-bold">
            <Calendar size={17} />
          </div>
          <div>
            <span className="text-xs font-black text-[#222222] block">
              Filter Periode Ringkasan
            </span>
            <span className="text-[11px] text-gray-500">
              {period === 'today' && 'Menampilkan omset & pesanan khusus Hari Ini'}
              {period === 'week' && 'Menampilkan data operasional 7 Hari Terakhir (Mingguan)'}
              {period === 'month' && 'Menampilkan data operasional 30 Hari Terakhir (Bulanan)'}
              {period === 'all' && 'Menampilkan seluruh data transaksi operasional toko'}
            </span>
          </div>
        </div>

        {/* Segmented Period Tabs */}
        <div className="inline-flex p-1 bg-gray-100/90 rounded-xl border border-gray-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'today'
                ? 'bg-white text-[#E5391B] shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => setPeriod('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'week'
                ? 'bg-white text-[#E5391B] shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Mingguan
          </button>
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'month'
                ? 'bg-white text-[#E5391B] shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Bulanan
          </button>
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'all'
                ? 'bg-white text-[#E5391B] shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Semua
          </button>
        </div>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold">Total Omset Penjualan</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 text-[#16A34A] flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-[#222222]">
            {formatRupiah(totalRevenue)}
          </div>
          <p className="text-[10px] text-gray-400">
            Transaksi lunas • <b className="text-gray-600 font-semibold">{periodLabel}</b>
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold">Pesanan Harus Diproses</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-600">
            {processingOrders} Pesanan
          </div>
          <p className="text-[10px] text-gray-400">
            Menunggu packing &amp; kurir • <b className="text-gray-600 font-semibold">{periodLabel}</b>
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold">Menunggu Pembayaran</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-amber-600">
            {pendingOrders} Pesanan
          </div>
          <p className="text-[10px] text-gray-400">
            Verifikasi transfer • <b className="text-gray-600 font-semibold">{periodLabel}</b>
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold">Peringatan Stok Menipis</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E5391B] flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-[#E5391B]">
            {lowStockProducts.length} Produk
          </div>
          <p className="text-[10px] text-gray-400">Stok &le; 5 unit di toko (Real-time)</p>
        </div>
      </div>

      {/* Two Column Layout: Recent Orders & Low Stock Warning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-bold text-sm text-[#222222] flex items-center gap-2">
              <ShoppingCart size={16} className="text-[#E5391B]" />
              <span>Pesanan Masuk Terbaru ({filteredOrders.length})</span>
            </h2>
            <Link
              href="/admin/orders"
              className="text-xs text-[#E5391B] font-bold hover:underline"
            >
              Kelola Semua Pesanan →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">No. Pesanan</th>
                  <th className="py-2.5 px-3">Pelanggan</th>
                  <th className="py-2.5 px-3">Metode Bayar</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-gray-500">
                      <p>Tidak ada transaksi pesanan untuk periode <b>{periodLabel}</b>.</p>
                      {period !== 'all' && (
                        <button
                          onClick={() => setPeriod('all')}
                          className="mt-2 text-[#E5391B] font-bold hover:underline inline-block"
                        >
                          Tampilkan Semua Pesanan
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.slice(0, 5).map((ord) => {
                    const meta = getOrderStatusMeta(ord.order_status);
                    return (
                      <tr key={ord.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-gray-900">
                          {ord.order_number}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-gray-800">{ord.customer_name}</p>
                          <p className="text-[10px] text-gray-400">{ord.customer_phone}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-gray-700">{ord.payment_method}</span>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#222222]">
                          {formatRupiah(ord.total_amount)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.color}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/admin/orders?highlight=${ord.id}`}
                            className="text-[#E5391B] font-bold hover:underline"
                          >
                            Buka Detail
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alert Sidebar (1 Column) */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-[#FF6D00]" />
              <span>Perlu Restock Toko</span>
            </h2>
            <span className="text-[11px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">
              {lowStockProducts.length} Item
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                Semua stok produk saat ini aman di atas 5 unit.
              </p>
            ) : (
              lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg border border-gray-100 bg-[#FFF7F5] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#222222] truncate">{p.name}</p>
                    <span className="font-mono text-[10px] text-gray-500">
                      SKU: {p.sku}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-black text-xs ${
                        p.stock === 0
                          ? 'bg-red-600 text-white'
                          : 'bg-[#FF6D00] text-white'
                      }`}
                    >
                      {p.stock === 0 ? 'Habis (0)' : `Sisa ${p.stock}`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            href="/admin/products"
            className="block text-center text-xs font-bold text-[#E5391B] hover:underline pt-2 border-t"
          >
            Perbarui Stok di Katalog Produk →
          </Link>
        </div>
      </div>
    </div>
  );
}

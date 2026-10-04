'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Order, OrderStatus, PaymentStatus } from '@/types';
import { orderService } from '@/services/orderService';
import { formatRupiah, formatDateIndo, getOrderStatusMeta } from '@/lib/utils';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  ShoppingCart,
  Package,
  DollarSign,
  ArrowRight,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { exportSalesReportToExcel } from '@/lib/excelExport';

type PeriodFilter = 'today' | 'week' | 'month' | 'past30' | 'year' | 'all' | 'custom';

export default function AdminSalesReportPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PROCESSING' | 'CANCELLED'>('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    key: string;
    label: string;
    fullDate: string;
    revenue: number;
    paidRevenue: number;
    ordersCount: number;
  } | null>(null);

  // Initialize dates on mount
  useEffect(() => {
    applyPeriodPreset('month');
    loadOrders();
  }, []);

  const loadOrders = () => {
    const list = orderService.getAll();
    setOrders(list);
  };

  // Helper to format Date to YYYY-MM-DD for input[type="date"]
  const toDateInputValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle Preset Period Selection
  const applyPeriodPreset = (preset: PeriodFilter) => {
    setPeriod(preset);
    const now = new Date();

    if (preset === 'today') {
      const todayStr = toDateInputValue(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 6);
      setStartDate(toDateInputValue(past7));
      setEndDate(toDateInputValue(now));
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toDateInputValue(firstDay));
      setEndDate(toDateInputValue(now));
    } else if (preset === 'past30') {
      const past30 = new Date();
      past30.setDate(now.getDate() - 29);
      setStartDate(toDateInputValue(past30));
      setEndDate(toDateInputValue(now));
    } else if (preset === 'year') {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
      setStartDate(toDateInputValue(firstDayOfYear));
      setEndDate(toDateInputValue(now));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter orders by date range, payment status, order status, and search query
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const orderDate = new Date(o.created_at);

      // 1. Date Range Filter
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }

      // 2. Payment Status Filter
      if (paymentFilter === 'PAID') {
        if (o.payment_status !== 'PAID') return false;
      } else if (paymentFilter === 'PENDING') {
        if (o.payment_status === 'PAID') return false;
      }

      // 3. Order Status Filter
      if (statusFilter === 'COMPLETED') {
        if (!['SELESAI', 'DIKIRIM'].includes(o.order_status)) return false;
      } else if (statusFilter === 'PROCESSING') {
        if (!['DIBAYAR', 'DIPROSES'].includes(o.order_status)) return false;
      } else if (statusFilter === 'CANCELLED') {
        if (o.order_status !== 'DIBATALKAN') return false;
      }

      // 4. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = o.order_number.toLowerCase().includes(q);
        const matchCustomer = o.customer_name.toLowerCase().includes(q);
        const matchPhone = (o.customer_phone || '').includes(q);
        if (!matchNumber && !matchCustomer && !matchPhone) return false;
      }

      return true;
    });
  }, [orders, startDate, endDate, paymentFilter, statusFilter, searchQuery]);

  // Aggregate Executive KPI Metrics
  const summaryMetrics = useMemo(() => {
    // Exclude cancelled orders from financial omset calculations
    const validOrders = filteredOrders.filter((o) => o.order_status !== 'DIBATALKAN');
    const paidOrders = validOrders.filter((o) => o.payment_status === 'PAID');
    const pendingOrders = validOrders.filter((o) => o.payment_status !== 'PAID');

    const totalGrossRevenue = validOrders.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
    const totalPaidRevenue = paidOrders.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
    const totalPendingRevenue = pendingOrders.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

    const totalSubtotal = validOrders.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
    const totalShipping = validOrders.reduce(
      (acc, curr) => acc + (curr.delivery_fee || curr.shipping_cost || 0),
      0
    );
    const totalDiscount = validOrders.reduce((acc, curr) => acc + (curr.discount_amount || 0), 0);

    let totalItemsCount = 0;
    validOrders.forEach((o) => {
      o.items.forEach((item) => {
        totalItemsCount += item.quantity || 0;
      });
    });

    const averageOrderValue = validOrders.length > 0 ? Math.round(totalGrossRevenue / validOrders.length) : 0;

    return {
      totalOrders: filteredOrders.length,
      validOrdersCount: validOrders.length,
      paidOrdersCount: paidOrders.length,
      pendingOrdersCount: pendingOrders.length,
      cancelledOrdersCount: filteredOrders.filter((o) => o.order_status === 'DIBATALKAN').length,
      totalGrossRevenue,
      totalPaidRevenue,
      totalPendingRevenue,
      totalSubtotal,
      totalShipping,
      totalDiscount,
      totalItemsCount,
      averageOrderValue,
    };
  }, [filteredOrders]);

  // Breakdown by Payment Method
  const paymentBreakdown = useMemo(() => {
    const validOrders = filteredOrders.filter((o) => o.order_status !== 'DIBATALKAN');
    const breakdown = {
      COD: { count: 0, total: 0 },
      TRANSFER_BANK: { count: 0, total: 0 },
      MIDTRANS_QRIS: { count: 0, total: 0 },
    };

    validOrders.forEach((o) => {
      const method = (o.payment_method || 'COD').toUpperCase();
      if (method.includes('TRANSFER')) {
        breakdown.TRANSFER_BANK.count++;
        breakdown.TRANSFER_BANK.total += o.total_amount || 0;
      } else if (method.includes('MIDTRANS') || method.includes('QRIS')) {
        breakdown.MIDTRANS_QRIS.count++;
        breakdown.MIDTRANS_QRIS.total += o.total_amount || 0;
      } else {
        breakdown.COD.count++;
        breakdown.COD.total += o.total_amount || 0;
      }
    });

    return breakdown;
  }, [filteredOrders]);

  // Top 5 Best-Selling Products in the Filtered Period
  const topProducts = useMemo(() => {
    const validOrders = filteredOrders.filter((o) => o.order_status !== 'DIBATALKAN');
    const map = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();

    validOrders.forEach((o) => {
      o.items.forEach((item) => {
        const key = item.product_name || item.sku || 'Unknown';
        const existing = map.get(key) || {
          name: item.product_name,
          sku: item.sku || 'SKU-UNSET',
          qty: 0,
          revenue: 0,
        };
        existing.qty += item.quantity || 0;
        existing.revenue += (item.subtotal || item.price * (item.quantity || 1)) || 0;
        map.set(key, existing);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredOrders]);

  // Label description of current active period
  const periodLabel = useMemo(() => {
    const now = new Date();
    if (period === 'today') return 'Hari Ini';
    if (period === 'week') return '7 Hari Terakhir';
    if (period === 'past30') return '30 Hari Terakhir';
    if (period === 'month') {
      const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const dayOfMonth = now.getDate();
      return `Bulan Ini (${monthName} — Berjalan ${dayOfMonth} Hari)`;
    }
    if (period === 'year') {
      return `Tahun ${now.getFullYear()}`;
    }
    if (period === 'all') return 'Semua Waktu';
    if (startDate && endDate) {
      const s = new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const e = new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${s} s/d ${e}`;
    }
    return 'Kustom Periode';
  }, [period, startDate, endDate]);

  // Aggregate Data for Daily/Monthly Trend Chart
  const trendChartData = useMemo(() => {
    const validOrders = filteredOrders.filter((o) => o.order_status !== 'DIBATALKAN');
    const isYearly = period === 'year';

    if (isYearly) {
      const currentYear = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

      const points = monthNames.map((m, idx) => ({
        key: `${currentYear}-${String(idx + 1).padStart(2, '0')}`,
        label: m,
        fullDate: `${m} ${currentYear}`,
        revenue: 0,
        paidRevenue: 0,
        ordersCount: 0,
      }));

      validOrders.forEach((o) => {
        const d = new Date(o.created_at);
        if (d.getFullYear() === currentYear) {
          const mIdx = d.getMonth();
          if (points[mIdx]) {
            points[mIdx].revenue += o.total_amount || 0;
            if (o.payment_status === 'PAID') {
              points[mIdx].paidRevenue += o.total_amount || 0;
            }
            points[mIdx].ordersCount += 1;
          }
        }
      });

      const maxRevenue = Math.max(...points.map((p) => p.revenue), 100000);
      return { type: 'monthly' as const, points, maxRevenue };
    }

    // Daily buckets
    let start: Date;
    let end: Date = new Date();
    end.setHours(23, 59, 59, 999);

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (startDate && !endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    } else {
      if (validOrders.length > 0) {
        const timestamps = validOrders.map((o) => new Date(o.created_at).getTime());
        start = new Date(Math.min(...timestamps));
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date();
        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);
      }
    }

    const dayMap = new Map<string, { key: string; label: string; fullDate: string; revenue: number; paidRevenue: number; ordersCount: number }>();

    // Build buckets from start to end (inclusive of today)
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);

    // Limit to max 35 days for clean bar width; if span is longer, focus on recent 35 days
    const totalDays = Math.round((end.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays > 35) {
      cur.setDate(end.getDate() - 34);
      cur.setHours(0, 0, 0, 0);
    }

    while (cur <= end) {
      const key = toDateInputValue(cur);
      const label = cur.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const fullDate = cur.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      dayMap.set(key, { key, label, fullDate, revenue: 0, paidRevenue: 0, ordersCount: 0 });
      cur.setDate(cur.getDate() + 1);
    }

    validOrders.forEach((o) => {
      const key = o.created_at.split('T')[0];
      const bucket = dayMap.get(key);
      if (bucket) {
        bucket.revenue += o.total_amount || 0;
        if (o.payment_status === 'PAID') {
          bucket.paidRevenue += o.total_amount || 0;
        }
        bucket.ordersCount += 1;
      } else {
        // Fallback: if order is within active date boundaries, ensure it is represented
        const d = new Date(o.created_at);
        const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const fullDate = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        dayMap.set(key, {
          key,
          label,
          fullDate,
          revenue: o.total_amount || 0,
          paidRevenue: o.payment_status === 'PAID' ? (o.total_amount || 0) : 0,
          ordersCount: 1,
        });
      }
    });

    const points = Array.from(dayMap.values()).sort((a, b) => a.key.localeCompare(b.key));
    const maxRevenue = Math.max(...points.map((p) => p.revenue), 100000);

    return { type: 'daily' as const, points, maxRevenue };
  }, [filteredOrders, startDate, endDate, period]);

  const peakPoint = useMemo(() => {
    if (!trendChartData.points || trendChartData.points.length === 0) return null;
    return [...trendChartData.points].sort((a, b) => b.revenue - a.revenue)[0];
  }, [trendChartData]);

  // Export to CSV with UTF-8 BOM for Microsoft Excel compatibility
  const handleDownloadCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        'No',
        'Nomor Pesanan',
        'Tanggal Transaksi',
        'Nama Pelanggan',
        'No WhatsApp',
        'Alamat Pengiriman',
        'Daftar Produk Dibeli',
        'Subtotal Produk (Rp)',
        'Ongkos Kirim (Rp)',
        'Diskon Voucher (Rp)',
        'Total Akhir (Rp)',
        'Metode Pembayaran',
        'Status Pembayaran',
        'Status Pesanan',
      ];

      const rows = filteredOrders.map((o, idx) => {
        const itemsSummary = o.items
          .map((item) => `${item.product_name} (${item.quantity}x)`)
          .join('; ');

        return [
          idx + 1,
          `"${o.order_number}"`,
          `"${formatDateIndo(o.created_at)}"`,
          `"${(o.customer_name || '').replace(/"/g, '""')}"`,
          `"${(o.customer_phone || '').replace(/"/g, '""')}"`,
          `"${(o.delivery_address || '').replace(/"/g, '""')}"`,
          `"${itemsSummary.replace(/"/g, '""')}"`,
          o.subtotal || 0,
          o.delivery_fee || o.shipping_cost || 0,
          o.discount_amount || 0,
          o.total_amount || 0,
          `"${o.payment_method}"`,
          `"${o.payment_status}"`,
          `"${o.order_status}"`,
        ].join(',');
      });

      // In Indonesian Excel, comma causes everything to dump into Column A unless sep=, is specified at the beginning
      const csvContent = '\uFEFF' + 'sep=,\n' + headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const cleanDate = new Date().toISOString().split('T')[0];
      const filename = `Laporan_Penjualan_Alvin_Swalayan_${period}_${cleanDate}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Gagal mengunduh CSV laporan:', err);
      alert('Terjadi kesalahan saat mengekspor laporan CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export directly to native Microsoft Excel (.xlsx) with proper formatting and styling
  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportSalesReportToExcel(filteredOrders, summaryMetrics, periodLabel);
    } catch (err) {
      console.error('Gagal mengunduh Excel laporan:', err);
      alert('Terjadi kesalahan saat mengekspor laporan Excel (.xlsx).');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Trigger browser print dialog for PDF saving / paper printing
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4 print:text-black">
      {/* Global Print Stylesheet for A4 page sizing and ink sharpness */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 8mm 12mm 8mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #ffffff !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Kop Surat Resmi Perusahaan (Hanya Tampil Saat Dicetak / Export PDF) */}
      <div className="hidden print:block border-b-2 border-black pb-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 bg-[#E5391B] rounded-lg p-1.5 flex items-center justify-center border-2 border-[#FFC107] shrink-0">
              <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                <circle cx="14" cy="32" r="3.5" fill="#FFFFFF" />
                <circle cx="28" cy="32" r="3.5" fill="#FFFFFF" />
                <path
                  d="M 4 8 L 8 8 L 13 26 L 31 26 L 35 13 L 9 13"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect x="14" y="6" width="5" height="9" rx="1" fill="#FFC107" />
                <rect x="21" y="4" width="6" height="11" rx="1" fill="#FFFFFF" />
                <circle cx="29" cy="9" r="3" fill="#FF6D00" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-black tracking-tight leading-none uppercase">
                ALVIN SWALAYAN BANDA ACEH
              </h1>
              <p className="text-[11px] font-bold text-gray-800 tracking-wider uppercase mt-1">
                Supermarket &amp; Toko Kebutuhan Harian Terlengkap
              </p>
              <p className="text-[10px] text-gray-700 mt-0.5 leading-tight">
                Jl. Teuku Umar No. 12, Peunyeurat, Kec. Banda Raya, Kota Banda Aceh, Aceh 23238
              </p>
              <p className="text-[9.5px] text-gray-600 font-mono">
                Telp/WA: 0822-7799-8811 &bull; Email: halo@alvinswalayan.com &bull; Web: alvin-swalayan.vercel.app
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block border border-black px-2.5 py-1 rounded text-center">
              <span className="block text-[8px] font-bold tracking-widest text-gray-600 uppercase">DOKUMEN RESMI</span>
              <span className="block text-[11px] font-black text-black uppercase">LAPORAN PENJUALAN</span>
            </div>
            <p className="text-[9px] text-gray-700 font-mono mt-1 font-semibold">
              No: LAP/ALV/{new Date().getFullYear()}/{String(new Date().getMonth() + 1).padStart(2, '0')}/{String(new Date().getDate()).padStart(2, '0')}-{filteredOrders.length}
            </p>
          </div>
        </div>

        {/* Header Document Summary Line */}
        <div className="mt-3 pt-2.5 border-t border-gray-300 flex items-center justify-between text-[10.5px] text-gray-800 font-medium">
          <div>
            <span>Periode Laporan: </span>
            <strong className="text-black font-extrabold uppercase">{periodLabel}</strong>
          </div>
          <div>
            <span>Waktu Cetak: </span>
            <strong className="text-black">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}
              pk {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </strong>
          </div>
          <div>
            <span>Total Transaksi: </span>
            <strong className="text-black">{filteredOrders.length} Pesanan</strong>
          </div>
        </div>
      </div>

      {/* Top Banner & Action Controls (Tampil di Web, Sembunyi Saat Print) */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#222222]">
              Laporan &amp; Rekapitulasi Penjualan
            </h1>
            <span className="bg-red-100 text-[#E5391B] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              REKAP RESMI
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Analisis omset penjualan, total transaksi belanja, metode pembayaran, dan riwayat pesanan Alvin Swalayan
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadOrders}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            title="Segarkan Data Pesanan Terbaru"
          >
            <RefreshCw size={15} />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Cetak langsung atau simpan sebagai dokumen PDF"
          >
            <Printer size={15} className="text-gray-600" />
            <span>Cetak / Simpan PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={isExportingExcel || filteredOrders.length === 0}
            className="bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Download file Microsoft Excel (.xlsx) resmi dengan tabel, warna brand, dan kolom yang rapi"
          >
            <FileSpreadsheet size={15} />
            <span>{isExportingExcel ? 'Mengekspor Excel...' : 'Download Excel (.xlsx)'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={isExporting || filteredOrders.length === 0}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download cadangan data mentah format CSV (didukung perintah sep=,)"
          >
            <Download size={14} className="text-gray-500" />
            <span>{isExporting ? 'Mengekspor...' : 'CSV'}</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Preset Selector (Hidden in Print View) */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-4 print:hidden">
        {/* Preset Period Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[#E5391B]" />
            <span className="text-xs font-bold text-gray-800">Pilih Periode Laporan:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => applyPeriodPreset('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                period === 'today'
                  ? 'bg-[#E5391B] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hari Ini
            </button>

            <button
              type="button"
              onClick={() => applyPeriodPreset('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                period === 'week'
                  ? 'bg-[#E5391B] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Minggu Ini (7 Hari)
            </button>

            <button
              type="button"
              onClick={() => applyPeriodPreset('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                period === 'month'
                  ? 'bg-[#E5391B] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bulan Ini
            </button>

            <button
              type="button"
              onClick={() => applyPeriodPreset('past30')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                period === 'past30'
                  ? 'bg-[#E5391B] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 Hari Terakhir
            </button>

            <button
              type="button"
              onClick={() => applyPeriodPreset('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                period === 'year'
                  ? 'bg-[#E5391B] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tahun Ini
            </button>

            <button
              type="button"
              onClick={() => applyPeriodPreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                period === 'all'
                  ? 'bg-[#E5391B] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semua Waktu
            </button>
          </div>
        </div>

        {/* Date Range & Specific Status Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Dari Tanggal */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              Dari Tanggal:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriod('custom');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-[#E5391B]"
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              Sampai Tanggal:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriod('custom');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-[#E5391B]"
            />
          </div>

          {/* Filter Status Bayar */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              Status Pembayaran:
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-800 bg-white focus:outline-none focus:border-[#E5391B]"
            >
              <option value="ALL">Semua Pembayaran</option>
              <option value="PAID">Sudah Lunas (PAID)</option>
              <option value="PENDING">Menunggu Bayar / COD Pending</option>
            </select>
          </div>

          {/* Filter Status Pesanan */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              Status Proses Pesanan:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-800 bg-white focus:outline-none focus:border-[#E5391B]"
            >
              <option value="ALL">Semua Status Pesanan</option>
              <option value="COMPLETED">Selesai / Dikirim</option>
              <option value="PROCESSING">Diproses / Dibayar</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Period Badge Indicator (Web Only) */}
      <div className="flex items-center justify-between text-xs bg-[#FFF7F5] border border-[#E5E7EB]/20 p-3 rounded-xl print:hidden">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-[#E5391B]" />
          <span className="font-bold text-[#222222]">
            Data Rekapitulasi Periode: <span className="text-[#E5391B]">{periodLabel}</span>
          </span>
        </div>
        <span className="text-gray-500 font-medium">
          Ditemukan <b>{filteredOrders.length}</b> transaksi pesanan
        </span>
      </div>

      {/* 4 Main Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2.5 print:break-inside-avoid print:mb-3">
        {/* Card 1: Total Nilai Omset */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-1.5 shadow-2xs print:border print:border-gray-400 print:shadow-none print:p-2.5 print:rounded-lg">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold print:text-[10px] print:text-black">Total Nilai Omset</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 text-[#16A34A] flex items-center justify-center print:hidden">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-[#222222] print:text-base print:text-black">
            {formatRupiah(summaryMetrics.totalGrossRevenue)}
          </div>
          <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1 border-t border-gray-100 print:text-[9.5px] print:border-gray-200">
            <span className="print:text-gray-700">Lunas (Paid):</span>
            <span className="font-bold text-[#16A34A] print:text-black">
              {formatRupiah(summaryMetrics.totalPaidRevenue)}
            </span>
          </div>
          {summaryMetrics.totalPendingRevenue > 0 && (
            <div
              className="text-[10px] text-amber-800 flex items-center justify-between pt-0.5 print:text-[9px]"
              title="Pesanan aktif dalam perjalanan kurir COD atau menunggu transfer bank"
            >
              <span className="print:text-gray-700">COD / Menunggu:</span>
              <span className="font-bold text-amber-900 print:text-black">
                {formatRupiah(summaryMetrics.totalPendingRevenue)}
              </span>
            </div>
          )}
        </div>

        {/* Card 2: Total Transaksi Pesanan */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-1.5 shadow-2xs print:border print:border-gray-400 print:shadow-none print:p-2.5 print:rounded-lg">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold print:text-[10px] print:text-black">Total Transaksi</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center print:hidden">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-600 print:text-base print:text-black">
            {summaryMetrics.totalOrders} Pesanan
          </div>
          <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1 border-t border-gray-100 print:text-[9.5px] print:border-gray-200">
            <span className="print:text-gray-700">Sukses / Lunas:</span>
            <span className="font-bold text-gray-800 print:text-black">
              {summaryMetrics.paidOrdersCount} Transaksi
            </span>
          </div>
        </div>

        {/* Card 3: Total Produk Terjual */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-1.5 shadow-2xs print:border print:border-gray-400 print:shadow-none print:p-2.5 print:rounded-lg">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold print:text-[10px] print:text-black">Produk Terjual</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center print:hidden">
              <Package size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-[#222222] print:text-base print:text-black">
            {summaryMetrics.totalItemsCount} Unit
          </div>
          <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1 border-t border-gray-100 print:text-[9.5px] print:border-gray-200">
            <span className="print:text-gray-700">Dibatalkan:</span>
            <span className="font-bold text-red-600 print:text-black">
              {summaryMetrics.cancelledOrdersCount} Pesanan
            </span>
          </div>
        </div>

        {/* Card 4: Rata-Rata Belanja (AOV) */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-1.5 shadow-2xs print:border print:border-gray-400 print:shadow-none print:p-2.5 print:rounded-lg">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold print:text-[10px] print:text-black">Rata-Rata Belanja (AOV)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#E5391B] flex items-center justify-center print:hidden">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-[#222222] print:text-base print:text-black">
            {formatRupiah(summaryMetrics.averageOrderValue)}
          </div>
          <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1 border-t border-gray-100 print:text-[9.5px] print:border-gray-200">
            <span className="print:text-gray-700">Diskon Promo:</span>
            <span className="font-bold text-red-600 print:text-black">
              {formatRupiah(summaryMetrics.totalDiscount)}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Sales Trend Chart */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4 shadow-2xs print:border print:border-gray-300 print:shadow-none print:p-3 print:rounded-lg print:break-inside-avoid print:mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3 print:pb-1.5 print:border-gray-200">
          <div>
            <h2 className="text-sm font-black text-[#222222] flex items-center gap-2 print:text-xs print:text-black">
              <BarChart3 size={17} className="text-[#E5391B] print:hidden" />
              <span>Grafik Tren Omset Penjualan</span>
            </h2>
            <p className="text-xs text-[#6B7280] print:hidden">
              Visualisasi pergerakan omset harian dan transaksi belanja Alvin Swalayan
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs flex-wrap">
            {peakPoint && peakPoint.revenue > 0 && (
              <div className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-[11px] text-amber-900 flex items-center gap-1.5 font-medium print:text-[9.5px] print:py-0.5 print:px-1.5 print:border-gray-400">
                <TrendingUp size={13} className="text-amber-600 shrink-0 print:hidden" />
                <span>
                  Penjualan Tertinggi: <strong>{peakPoint.label}</strong> ({formatRupiah(peakPoint.revenue)})
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium print:text-[9.5px] print:text-black">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-gradient-to-t from-[#E5391B] to-[#FF6B4A] print:bg-[#E5391B]" />
                Omset Total
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                Lunas
              </span>
            </div>
          </div>
        </div>

        {/* Chart Canvas Area */}
        {trendChartData.points.length === 0 || trendChartData.points.every((p) => p.revenue === 0) ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <BarChart3 size={36} className="mx-auto text-gray-300" />
            <p className="text-xs font-semibold text-gray-500">
              Belum ada aktivitas transaksi pesanan pada rentang tanggal yang dipilih.
            </p>
          </div>
        ) : (
          <div className="space-y-3 print:space-y-1">
            {/* Interactive Tooltip Bar (Hanya Muncul di Web, Disembunyikan Saat Print) */}
            <div className="min-h-9 flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 bg-[#FFF7F5] rounded-lg text-xs border border-red-100 gap-2 print:hidden">
              {hoveredPoint ? (
                <>
                  <span className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#E5391B]" />
                    {hoveredPoint.fullDate}
                  </span>
                  <div className="flex items-center gap-4 flex-wrap text-xs">
                    <span className="text-gray-600">
                      Omset: <strong className="text-[#E5391B] font-extrabold">{formatRupiah(hoveredPoint.revenue)}</strong>
                    </span>
                    <span className="text-gray-600">
                      Lunas: <strong className="text-emerald-700 font-extrabold">{formatRupiah(hoveredPoint.paidRevenue)}</strong>
                    </span>
                    <span className="text-gray-600">
                      Pesanan: <strong className="text-indigo-700 font-extrabold">{hoveredPoint.ordersCount} Transaksi</strong>
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-[11px] text-gray-500 italic flex items-center gap-1">
                  💡 Arahkan kursor atau ketuk batang grafik di bawah untuk melihat rincian omset per tanggal
                </span>
              )}
            </div>

            {/* Bars container */}
            <div className="pt-4 pb-2 print:pt-2 print:pb-1">
              <div className="flex items-end gap-1 sm:gap-2 h-44 print:h-28 w-full border-b border-gray-200 px-1 overflow-x-auto print:overflow-visible">
                {trendChartData.points.map((pt) => {
                  const heightPercent =
                    trendChartData.maxRevenue > 0
                      ? Math.max(pt.revenue > 0 ? 10 : 3, Math.round((pt.revenue / trendChartData.maxRevenue) * 100))
                      : 3;
                  const isHovered = hoveredPoint?.key === pt.key;

                  return (
                    <div
                      key={pt.key}
                      className="flex-1 min-w-[28px] max-w-[48px] flex flex-col items-center h-full justify-end group cursor-pointer relative"
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => setHoveredPoint(pt)}
                    >
                      {/* Floating tooltip badge */}
                      {isHovered && (
                        <div className="absolute -top-9 z-20 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none print:hidden">
                          {formatRupiah(pt.revenue)}
                        </div>
                      )}

                      {/* Bar with gradient */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-md transition-all duration-150 relative overflow-hidden ${
                          pt.revenue > 0
                            ? isHovered
                              ? 'bg-gradient-to-t from-[#B91C1C] to-[#E5391B] shadow-md ring-2 ring-[#E5391B]/40'
                              : 'bg-gradient-to-t from-[#E5391B] to-[#FF6B4A] hover:brightness-110'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        {/* Lunas inner fill if partially paid */}
                        {pt.paidRevenue > 0 && pt.paidRevenue < pt.revenue && (
                          <div
                            style={{ height: `${Math.round((pt.paidRevenue / pt.revenue) * 100)}%` }}
                            className="absolute bottom-0 inset-x-0 bg-emerald-500/80"
                          />
                        )}
                        {pt.paidRevenue > 0 && pt.paidRevenue >= pt.revenue && (
                          <div className="absolute inset-0 bg-gradient-to-t from-emerald-600 to-emerald-400" />
                        )}
                      </div>

                      {/* Label below bar */}
                      <span
                        className={`text-[10px] mt-2 block truncate max-w-full text-center transition-colors ${
                          isHovered ? 'font-black text-[#E5391B]' : 'text-gray-500 font-medium print:text-black'
                        }`}
                      >
                        {pt.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout: Payment Method Breakdown & Top 5 Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-3 print:break-inside-avoid print:mb-3">
        {/* Breakdown by Payment Method */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] space-y-4 shadow-2xs print:border print:border-gray-300 print:shadow-none print:p-3 print:rounded-lg">
          <div className="flex items-center justify-between border-b pb-3 print:pb-1.5 print:border-gray-200">
            <h2 className="text-sm font-bold text-[#222222] flex items-center gap-2 print:text-xs print:text-black">
              <CreditCard size={16} className="text-[#E5391B] print:hidden" />
              <span>Rekapitulasi Berdasarkan Metode Bayar</span>
            </h2>
            <span className="text-[11px] text-gray-400 font-medium print:text-[9px] print:text-gray-700">Periode Terpilih</span>
          </div>

          {/* Visual Proportion Bar */}
          {summaryMetrics.totalGrossRevenue > 0 && (
            <div className="space-y-1.5 pt-1 pb-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 print:text-[9.5px] print:text-black">
                <span>Distribusi Transaksi</span>
                <span>100% Omset</span>
              </div>
              <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden flex shadow-inner print:border print:border-gray-300">
                {paymentBreakdown.COD.total > 0 && (
                  <div
                    style={{ width: `${(paymentBreakdown.COD.total / summaryMetrics.totalGrossRevenue) * 100}%` }}
                    className="bg-amber-500 hover:bg-amber-600 transition-all h-full"
                    title={`COD: ${formatRupiah(paymentBreakdown.COD.total)} (${Math.round(
                      (paymentBreakdown.COD.total / summaryMetrics.totalGrossRevenue) * 100
                    )}%)`}
                  />
                )}
                {paymentBreakdown.TRANSFER_BANK.total > 0 && (
                  <div
                    style={{
                      width: `${(paymentBreakdown.TRANSFER_BANK.total / summaryMetrics.totalGrossRevenue) * 100}%`,
                    }}
                    className="bg-blue-600 hover:bg-blue-700 transition-all h-full"
                    title={`Transfer Bank: ${formatRupiah(paymentBreakdown.TRANSFER_BANK.total)} (${Math.round(
                      (paymentBreakdown.TRANSFER_BANK.total / summaryMetrics.totalGrossRevenue) * 100
                    )}%)`}
                  />
                )}
                {paymentBreakdown.MIDTRANS_QRIS.total > 0 && (
                  <div
                    style={{
                      width: `${(paymentBreakdown.MIDTRANS_QRIS.total / summaryMetrics.totalGrossRevenue) * 100}%`,
                    }}
                    className="bg-purple-600 hover:bg-purple-700 transition-all h-full"
                    title={`QRIS: ${formatRupiah(paymentBreakdown.MIDTRANS_QRIS.total)} (${Math.round(
                      (paymentBreakdown.MIDTRANS_QRIS.total / summaryMetrics.totalGrossRevenue) * 100
                    )}%)`}
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-500 flex-wrap gap-2 pt-0.5 print:text-[9px]">
                <span className="flex items-center gap-1 font-semibold text-amber-800 print:text-black">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  COD ({summaryMetrics.totalGrossRevenue > 0 ? Math.round((paymentBreakdown.COD.total / summaryMetrics.totalGrossRevenue) * 100) : 0}%)
                </span>
                <span className="flex items-center gap-1 font-semibold text-blue-800 print:text-black">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  Transfer ({summaryMetrics.totalGrossRevenue > 0 ? Math.round((paymentBreakdown.TRANSFER_BANK.total / summaryMetrics.totalGrossRevenue) * 100) : 0}%)
                </span>
                <span className="flex items-center gap-1 font-semibold text-purple-800 print:text-black">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                  QRIS ({summaryMetrics.totalGrossRevenue > 0 ? Math.round((paymentBreakdown.MIDTRANS_QRIS.total / summaryMetrics.totalGrossRevenue) * 100) : 0}%)
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3 print:space-y-1.5">
            {/* COD */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between print:p-2 print:border-gray-300">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold print:hidden">
                  <Banknote size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 print:text-[11px] print:text-black">Bayar di Tempat (COD Tunai)</p>
                  <p className="text-[11px] text-gray-500 print:text-[9px] print:text-gray-700">{paymentBreakdown.COD.count} transaksi pesanan</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-gray-900 print:text-[11px] print:text-black">{formatRupiah(paymentBreakdown.COD.total)}</p>
                <p className="text-[10px] text-gray-500 font-medium print:text-[8.5px] print:text-gray-700">
                  {summaryMetrics.totalGrossRevenue > 0
                    ? Math.round((paymentBreakdown.COD.total / summaryMetrics.totalGrossRevenue) * 100)
                    : 0}
                  % dari omset
                </p>
              </div>
            </div>

            {/* Transfer Bank */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between print:p-2 print:border-gray-300">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold print:hidden">
                  <CreditCard size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 print:text-[11px] print:text-black">Transfer Bank Syariah (BSI / BAS)</p>
                  <p className="text-[11px] text-gray-500 print:text-[9px] print:text-gray-700">{paymentBreakdown.TRANSFER_BANK.count} transaksi pesanan</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-gray-900 print:text-[11px] print:text-black">
                  {formatRupiah(paymentBreakdown.TRANSFER_BANK.total)}
                </p>
                <p className="text-[10px] text-gray-500 font-medium print:text-[8.5px] print:text-gray-700">
                  {summaryMetrics.totalGrossRevenue > 0
                    ? Math.round((paymentBreakdown.TRANSFER_BANK.total / summaryMetrics.totalGrossRevenue) * 100)
                    : 0}
                  % dari omset
                </p>
              </div>
            </div>

            {/* Midtrans / QRIS */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between print:p-2 print:border-gray-300">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold print:hidden">
                  <QrCode size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 print:text-[11px] print:text-black">QRIS &amp; E-Wallet (Midtrans)</p>
                  <p className="text-[11px] text-gray-500 print:text-[9px] print:text-gray-700">{paymentBreakdown.MIDTRANS_QRIS.count} transaksi pesanan</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-gray-900 print:text-[11px] print:text-black">
                  {formatRupiah(paymentBreakdown.MIDTRANS_QRIS.total)}
                </p>
                <p className="text-[10px] text-gray-500 font-medium print:text-[8.5px] print:text-gray-700">
                  {summaryMetrics.totalGrossRevenue > 0
                    ? Math.round((paymentBreakdown.MIDTRANS_QRIS.total / summaryMetrics.totalGrossRevenue) * 100)
                    : 0}
                  % dari omset
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Products Sold */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] space-y-4 shadow-2xs print:border print:border-gray-300 print:shadow-none print:p-3 print:rounded-lg">
          <div className="flex items-center justify-between border-b pb-3 print:pb-1.5 print:border-gray-200">
            <h2 className="text-sm font-bold text-[#222222] flex items-center gap-2 print:text-xs print:text-black">
              <Package size={16} className="text-[#E5391B] print:hidden" />
              <span>Top 5 Produk Terlaris Periode Ini</span>
            </h2>
            <Link
              href="/admin/products"
              className="text-xs text-[#E5391B] font-bold hover:underline print:hidden"
            >
              Lihat Semua Stok →
            </Link>
          </div>

          <div className="space-y-2.5 print:space-y-1.5">
            {topProducts.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center print:py-4">
                Belum ada data produk terjual dalam rentang periode ini.
              </p>
            ) : (
              topProducts.map((p, index) => (
                <div
                  key={p.name + index}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors print:p-1.5 print:border-gray-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-red-50 text-[#E5391B] font-black text-xs flex items-center justify-center shrink-0 print:border print:border-black print:text-black print:bg-white print:w-5 print:h-5 print:text-[10px]">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate print:text-[10.5px] print:text-black">{p.name}</p>
                      <span className="text-[10px] text-gray-400 font-mono print:text-[8.5px] print:text-gray-600">SKU: {p.sku}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-gray-900 print:text-[10.5px] print:text-black">{p.qty} terjual</span>
                    <p className="text-[10px] text-gray-500 font-medium print:text-[8.5px] print:text-gray-700">{formatRupiah(p.revenue)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detailed Transaction Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4 shadow-2xs print:border print:border-gray-300 print:shadow-none print:p-3 print:rounded-lg print:break-inside-avoid">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 print:pb-1.5 print:border-gray-200">
          <div>
            <h2 className="text-sm font-black text-[#222222] flex items-center gap-2 print:text-xs print:text-black">
              <ShoppingCart size={16} className="text-[#E5391B] print:hidden" />
              <span>Rincian Buku Transaksi Belanja ({filteredOrders.length})</span>
            </h2>
            <p className="text-xs text-[#6B7280] print:hidden">
              Daftar seluruh transaksi pesanan yang sesuai dengan filter periode aktif
            </p>
          </div>

          {/* Quick Search in Table (Sembunyi saat print) */}
          <div className="relative w-full sm:w-64 print:hidden">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no order / pelanggan..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-[#E5391B]"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
          </div>
        </div>

        {/* Table Display */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left text-xs print:text-[9px]">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b print:bg-gray-100 print:text-black print:border-b-2 print:border-black">
              <tr>
                <th className="py-2.5 px-3 print:py-1 print:px-1.5">No. Pesanan</th>
                <th className="py-2.5 px-3 print:py-1 print:px-1.5">Tanggal</th>
                <th className="py-2.5 px-3 print:py-1 print:px-1.5">Pelanggan</th>
                <th className="py-2.5 px-3 print:py-1 print:px-1.5">Produk Dibeli</th>
                <th className="py-2.5 px-3 text-right print:py-1 print:px-1.5">Subtotal</th>
                <th className="py-2.5 px-3 text-right print:py-1 print:px-1.5">Ongkir</th>
                <th className="py-2.5 px-3 text-right print:py-1 print:px-1.5">Diskon</th>
                <th className="py-2.5 px-3 text-right font-bold text-gray-900 print:py-1 print:px-1.5 print:text-black">Total Akhir</th>
                <th className="py-2.5 px-3 print:py-1 print:px-1.5">Metode Bayar</th>
                <th className="py-2.5 px-3 print:py-1 print:px-1.5">Status</th>
                <th className="py-2.5 px-3 text-right print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 print:divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400 print:py-6">
                    Tidak ada riwayat transaksi penjualan dalam rentang waktu atau filter ini.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const meta = getOrderStatusMeta(ord.order_status);
                  const isPaid = ord.payment_status === 'PAID';

                  return (
                    <tr key={ord.id} className="hover:bg-gray-50 transition-colors print:break-inside-avoid">
                      <td className="py-3 px-3 print:py-1.5 print:px-1.5 font-mono font-bold text-gray-900 print:text-black">
                        {ord.order_number}
                      </td>
                      <td className="py-3 px-3 print:py-1.5 print:px-1.5 text-[11px] print:text-[8.5px] text-gray-500 print:text-black whitespace-nowrap">
                        {new Date(ord.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        <div className="text-[10px] print:text-[8px] text-gray-400 print:text-gray-600">
                          {new Date(ord.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          WIB
                        </div>
                      </td>
                      <td className="py-3 px-3 print:py-1.5 print:px-1.5">
                        <p className="font-semibold text-gray-800 print:text-black">{ord.customer_name}</p>
                        <p className="text-[10px] print:text-[8px] text-gray-400 print:text-gray-600 font-mono">{ord.customer_phone}</p>
                      </td>
                      <td className="py-3 px-3 print:py-1.5 print:px-1.5 max-w-[200px] print:max-w-[170px]">
                        <p className="text-[11px] print:text-[8.5px] text-gray-700 print:text-black truncate print:whitespace-normal print:line-clamp-2" title={ord.items.map((i) => `${i.product_name} (${i.quantity}x)`).join(', ')}>
                          {ord.items.map((i) => `${i.product_name} (${i.quantity}x)`).join(', ')}
                        </p>
                        <span className="text-[10px] print:text-[8px] text-gray-400 print:text-gray-600 font-medium">
                          {ord.items.reduce((acc, curr) => acc + curr.quantity, 0)} item
                        </span>
                      </td>
                      <td className="py-3 px-3 print:py-1.5 print:px-1.5 text-right font-medium text-gray-700 print:text-black">
                        {formatRupiah(ord.subtotal)}
                      </td>
                      <td className="py-3 px-3 print:py-1.5 print:px-1.5 text-right text-gray-500 print:text-black">
                        {formatRupiah(ord.delivery_fee || ord.shipping_cost || 0)}
                      </td>
                      <td className="py-3 px-3 print:py-1.5 print:px-1.5 text-right text-red-600 font-medium print:text-black">
                        {ord.discount_amount > 0 ? `-${formatRupiah(ord.discount_amount)}` : 'Rp 0'}
                      </td>
                      <td className="py-3 px-3 print:py-1.5 print:px-1.5 text-right font-black text-gray-900 print:text-black">
                        {formatRupiah(ord.total_amount)}
                      </td>
                      <td className="py-3 px-3 print:py-1.5 print:px-1.5">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] print:text-[8px] font-bold bg-gray-100 text-gray-700 print:border print:border-gray-300 print:bg-white print:text-black">
                          {ord.payment_method}
                        </span>
                        <div>
                          <span
                            className={`inline-block mt-0.5 text-[9px] print:text-[7.5px] font-bold px-1.5 py-0.2 rounded print:border print:border-gray-300 ${
                              isPaid ? 'bg-green-100 text-green-800 print:text-black' : 'bg-amber-100 text-amber-800 print:text-black'
                            }`}
                          >
                            {ord.payment_status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 print:py-1.5 print:px-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] print:text-[8px] font-bold border print:text-black print:border-gray-400 ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right print:hidden">
                        <Link
                          href={`/admin/orders?highlight=${ord.id}`}
                          className="text-[#E5391B] font-bold hover:underline"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Summary Footer */}
            {filteredOrders.length > 0 && (
              <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-300 text-gray-900 print:bg-gray-100 print:border-t-2 print:border-black print:text-black">
                <tr>
                  <td colSpan={4} className="py-3 px-3 print:py-1.5 print:px-1.5 text-right font-black print:text-[9.5px]">
                    TOTAL KESELURUHAN PERIODE:
                  </td>
                  <td className="py-3 px-3 print:py-1.5 print:px-1.5 text-right print:text-[9px]">
                    {formatRupiah(summaryMetrics.totalSubtotal)}
                  </td>
                  <td className="py-3 px-3 print:py-1.5 print:px-1.5 text-right print:text-[9px]">
                    {formatRupiah(summaryMetrics.totalShipping)}
                  </td>
                  <td className="py-3 px-3 print:py-1.5 print:px-1.5 text-right text-red-600 print:text-black print:text-[9px]">
                    -{formatRupiah(summaryMetrics.totalDiscount)}
                  </td>
                  <td className="py-3 px-3 print:py-1.5 print:px-1.5 text-right font-black text-[#E5391B] print:text-black text-sm print:text-[10px]">
                    {formatRupiah(summaryMetrics.totalGrossRevenue)}
                  </td>
                  <td colSpan={3} className="py-3 px-3 print:py-1.5 print:px-1.5 text-gray-500 print:text-gray-800 font-medium text-[11px] print:text-[8px]">
                    ({summaryMetrics.paidOrdersCount} lunas, {summaryMetrics.pendingOrdersCount} pending)
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Lembar Pengesahan Resmi (Tanda Tangan Kasir & Pemilik Toko) */}
      <div className="hidden print:block mt-8 pt-4 break-inside-avoid text-black">
        <div className="flex items-start justify-between px-8 text-xs">
          {/* Kolom Kiri: Kasir / Pengelola Toko */}
          <div className="text-center w-60">
            <p className="text-[10.5px] text-gray-600 mb-0.5">Dibuat &amp; Dilaporkan Oleh,</p>
            <p className="font-bold text-gray-900 text-[11px]">Petugas Kasir &amp; Pengelola Toko</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[9px] text-gray-300 italic">( Tanda Tangan &amp; Cap Toko )</span>
            </div>
            <p className="font-bold border-b border-black pb-0.5 inline-block min-w-[170px] text-[11px]">
              ( .................................................... )
            </p>
            <p className="text-[9.5px] text-gray-500 mt-1 font-mono">Petugas Admin / Kasir</p>
          </div>

          {/* Kolom Kanan: Owner / Pimpinan Alvin Swalayan */}
          <div className="text-center w-60">
            <p className="text-[10.5px] text-gray-600 mb-0.5">
              Banda Aceh, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="font-bold text-gray-900 text-[11px]">Owner / Pimpinan Alvin Swalayan</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[9px] text-gray-300 italic">( Tanda Tangan &amp; Cap Toko )</span>
            </div>
            <p className="font-bold border-b border-black pb-0.5 inline-block min-w-[170px] text-[11px]">
              ( .................................................... )
            </p>
            <p className="text-[9.5px] text-gray-500 mt-1 font-mono">Pimpinan / Pemilik Usaha</p>
          </div>
        </div>

        {/* Legal Disclaimer Footer */}
        <div className="mt-8 pt-3 border-t border-gray-300 text-center text-[8.5px] text-gray-500 flex items-center justify-between">
          <span>Sistem Manajemen Toko &bull; Alvin Swalayan Banda Aceh</span>
          <span>Dokumen ini dicetak otomatis secara elektronik dan sah sebagai arsip rekapitulasi penjualan toko.</span>
          <span>Halaman 1 dari 1</span>
        </div>
      </div>
    </div>
  );
}

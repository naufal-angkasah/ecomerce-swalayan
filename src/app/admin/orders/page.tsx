'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Order, OrderStatus } from '@/types';
import { orderService } from '@/services/orderService';
import { formatRupiah, formatDateIndo, getOrderStatusMeta } from '@/lib/utils';
import {
  CheckCircle2,
  Search,
  XCircle,
  MessageCircle,
  AlertOctagon,
  Download,
  X,
  Printer,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Eye,
} from 'lucide-react';

function AdminOrdersContent() {
  const searchParams = useSearchParams();
  const highlightedId = searchParams.get('highlight');

  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
  const [rejectModalOrder, setRejectModalOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Foto struk buram atau tidak terbaca jelas');
  const [customRejectReason, setCustomRejectReason] = useState<string>('');
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const handlePrintReceipt = () => {
    document.body.classList.add('printing-receipt');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-receipt');
    }, 1500);
  };

  const handleCopyWhatsAppReceipt = (ord: Order) => {
    const itemsText = ord.items
      .map((i) => `• ${i.product_name} (${i.quantity}x) = ${formatRupiah(i.subtotal)}`)
      .join('\n');

    const receiptText = `*NOTA BELANJA ALVIN SWALAYAN*
================================
No. Pesanan : ${ord.order_number}
Tanggal     : ${formatDateIndo(ord.created_at)}
Pelanggan   : ${ord.customer_name} (${ord.customer_phone})
Alamat      : ${ord.delivery_address}
${ord.delivery_note ? `Catatan     : "${ord.delivery_note}"\n` : ''}--------------------------------
*Daftar Barang:*
${itemsText}
--------------------------------
Subtotal    : ${formatRupiah(ord.subtotal)}
${ord.discount_amount > 0 ? `Diskon      : -${formatRupiah(ord.discount_amount)}\n` : ''}Ongkos Kirim: ${ord.delivery_fee === 0 ? 'GRATIS' : formatRupiah(ord.delivery_fee || 0)}
*TOTAL AKHIR : ${formatRupiah(ord.total_amount)}*
Metode Bayar: ${ord.payment_method === 'COD' ? 'Bayar di Tempat (COD Tunai)' : ord.payment_method}
Status      : ${ord.order_status} (${ord.payment_status})
================================
_Terima kasih telah berbelanja di Alvin Swalayan Banda Aceh!_`;

    navigator.clipboard.writeText(receiptText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const hasConsumedHighlightRef = React.useRef(false);

  const selectOrder = (ord: Order) => {
    hasConsumedHighlightRef.current = true;
    setSelectedOrder(ord);
    if (typeof window !== 'undefined' && window.location.search.includes('highlight=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const loadOrders = React.useCallback(() => {
    const list = orderService.getAll();
    setOrders(list);

    // 1. If there is an unconsumed highlight param, select it ONCE and clean URL
    if (highlightedId && !hasConsumedHighlightRef.current) {
      const match = list.find((o) => o.id === highlightedId || o.order_number === highlightedId);
      if (match) {
        setSelectedOrder(match);
        hasConsumedHighlightRef.current = true;
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname);
        }
        return;
      }
    }

    // 2. Preserve the currently selected order and update its data from latest list
    setSelectedOrder((prev) => {
      if (!prev) return list[0] || null;
      return list.find((o) => o.id === prev.id || o.order_number === prev.order_number) || prev;
    });
  }, [highlightedId]);

  useEffect(() => {
    loadOrders();
    orderService.syncFromCloud().then(() => loadOrders());

    const handleUpdate = () => loadOrders();
    window.addEventListener('alvin:orders_updated', handleUpdate);
    window.addEventListener('alvin:new_order', handleUpdate);
    window.addEventListener('alvin:payment_proof_uploaded', handleUpdate);

    return () => {
      window.removeEventListener('alvin:orders_updated', handleUpdate);
      window.removeEventListener('alvin:new_order', handleUpdate);
      window.removeEventListener('alvin:payment_proof_uploaded', handleUpdate);
    };
  }, [loadOrders]);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert('Tidak ada data pesanan untuk diexport.');
      return;
    }

    const headers = [
      'Nomor Pesanan',
      'Tanggal',
      'Nama Pelanggan',
      'WhatsApp',
      'Metode Pembayaran',
      'Status Pembayaran',
      'Status Pesanan',
      'Jumlah Item',
      'Subtotal (Rp)',
      'Ongkir (Rp)',
      'Diskon Voucher (Rp)',
      'Total Akhir (Rp)',
      'Alamat Pengiriman',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.order_number}"`,
      `"${new Date(o.created_at).toLocaleString('id-ID')}"`,
      `"${(o.customer_name || '').replace(/"/g, '""')}"`,
      `"${(o.customer_phone || '').replace(/"/g, '""')}"`,
      `"${o.payment_method}"`,
      `"${o.payment_status}"`,
      `"${o.order_status}"`,
      o.items?.length || 0,
      o.subtotal,
      o.shipping_fee ?? o.delivery_fee ?? 0,
      o.discount_amount || 0,
      o.grand_total ?? o.total_amount,
      `"${(o.delivery_address || o.shipping_address || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pesanan_alvin_swalayan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    const updated = orderService.updateStatus(orderId, newStatus);
    if (updated) {
      loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...updated });
      }
      setToastMessage(`Status pesanan ${updated.order_number} diubah menjadi: ${newStatus}`);
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    const isDelivery = selectedOrder?.order_status === 'DIKIRIM';
    const confirmMsg = isDelivery
      ? 'Pesanan saat ini sedang dalam status SEDANG DIKIRIM.\n\nApakah kurir melaporkan bahwa pelanggan menolak/membatalkan pesanan di tempat?\n\nKlik OK untuk membatalkan pesanan ini dan mengembalikan stok barang ke rak toko Alvin Swalayan.'
      : 'Apakah Anda yakin ingin membatalkan pesanan ini? Stok barang akan otomatis dikembalikan ke rak toko.';

    if (confirm(confirmMsg)) {
      const cancelReason = isDelivery
        ? 'Dibatalkan admin (Pelanggan menolak/batal di tempat saat pengantaran kurir)'
        : 'Dibatalkan oleh admin toko';
      const res = orderService.cancelOrder(orderId, cancelReason, true);
      if (res.success && res.order) {
        loadOrders();
        setSelectedOrder({ ...res.order });
        setToastMessage('Pesanan dibatalkan dan stok produk telah dikembalikan ke rak toko.');
        setTimeout(() => setToastMessage(''), 3000);
      } else {
        alert(res.message);
      }
    }
  };

  const handleVerifyManualPayment = (orderId: string, approved: boolean) => {
    if (!selectedOrder) return;
    if (selectedOrder.order_status === 'DIBATALKAN') {
      alert('Pesanan ini sudah dibatalkan sehingga tidak dapat diverifikasi lagi.');
      return;
    }

    if (!approved) {
      // Buka modal penolakan untuk memilih alasan & langsung siapkan pesan WhatsApp
      setRejectModalOrder(selectedOrder);
      setRejectReason('Foto struk buram atau tidak terbaca jelas');
      setCustomRejectReason('');
      return;
    }

    const updated = orderService.verifyManualPayment(orderId, true, selectedOrder.order_number);
    if (updated) {
      loadOrders();
      setSelectedOrder({ ...updated });
      setToastMessage('Bukti transfer disetujui! Status pesanan otomatis menjadi DIBAYAR.');
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  const handleConfirmRejectPayment = () => {
    if (!rejectModalOrder) return;
    const finalReason = rejectReason === 'Lainnya (Tulis alasan sendiri)'
      ? (customRejectReason.trim() || 'Foto struk tidak jelas / mutasi bank belum masuk')
      : rejectReason;

    const updated = orderService.verifyManualPayment(
      rejectModalOrder.id,
      false,
      rejectModalOrder.order_number,
      finalReason
    );

    if (updated) {
      loadOrders();
      setSelectedOrder({ ...updated });
      setToastMessage('Bukti transfer ditolak. Pesan WhatsApp pengingat telah disiapkan.');
      setTimeout(() => setToastMessage(''), 3500);

      // Buka WhatsApp Web ke nomor pelanggan dengan pesan template siap kirim
      const phone = rejectModalOrder.customer_phone ? rejectModalOrder.customer_phone.replace(/^0/, '62').replace(/[^\d]/g, '') : '';
      if (phone) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://alvin-swalayan.vercel.app';
        const trackingUrl = `${origin}/orders/${rejectModalOrder.order_number || rejectModalOrder.id}`;
        const textMsg = encodeURIComponent(
          `*Pemberitahuan Bukti Transfer - Alvin Swalayan* ⚠️\n\nHalo Kak *${rejectModalOrder.customer_name}*,\nTerima kasih telah berbelanja di Alvin Swalayan Banda Aceh.\n\nMengenai pesanan Anda:\nNo. Pesanan: *${rejectModalOrder.order_number}*\nTotal Tagihan: *${formatRupiah(rejectModalOrder.total_amount)}*\n\nMohon maaf, bukti transfer yang Anda unggah *belum dapat diverifikasi oleh kasir* kami karena:\n👉 *${finalReason}*\n\nSilakan periksa kembali mutasi rekening Anda dan unggah ulang bukti transfer yang jelas melalui link berikut:\n🔗 *Unggah Ulang Bukti Transfer:*\n${trackingUrl}\n\nAtau Anda dapat langsung mengirimkan foto struk transfer terbaru via balasan chat WhatsApp ini.\n\nTerima kasih.\n_Alvin Swalayan - Hemat & Berkualitas_`
        );
        window.open(`https://wa.me/${phone}?text=${textMsg}`, '_blank');
      }
    }
    setRejectModalOrder(null);
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_phone.includes(searchTerm);

    const matchesStatus = filterStatus === 'ALL' || o.order_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#222222]">
            Kelola &amp; Proses Pesanan Pelanggan
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Verifikasi transfer, siapkan barang di toko, dan kirim ke alamat pemesan di Banda Aceh
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          title="Download rekapan pesanan dalam format file CSV"
        >
          <Download size={14} />
          <span>Export CSV Pesanan</span>
        </button>
      </div>

      {toastMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-bold p-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border-2 border-gray-200/90 p-4 flex flex-col sm:flex-row items-center gap-3 text-xs shadow-xs">
        <div className="relative flex-1 w-full">
          <label htmlFor="admin-order-search" className="sr-only">
            Cari Pesanan
          </label>
          <div className="relative flex items-center">
            <Search size={17} className="absolute left-3.5 text-gray-500 pointer-events-none transition-colors" />
            <input
              id="admin-order-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik untuk mencari pesanan (No. ALV-..., nama pelanggan, atau HP)..."
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50/90 hover:bg-white focus:bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-[#E5391B] focus:ring-4 focus:ring-red-500/10 rounded-xl text-xs text-gray-800 placeholder-gray-400 transition-all font-medium focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                title="Hapus kata kunci pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <label htmlFor="admin-order-status" className="text-gray-700 font-bold shrink-0 text-xs">
            Status:
          </label>
          <select
            id="admin-order-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border-2 border-gray-300 hover:border-gray-400 focus:border-[#E5391B] focus:ring-4 focus:ring-red-500/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none bg-gray-50/90 hover:bg-white focus:bg-white text-gray-800 w-full sm:w-auto transition-all cursor-pointer"
          >
            <option value="ALL">Semua Status ({orders.length})</option>
            <option value="MENUNGGU_PEMBAYARAN">Menunggu Pembayaran</option>
            <option value="DIBAYAR">Dibayar / Terverifikasi</option>
            <option value="DIPROSES">Sedang Diproses Toko</option>
            <option value="DIKIRIM">Sedang Dikirim Kurir</option>
            <option value="SELESAI">Selesai</option>
            <option value="DIBATALKAN">Dibatalkan</option>
          </select>

          {(searchTerm || filterStatus !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('ALL');
              }}
              className="px-3 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-600 hover:text-gray-900 font-bold text-xs transition-colors shrink-0 whitespace-nowrap"
              title="Reset filter pesanan"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Orders Grid & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Orders Table (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                <tr>
                  <th className="py-3 px-3">No. Pesanan</th>
                  <th className="py-3 px-3">Pelanggan</th>
                  <th className="py-3 px-3">Metode Bayar</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Tidak ada pesanan yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const meta = getOrderStatusMeta(ord.order_status);
                    const isSelected =
                      Boolean(selectedOrder) &&
                      (selectedOrder?.id === ord.id || selectedOrder?.order_number === ord.order_number);

                    return (
                      <tr
                        key={ord.id}
                        onClick={() => selectOrder(ord)}
                        className={`cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-[#FFF3F0] border-l-4 border-l-[#E5391B] shadow-2xs'
                            : 'hover:bg-gray-50/80 border-l-4 border-l-transparent'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E5391B] animate-pulse shrink-0" />
                            )}
                            <span className={`font-mono font-bold ${isSelected ? 'text-[#E5391B]' : 'text-gray-900'}`}>
                              {ord.order_number}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <p className={`font-semibold ${isSelected ? 'text-gray-950 font-bold' : 'text-gray-800'}`}>
                            {ord.customer_name}
                          </p>
                          <p className="text-[10px] text-gray-400">{ord.customer_phone}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-gray-700">{ord.payment_method}</span>
                          {ord.payment_proof_url && (
                            <span
                              className={`block text-[10px] font-bold ${
                                ord.payment_status === 'FAILED'
                                  ? 'text-red-600'
                                  : ord.payment_status === 'PAID'
                                  ? 'text-green-600'
                                  : 'text-blue-600'
                              }`}
                            >
                              {ord.payment_status === 'FAILED'
                                ? '❌ Bukti Ditolak'
                                : ord.payment_status === 'PAID'
                                ? '✓ Bukti Lunas'
                                : '📎 Ada Bukti Bayar'}
                            </span>
                          )}
                        </td>
                        <td className={`py-3 px-3 font-bold ${isSelected ? 'text-[#C62818] font-black' : 'text-[#E5391B]'}`}>
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectOrder(ord);
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shadow-2xs ${
                              isSelected
                                ? 'bg-[#E5391B] text-white shadow-xs font-black'
                                : 'bg-gray-100 hover:bg-[#E5391B] hover:text-white text-gray-700'
                            }`}
                          >
                            {isSelected ? 'Dibuka ✓' : 'Buka'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Order Detail Panel (1 Column) */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-5">
          {selectedOrder ? (
            <>
              <div className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-extrabold text-base text-[#222222]">
                    {selectedOrder.order_number}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                      getOrderStatusMeta(selectedOrder.order_status).color
                    }`}
                  >
                    {getOrderStatusMeta(selectedOrder.order_status).label}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Dibuat: {formatDateIndo(selectedOrder.created_at)}
                </p>
              </div>

              {/* Status Updater Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">
                    Ubah Alur Status Pesanan:
                  </label>
                  {selectedOrder.payment_method === 'COD' && (
                    <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">
                      COD (Bayar Tunai saat Terima)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {selectedOrder.payment_method !== 'COD' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'DIBAYAR')}
                      className={`p-1.5 rounded font-bold border text-left ${
                        selectedOrder.order_status === 'DIBAYAR'
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border-blue-200'
                      }`}
                    >
                      1. Set Dibayar
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'DIPROSES')}
                    className={`p-1.5 rounded font-bold border text-left ${
                      selectedOrder.order_status === 'DIPROSES'
                        ? 'bg-indigo-600 text-white border-indigo-700'
                        : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-200'
                    }`}
                  >
                    {selectedOrder.payment_method === 'COD' ? '1. Sedang Diproses' : '2. Sedang Diproses'}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'DIKIRIM')}
                    className={`p-1.5 rounded font-bold border text-left ${
                      selectedOrder.order_status === 'DIKIRIM'
                        ? 'bg-purple-600 text-white border-purple-700'
                        : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border-purple-200'
                    }`}
                  >
                    {selectedOrder.payment_method === 'COD' ? '2. Sedang Dikirim' : '3. Sedang Dikirim'}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'SELESAI')}
                    className={`p-1.5 rounded font-bold border text-left ${
                      selectedOrder.order_status === 'SELESAI'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                    }`}
                  >
                    {selectedOrder.payment_method === 'COD' ? '3. Selesai (Lunas COD)' : '4. Selesai (Diterima)'}
                  </button>
                </div>

                {/* SOP Konfirmasi COD Sebelum Dikirim */}
                {selectedOrder.payment_method === 'COD' && (selectedOrder.order_status === 'DIPROSES' || selectedOrder.order_status === 'MENUNGGU_PEMBAYARAN') && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1.5 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 flex items-center gap-1">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        SOP Anti-COD Fiktif / Ditolak:
                      </span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                        Wajib Konfirmasi
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-snug">
                      Sebelum klik <strong>Sedang Dikirim</strong>, kirim pesan WA ke pelanggan untuk memastikan ada orang di rumah dan uang pas sudah siap.
                    </p>
                    <a
                      href={`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Halo Kak ${selectedOrder.customer_name}, kami dari Alvin Swalayan Banda Aceh.\n\nPesanan COD nomor *${selectedOrder.order_number}* telah selesai kami siapkan.\nTotal Bayar Tunai: *${formatRupiah(selectedOrder.total_amount)}*.\nAlamat Pengantaran: ${selectedOrder.delivery_address}\n\nKurir kami siap meluncur ke lokasi Kakak. Mohon pastikan ada penerima dan siapkan uang pas ya Kak. Mohon balas pesan ini jika sudah siap terima belanjaan. Terima kasih!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded bg-[#16A34A] hover:bg-green-700 text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      <MessageCircle size={14} />
                      <span>Kirim WA Konfirmasi Siap Kirim (SOP)</span>
                    </a>
                  </div>
                )}

                {/* Info when out for delivery */}
                {selectedOrder.order_status === 'DIKIRIM' && (
                  <div className="p-2 rounded bg-purple-50 border border-purple-200 text-[11px] text-purple-900 mt-2">
                    🛵 <strong>Sedang Diantar Kurir.</strong> Jika kurir melaporkan pelanggan menolak/batal di tempat, tekan tombol <strong>Batalkan Pesanan</strong> di bawah untuk mengembalikan stok ke rak toko.
                  </div>
                )}

                {/* Cancel Order Action */}
                {selectedOrder.order_status !== 'DIBATALKAN' && selectedOrder.order_status !== 'SELESAI' && (
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="w-full mt-2 py-2 px-3 rounded bg-red-50 text-red-700 font-bold hover:bg-red-100 border border-red-200 text-center text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle size={14} />
                    <span>Batalkan Pesanan (Kembalikan Stok)</span>
                  </button>
                )}

                {selectedOrder.order_status === 'DIBATALKAN' && (
                  <div className="bg-red-50 border border-red-200 p-2.5 rounded text-xs text-red-800 font-semibold flex items-center gap-2">
                    <AlertOctagon size={16} className="text-red-600 shrink-0" />
                    <span>Pesanan telah dibatalkan &amp; stok dikembalikan.</span>
                  </div>
                )}
              </div>

              {/* Manual Transfer Verification Box */}
              {selectedOrder.payment_method === 'TRANSFER_BANK' && (
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-800">
                      {selectedOrder.order_status === 'DIBATALKAN'
                        ? 'Bukti Transfer (Arsip Pesanan Batal):'
                        : selectedOrder.payment_status === 'PAID' || ['DIBAYAR', 'DIPROSES', 'DIKIRIM', 'SELESAI'].includes(selectedOrder.order_status)
                        ? 'Bukti Transfer (Terverifikasi Lunas):'
                        : selectedOrder.payment_status === 'FAILED'
                        ? 'Bukti Transfer (Ditolak Kasir):'
                        : 'Verifikasi Bukti Transfer Manual:'}
                    </p>
                    {selectedOrder.order_status === 'DIBATALKAN' ? (
                      <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                        Pesanan Dibatalkan
                      </span>
                    ) : selectedOrder.payment_status === 'PAID' || ['DIBAYAR', 'DIPROSES', 'DIKIRIM', 'SELESAI'].includes(selectedOrder.order_status) ? (
                      <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={11} /> Lunas
                      </span>
                    ) : selectedOrder.payment_status === 'FAILED' ? (
                      <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle size={11} /> Bukti Ditolak
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        Menunggu Verifikasi
                      </span>
                    )}
                  </div>

                  {selectedOrder.payment_proof_url ? (
                    <div className="space-y-2">
                      <div className="relative group border border-gray-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                        {selectedOrder.payment_status === 'FAILED' && (
                          <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm tracking-wide">
                            BUKTI DITOLAK
                          </div>
                        )}
                        <img
                          src={selectedOrder.payment_proof_url}
                          alt={`Bukti Transfer ${selectedOrder.order_number}`}
                          className="w-full h-36 object-contain bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewProofUrl(selectedOrder.payment_proof_url!)}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewProofUrl(selectedOrder.payment_proof_url!)}
                          className="w-full text-center py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold border-t border-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Lihat / Perbesar Foto Bukti</span>
                        </button>
                      </div>

                      {/* Kondisi 1: Pesanan telah DIBATALKAN -> Tombol Setujui/Tolak disembunyikan, tampilkan keterangan arsip */}
                      {selectedOrder.order_status === 'DIBATALKAN' ? (
                        <div className="p-2.5 rounded-lg bg-gray-100/90 border border-gray-200 text-gray-600 text-[11px] flex items-center gap-2">
                          <AlertCircle size={15} className="text-gray-500 shrink-0" />
                          <span>
                            Pesanan telah dibatalkan. Verifikasi atau penolakan bukti pembayaran tidak diperlukan lagi.
                          </span>
                        </div>
                      ) : selectedOrder.payment_status === 'PAID' || ['DIBAYAR', 'DIPROSES', 'DIKIRIM', 'SELESAI'].includes(selectedOrder.order_status) ? (
                        /* Kondisi 2: Pesanan sudah LUNAS -> Tampilkan badge disetujui */
                        <div className="p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-[11px] font-semibold flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                          <span>Pembayaran telah diverifikasi kasir dan pesanan berstatus Lunas.</span>
                        </div>
                      ) : selectedOrder.payment_status === 'FAILED' ? (
                        /* Kondisi 3: Bukti Ditolak -> Sembunyikan tombol verifikasi, tampilkan keterangan & tombol WA */
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px] flex items-center gap-2">
                            <AlertCircle size={15} className="text-red-600 shrink-0" />
                            <span>
                              Bukti transfer ditolak kasir. Menunggu pelanggan mengunggah ulang bukti transfer baru.
                            </span>
                          </div>
                          {selectedOrder.customer_phone && (
                            <a
                              href={`https://wa.me/${selectedOrder.customer_phone.replace(/^0/, '62').replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                                `*Pemberitahuan Bukti Transfer - Alvin Swalayan* ⚠️\n\nHalo Kak *${selectedOrder.customer_name}*,\nMohon maaf bukti transfer pesanan *${selectedOrder.order_number}* belum dapat diverifikasi oleh kasir. Silakan unggah bukti transfer baru melalui link: https://alvin-swalayan.vercel.app/orders/${selectedOrder.order_number || selectedOrder.id} atau kirimkan via chat WhatsApp ini. Terima kasih!`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2 px-3 rounded-lg font-bold transition-colors text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <MessageCircle size={14} />
                              <span>Kirim Pengingat WhatsApp ke Pelanggan</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        /* Kondisi 4: Pesanan aktif menunggu verifikasi -> Tampilkan tombol Setujui dan Tolak */
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleVerifyManualPayment(selectedOrder.id, true)}
                            className="flex-1 bg-[#16A34A] hover:bg-green-700 text-white py-2 rounded-lg font-bold transition-colors shadow-2xs text-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check size={14} strokeWidth={3} />
                            <span>Setujui Pembayaran</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyManualPayment(selectedOrder.id, false)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold transition-colors shadow-2xs text-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <X size={14} strokeWidth={3} />
                            <span>Tolak</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-[11px]">
                      {selectedOrder.order_status === 'DIBATALKAN'
                        ? 'Tidak ada bukti transfer yang diunggah sebelum pesanan dibatalkan.'
                        : 'Pelanggan belum mengunggah foto bukti transfer bank.'}
                    </p>
                  )}
                </div>
              )}

              {/* Customer & Address Details */}
              <div className="space-y-2 text-xs border-t pt-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-800">Tujuan Pengantaran:</p>
                  <a
                    href={`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo Kak ${selectedOrder.customer_name}, kami dari Alvin Swalayan Peunyeurat Banda Aceh terkait pesanan ${selectedOrder.order_number}...`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A] hover:underline"
                  >
                    <MessageCircle size={13} />
                    <span>Chat WA</span>
                  </a>
                </div>
                <div className="bg-[#FFF7F5] p-2.5 rounded border border-[#E5E7EB] space-y-1">
                  <p className="font-bold text-[#222222]">
                    {selectedOrder.customer_name} ({selectedOrder.customer_phone})
                  </p>
                  <p className="text-gray-700 leading-snug">
                    {selectedOrder.delivery_address}
                  </p>
                  {selectedOrder.delivery_note && (
                    <p className="text-[11px] text-[#E5391B] font-medium pt-1">
                      Catatan: &ldquo;{selectedOrder.delivery_note}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2 border-t pt-3 text-xs">
                <p className="font-bold text-gray-800">Barang Belanjaan:</p>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {selectedOrder.items.map((i) => (
                    <div key={i.id} className="py-2 flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="truncate block font-medium">
                          {i.quantity}x {i.product_name}
                        </span>
                        {i.note && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-amber-900 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded">
                            📝 Catatan: {i.note}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold shrink-0">{formatRupiah(i.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-sm">
                  <span>Total Tagihan:</span>
                  <span className="text-[#E5391B]">
                    {formatRupiah(selectedOrder.total_amount)}
                  </span>
                </div>

                <div className="pt-3 border-t space-y-2">
                  <button
                    type="button"
                    onClick={() => setReceiptModalOrder(selectedOrder)}
                    className="w-full bg-[#222222] hover:bg-black text-white py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>Cetak Struk Thermal (POS 78/80mm)</span>
                  </button>
                  <Link
                    href={`/orders/${selectedOrder.id}`}
                    className="w-full py-1.5 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink size={12} />
                    <span>Lihat Halaman Pelacakan Pelanggan</span>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-gray-400">
              Pilih salah satu pesanan di tabel sebelah kiri untuk melihat rincian dan memproses statusnya.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          THERMAL RECEIPT PREVIEW & PRINT MODAL (Admin Cashier POS)
      ======================================================== */}
      {receiptModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-[#FFC107]" />
                <span className="text-xs font-bold">Pratinjau Struk Kasir Thermal (POS)</span>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOrder(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Receipt Scrollable Container */}
            <div className="p-4 overflow-y-auto bg-gray-100 flex justify-center">
              {/* Actual Thermal Paper Slip */}
              <div
                id="thermal-receipt"
                className="bg-white p-4 font-mono text-black text-[11px] leading-snug w-[78mm] max-w-[78mm] shadow-md border border-gray-300 rounded-sm"
              >
                {/* Store Header */}
                <div className="text-center pb-2 border-b border-dashed border-gray-600">
                  <h2 className="text-sm font-black tracking-wider uppercase">ALVIN SWALAYAN</h2>
                  <p className="text-[10px] font-bold">HEMAT &amp; BERKUALITAS</p>
                  <p className="text-[9px] text-gray-700">Jl. AMD No.1 Peunyeurat, Kec. Banda Raya</p>
                  <p className="text-[9px] text-gray-700">Kota Banda Aceh, Aceh 23117</p>
                  <p className="text-[9px] text-gray-700">WhatsApp / Kasir: 0812-6900-8899</p>
                </div>

                {/* Metadata */}
                <div className="py-2 border-b border-dashed border-gray-600 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600">No. Nota:</span>
                    <span className="font-bold">{receiptModalOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tgl/Waktu:</span>
                    <span>{new Date(receiptModalOrder.created_at).toLocaleString('id-ID')} WIB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kasir:</span>
                    <span>Admin Alvin POS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pelanggan:</span>
                    <span className="font-bold">{receiptModalOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">No. HP:</span>
                    <span>{receiptModalOrder.customer_phone}</span>
                  </div>
                  <div className="flex justify-between items-start pt-0.5">
                    <span className="text-gray-600 shrink-0">Alamat:</span>
                    <span className="text-right pl-2 leading-tight">{receiptModalOrder.delivery_address}</span>
                  </div>
                  {receiptModalOrder.delivery_note && (
                    <div className="flex justify-between items-start italic text-gray-600">
                      <span className="shrink-0">Catatan:</span>
                      <span className="text-right pl-2 leading-tight">&ldquo;{receiptModalOrder.delivery_note}&rdquo;</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="py-2 border-b border-dashed border-gray-600 text-[10px] space-y-1.5">
                  {receiptModalOrder.items.map((it) => (
                    <div key={it.id}>
                      <div className="flex justify-between font-bold">
                        <span className="truncate pr-1">{it.product_name}</span>
                        <span className="shrink-0">{formatRupiah(it.subtotal)}</span>
                      </div>
                      <div className="text-[9px] text-gray-600 pl-1">
                        {it.quantity} {it.unit || 'unit'} x {formatRupiah(it.price)}
                      </div>
                      {it.note && (
                        <div className="text-[9px] text-black font-bold pl-1 italic">
                          * Req: &ldquo;{it.note}&rdquo;
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="py-2 border-b border-dashed border-gray-600 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Subtotal ({receiptModalOrder.items.reduce((acc, i) => acc + i.quantity, 0)} item):</span>
                    <span>{formatRupiah(receiptModalOrder.subtotal)}</span>
                  </div>
                  {receiptModalOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-gray-900 font-medium">
                      <span>Diskon ({receiptModalOrder.voucher_code || 'PROMO'}):</span>
                      <span>-{formatRupiah(receiptModalOrder.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Ongkir Pengantaran:</span>
                    <span>{receiptModalOrder.delivery_fee === 0 ? 'GRATIS' : formatRupiah(receiptModalOrder.delivery_fee ?? 0)}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-dashed border-gray-700 mt-1">
                    <span>TOTAL TAGIHAN:</span>
                    <span>{formatRupiah(receiptModalOrder.total_amount)}</span>
                  </div>
                </div>

                {/* Payment & Footer */}
                <div className="py-2 text-[10px] space-y-0.5 text-center">
                  <p>
                    Metode: <b>{receiptModalOrder.payment_method === 'COD' ? 'Bayar di Tempat (COD Tunai)' : receiptModalOrder.payment_method}</b>
                  </p>
                  <p>
                    Status: <b>{receiptModalOrder.order_status} ({receiptModalOrder.payment_status})</b>
                  </p>
                  <div className="pt-2 text-[9px] text-gray-600 space-y-0.5 border-t border-dashed border-gray-400 mt-1">
                    <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan kecuali ada perjanjian.</p>
                    <p className="font-bold pt-1">*** TERIMA KASIH TELAH BERBELANJA ***</p>
                    <p className="font-black text-gray-800">ALVIN SWALAYAN BANDA ACEH</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-3 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleCopyWhatsAppReceipt(receiptModalOrder)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 font-bold border border-green-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedText ? <Check size={14} className="text-green-700" /> : <Copy size={14} />}
                <span>{copiedText ? 'Nota Tersalin!' : 'Salin Teks WhatsApp'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setReceiptModalOrder(null)}
                  className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold cursor-pointer transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[#E5391B] hover:bg-[#C62818] text-white font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Cetak Struk Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PAYMENT PROOF LIGHTBOX MODAL (High Resolution Zoom)
      ======================================================== */}
      {previewProofUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewProofUrl(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-[#FFC107]" />
                <span className="text-xs font-bold">
                  Foto Bukti Transfer — {selectedOrder?.order_number || 'Pesanan'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProofUrl(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
                title="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Image View */}
            <div className="p-4 overflow-auto flex items-center justify-center bg-gray-950/90 max-h-[75vh]">
              <img
                src={previewProofUrl}
                alt="Foto Bukti Transfer Penuh"
                className="max-w-full max-h-[70vh] object-contain rounded shadow-lg"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80';
                }}
              />
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
              <span className="text-gray-600 text-[11px] font-medium">
                {selectedOrder?.customer_name} • Total: <b className="text-gray-900">{formatRupiah(selectedOrder?.total_amount || 0)}</b>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold flex items-center gap-1 transition-colors text-[11px]"
                >
                  <ExternalLink size={12} />
                  <span>Buka Tab Baru ↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewProofUrl(null)}
                  className="px-4 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white font-bold transition-colors cursor-pointer text-[11px]"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          REJECT PAYMENT PROOF MODAL (With Reason & WhatsApp Action)
      ======================================================== */}
      {rejectModalOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setRejectModalOrder(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[90vh] my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <XCircle size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Tolak Bukti Transfer</h3>
                  <p className="text-[11px] text-white/90 font-mono">
                    {rejectModalOrder.order_number} • {rejectModalOrder.customer_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body (Scrollable) */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-900 leading-relaxed text-[11px]">
                Status pembayaran pesanan ini akan diubah menjadi <b>GAGAL</b>. Pelanggan akan diminta mengunggah ulang bukti transfer baru, dan template pesan WhatsApp otomatis disiapkan untuk dikirim ke nomor pelanggan.
              </div>

              <div>
                <label className="font-bold text-gray-800 block mb-2 text-xs">
                  Pilih Alasan Penolakan:
                </label>
                <div className="space-y-2">
                  {[
                    'Foto struk buram atau tidak terbaca jelas',
                    'Nominal transfer tidak sesuai dengan total tagihan',
                    'Dana belum masuk ke mutasi rekening bank toko',
                    'Salah nomor rekening tujuan transfer',
                    'Lainnya (Tulis alasan sendiri)',
                  ].map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                        rejectReason === reason
                          ? 'bg-red-50/80 border-red-300 font-bold text-red-950 shadow-2xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rejectReason"
                        checked={rejectReason === reason}
                        onChange={() => setRejectReason(reason)}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                {rejectReason === 'Lainnya (Tulis alasan sendiri)' && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      placeholder="Tuliskan alasan penolakan secara spesifik..."
                      value={customRejectReason}
                      onChange={(e) => setCustomRejectReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                )}
              </div>

              {/* WhatsApp Notification Preview */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-[11px] space-y-1">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                  <MessageCircle size={14} className="text-[#25D366]" />
                  <span>Notifikasi WhatsApp ke {rejectModalOrder.customer_phone}:</span>
                </span>
                <p className="text-gray-600 italic leading-relaxed text-[10px]">
                  &ldquo;Halo Kak {rejectModalOrder.customer_name}, mohon maaf bukti transfer pesanan {rejectModalOrder.order_number} belum dapat diverifikasi kasir karena {rejectReason === 'Lainnya (Tulis alasan sendiri)' ? customRejectReason || '...' : rejectReason}. Silakan unggah bukti baru melalui link:...&rdquo;
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 font-bold text-gray-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectPayment}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <XCircle size={15} />
                <span>Konfirmasi Tolak &amp; Buka WA</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-gray-500">
          Memuat pesanan...
        </div>
      }
    >
      <AdminOrdersContent />
    </Suspense>
  );
}

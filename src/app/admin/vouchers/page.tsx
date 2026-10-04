'use client';

import React, { useState, useEffect } from 'react';
import { Voucher } from '@/types';
import { voucherService } from '@/services/voucherService';
import { formatRupiah } from '@/lib/utils';
import { Plus, Check, X, AlertCircle } from 'lucide-react';

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'NOMINAL'>('NOMINAL');
  const [discountValue, setDiscountValue] = useState<number>(10000);
  const [maxDiscount, setMaxDiscount] = useState<number | undefined>(undefined);
  const [minPurchase, setMinPurchase] = useState<number>(50000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('2026-12-31');
  const [maxUsage, setMaxUsage] = useState<number>(500);

  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const loadVouchers = () => {
    setVouchers(voucherService.getAll());
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!code.trim()) {
      setErrorMessage('Kode voucher wajib diisi.');
      return;
    }

    const res = voucherService.create({
      code: code.trim(),
      discount_type: discountType,
      discount_value: discountValue,
      max_discount: discountType === 'PERCENTAGE' ? maxDiscount : undefined,
      min_purchase: minPurchase,
      start_date: startDate,
      end_date: endDate,
      max_usage: maxUsage,
      is_active: true,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Gagal membuat voucher.');
      return;
    }

    setSuccessToast(`Voucher "${code.toUpperCase()}" berhasil dibuat!`);
    setIsModalOpen(false);
    loadVouchers();
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleToggle = (id: string) => {
    voucherService.toggleActive(id);
    loadVouchers();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#222222]">
            Manajemen Voucher &amp; Promo Belanja
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Buat kode kupon diskon nominal atau persen untuk pelanggan Alvin Swalayan
          </p>
        </div>

        <button
          onClick={() => {
            setCode('');
            setErrorMessage('');
            setIsModalOpen(true);
          }}
          className="bg-[#E5391B] hover:bg-[#C62818] text-white px-4 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus size={15} />
          <span>Buat Voucher Baru</span>
        </button>
      </div>

      {successToast && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-bold p-3 rounded-lg flex items-center gap-2">
          <Check size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Vouchers Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
              <tr>
                <th className="py-3 px-4">Kode Voucher</th>
                <th className="py-3 px-3">Tipe &amp; Nilai Diskon</th>
                <th className="py-3 px-3">Min. Belanja</th>
                <th className="py-3 px-3">Masa Berlaku</th>
                <th className="py-3 px-3">Penggunaan</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="font-mono font-black text-sm text-[#E5391B] bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                      {v.code}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-gray-800">
                    {v.discount_type === 'PERCENTAGE'
                      ? `${v.discount_value}% (Maks: ${v.max_discount ? formatRupiah(v.max_discount) : 'Tanpa batas'})`
                      : formatRupiah(v.discount_value)}
                  </td>
                  <td className="py-3 px-3 text-gray-700">
                    {formatRupiah(v.min_purchase)}
                  </td>
                  <td className="py-3 px-3 text-gray-600">
                    {v.start_date} s/d {v.end_date}
                  </td>
                  <td className="py-3 px-3 text-gray-700">
                    {v.used_count} / {v.max_usage} kali
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {v.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggle(v.id)}
                      className="text-xs font-bold text-[#E5391B] hover:underline"
                    >
                      {v.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create Voucher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h2 className="text-base font-extrabold text-[#222222]">
                  Buat Kode Voucher Baru
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Tambahkan promo diskon belanja untuk pelanggan toko
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                aria-label="Tutup popup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateVoucher} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3.5 text-xs">
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg text-xs text-red-700 font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Kode Voucher <span className="text-[#E5391B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: MERDEKAALVIN"
                    className="w-full font-mono uppercase px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#E5391B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tipe Diskon</label>
                    <select
                      value={discountType}
                      onChange={(e) =>
                        setDiscountType(e.target.value as 'PERCENTAGE' | 'NOMINAL')
                      }
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                    >
                      <option value="NOMINAL">Nominal Rupiah (Rp)</option>
                      <option value="PERCENTAGE">Persentase (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Nilai Diskon <span className="text-[#E5391B]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg"
                    />
                  </div>
                </div>

                {discountType === 'PERCENTAGE' && (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Maksimal Diskon (Rp)</label>
                    <input
                      type="number"
                      value={maxDiscount || ''}
                      onChange={(e) => setMaxDiscount(parseFloat(e.target.value) || undefined)}
                      placeholder="Contoh: 20000"
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Minimal Belanja (Rp) <span className="text-[#E5391B]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tanggal Mulai</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tanggal Berakhir</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Maksimal Kuota Pemakaian</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={maxUsage}
                    onChange={(e) => setMaxUsage(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg"
                  />
                </div>
              </div>

              {/* Sticky Actions Footer */}
              <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-white transition-colors text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E5391B] hover:bg-[#C62818] active:bg-[#B71C1C] text-white rounded-lg font-black transition-colors text-xs cursor-pointer shadow-xs"
                >
                  Simpan Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

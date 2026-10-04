'use client';

import React, { useState, useEffect } from 'react';
import { Voucher } from '@/types';
import { voucherService, VoucherApplicability } from '@/services/voucherService';
import { formatRupiah } from '@/lib/utils';
import { Tag, Ticket, X, Check, AlertCircle, Sparkles, ChevronRight, ShieldCheck } from 'lucide-react';

interface VoucherSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  appliedVoucher: Voucher | null;
  onApplyVoucher: (code: string) => { success: boolean; message: string };
  onRemoveVoucher: () => void;
}

export function VoucherSelectorModal({
  isOpen,
  onClose,
  subtotal,
  appliedVoucher,
  onApplyVoucher,
  onRemoveVoucher,
}: VoucherSelectorModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [manualFeedback, setManualFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [applicabilityList, setApplicabilityList] = useState<VoucherApplicability[]>([]);

  // Reload applicability whenever modal opens or subtotal changes
  useEffect(() => {
    if (isOpen) {
      setApplicabilityList(voucherService.getApplicableForSubtotal(subtotal));
      setManualFeedback(null);
      setManualCode('');
    }
  }, [isOpen, subtotal]);

  if (!isOpen) return null;

  const eligibleVouchers = applicabilityList.filter((item) => item.isEligible);
  const ineligibleVouchers = applicabilityList.filter((item) => !item.isEligible);

  const handleApplyManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const res = onApplyVoucher(manualCode.trim());
    setManualFeedback(res);
    if (res.success) {
      setApplicabilityList(voucherService.getApplicableForSubtotal(subtotal));
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  const handleSelectVoucher = (code: string) => {
    const res = onApplyVoucher(code);
    if (res.success) {
      setApplicabilityList(voucherService.getApplicableForSubtotal(subtotal));
      onClose();
    } else {
      setManualFeedback(res);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#FFF5F2] to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E5391B]/10 text-[#E5391B] flex items-center justify-center font-bold">
              <Ticket size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#222222]">
                Pilih Voucher Promo
              </h2>
              <p className="text-[11px] text-[#6B7280]">
                Gunakan kupon potongan belanja terbaik Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Tutup modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Banner: 1 Transaksi = 1 Voucher */}
        <div className="bg-amber-50/80 border-b border-amber-100 px-4 py-2 flex items-center gap-2 text-[11px] text-amber-800 font-medium">
          <ShieldCheck size={14} className="text-amber-600 shrink-0" />
          <span>Aturan: Maksimal <b>1 voucher promo</b> per setiap transaksi pesanan.</span>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Manual Input Box */}
          <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-200/70">
            <label className="block text-[11px] font-bold text-[#222222] mb-1.5">
              Punya Kode Promo Khusus?
            </label>
            <form onSubmit={handleApplyManual} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value.toUpperCase());
                  if (manualFeedback) setManualFeedback(null);
                }}
                placeholder="Contoh: PROMOBANDARAYA"
                className="flex-1 uppercase bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#222222] focus:border-[#E5391B] focus:ring-1 focus:ring-[#E5391B] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-[#E5391B] hover:bg-[#C62818] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs"
              >
                Terapkan
              </button>
            </form>
            {manualFeedback && (
              <div
                className={`mt-2 text-[11px] flex items-center gap-1.5 font-semibold ${
                  manualFeedback.success ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {manualFeedback.success ? (
                  <Check size={13} className="shrink-0" />
                ) : (
                  <AlertCircle size={13} className="shrink-0" />
                )}
                <span>{manualFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Section 1: Eligible Vouchers */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#222222]">
                <Sparkles size={14} className="text-[#FF6D00]" />
                <span>Voucher Tersedia untuk Dipakai</span>
              </div>
              <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full">
                {eligibleVouchers.length} Siap Pakai
              </span>
            </div>

            {eligibleVouchers.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-500 bg-gray-50/50">
                Belum ada voucher yang memenuhi total belanjaan saat ini ({formatRupiah(subtotal)}).
              </div>
            ) : (
              <div className="space-y-2.5">
                {eligibleVouchers.map(({ voucher, discountAmount }) => {
                  const isCurrentApplied =
                    appliedVoucher && appliedVoucher.code.toUpperCase() === voucher.code.toUpperCase();

                  return (
                    <div
                      key={voucher.id}
                      className={`relative rounded-xl border p-3.5 transition-all ${
                        isCurrentApplied
                          ? 'border-green-500 bg-green-50/40 shadow-sm ring-1 ring-green-500'
                          : 'border-gray-200 hover:border-[#E5391B] bg-white hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs text-[#E5391B] bg-[#FFF2F0] px-2 py-0.5 rounded-md border border-[#E5391B]/20">
                              {voucher.code}
                            </span>
                            <span className="text-xs font-black text-[#222222]">
                              {voucher.discount_type === 'PERCENTAGE'
                                ? `Diskon ${voucher.discount_value}% (Maks. ${formatRupiah(
                                    voucher.max_discount || 0
                                  )})`
                                : `Potongan ${formatRupiah(voucher.discount_value)}`}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-600">
                            {voucher.name || 'Promo Belanja Spesial Alvin Swalayan'}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 pt-0.5">
                            <span>Min. Belanja: <b>{formatRupiah(voucher.min_purchase)}</b></span>
                            {voucher.end_date && <span>• Berlaku s/d {voucher.end_date}</span>}
                          </div>

                          <div className="text-[11px] font-extrabold text-green-700 pt-0.5 flex items-center gap-1">
                            <Check size={13} />
                            <span>Hemat {formatRupiah(discountAmount)} untuk belanjaan ini</span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="shrink-0 self-center">
                          {isCurrentApplied ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="bg-green-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs">
                                <Check size={13} />
                                Terpasang
                              </span>
                              <button
                                onClick={onRemoveVoucher}
                                className="text-[10px] text-red-600 hover:underline font-semibold"
                              >
                                Lepas
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSelectVoucher(voucher.code)}
                              className="bg-[#E5391B] hover:bg-[#C62818] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-transform active:scale-95 shadow-xs flex items-center gap-1"
                            >
                              <span>Gunakan</span>
                              <ChevronRight size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Ineligible Vouchers */}
          {ineligibleVouchers.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">
                  Voucher Belum Memenuhi Syarat
                </span>
                <span className="text-[10px] text-gray-400">
                  {ineligibleVouchers.length} Voucher
                </span>
              </div>

              <div className="space-y-2">
                {ineligibleVouchers.map(({ voucher, deficit }) => (
                  <div
                    key={voucher.id}
                    className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-3 opacity-80"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[11px] text-gray-500 bg-gray-200/70 px-2 py-0.5 rounded">
                            {voucher.code}
                          </span>
                          <span className="text-xs font-bold text-gray-600">
                            {voucher.discount_type === 'PERCENTAGE'
                              ? `Diskon ${voucher.discount_value}%`
                              : `Potongan ${formatRupiah(voucher.discount_value)}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Minimal belanja: <b>{formatRupiah(voucher.min_purchase)}</b>
                        </p>
                        <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>Kurang {formatRupiah(deficit)} lagi untuk pakai voucher ini</span>
                        </div>
                      </div>

                      <div className="shrink-0 self-center">
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-200/60 px-2.5 py-1 rounded-md">
                          Belum Cukup
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-gray-500">Total Belanja:</span>{' '}
            <b className="text-[#222222] font-black">{formatRupiah(subtotal)}</b>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-gray-600 hover:text-black px-4 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect } from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isAdmin?: boolean;
}

export function LogoutConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  isAdmin = false,
}: LogoutConfirmModalProps) {
  // Close on Escape key press & prevent body scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X button */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="Tutup"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Modal Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 text-[#E5391B] flex items-center justify-center mx-auto mb-4 shadow-xs">
          <LogOut size={26} className="translate-x-0.5" />
        </div>

        {/* Modal Title & Message */}
        <div className="text-center space-y-2 mb-6">
          <h3 id="logout-modal-title" className="text-lg font-black text-gray-900">
            Konfirmasi Keluar
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed px-2">
            Apakah Anda yakin ingin keluar dari akun{' '}
            <span className="font-semibold text-gray-800">Alvin Swalayan</span>?
          </p>

          {isAdmin ? (
            <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] text-left flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <span>Sesi mode Admin akan diakhiri dan Anda akan langsung dialihkan ke menu utama toko.</span>
            </div>
          ) : (
            <div className="mt-2.5 p-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-[11px]">
              Tampilan akan langsung kembali ke <strong>Menu Utama</strong>.
            </div>
          )}
        </div>

        {/* Action Buttons: Batal & Ya, Keluar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 hover:text-gray-900 transition-all active:scale-[0.98]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#E5391B] hover:bg-[#C62818] text-white font-bold text-xs transition-all shadow-md shadow-red-500/20 flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <LogOut size={14} />
            <span>Ya, Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

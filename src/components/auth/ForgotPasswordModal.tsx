'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, MessageCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { STORE_INFO } from '@/lib/constants';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessReset?: (email: string) => void;
  initialEmail?: string;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  onSuccessReset,
  initialEmail = '',
}: ForgotPasswordModalProps) {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setErrorMsg('');
      setIsSuccess(false);
      setSuccessMsg('');
    }
  }, [isOpen, initialEmail]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Harap masukkan alamat email yang valid.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok. Mohon periksa kembali.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(cleanEmail, newPassword);
      if (res.success) {
        setIsSuccess(true);
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Terjadi kesalahan saat mengatur ulang kata sandi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSuccess = () => {
    if (onSuccessReset) {
      onSuccessReset(email.trim().toLowerCase());
    }
    onClose();
  };

  const whatsappHelpUrl = `https://wa.me/${STORE_INFO.whatsapp}?text=${encodeURIComponent(
    `Halo Admin ${STORE_INFO.name}, saya butuh bantuan untuk atur ulang kata sandi akun saya (${email.trim() || 'email saya'}). Mohon bantuannya.`
  )}`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-gray-100 transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Tutup */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>

        {isSuccess ? (
          /* Tampilan Berhasil */
          <div className="text-center py-2 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#222222]">
                Sandi Berhasil Diperbarui!
              </h2>
              <p className="text-xs text-gray-600 mt-1.5 px-2 leading-relaxed">
                {successMsg || 'Kata sandi akun Anda telah berhasil diubah. Silakan masuk kembali menggunakan kata sandi baru Anda.'}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-left text-xs space-y-1">
              <p className="text-gray-500 font-medium">Email Akun:</p>
              <p className="font-bold text-[#222222]">{email.trim().toLowerCase()}</p>
            </div>

            <button
              type="button"
              onClick={handleFinishSuccess}
              className="w-full py-2.5 px-4 bg-[#E5391B] hover:bg-[#c93015] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <span>Masuk dengan Sandi Baru</span>
              <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          /* Formulir Atur Ulang Sandi */
          <div>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-[#E5391B] flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
                <Lock size={22} />
              </div>
              <h2 className="text-lg font-extrabold text-[#222222]">
                Lupa Kata Sandi?
              </h2>
              <p className="text-xs text-[#6B7280] mt-1">
                Masukkan email terdaftar dan buat kata sandi baru untuk akun Anda
              </p>
            </div>

            {/* Alert Error */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Input Email */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Akun Terdaftar
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E5E7EB] focus:border-[#E5391B] focus:ring-1 focus:ring-[#E5391B] focus:outline-none text-xs text-[#222222]"
                  />
                  <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              {/* Input Sandi Baru */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-[#E5E7EB] focus:border-[#E5391B] focus:ring-1 focus:ring-[#E5391B] focus:outline-none text-xs text-[#222222]"
                  />
                  <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Sandi Baru */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-[#E5E7EB] focus:border-[#E5391B] focus:ring-1 focus:ring-[#E5391B] focus:outline-none text-xs text-[#222222]"
                  />
                  <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Tombol Simpan */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#E5391B] hover:bg-[#c93015] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Menyimpan Sandi...
                  </span>
                ) : (
                  <span>Simpan Kata Sandi Baru</span>
                )}
              </button>
            </form>

            {/* Garis Pemisah atau Bantuan CS */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-center space-y-2">
                <p className="text-[11px] text-gray-600 leading-snug">
                  Lupa email atau akun bermasalah? Hubungi langsung tim kasir toko:
                </p>
                <a
                  href={whatsappHelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                >
                  <MessageCircle size={15} />
                  <span>Bantuan via WhatsApp ({STORE_INFO.phone})</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

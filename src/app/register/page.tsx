'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Lock, Phone, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { user, register, loginWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    const cleanPhone = phone.replace(/[\s-]/g, '');
    const phoneRegex = /^(?:\+62|62|0)8[1-9][0-9]{7,10}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setErrorMsg('Nomor WhatsApp / HP tidak valid. Masukkan nomor seluler Indonesia yang aktif (contoh: 081234567890).');
      return;
    }

    setLoading(true);
    try {
      const res = await register(name, email, password, cleanPhone);
      if (res.success) {
        router.push('/');
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Gagal mendaftar. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-4 pt-4 pb-10 sm:py-8 bg-[#FFF7F5]">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-7 shadow-sm">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-xl font-extrabold text-[#222222]">
            Daftar Akun Baru
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Mulai nikmati kemudahan pesan antar sembako di Banda Aceh
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nama Lengkap <span className="text-[#E5391B]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Teuku Umar"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E5E7EB] focus:border-[#E5391B] focus:outline-none text-xs text-[#222222]"
              />
              <User size={16} className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nomor WhatsApp / HP <span className="text-[#E5391B]">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812xxxxxxxx"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E5E7EB] focus:border-[#E5391B] focus:outline-none text-xs text-[#222222]"
              />
              <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Alamat Email <span className="text-[#E5391B]">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E5E7EB] focus:border-[#E5391B] focus:outline-none text-xs text-[#222222]"
              />
              <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Kata Sandi <span className="text-[#E5391B]">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-[#E5E7EB] focus:border-[#E5391B] focus:outline-none text-xs text-[#222222]"
              />
              <Lock size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none p-0.5 rounded cursor-pointer transition-colors"
                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-1.5 font-medium">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E5391B] hover:bg-[#C62818] active:bg-[#B71C1C] text-white py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <span>{loading ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-[11px] text-gray-400">atau</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => loginWithGoogle()}
          disabled={loading}
          className="w-full py-2.5 px-4 border border-[#E5E7EB] rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Daftar dengan Akun Google</span>
        </button>

        {/* Login Link */}
        <div className="mt-5 text-center text-xs text-gray-600">
          Sudah memiliki akun?{' '}
          <Link href="/login" className="text-[#E5391B] font-bold hover:underline">
            Masuk di Sini
          </Link>
        </div>
      </div>
    </div>
  );
}

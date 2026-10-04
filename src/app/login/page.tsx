'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, ArrowRight, AlertCircle, Shield, UserCheck, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const { user, login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Muat email tersimpan dari cache/localStorage saat pertama kali halaman dibuka
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('alvin_remembered_email_v1');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        window.location.href = '/admin';
      } else {
        router.push(redirectUrl);
      }
    }
  }, [user, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        // Simpan atau bersihkan cache email sesuai preferensi "Ingat Saya"
        try {
          if (rememberMe) {
            localStorage.setItem('alvin_remembered_email_v1', email.trim().toLowerCase());
          } else {
            localStorage.removeItem('alvin_remembered_email_v1');
          }
        } catch {}

        if (email.toLowerCase().includes('admin') || res.message?.includes('Admin')) {
          window.location.href = '/admin';
        } else {
          router.push(redirectUrl);
        }
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Gagal masuk. Periksa kembali email dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLoginCustomer = async () => {
    setLoading(true);
    if (rememberMe) {
      try {
        localStorage.setItem('alvin_remembered_email_v1', 'cut.nurul@gmail.com');
      } catch {}
    }
    await login('cut.nurul@gmail.com', '123456');
    router.push(redirectUrl);
  };

  const handleQuickLoginAdmin = async () => {
    setLoading(true);
    const res = await login('admin@alvinswalayan.com', 'AlvinSwalayan@2025!');
    if (res.success) {
      window.location.href = '/admin';
    } else {
      setErrorMsg(res.message);
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg('');
    await loginWithGoogle();
  };

  return (
    <div className="flex items-center justify-center px-4 pt-4 pb-10 sm:py-8 bg-[#FFF7F5]">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-7 shadow-sm">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-xl font-extrabold text-[#222222]">
            Masuk ke Akun Anda
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            {redirectUrl !== '/'
              ? 'Silakan masuk terlebih dahulu untuk melanjutkan belanja'
              : 'Belanja kebutuhan sehari-hari lebih cepat dan praktis'}
          </p>
        </div>

        {/* 1-Tap Quick Demo Login Buttons */}
        <div className="mb-5 p-3.5 rounded-xl bg-orange-50 border border-orange-200 space-y-2.5">
          <p className="text-[11px] font-bold text-orange-950 flex items-center gap-1.5">
            <Shield size={14} className="text-[#E5391B]" />
            <span>Pintasan Masuk Cepat (Sekali Klik):</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={handleQuickLoginCustomer}
              disabled={loading}
              className="py-2 px-2.5 bg-white hover:bg-orange-100 border border-orange-300 rounded-lg font-bold text-[#E5391B] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <UserCheck size={14} />
              <span>Masuk sbg Pelanggan</span>
            </button>
            <button
              type="button"
              onClick={handleQuickLoginAdmin}
              disabled={loading}
              className="py-2 px-2.5 bg-[#222222] hover:bg-black text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <ShieldAlert size={14} className="text-[#FFC107]" />
              <span>Masuk sbg Admin</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email username"
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-700">
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-[11px] text-[#E5391B] hover:underline font-semibold cursor-pointer"
              >
                Lupa sandi?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          {/* Checkbox Ingat Saya */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                name="remember_me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#E5391B] focus:ring-[#E5391B] accent-[#E5391B] cursor-pointer"
              />
              <span className="text-xs text-gray-700 font-medium">
                Ingat saya di perangkat ini
              </span>
            </label>
            <span className="text-[10px] text-gray-400 hidden sm:inline">
              Otomatis isi saat kembali
            </span>
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
            <span>{loading ? 'Sedang Masuk...' : 'Masuk Sekarang'}</span>
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
          onClick={handleGoogle}
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
          <span>Masuk dengan Akun Google</span>
        </button>

        {/* Register Link */}
        <div className="mt-6 text-center text-xs text-gray-600">
          Belum punya akun?{' '}
          <Link href="/register" className="text-[#E5391B] font-bold hover:underline">
            Daftar Sekarang
          </Link>
        </div>

        {/* Modal Lupa Sandi */}
        <ForgotPasswordModal
          isOpen={isForgotModalOpen}
          onClose={() => setIsForgotModalOpen(false)}
          initialEmail={email}
          onSuccessReset={(resetEmail) => {
            setEmail(resetEmail);
            setPassword('');
            setErrorMsg('');
          }}
        />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-gray-500">Memuat halaman masuk...</div>}>
      <LoginContent />
    </Suspense>
  );
}

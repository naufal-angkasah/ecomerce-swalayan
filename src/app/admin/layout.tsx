'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  Upload,
  Store,
  LogOut,
  ShieldCheck,
  Image as ImageIcon,
  Layers,
  Users,
  Settings,
  Lock,
  ShieldAlert,
  BarChart3,
} from 'lucide-react';
import { AdminOrderNotifier } from '@/components/admin/AdminOrderNotifier';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, isLoading, requestLogout } = useAuth();

  const navLinks = [
    { label: 'Ringkasan Toko', href: '/admin', icon: LayoutDashboard },
    { label: 'Laporan Penjualan', href: '/admin/reports', icon: BarChart3 },
    { label: 'Kelola Pesanan', href: '/admin/orders', icon: ShoppingCart },
    { label: 'Katalog Produk', href: '/admin/products', icon: Package },
    { label: 'Import CSV Produk', href: '/admin/products/import', icon: Upload },
    { label: '14 Kategori', href: '/admin/categories', icon: Layers },
    { label: 'Pelanggan', href: '/admin/customers', icon: Users },
    { label: 'Banner Promo', href: '/admin/banners', icon: ImageIcon },
    { label: 'Voucher Promo', href: '/admin/vouchers', icon: Tag },
    { label: 'Pengaturan Toko', href: '/admin/settings', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#E5391B] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-gray-500">Memverifikasi hak akses Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-xl p-6 sm:p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 text-[#E5391B] flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert size={32} />
          </div>
          <div>
            <div className="inline-block bg-red-100 text-[#E5391B] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
              Akses Terbatas
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#222222]">
              Khusus Pengelola &amp; Kasir Toko
            </h1>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Halaman ini memerlukan hak akses Administrator Alvin Swalayan. Silakan masuk dengan akun Admin yang terdaftar untuk membuka panel ini.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname)}`}
              className="w-full bg-[#E5391B] hover:bg-[#C62818] text-white py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Lock size={14} />
              <span>Masuk dengan Akun Admin</span>
            </Link>
            <Link
              href="/"
              className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Store size={14} />
              <span>Kembali ke Beranda Toko</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col print:bg-white print:min-h-0">
      {/* Admin Top Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 px-4 py-2.5 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo variant="compact" />
            <div className="h-6 w-px bg-gray-200"></div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-[#E5391B] tracking-wide uppercase">
                  Panel Kasir &amp; Pengelola
                </span>
                <span className="bg-red-100 text-[#E5391B] text-[9px] font-black px-1.5 py-0.5 rounded">
                  ADMIN
                </span>
              </div>
              <p className="text-[10px] text-gray-500">Alvin Swalayan Banda Aceh</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Order Audio & Voice Notifier */}
            <AdminOrderNotifier />

            <div className="h-5 w-px bg-gray-200 hidden sm:block"></div>

            {user && (
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-gray-200 text-xs">
                <div className="w-7 h-7 rounded-full bg-red-50 text-[#E5391B] flex items-center justify-center font-bold text-xs border border-red-200">
                  <ShieldCheck size={16} />
                </div>
                <div className="text-left leading-tight">
                  <div className="font-bold text-gray-800">{user.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono truncate max-w-[140px]">{user.email}</div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={requestLogout}
              title="Keluar dari sesi Admin"
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto text-xs py-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === '/admin'
                ? pathname === '/admin'
                : link.href === '/admin/products'
                ? pathname === '/admin/products'
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#E5391B] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-[#222222]'
                }`}
              >
                <Icon size={15} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0 print:max-w-none print:m-0">
        {children}
      </main>

      {/* Dedicated Admin Footer */}
      <footer className="bg-white border-t border-[#E5E7EB] py-3 text-center text-[11px] text-gray-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>&copy; {new Date().getFullYear()} Alvin Swalayan &bull; Panel Kasir &amp; Pengelola Toko</span>
          <span>Lokasi: Peunyeurat, Banda Raya, Banda Aceh</span>
        </div>
      </footer>
    </div>
  );
}

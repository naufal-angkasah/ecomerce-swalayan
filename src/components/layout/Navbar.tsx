'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Logo } from '@/components/common/Logo';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { STORE_INFO, CATEGORIES } from '@/lib/constants';
import { CategoryMegaMenu } from '@/components/layout/CategoryMegaMenu';
import { productService } from '@/services/productService';
import {
  Search,
  ShoppingCart,
  User,
  MapPin,
  Phone,
  Menu,
  X,
  ChevronDown,
  Clock,
  ShieldCheck,
  Package,
  LayoutGrid,
  LogOut,
} from 'lucide-react';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { user, isAdmin, requestLogout } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  const hideCategoryBar =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/profile' ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/cart');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    setCategoryMenuOpen(false);
    if (query) {
      productService.recordSearchQuery(query);
      router.push(`/search?q=${encodeURIComponent(query)}`);
    } else {
      // Empty search → browse all products in the full catalog
      router.push('/catalog');
    }
  };

  // Close menus on route navigation
  React.useEffect(() => {
    setCategoryMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Do not render consumer store navbar inside the dedicated admin dashboard
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] shadow-xs print:hidden">
      {/* Top Announcement Bar */}
      <div className="bg-[#FFF7F5] border-b border-[#E5E7EB] text-xs py-1.5 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[#6B7280]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#222222] font-medium">
              <MapPin size={13} className="text-[#E5391B]" />
              <span>Lokasi Toko: Peunyeurat, Kec. Banda Raya, Banda Aceh</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-[#FF6D00]" />
              <span>Buka Setiap Hari: 07.30 - 22.30 WIB</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={STORE_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#16A34A] hover:underline font-semibold"
            >
              <Phone size={13} />
              <span>WA Pesanan: {STORE_INFO.phone}</span>
            </a>
            {isAdmin && (
              <Link
                href="/admin"
                className="bg-[#E5391B] text-white px-2.5 py-0.5 rounded text-[11px] font-bold hover:bg-[#C62818] flex items-center gap-1"
              >
                <ShieldCheck size={12} />
                <span>Dashboard Admin</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Logo variant="full" />
          </div>

          {/* Desktop Category Dropdown Trigger (Klik Indomaret style) */}
          <button
            type="button"
            onClick={() => setCategoryMenuOpen(!categoryMenuOpen)}
            className={`hidden md:flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer select-none ${
              categoryMenuOpen
                ? 'bg-red-50 text-[#E5391B] border-red-200 shadow-inner'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
            }`}
            aria-expanded={categoryMenuOpen}
            aria-label="Buka Menu Kategori"
          >
            <LayoutGrid size={16} className={categoryMenuOpen ? 'text-[#E5391B]' : 'text-gray-500'} />
            <span>Kategori</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${
                categoryMenuOpen ? 'rotate-180 text-[#E5391B]' : 'text-gray-400'
              }`}
            />
          </button>

          {/* Desktop Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-2xl relative items-center"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari beras, minyak goreng, kopi Aceh, susu, popok..."
              className="w-full pl-11 pr-24 py-2.5 rounded-xl border-2 border-gray-300 hover:border-gray-400 focus:border-[#E5391B] focus:ring-4 focus:ring-red-500/10 focus:outline-none text-sm text-[#222222] placeholder-gray-400 bg-gray-50/80 hover:bg-white focus:bg-white transition-all shadow-xs font-medium"
            />
            <Search
              size={18}
              className="absolute left-3.5 text-gray-500 pointer-events-none"
            />
            <button
              type="submit"
              className="absolute right-1.5 bg-[#E5391B] hover:bg-[#C62818] text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors"
            >
              Cari
            </button>
          </form>

          {/* Actions: Cart & Auth */}
          <div className="flex items-center gap-3">
            {/* Cart or Admin Dashboard Action */}
            {isAdmin ? (
              <Link
                href="/admin"
                className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-[#E5391B] transition-colors border border-red-200"
                title="Masuk ke Dashboard Admin Toko"
              >
                <ShieldCheck size={20} className="text-[#E5391B]" />
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-[10px] text-[#E5391B] font-bold uppercase tracking-wider leading-tight">Admin Toko</span>
                  <span className="text-xs font-extrabold text-[#E5391B]">Dashboard</span>
                </div>
              </Link>
            ) : (
              <button
                onClick={() => {
                  if (!user) {
                    router.push('/login?redirect=/cart');
                  } else {
                    router.push('/cart');
                  }
                }}
                className="relative flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-[#222222] transition-colors cursor-pointer text-left"
                title="Keranjang Belanja"
              >
                <div className="relative">
                  <ShoppingCart size={24} className="text-[#E5391B]" />
                  {user && totalItems > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-[#FF6D00] text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                      {totalItems > 99 ? '99+' : totalItems}
                    </span>
                  )}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-[11px] text-gray-500 font-medium leading-none">Keranjang</span>
                  <span className="text-xs font-bold text-[#222222]">
                    {user && totalItems > 0 ? `${totalItems} Barang` : 'Kosong'}
                  </span>
                </div>
              </button>
            )}

            {/* User Profile / Login */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-[#222222] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FFF7F5] border border-[#E5391B]/40 flex items-center justify-center text-[#E5391B]">
                    <User size={18} />
                  </div>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-bold text-[#222222] truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {isAdmin ? 'Administrator' : 'Akun Saya'}
                    </span>
                  </div>
                  <ChevronDown size={14} className="text-gray-400 hidden lg:block" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-1.5 z-50 text-xs"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-gray-100">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="font-bold text-[#222222] truncate">{user.name}</p>
                        {isAdmin && (
                          <span className="bg-red-100 text-[#E5391B] text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 truncate text-[11px]">{user.email}</p>
                    </div>

                    {isAdmin ? (
                      <>
                        <Link
                          href="/admin"
                          className="block px-3 py-2 text-[#E5391B] font-bold hover:bg-red-50"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Dashboard Utama
                        </Link>
                        <Link
                          href="/admin/orders"
                          className="block px-3 py-2 text-gray-700 hover:bg-gray-50 font-medium"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Kelola Pesanan Masuk
                        </Link>
                        <Link
                          href="/admin/products"
                          className="block px-3 py-2 text-gray-700 hover:bg-gray-50 font-medium"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Kelola Stok &amp; Katalog
                        </Link>
                        <Link
                          href="/admin/reports"
                          className="block px-3 py-2 text-gray-700 hover:bg-gray-50 font-medium"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Laporan Penjualan
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/orders"
                          className="block px-3 py-2 text-gray-700 hover:bg-gray-50 font-medium"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Pesanan Saya
                        </Link>
                        <Link
                          href="/profile"
                          className="block px-3 py-2 text-gray-700 hover:bg-gray-50 font-medium"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Profil &amp; Buku Alamat
                        </Link>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        requestLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 font-semibold border-t border-gray-100 flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      <span>Keluar</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg border border-[#E5391B] text-[#E5391B] text-xs font-bold hover:bg-[#FFF7F5] transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-block px-3 py-1.5 rounded-lg bg-[#E5391B] text-white text-xs font-bold hover:bg-[#C62818] transition-colors"
                >
                  Daftar
                </Link>
              </div>
            )}

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (Full Width on Phone) */}
        <form onSubmit={handleSearchSubmit} className="mt-2.5 md:hidden relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari beras, minyak, susu, kopi..."
            className="w-full pl-10 pr-20 py-2.5 rounded-xl border-2 border-gray-300 focus:border-[#E5391B] focus:ring-4 focus:ring-red-500/10 focus:outline-none text-xs text-[#222222] bg-gray-50/90 focus:bg-white transition-all shadow-xs"
          />
          <Search size={16} className="absolute left-3 text-gray-500 pointer-events-none" />
          <button
            type="submit"
            className="absolute right-1.5 bg-[#E5391B] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:bg-[#C62818]"
          >
            Cari
          </button>
        </form>

        {!hideCategoryBar && (
          <>
            {/* Mobile Quick Category Bar (Modern Supermarket App style) */}
            <div className="md:hidden flex items-center gap-1.5 mt-2.5 overflow-x-auto scrollbar-none text-xs pb-1 [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setCategoryMenuOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-[#E5391B] font-bold border border-red-200 shrink-0 shadow-2xs"
              >
                <LayoutGrid size={13} />
                <span>Kategori</span>
              </button>
              <Link
                href="/catalog?discount=true"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200 shrink-0 shadow-2xs"
              >
                <span>🔥 Diskon</span>
              </Link>
              <Link
                href="/catalog"
                className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 font-semibold shrink-0 hover:bg-gray-200"
              >
                Semua Produk
              </Link>
              {CATEGORIES.slice(0, 5).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/catalog?category=${cat.id}`}
                  className="px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 font-medium shrink-0 border border-gray-200 hover:border-gray-300 whitespace-nowrap"
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            {/* Mobile Alfagift-style Slim Delivery & Location Strip */}
            <div className="md:hidden flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-600">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin size={12} className="text-[#E5391B] shrink-0" />
                <span className="truncate">
                  Kirim ke: <b className="text-gray-900 font-extrabold">Banda Aceh &amp; Sekitarnya</b>
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold shrink-0">
                ● Buka 07.30 - 22.30 WIB
              </span>
            </div>

            {/* Category Navigation Bar (Desktop & iPad) */}
            <div className="hidden md:flex items-center gap-5 mt-3 pt-2.5 border-t border-gray-100 text-xs font-semibold text-gray-700 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
              <Link
                href="/catalog"
                className="text-[#E5391B] font-bold shrink-0 hover:text-[#C62818] transition-colors"
              >
                Semua Produk
              </Link>
              {CATEGORIES.slice(0, 9).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/catalog?category=${cat.id}`}
                  className="hover:text-[#E5391B] shrink-0 transition-colors text-gray-600 hover:font-bold whitespace-nowrap"
                >
                  {cat.name}
                </Link>
              ))}
              <Link
                href="/catalog?discount=true"
                className="text-[#FF6D00] font-bold shrink-0 ml-auto flex items-center gap-1 hover:underline whitespace-nowrap"
              >
                🔥 Sedang Diskon
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E7EB] bg-white px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Kategori Pilihan</p>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setCategoryMenuOpen(true);
              }}
              className="text-[11px] font-bold text-[#E5391B] flex items-center gap-1 hover:underline"
            >
              <span>Buka Menu Lengkap</span>
              <span>→</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setCategoryMenuOpen(true);
            }}
            className="w-full p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#E5391B] font-bold flex items-center justify-between text-xs border border-red-200 transition-colors shadow-2xs"
          >
            <span className="flex items-center gap-2">
              <LayoutGrid size={16} />
              <span>Jelajahi Semua Subkategori Lengkap</span>
            </span>
            <span>Buka ▾</span>
          </button>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/catalog"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded bg-gray-50 text-[#E5391B] font-bold"
            >
              Semua Produk
            </Link>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalog?category=${cat.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded bg-gray-50 text-gray-800 hover:bg-red-50"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-2 text-xs">
            <Link
              href="/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-gray-700 font-medium"
            >
              <Package size={16} className="text-[#E5391B]" />
              <span>Pesanan Saya</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-[#E5391B] font-bold"
              >
                <ShieldCheck size={16} />
                <span>Dashboard Admin</span>
              </Link>
            )}
            <div className="text-[11px] text-gray-500 pt-1">
              📍 Peunyeurat, Banda Raya, Banda Aceh
            </div>
          </div>
        </div>
      )}

      {/* Category Mega Menu Dropdown */}
      <CategoryMegaMenu
        isOpen={categoryMenuOpen}
        onClose={() => setCategoryMenuOpen(false)}
      />
    </header>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Home, Grid, ShoppingCart, Package, User, ShieldCheck, Settings } from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { user, isAdmin } = useAuth();

  // Hide mobile bottom nav on admin routes
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const navItems = isAdmin
    ? [
        { label: 'Beranda', href: '/', icon: Home },
        { label: 'Katalog', href: '/catalog', icon: Grid },
        { label: 'Dashboard', href: '/admin', icon: ShieldCheck },
        { label: 'Pesanan Toko', href: '/admin/orders', icon: Package },
        { label: 'Pengaturan', href: '/admin/settings', icon: Settings },
      ]
    : [
        { label: 'Beranda', href: '/', icon: Home },
        { label: 'Kategori', href: '/catalog', icon: Grid },
        {
          label: 'Keranjang',
          href: user ? '/cart' : '/login?redirect=/cart',
          icon: ShoppingCart,
          badge: user && totalItems > 0 ? totalItems : null,
        },
        {
          label: 'Pesanan',
          href: user ? '/orders' : '/login?redirect=/orders',
          icon: Package,
        },
        { label: 'Akun', href: user ? '/profile' : '/login', icon: User },
      ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-area-bottom print:hidden">
      <div className="grid grid-cols-5 h-[58px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center relative py-1 transition-all ${
                isActive ? 'text-[#E5391B]' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'scale-105 transition-transform' : ''} />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2.5 bg-[#FF6D00] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  isActive ? 'font-black text-[#E5391B]' : 'font-medium text-gray-500'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-4 h-0.5 bg-[#E5391B] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

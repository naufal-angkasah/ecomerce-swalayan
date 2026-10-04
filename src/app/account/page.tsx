'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { orderService } from '@/services/orderService';
import { formatRupiah } from '@/lib/utils';
import {
  User,
  MapPin,
  Package,
  Clock,
  CheckCircle,
  Truck,
  ArrowRight,
  ShieldCheck,
  Phone,
  ShoppingBag,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { STORE_INFO } from '@/lib/constants';

export default function AccountDashboardPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  const userOrders = useMemo(() => {
    if (!user) return [];
    return orderService.getAll().filter(
      (o) =>
        (o.user_id && o.user_id === user.id) ||
        (user.phone && o.customer_phone && o.customer_phone.replace(/\D/g, '').includes(user.phone.replace(/\D/g, '')))
    );
  }, [user]);

  const activeOrders = useMemo(() => {
    return userOrders.filter(
      (o) =>
        o.order_status === 'MENUNGGU_PEMBAYARAN' ||
        o.order_status === 'DIBAYAR' ||
        o.order_status === 'DIPROSES' ||
        o.order_status === 'DIKIRIM'
    );
  }, [userOrders]);

  const completedOrders = useMemo(() => {
    return userOrders.filter((o) => o.order_status === 'SELESAI');
  }, [userOrders]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-red-50 text-[#E5391B] rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={32} />
        </div>
        <h2 className="text-xl font-bold text-[#222222] mb-2">Silakan Masuk Terlebih Dahulu</h2>
        <p className="text-xs text-gray-500 mb-6">
          Masuk ke akun Anda untuk melihat ringkasan pesanan, riwayat belanja, dan buku alamat.
        </p>
        <Link
          href="/login?redirect=/account"
          className="inline-block bg-[#E5391B] hover:bg-[#C62818] text-white px-6 py-2.5 rounded-lg text-xs font-bold transition-colors"
        >
          Masuk ke Akun
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Greeting */}
      <div className="bg-gradient-to-r from-red-600 to-[#E5391B] rounded-2xl p-6 text-white shadow-md mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-white font-black text-2xl shadow-inner">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">Halo, {user.name}!</h1>
                {isAdmin ? (
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Admin
                  </span>
                ) : (
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Pelanggan Setia
                  </span>
                )}
              </div>
              <p className="text-xs text-red-100 mt-1">
                {user.email} &bull; {user.phone || 'Nomor HP belum diatur'}
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="bg-white text-[#E5391B] hover:bg-gray-100 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <ShieldCheck size={16} />
                <span>Portal Admin</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Alert if Profile Incomplete (e.g. from Google Login) */}
      {(!user.phone || !user.addresses || user.addresses.length === 0) && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle size={22} />
            </div>
            <div>
              <p className="text-xs font-black text-amber-950">
                Lengkapi Nomor WhatsApp &amp; Alamat Pengiriman
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Akun Anda belum memiliki data nomor kontak atau alamat pengiriman. Lengkapi sekarang agar dapat belanja dan checkout kebutuhan swalayan.
              </p>
            </div>
          </div>
          <Link
            href="/profile"
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg text-center shrink-0 transition-colors shadow-xs"
          >
            Lengkapi Sekarang
          </Link>
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium">Total Pesanan</span>
            <ShoppingBag size={18} className="text-blue-500" />
          </div>
          <span className="text-2xl font-black text-gray-800">{userOrders.length}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium">Pesanan Aktif</span>
            <Truck size={18} className="text-amber-500" />
          </div>
          <span className="text-2xl font-black text-amber-600">{activeOrders.length}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium">Pesanan Selesai</span>
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-600">{completedOrders.length}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium">Alamat Tersimpan</span>
            <MapPin size={18} className="text-red-500" />
          </div>
          <span className="text-2xl font-black text-gray-800">{user.addresses?.length || 0}</span>
        </div>
      </div>

      {/* Action Shortcut Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/orders"
          className="group bg-white hover:border-[#E5391B] border border-gray-200 rounded-xl p-5 transition-all shadow-sm flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-red-50 group-hover:bg-red-100 text-[#E5391B] flex items-center justify-center flex-shrink-0 transition-colors">
            <Package size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-800 group-hover:text-[#E5391B] flex items-center justify-between">
              <span>Riwayat Pesanan</span>
              <ArrowRight size={16} className="text-gray-400 group-hover:text-[#E5391B] group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Pantau status pengiriman, bukti transfer, dan riwayat belanja Anda.
            </p>
          </div>
        </Link>

        <Link
          href="/profile"
          className="group bg-white hover:border-[#E5391B] border border-gray-200 rounded-xl p-5 transition-all shadow-sm flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 transition-colors">
            <User size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-800 group-hover:text-[#E5391B] flex items-center justify-between">
              <span>Profil &amp; Alamat Pengiriman</span>
              <ArrowRight size={16} className="text-gray-400 group-hover:text-[#E5391B] group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Kelola data diri, nomor WhatsApp aktif, dan daftar alamat rumah atau kantor Anda.
            </p>
          </div>
        </Link>
      </div>

      {/* Active Orders Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[#E5391B]" />
            <h2 className="text-base font-bold text-[#222222]">Pesanan Terbaru</h2>
          </div>
          <Link
            href="/orders"
            className="text-xs font-bold text-[#E5391B] hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua Pesanan</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {userOrders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-gray-500 mb-3">Anda belum memiliki riwayat pesanan.</p>
            <Link
              href="/"
              className="bg-[#E5391B] hover:bg-[#C62818] text-white px-4 py-2 rounded-lg text-xs font-bold inline-block"
            >
              Mulai Belanja Kebutuhan Harian
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {userOrders.slice(0, 3).map((order) => (
              <div
                key={order.id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-extrabold text-xs text-[#222222]">
                      {order.order_number}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.order_status === 'SELESAI'
                          ? 'bg-green-100 text-green-700'
                          : order.order_status === 'DIKIRIM'
                          ? 'bg-blue-100 text-blue-700'
                          : order.order_status === 'DIPROSES'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.order_status === 'DIBATALKAN'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {order.order_status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    &bull; {order.items.length} Barang &bull;{' '}
                    <span className="font-bold text-gray-700">
                      {formatRupiah(order.grand_total || order.total_amount)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/orders/${order.id}`}
                    className="border border-gray-300 hover:border-[#E5391B] hover:text-[#E5391B] text-gray-700 text-xs font-bold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                  >
                    <span>Detail Pesanan</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Service Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Phone size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-900">Butuh Bantuan Pesanan Anda?</h4>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              Hubungi layanan pelanggan resmi Alvin Swalayan Banda Aceh via WhatsApp langsung.
            </p>
          </div>
        </div>
        <a
          href={STORE_INFO.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors flex-shrink-0"
        >
          <Phone size={14} />
          <span>Chat WhatsApp CS</span>
        </a>
      </div>
    </div>
  );
}

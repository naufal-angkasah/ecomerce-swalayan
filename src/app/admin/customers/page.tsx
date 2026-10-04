'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { orderService } from '@/services/orderService';
import { Order, CustomerAddress } from '@/types';
import { formatRupiah } from '@/lib/utils';
import {
  Search,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Calendar,
  X,
} from 'lucide-react';

interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  registeredDate: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  addresses: string[];
}

export default function AdminCustomersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

  useEffect(() => {
    setOrders(orderService.getAll());
  }, []);

  const customers = useMemo(() => {
    const customerMap = new Map<string, CustomerSummary>();

    // 1. Seed with known default active customer
    customerMap.set('081370229988', {
      id: 'cust-001',
      name: 'Cut Nurul Fadhilah',
      email: 'customer@gmail.com',
      phone: '081370229988',
      registeredDate: '2026-02-01',
      totalOrders: 0,
      totalSpent: 0,
      addresses: ['Komplek Griya Indah No. B-4, Peunyeurat, Kec. Banda Raya, Banda Aceh'],
    });

    // 2. Add logged in user from localStorage if customer
    try {
      const raw = localStorage.getItem('alvin_auth_user_v1');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && u.role === 'customer' && u.phone) {
          const cleanPhone = u.phone.replace(/\D/g, '');
          if (!customerMap.has(cleanPhone)) {
            customerMap.set(cleanPhone, {
              id: u.id || `cust-${Date.now()}`,
              name: u.name,
              email: u.email,
              phone: u.phone,
              registeredDate: u.created_at ? u.created_at.split('T')[0] : '2026-03-01',
              totalOrders: 0,
              totalSpent: 0,
              addresses: u.addresses?.map((a: CustomerAddress) => `${a.label}: ${a.full_address}, ${a.area_district || a.district}`) || [],
            });
          }
        }
      }
    } catch {
      // ignore
    }

    // 3. Aggregate data from all orders
    orders.forEach((o) => {
      const cleanPhone = o.customer_phone.replace(/\D/g, '') || 'no-phone';
      let c = customerMap.get(cleanPhone);

      if (!c) {
        c = {
          id: `cust-${cleanPhone}`,
          name: o.customer_name || 'Pelanggan Belanja',
          email: `${cleanPhone}@customer.alvin`,
          phone: o.customer_phone,
          registeredDate: o.created_at.split('T')[0],
          totalOrders: 0,
          totalSpent: 0,
          addresses: [],
        };
        customerMap.set(cleanPhone, c);
      }

      c.totalOrders += 1;
      if (o.payment_status === 'PAID') {
        c.totalSpent += (o.grand_total || o.total_amount);
      }

      if (!c.lastOrderDate || new Date(o.created_at) > new Date(c.lastOrderDate)) {
        c.lastOrderDate = o.created_at;
      }

      const addr = o.delivery_address || o.shipping_address;
      if (addr && !c.addresses.includes(addr)) {
        c.addresses.push(addr);
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.addresses.some((a) => a.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const totalRegistered = customers.length;
  const totalLTV = customers.reduce((acc, c) => acc + c.totalSpent, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#222222]">Data Pelanggan Toko</h1>
            <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-blue-200">
              {totalRegistered} Pelanggan Terdaftar
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Daftar pelanggan, riwayat belanja, dan kontak pembeli Alvin Swalayan Banda Aceh
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-right">
          <span className="text-[11px] text-gray-500 font-semibold block">Total Akumulasi Belanja</span>
          <span className="text-base font-black text-gray-900">{formatRupiah(totalLTV)}</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-xl border-2 border-gray-200/90 p-4 flex items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={17} className="absolute left-3.5 top-3 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ketik untuk mencari pelanggan (nama, HP, email, alamat)..."
            className="w-full pl-10 pr-9 py-2.5 bg-gray-50/90 hover:bg-white focus:bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-[#E5391B] focus:ring-4 focus:ring-red-500/10 rounded-xl text-xs text-gray-800 placeholder-gray-400 transition-all font-medium focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition-colors"
              title="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-xs text-gray-600 font-semibold hidden sm:inline">
          Menampilkan <span className="text-[#E5391B] font-bold">{filteredCustomers.length}</span> pelanggan
        </span>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">Kontak WhatsApp &amp; Email</th>
                <th className="py-3 px-4 text-center">Total Pesanan</th>
                <th className="py-3 px-4 text-right">Total Belanja (LTV)</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Tidak ada pelanggan yang cocok dengan pencarian &ldquo;{search}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, idx) => (
                  <tr key={cust.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-400 text-center w-12">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900 text-sm">{cust.name}</div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={11} />
                        <span>Sejak {cust.registeredDate}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-gray-800 flex items-center gap-1.5">
                        <Phone size={12} className="text-green-600" />
                        <a
                          href={`https://wa.me/${cust.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-green-700 font-semibold"
                        >
                          {cust.phone}
                        </a>
                      </div>
                      <div className="text-gray-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                        <Mail size={12} />
                        <span>{cust.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href={`/admin/orders?search=${encodeURIComponent(cust.phone)}`}
                        className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-2.5 py-1 rounded-full font-bold text-[11px] transition-colors"
                        title="Lihat semua pesanan pelanggan ini"
                      >
                        <ShoppingBag size={12} />
                        <span>{cust.totalOrders} Pesanan</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-gray-900">
                      {formatRupiah(cust.totalSpent)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="border border-gray-300 hover:border-[#E5391B] hover:text-[#E5391B] text-gray-700 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Lihat Alamat
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Address Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedCustomer.name}</h3>
                <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-[#E5391B]" />
                <span>Alamat Pengiriman Terdaftar ({selectedCustomer.addresses.length})</span>
              </h4>

              {selectedCustomer.addresses.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Belum ada riwayat alamat tersimpan.</p>
              ) : (
                <div className="space-y-2">
                  {selectedCustomer.addresses.map((addr, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700"
                    >
                      <span className="font-bold text-gray-900 block mb-0.5">Alamat {i + 1}</span>
                      <p className="leading-relaxed">{addr}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
              <a
                href={`https://wa.me/${selectedCustomer.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Phone size={14} />
                <span>Hubungi via WhatsApp</span>
              </a>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="border border-gray-300 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-50 text-gray-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

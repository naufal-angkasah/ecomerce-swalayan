'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/common/Logo';
import { STORE_INFO, CATEGORIES } from '@/lib/constants';
import { MapPin, Phone, Clock, ShieldCheck, Truck, CreditCard } from 'lucide-react';

export function Footer() {
  const pathname = usePathname();

  // Hide consumer footer on admin pages
  if (pathname.startsWith('/admin')) {
    return null;
  }
  return (
    <footer className="bg-white border-t border-[#E5E7EB] text-[#222222] mt-12 print:hidden">
      {/* Top Value Banner */}
      <div className="bg-[#FFF7F5] border-b border-[#E5E7EB] py-6 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E5391B]/10 flex items-center justify-center text-[#E5391B] shrink-0">
              <Truck size={20} />
            </div>
            <div>
              <h4 className="font-bold text-[#222222]">Pengantaran Banda Aceh</h4>
              <p className="text-xs text-[#6B7280]">Langsung diantar dari toko kami di Peunyeurat ke depan pintu Anda.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#16A34A]/10 flex items-center justify-center text-[#16A34A] shrink-0">
              <CreditCard size={20} />
            </div>
            <div>
              <h4 className="font-bold text-[#222222]">Bayar di Tempat (COD) / Transfer</h4>
              <p className="text-xs text-[#6B7280]">Bisa bayar tunai saat barang sampai, transfer Bank Syariah, atau QRIS.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FF6D00]/10 flex items-center justify-center text-[#FF6D00] shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="font-bold text-[#222222]">Kualitas Terjamin &amp; Hemat</h4>
              <p className="text-xs text-[#6B7280]">Produk pangan baru, kadaluwarsa aman, dan harga bersaing setiap hari.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Info */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Store Branding & Address */}
          <div className="space-y-3">
            <Logo variant="full" />
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Supermarket kebutuhan harian keluarga di Kota Banda Aceh. Menyediakan sembako, makanan, minuman, dan perlengkapan rumah tangga dengan pelayanan ramah dan harga hemat.
            </p>
            <div className="pt-2 space-y-2 text-xs text-gray-700">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-[#E5391B] shrink-0 mt-0.5" />
                <div>
                  <p>{STORE_INFO.address}</p>
                  <a
                    href={STORE_INFO.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#E5391B] font-bold hover:underline mt-1"
                  >
                    <span>Buka Lokasi di Google Maps ↗</span>
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#FF6D00] shrink-0" />
                <span>{STORE_INFO.operatingHours}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Kategori Populer */}
          <div>
            <h3 className="font-bold text-sm text-[#222222] mb-3 border-b-2 border-[#E5391B] inline-block pb-1">
              Kategori Belanja
            </h3>
            <ul className="space-y-2 text-xs text-[#6B7280]">
              {CATEGORIES.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/catalog?category=${cat.id}`}
                    className="hover:text-[#E5391B] transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/catalog" className="text-[#E5391B] font-semibold hover:underline">
                  Lihat Semua Produk →
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Layanan Pelanggan & Bantuan */}
          <div>
            <h3 className="font-bold text-sm text-[#222222] mb-3 border-b-2 border-[#E5391B] inline-block pb-1">
              Layanan Pelanggan
            </h3>
            <ul className="space-y-2 text-xs text-[#6B7280]">
              <li>
                <Link href="/orders" className="hover:text-[#E5391B]">
                  Lacak Status Pesanan
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-[#E5391B]">
                  Atur Alamat Pengantaran
                </Link>
              </li>
              <li>
                <a
                  href={STORE_INFO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#E5391B] flex items-center gap-1 text-[#16A34A] font-semibold"
                >
                  <Phone size={13} />
                  <span>Hubungi Kami via WhatsApp</span>
                </a>
              </li>
              <li className="pt-2 text-gray-500 text-[11px]">
                Area Layanan: Banda Raya, Baiturrahman, Kuta Alam, Lueng Bata, Syiah Kuala, Ulee Kareng, Meuraxa.
              </li>
            </ul>
          </div>

          {/* Col 4: Metode Pembayaran */}
          <div>
            <h3 className="font-bold text-sm text-[#222222] mb-3 border-b-2 border-[#E5391B] inline-block pb-1">
              Metode Pembayaran
            </h3>
            <p className="text-xs text-[#6B7280] mb-3">
              Mendukung transaksi tunai maupun nontunai:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 shadow-2xs h-8">
                <span>💵</span>
                <span>COD (Bayar di Tempat)</span>
              </span>
              <span
                className="inline-flex items-center px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-2xs h-8 hover:border-gray-300 transition-colors"
                title="Bank Syariah Indonesia (BSI)"
              >
                <img
                  src="/images/payments/bsi.png"
                  alt="Bank Syariah Indonesia"
                  className="h-4.5 w-auto object-contain"
                />
              </span>
              <span
                className="inline-flex items-center px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-2xs h-8 hover:border-gray-300 transition-colors"
                title="Bank Aceh Syariah"
              >
                <img
                  src="/images/payments/bank-aceh.png"
                  alt="Bank Aceh Syariah"
                  className="h-4.5 w-auto object-contain"
                />
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 shadow-2xs h-8">
                <img
                  src="/images/payments/qris.png"
                  alt="QRIS"
                  className="h-3.5 w-auto object-contain"
                />
                <span>QRIS</span>
              </span>
            </div>
          </div>
        </div>

        {/* Google Maps & Physical Store Location Section */}
        <div className="mt-10 pt-8 border-t border-[#E5E7EB]">
          <div className="bg-[#FFF7F5] rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Store Location Info */}
            <div className="lg:col-span-5 space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-[#E5391B]/10 text-[#E5391B] text-xs font-bold px-2.5 py-1 rounded-full">
                <MapPin size={14} />
                <span>Lokasi Toko Fisik Alvin Swalayan</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#222222]">
                Kunjungi Toko Kami di Banda Aceh
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                {STORE_INFO.address}
              </p>
              <div className="text-xs text-gray-600 flex items-center gap-2">
                <Clock size={14} className="text-[#FF6D00] shrink-0" />
                <span>Buka Setiap Hari: 07.30 - 22.30 WIB</span>
              </div>
              <div className="pt-2 flex flex-wrap gap-2.5">
                <a
                  href={STORE_INFO.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#E5391B] hover:bg-[#C62818] active:bg-[#B71C1C] text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <MapPin size={15} />
                  <span>Buka di Google Maps ↗</span>
                </a>
                <a
                  href={STORE_INFO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                >
                  <Phone size={14} className="text-[#16A34A]" />
                  <span>Chat WhatsApp Toko</span>
                </a>
              </div>
            </div>

            {/* Embedded Google Maps View */}
            <div className="lg:col-span-7 w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-[#E5E7EB] shadow-xs relative bg-gray-100">
              <iframe
                title="Peta Lokasi Google Maps Alvin Swalayan Banda Aceh"
                src={STORE_INFO.googleMapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-8 pt-6 border-t border-[#E5E7EB] flex flex-col md:flex-row items-center justify-between text-xs text-[#6B7280] gap-3">
          <p>© {new Date().getFullYear()} Alvin Swalayan Banda Aceh. Hemat &amp; Berkualitas. Hak cipta dilindungi.</p>
          <div className="flex gap-4">
            <span className="text-gray-500">Banda Aceh, Indonesia</span>
            <Link href="/admin" prefetch={false} className="text-gray-400 hover:text-[#E5391B] font-medium">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

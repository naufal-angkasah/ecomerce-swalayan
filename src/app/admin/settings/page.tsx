'use client';

import React, { useState, useEffect } from 'react';
import { settingsService } from '@/services/settingsService';
import { StoreSettings } from '@/types';
import { formatRupiah } from '@/lib/utils';
import {
  Settings,
  Store,
  Truck,
  CreditCard,
  Building,
  CheckCircle2,
  RotateCcw,
  Save,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isTestingWhatsapp, setIsTestingWhatsapp] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<any | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [isTestingMidtrans, setIsTestingMidtrans] = useState(false);
  const [midtransStatus, setMidtransStatus] = useState<any | null>(null);
  const [midtransError, setMidtransError] = useState<string | null>(null);

  useEffect(() => {
    setSettings(settingsService.get());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleTestWhatsapp = async () => {
    if (!settings?.fonnte_token) {
      setWhatsappError('Harap masukkan token Fonnte terlebih dahulu.');
      return;
    }
    setIsTestingWhatsapp(true);
    setWhatsappError(null);
    setWhatsappStatus(null);
    try {
      const res = await fetch('/api/notifications/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: settings.fonnte_token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWhatsappStatus(data);
      } else {
        setWhatsappError(data.error || 'Token tidak valid atau device belum terhubung.');
      }
    } catch (err: any) {
      setWhatsappError(err.message || 'Gagal menguji koneksi WhatsApp.');
    } finally {
      setIsTestingWhatsapp(false);
    }
  };

  const handleTestMidtrans = async () => {
    if (!settings?.midtrans_server_key) {
      setMidtransError('Harap masukkan Server Key Midtrans terlebih dahulu.');
      return;
    }
    setIsTestingMidtrans(true);
    setMidtransError(null);
    setMidtransStatus(null);
    try {
      const res = await fetch('/api/payments/midtrans/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverKey: settings.midtrans_server_key,
          isProduction: settings.midtrans_is_production,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMidtransStatus(data);
      } else {
        setMidtransError(data.error || 'Kredensial Midtrans tidak valid.');
      }
    } catch (err: any) {
      setMidtransError(err.message || 'Gagal menguji koneksi Midtrans.');
    } finally {
      setIsTestingMidtrans(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    settingsService.update(settings);
    showToast('Pengaturan toko berhasil disimpan!');
  };

  const handleReset = () => {
    if (window.confirm('Kembalikan seluruh pengaturan ke default operasional toko?')) {
      const def = settingsService.reset();
      setSettings(def);
      showToast('Pengaturan berhasil direset ke standar default.');
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#222222] flex items-center gap-2">
            <Settings size={22} className="text-[#E5391B]" />
            <span>Pengaturan Toko &amp; Pembayaran</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Konfigurasi operasional, tarif kurir pengantaran, dan rekening bank Alvin Swalayan
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RotateCcw size={14} />
          <span>Reset ke Default</span>
        </button>
      </div>

      {toastMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Section 1: Store Information */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Store size={16} className="text-[#E5391B]" />
            <span>Identitas &amp; Alamat Toko</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Nama Toko</label>
              <input
                type="text"
                required
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] focus:outline-none bg-white font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">No. WhatsApp Toko / CS</label>
              <input
                type="text"
                required
                value={settings.store_phone}
                onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] focus:outline-none bg-white font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Email Resmi</label>
              <input
                type="email"
                required
                value={settings.store_email}
                onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] focus:outline-none bg-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Alamat Fisik Toko</label>
            <textarea
              rows={2}
              required
              value={settings.store_address}
              onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] focus:outline-none bg-white"
            />
          </div>
        </div>

        {/* Section 2: Delivery & Shipping Rules */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Truck size={16} className="text-[#E5391B]" />
            <span>Ongkos Kirim &amp; Pengantaran Kurir Toko</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Ongkir Flat Standar (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={settings.shipping_fee}
                onChange={(e) =>
                  setSettings({ ...settings, shipping_fee: Math.max(0, parseInt(e.target.value) || 0) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] focus:outline-none bg-white font-medium"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Contoh: {formatRupiah(settings.shipping_fee)} untuk seluruh wilayah Banda Aceh
              </span>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Minimal Belanja Gratis Ongkir (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                required
                value={settings.free_delivery_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    free_delivery_threshold: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] focus:outline-none bg-white font-medium"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Jika belanja &gt;= {formatRupiah(settings.free_delivery_threshold)}, ongkir otomatis Rp 0
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Bank Accounts for Manual Transfer */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Building size={16} className="text-[#E5391B]" />
            <span>Rekening Bank Transfer Manual (BSI &amp; BAS)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Bank */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
              <span className="font-bold text-gray-900 text-xs block">Rekening Bank Utama (1)</span>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Bank</label>
                <input
                  type="text"
                  required
                  value={settings.bank_name}
                  onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] bg-white text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  required
                  value={settings.bank_account_number}
                  onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] bg-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Atas Nama (A/N)</label>
                <input
                  type="text"
                  required
                  value={settings.bank_account_name}
                  onChange={(e) => setSettings({ ...settings, bank_account_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] bg-white text-xs uppercase"
                />
              </div>
            </div>

            {/* Secondary Bank */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
              <span className="font-bold text-gray-900 text-xs block">Rekening Bank Cadangan (2)</span>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Bank</label>
                <input
                  type="text"
                  value={settings.secondary_bank_name || ''}
                  onChange={(e) => setSettings({ ...settings, secondary_bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] bg-white text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  value={settings.secondary_bank_account_number || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, secondary_bank_account_number: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] bg-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Atas Nama (A/N)</label>
                <input
                  type="text"
                  value={settings.secondary_bank_account_name || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, secondary_bank_account_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] bg-white text-xs uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Payment Switches & Maintenance */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
            <CreditCard size={16} className="text-[#E5391B]" />
            <span>Sakelar Metode Pembayaran &amp; Mode Toko</span>
          </h2>

          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <label className="flex items-center justify-between p-3.5 hover:bg-gray-50 cursor-pointer transition-colors">
                <div>
                  <span className="font-bold text-gray-900 block">Bayar di Tempat (COD)</span>
                  <span className="text-[11px] text-gray-500">
                    Pelanggan membayar uang tunai pas kepada kurir saat pesanan sampai.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.cod_enabled}
                  onChange={(e) => setSettings({ ...settings, cod_enabled: e.target.checked })}
                  className="w-5 h-5 text-[#E5391B] rounded border-gray-300 focus:ring-[#E5391B]"
                />
              </label>

              {settings.cod_enabled && (
                <div className="px-3.5 pb-3.5 pt-1 bg-[#FFF9F8] border-t border-red-100 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-gray-800 block">
                        Batas Maksimal Nominal Belanja COD (Rp):
                      </label>
                      <p className="text-[11px] text-gray-500">
                        Pesanan dengan total belanja di atas batas ini otomatis tidak dapat memilih COD (wajib Transfer Bank / QRIS) untuk mencegah risiko kerugian kurir &amp; pesanan fiktif.
                      </p>
                    </div>
                    <div className="w-full sm:w-48 shrink-0">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">Rp</span>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={settings.cod_max_amount ?? 200000}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              cod_max_amount: Math.max(0, parseInt(e.target.value) || 0),
                            })
                          }
                          className="w-full pl-9 pr-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 focus:border-[#E5391B] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                    <span>Rekomendasi toko ritel: <strong>Rp 200.000</strong>. Nilai saat ini: <strong>{formatRupiah(settings.cod_max_amount ?? 200000)}</strong></span>
                  </div>
                </div>
              )}
            </div>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
              <div>
                <span className="font-bold text-gray-900 block">Transfer Bank Manual (BSI / BAS)</span>
                <span className="text-[11px] text-gray-500">
                  Pelanggan mentransfer manual dan mengunggah foto bukti transfer untuk dicek kasir.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.bank_transfer_enabled}
                onChange={(e) => setSettings({ ...settings, bank_transfer_enabled: e.target.checked })}
                className="w-5 h-5 text-[#E5391B] rounded border-gray-300 focus:ring-[#E5391B]"
              />
            </label>

            <div className="border border-gray-200 rounded-xl overflow-hidden transition-all">
              <label className="flex items-center justify-between p-3.5 hover:bg-gray-50 cursor-pointer bg-white">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 block">Midtrans Payment Gateway (QRIS / E-Wallet)</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      settings.midtrans_is_production
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {settings.midtrans_is_production ? '🔴 PRODUCTION (LIVE)' : '🟡 SANDBOX (UJI COBA)'}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    Pembayaran instan online via QRIS, GoPay, ShopeePay, dan Virtual Account otomatis.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.midtrans_enabled}
                  onChange={(e) => setSettings({ ...settings, midtrans_enabled: e.target.checked })}
                  className="w-5 h-5 text-[#E5391B] rounded border-gray-300 focus:ring-[#E5391B]"
                />
              </label>

              {settings.midtrans_enabled && (
                <div className="p-4 bg-gray-50/80 border-t border-gray-200 space-y-4">
                  {/* Mode Selector */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1.5 text-xs">
                      Pilihan Lingkungan (Environment Mode):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label
                        className={`p-3 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                          !settings.midtrans_is_production
                            ? 'bg-white border-amber-500 shadow-xs ring-1 ring-amber-500/20'
                            : 'bg-white/60 border-gray-200 hover:bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="midtransEnv"
                          checked={!settings.midtrans_is_production}
                          onChange={() => setSettings({ ...settings, midtrans_is_production: false })}
                          className="accent-[#E5391B] mt-0.5"
                        />
                        <div>
                          <span className="font-extrabold text-amber-950 block">Mode Sandbox (Uji Coba)</span>
                          <span className="text-[10px] text-gray-500 block leading-tight mt-0.5">
                            Simulasi pembayaran QRIS &amp; transfer tanpa uang sungguhan. Cocok untuk demo dan pengembangan.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                          settings.midtrans_is_production
                            ? 'bg-white border-green-600 shadow-xs ring-1 ring-green-600/20'
                            : 'bg-white/60 border-gray-200 hover:bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="midtransEnv"
                          checked={!!settings.midtrans_is_production}
                          onChange={() => setSettings({ ...settings, midtrans_is_production: true })}
                          className="accent-green-600 mt-0.5"
                        />
                        <div>
                          <span className="font-extrabold text-green-950 block">Mode Production (Live Riil)</span>
                          <span className="text-[10px] text-gray-500 block leading-tight mt-0.5">
                            Menerima transaksi uang riil dari rekening &amp; e-wallet pelanggan toko Alvin Swalayan.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Credentials Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-gray-700">Client Key</label>
                        <a
                          href={settings.midtrans_is_production ? 'https://dashboard.midtrans.com' : 'https://dashboard.sandbox.midtrans.com/settings/access-keys/credentials'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          <span>Buka Dashboard</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      <input
                        type="text"
                        value={settings.midtrans_client_key || ''}
                        onChange={(e) => setSettings({ ...settings, midtrans_client_key: e.target.value.trim() })}
                        placeholder="Mid-client-..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] bg-white font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Server Key</label>
                      <input
                        type="text"
                        value={settings.midtrans_server_key || ''}
                        onChange={(e) => setSettings({ ...settings, midtrans_server_key: e.target.value.trim() })}
                        placeholder="Mid-server-..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#E5391B] bg-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Test Connection Button & Result */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleTestMidtrans}
                      disabled={isTestingMidtrans || !settings.midtrans_server_key}
                      className="bg-[#222222] hover:bg-black text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isTestingMidtrans ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Menguji Akses Midtrans...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={14} className="text-amber-400" />
                          <span>Uji Koneksi Midtrans ({settings.midtrans_is_production ? 'Production' : 'Sandbox'})</span>
                        </>
                      )}
                    </button>

                    {midtransStatus && (
                      <div className="mt-2.5 p-3 bg-green-50 border border-green-200 rounded-lg text-green-900 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-green-800">
                          <CheckCircle2 size={15} className="text-green-600" />
                          <span>{midtransStatus.message}</span>
                        </div>
                        <p className="text-[11px] text-green-700">
                          Mode: <b>{midtransStatus.environment}</b> • Token Snap berhasil dibangkitkan dari server Midtrans.
                        </p>
                      </div>
                    )}

                    {midtransError && (
                      <div className="mt-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs flex items-start gap-1.5">
                        <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                        <span>{midtransError}</span>
                      </div>
                    )}
                  </div>

                  {/* Handover Notice */}
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 text-[11px] text-amber-900 leading-relaxed">
                    <span className="font-bold text-amber-950 block mb-0.5">
                      💡 Peralihan ke Production Saat Klien Bayar DP:
                    </span>
                    Saat klien sudah menyelesaikan pembayaran DP dan akun Production Midtrans mereka aktif, Anda cukup memilih opsi <b>Mode Production (Live Riil)</b> di atas, masukkan Client Key &amp; Server Key Production, lalu klik <b>Simpan Semua Pengaturan</b> di bawah. Website langsung siap menerima uang riil tanpa perlu ubah kode.
                  </div>
                </div>
              )}
            </div>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-red-200 bg-red-50/40 hover:bg-red-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
                <div>
                  <span className="font-bold text-red-900 block">Mode Pemeliharaan (Maintenance Mode)</span>
                  <span className="text-[11px] text-red-700">
                    Jika diaktifkan, checkout untuk pelanggan akan ditutup sementara.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenance_mode}
                onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                className="w-5 h-5 text-red-600 rounded border-red-300 focus:ring-red-500"
              />
            </label>
          </div>
        </div>

        {/* Section 5: WhatsApp Gateway (Fonnte API) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare size={16} className="text-[#25D366]" />
              <span>Integrasi WhatsApp Gateway (Fonnte API)</span>
            </h2>
            <a
              href="https://md.fonnte.com/new/device.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-green-700 hover:text-green-800 flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Dashboard Fonnte</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Token Perangkat Fonnte (Device Token)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={settings.fonnte_token || ''}
                  onChange={(e) => setSettings({ ...settings, fonnte_token: e.target.value.trim() })}
                  placeholder="Masukkan token dari Fonnte (contoh: your-fonnte-token-here)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-green-600 bg-white font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleTestWhatsapp}
                  disabled={isTestingWhatsapp || !settings.fonnte_token}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isTestingWhatsapp ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Menguji...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      <span>Uji Koneksi Token</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test Results / Status Feedback */}
            {whatsappStatus && (
              <div className="p-3.5 bg-green-50/80 border border-green-200 rounded-xl space-y-2 text-green-900">
                <div className="flex items-center gap-2 font-bold text-xs text-green-800">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <span>Koneksi WhatsApp Gateway Aktif &amp; Terhubung!</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-green-200/60">
                  <div>
                    <span className="text-gray-500 block">Nomor HP Terhubung:</span>
                    <span className="font-bold font-mono text-gray-800">+{whatsappStatus.device}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Nama Perangkat:</span>
                    <span className="font-bold text-gray-800">{whatsappStatus.name || 'AlvinSwalayan'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Status Gateway:</span>
                    <span className="font-bold text-green-700 uppercase">{whatsappStatus.device_status || 'Connect'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Sisa Kuota:</span>
                    <span className="font-bold text-gray-800">{whatsappStatus.quota || '1000'} pesan</span>
                  </div>
                </div>
              </div>
            )}

            {whatsappError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
                <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                <span>{whatsappError}</span>
              </div>
            )}

            {/* Handover Notice */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold text-amber-950 block mb-0.5">
                💡 Panduan Serah Terima ke Klien:
              </span>
              Jika di kemudian hari kepemilikan website dialihkan ke pihak pemilik toko Alvin Swalayan atau ingin mengganti nomor WhatsApp gateway, Anda atau staf toko cukup membuka halaman ini, memasukkan token perangkat baru dari Fonnte, lalu klik <b>Simpan Semua Pengaturan</b> tanpa perlu mengubah kode sumber website.
            </div>
          </div>
        </div>

        {/* Submit Button Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="bg-[#E5391B] hover:bg-[#C62818] text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm flex items-center gap-2"
          >
            <Save size={16} />
            <span>Simpan Semua Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
}

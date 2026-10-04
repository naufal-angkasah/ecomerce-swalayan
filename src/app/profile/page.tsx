'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { CustomerAddress } from '@/types';
import { deduplicateAddresses } from '@/lib/utils';
import {
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Plus,
  CheckCircle2,
  Package,
  ShieldCheck,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';

export default function ProfilePage() {
  const {
    user,
    isAdmin,
    updateProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAuth();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [birthdate, setBirthdate] = useState(user?.birthdate || '');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Add Address Modal / Form State
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newLabel, setNewLabel] = useState('Rumah');
  const [newRecipient, setNewRecipient] = useState(user?.name || '');
  const [newPhone, setNewPhone] = useState(user?.phone || '');
  const [newFullAddress, setNewFullAddress] = useState('');
  const [newDistrict, setNewDistrict] = useState('Kec. Banda Raya');
  const [newNotes, setNewNotes] = useState('');
  const [newIsPrimary, setNewIsPrimary] = useState(false);

  // Edit Address Modal / Form State
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [editLabel, setEditLabel] = useState('Rumah');
  const [editRecipient, setEditRecipient] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDistrict, setEditDistrict] = useState('Kec. Banda Raya');
  const [editFullAddress, setEditFullAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editIsPrimary, setEditIsPrimary] = useState(false);

  // Delete Address Confirmation State
  const [deletingAddress, setDeletingAddress] = useState<CustomerAddress | null>(null);

  // Feedback notifications for addresses
  const [addressSuccess, setAddressSuccess] = useState('');
  const [addressError, setAddressError] = useState('');

  const cleanAddresses = React.useMemo(() => deduplicateAddresses(user?.addresses || []), [user?.addresses]);

  // Sync state if user changes/loads from database
  React.useEffect(() => {
    if (user) {
      if (!isEditingProfile) {
        setName(user.name || '');
        setPhone(user.phone || '');
        setBirthdate(user.birthdate || '');
      }
      if (!newPhone && user.phone) {
        setNewPhone(user.phone);
      }
      if (!newRecipient && user.name) {
        setNewRecipient(user.name);
      }
    }
  }, [user, isEditingProfile]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-[#222222] mb-2">Silakan Masuk Terlebih Dahulu</h2>
        <p className="text-xs text-[#6B7280] mb-6">
          Anda perlu masuk untuk melihat profil dan mengelola alamat pengiriman Anda.
        </p>
        <Link
          href="/login"
          className="bg-[#E5391B] text-white px-5 py-2.5 rounded-lg text-xs font-bold"
        >
          Masuk ke Akun
        </Link>
      </div>
    );
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    // Auto-sync nomor HP & nama penerima di alamat utama / alamat dengan no hp lama
    const updatedAddresses = cleanAddresses.map((a) => {
      const isPhoneMatchOrPrimary = a.is_primary || a.is_default || a.phone === user.phone || !a.phone;
      const isNameMatchOrPrimary = a.is_primary || a.is_default || a.recipient_name === user.name || !a.recipient_name;
      return {
        ...a,
        phone: isPhoneMatchOrPrimary && cleanPhone ? cleanPhone : a.phone,
        recipient_name: isNameMatchOrPrimary && cleanName ? cleanName : a.recipient_name,
      };
    });

    updateProfile({
      name: cleanName,
      phone: cleanPhone,
      birthdate,
      addresses: deduplicateAddresses(updatedAddresses),
    });
    setIsEditingProfile(false);
    setProfileSuccess('Data pribadi & nomor kontak alamat berhasil diperbarui!');
    setTimeout(() => setProfileSuccess(''), 3000);
  };

  const handleCreateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullAddress.trim()) {
      setAddressError('Silakan masukkan alamat lengkap pengiriman.');
      setTimeout(() => setAddressError(''), 3000);
      return;
    }

    const normNew = newFullAddress.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    const alreadyExists = cleanAddresses.some((a) => {
      const norm = (a.full_address || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
      return norm === normNew;
    });

    if (alreadyExists) {
      setAddressError('Alamat ini sudah tersimpan dalam daftar alamat Anda.');
      setTimeout(() => setAddressError(''), 3500);
      return;
    }

    const isFirstAddress = cleanAddresses.length === 0;

    addAddress({
      label: newLabel.trim() || 'Rumah',
      recipient_name: newRecipient.trim() || user.name || 'Pelanggan',
      phone: newPhone.trim() || user.phone || '',
      full_address: newFullAddress.trim(),
      area_district: newDistrict,
      district: newDistrict,
      city: 'Banda Aceh',
      postal_code: '23117',
      delivery_notes: newNotes.trim() || undefined,
      notes: newNotes.trim() || undefined,
      is_primary: isFirstAddress || newIsPrimary,
      is_default: isFirstAddress || newIsPrimary,
    });

    setShowAddAddress(false);
    setNewLabel('Rumah');
    setNewRecipient(user.name || '');
    setNewPhone(user.phone || '');
    setNewFullAddress('');
    setNewNotes('');
    setNewIsPrimary(false);
    setAddressSuccess('Alamat baru berhasil ditambahkan!');
    setTimeout(() => setAddressSuccess(''), 3000);
  };

  const handleOpenEditAddress = (addr: CustomerAddress) => {
    setEditingAddress(addr);
    setEditLabel(addr.label || 'Rumah');
    setEditRecipient(addr.recipient_name || user.name || '');
    setEditPhone(addr.phone || user.phone || '');
    setEditDistrict(addr.area_district || addr.district || 'Kec. Banda Raya');
    setEditFullAddress(addr.full_address || '');
    setEditNotes(addr.delivery_notes || addr.notes || '');
    setEditIsPrimary(Boolean(addr.is_primary || addr.is_default));
  };

  const handleSaveEditAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddress) return;
    if (!editFullAddress.trim()) {
      setAddressError('Alamat lengkap tidak boleh kosong.');
      setTimeout(() => setAddressError(''), 3000);
      return;
    }

    updateAddress(editingAddress.id, {
      label: editLabel.trim() || 'Rumah',
      recipient_name: editRecipient.trim() || user.name || 'Pelanggan',
      phone: editPhone.trim() || user.phone || '',
      area_district: editDistrict,
      district: editDistrict,
      city: 'Banda Aceh',
      postal_code: '23117',
      full_address: editFullAddress.trim(),
      delivery_notes: editNotes.trim() || undefined,
      notes: editNotes.trim() || undefined,
      is_primary: editIsPrimary,
      is_default: editIsPrimary,
    });

    setEditingAddress(null);
    setAddressSuccess('Alamat berhasil diperbarui!');
    setTimeout(() => setAddressSuccess(''), 3000);
  };

  const handlePromptDeleteAddress = (addr: CustomerAddress) => {
    setDeletingAddress(addr);
  };

  const handleConfirmDeleteAddress = () => {
    if (!deletingAddress) return;
    const label = deletingAddress.label;
    deleteAddress(deletingAddress.id);
    setDeletingAddress(null);
    setAddressSuccess(`Alamat "${label}" berhasil dihapus.`);
    setTimeout(() => setAddressSuccess(''), 3000);
  };

  const handleSetDefault = (addressId: string) => {
    setDefaultAddress(addressId);
    setAddressSuccess('Alamat utama berhasil diubah!');
    setTimeout(() => setAddressSuccess(''), 3000);
  };

  const districtsInBandaAceh = [
    'Kec. Banda Raya',
    'Kec. Baiturrahman',
    'Kec. Kuta Alam',
    'Kec. Lueng Bata',
    'Kec. Syiah Kuala',
    'Kec. Ulee Kareng',
    'Kec. Meuraxa',
    'Kec. Jaya Baru',
    'Kec. Kuta Raja',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#E5E7EB] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#222222]">
            Profil &amp; Akun Saya
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Kelola data diri dan daftar alamat pengiriman belanjaan Anda
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="bg-[#E5391B] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#C62818] flex items-center gap-1.5"
            >
              <ShieldCheck size={14} />
              <span>Portal Admin</span>
            </Link>
          </div>
        )}
      </div>

      {profileSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-xs font-bold p-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{profileSuccess}</span>
        </div>
      )}

      {/* Alert if Profile Incomplete */}
      {(!user.phone || !user.addresses || user.addresses.length === 0) && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-extrabold text-sm text-amber-950">
              Lengkapi Nomor WhatsApp &amp; Alamat Pengiriman
            </p>
            <p className="text-amber-800 leading-relaxed">
              Agar Anda dapat melakukan transaksi belanja sembako dan menerima pengantaran kurir di Banda Aceh, silakan lengkapi <strong>Nomor WhatsApp</strong> Anda pada form Data Pribadi dan tambahkan minimal satu <strong>Alamat Pengiriman</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Personal Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-[#E5391B]" />
                <span>Data Pribadi</span>
              </h2>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="text-xs text-[#E5391B] font-bold hover:underline"
              >
                {isEditingProfile ? 'Batal' : 'Ubah'}
              </button>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-600 font-bold mb-1">Nama</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-md focus:border-[#E5391B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-bold mb-1">Nomor WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081269008899"
                    className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-md focus:border-[#E5391B] focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Contoh: 081269008899 atau 08xxxxxxxxxx</p>
                </div>
                <div>
                  <label className="block text-gray-600 font-bold mb-1">Tanggal Lahir (Opsional)</label>
                  <input
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-md focus:border-[#E5391B] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#E5391B] text-white py-2 rounded-md font-bold text-xs"
                >
                  Simpan Perubahan
                </button>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] text-gray-400 block">Nama Lengkap</span>
                  <span className="font-bold text-[#222222]">{user.name}</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 block">Email</span>
                  <span className="font-medium text-[#222222] flex items-center gap-1.5">
                    <Mail size={13} className="text-gray-400" />
                    <span>{user.email}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 block">No. WhatsApp</span>
                  <span className="font-medium text-[#222222] flex items-center gap-1.5">
                    <Phone size={13} className="text-gray-400" />
                    <span>{user.phone}</span>
                  </span>
                </div>
                {user.birthdate && (
                  <div>
                    <span className="text-[11px] text-gray-400 block">Tanggal Lahir</span>
                    <span className="font-medium text-[#222222] flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-400" />
                      <span>{user.birthdate}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Orders Link */}
          <Link
            href="/orders"
            className="bg-[#FFF7F5] border border-[#E5E7EB] hover:border-[#E5391B] p-4 rounded-xl flex items-center justify-between text-xs font-bold text-[#222222] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Package size={18} className="text-[#E5391B]" />
              <span>Lihat Riwayat Pesanan Saya</span>
            </div>
            <span className="text-[#E5391B]">→</span>
          </Link>
        </div>

        {/* Right Column: Multiple Delivery Addresses */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h2 className="text-sm font-bold text-[#222222] flex items-center gap-1.5">
                  <MapPin size={16} className="text-[#E5391B]" />
                  <span>Daftar Alamat Pengiriman</span>
                </h2>
                <p className="text-[11px] text-gray-500">
                  Simpan beberapa alamat rumah, toko, atau kantor untuk checkout kilat
                </p>
              </div>

              <button
                onClick={() => setShowAddAddress(!showAddAddress)}
                className="bg-[#E5391B] hover:bg-[#C62818] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Alamat</span>
              </button>
            </div>

            {/* Address Feedback Notifications */}
            {addressSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{addressSuccess}</span>
              </div>
            )}
            {addressError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
                <AlertCircle size={16} className="text-red-600 shrink-0" />
                <span>{addressError}</span>
              </div>
            )}

            {/* Form Add New Address */}
            {showAddAddress && (
              <form
                onSubmit={handleCreateAddress}
                className="bg-[#FFF7F5] border border-[#E5E7EB] p-4 rounded-xl space-y-3 text-xs animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between border-b border-[#FEE2E2] pb-2">
                  <h3 className="font-bold text-[#222222] flex items-center gap-1.5">
                    <Plus size={15} className="text-[#E5391B]" />
                    <span>Tambah Alamat Pengiriman Baru</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Label Alamat <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Rumah / Toko / Kantor / Kos"
                      className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-xs focus:border-[#E5391B] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Nama Penerima <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-xs focus:border-[#E5391B] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      No. WhatsApp Penerima <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="Contoh: 081269008899"
                      className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-xs focus:border-[#E5391B] outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Kurir akan menghubungi no. ini saat pengantaran</p>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Kecamatan (Banda Aceh) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newDistrict}
                      onChange={(e) => setNewDistrict(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-xs font-semibold focus:border-[#E5391B] outline-none"
                    >
                      {districtsInBandaAceh.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Alamat Lengkap <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={newFullAddress}
                    onChange={(e) => setNewFullAddress(e.target.value)}
                    placeholder="Nama jalan, nomor rumah, lorong, RT/RW, dsb..."
                    className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-xs focus:border-[#E5391B] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Catatan / Patokan (Opsional)</label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Contoh: Rumah cat putih pagar hitam samping musholla..."
                    className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-xs focus:border-[#E5391B] outline-none"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newIsPrimary}
                      onChange={(e) => setNewIsPrimary(e.target.checked)}
                      className="rounded text-[#E5391B] focus:ring-[#E5391B] w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-gray-700 text-xs">
                      Jadikan sebagai Alamat Utama
                    </span>
                  </label>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#FEE2E2]">
                  <button
                    type="submit"
                    className="bg-[#E5391B] hover:bg-[#C62818] text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                  >
                    Simpan Alamat
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(false)}
                    className="border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}

            {/* Addresses List */}
            {cleanAddresses.length === 0 ? (
              <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/60">
                <MapPin className="mx-auto h-9 w-9 text-gray-400 mb-2" />
                <p className="text-xs font-bold text-gray-800">Belum ada alamat pengiriman tersimpan</p>
                <p className="text-[11px] text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                  Tambahkan alamat rumah, toko, atau kantor Anda di Banda Aceh agar proses checkout belanja makin cepat dan akurat.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddAddress(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E5391B] hover:bg-[#C62818] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>Tambah Alamat Pertama</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cleanAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-xl border transition-all text-xs ${
                      addr.is_primary || addr.is_default
                        ? 'border-[#E5391B] bg-[#FFF7F5] shadow-xs'
                        : 'border-[#E5E7EB] bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-[#222222]">
                          {addr.label}
                        </span>
                        {(addr.is_primary || addr.is_default) && (
                          <span className="bg-[#E5391B] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">
                            Alamat Utama
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="font-semibold text-gray-800">
                      {addr.recipient_name}{' '}
                      <span className="text-gray-500 font-normal">({addr.phone})</span>
                    </p>

                    <p className="text-gray-700 mt-1 leading-relaxed">
                      {addr.full_address}, {addr.area_district || addr.district || 'Kec. Banda Raya'}, {addr.city || 'Banda Aceh'} {addr.postal_code || '23117'}
                    </p>

                    {(addr.delivery_notes || addr.notes) && (
                      <p className="text-[11px] text-gray-500 mt-1 italic">
                        Patokan: &ldquo;{addr.delivery_notes || addr.notes}&rdquo;
                      </p>
                    )}

                    {/* Action Buttons: Set Default, Edit, Delete */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 mt-3 flex-wrap">
                      <div>
                        {!(addr.is_primary || addr.is_default) && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(addr.id)}
                            className="text-[11px] font-bold text-gray-700 hover:text-[#E5391B] px-2.5 py-1 rounded border border-gray-200 hover:border-[#E5391B] hover:bg-white transition-colors cursor-pointer"
                          >
                            Jadikan Alamat Utama
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAddress(addr)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Pencil size={12} />
                          <span>Ubah</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePromptDeleteAddress(addr)}
                          className="text-[11px] font-bold text-red-600 hover:text-red-800 bg-red-50/80 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Address Modal */}
      {editingAddress && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Pencil size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                    Ubah Alamat Pengiriman
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Perbarui kontak dan detail alamat untuk pengantaran kurir
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAddress(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditAddress} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Label Alamat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Contoh: Rumah, Kantor, Toko, Kos"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5391B]/20 focus:border-[#E5391B] outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Nama Penerima <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editRecipient}
                    onChange={(e) => setEditRecipient(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5391B]/20 focus:border-[#E5391B] outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    No. WhatsApp Penerima <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Contoh: 081269008899"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5391B]/20 focus:border-[#E5391B] outline-none text-xs"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Kurir akan menghubungi nomor ini saat pesanan diantar.
                  </p>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Kecamatan (Banda Aceh) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5391B]/20 focus:border-[#E5391B] outline-none text-xs font-semibold bg-white"
                  >
                    {districtsInBandaAceh.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Alamat Lengkap <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editFullAddress}
                  onChange={(e) => setEditFullAddress(e.target.value)}
                  placeholder="Nama jalan, nomor rumah, lorong, RT/RW, dsb..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5391B]/20 focus:border-[#E5391B] outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Catatan / Patokan Lokasi (Opsional)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Contoh: Pagar hitam, samping musholla, seberang warung kopi..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5391B]/20 focus:border-[#E5391B] outline-none text-xs"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editIsPrimary}
                    onChange={(e) => setEditIsPrimary(e.target.checked)}
                    className="rounded text-[#E5391B] focus:ring-[#E5391B] w-4 h-4 cursor-pointer"
                  />
                  <span className="font-bold text-gray-800 text-xs">
                    Jadikan sebagai Alamat Utama
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setEditingAddress(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E5391B] hover:bg-[#C62818] text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Address Confirmation Modal */}
      {deletingAddress && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900">
                  Hapus Alamat Pengiriman?
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus alamat <strong>&ldquo;{deletingAddress.label}&rdquo;</strong>?
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs mb-5 space-y-1">
              <div className="font-bold text-gray-800">
                {deletingAddress.recipient_name}{' '}
                <span className="text-gray-500 font-normal">({deletingAddress.phone})</span>
              </div>
              <div className="text-gray-600 leading-relaxed">
                {deletingAddress.full_address}, {deletingAddress.area_district || deletingAddress.district}, {deletingAddress.city || 'Banda Aceh'}
              </div>
              {(deletingAddress.is_primary || deletingAddress.is_default) && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg font-medium mt-2">
                  <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                  <span>Ini adalah alamat utama. Jika dihapus, alamat tersimpan lainnya otomatis menjadi alamat utama.</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingAddress(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAddress}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Ya, Hapus Alamat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

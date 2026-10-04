'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, CustomerAddress } from '@/types';
import { MOCK_USER } from '@/services/mockData';
import { LogoutConfirmModal } from '@/components/ui/LogoutConfirmModal';
import { GoogleLoginModal } from '@/components/auth/GoogleLoginModal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { deduplicateAddresses } from '@/lib/utils';

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isLogoutModalOpen: boolean;
  isGoogleModalOpen: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  openGoogleModal: () => void;
  closeGoogleModal: () => void;
  loginWithGoogleAccount: (email: string, name: string) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, pass: string, phone: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  requestLogout: () => void;
  cancelLogout: () => void;
  confirmLogout: () => void;
  addAddress: (address: Omit<CustomerAddress, 'id'>) => void;
  updateAddress: (addressId: string, address: Partial<CustomerAddress>) => void;
  deleteAddress: (addressId: string) => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  setDefaultAddress: (addressId: string) => void;
  switchToCustomer: () => void;
  switchToAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_AUTH = 'alvin_auth_user_v1';
const STORAGE_KEY_REGISTERED_USERS = 'alvin_registered_users_v1';
const STORAGE_KEY_CUSTOMER_LAST_ACTIVITY = 'alvin_customer_last_activity_v1';
const CUSTOMER_SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 Jam tidak aktif

function getRegisteredUsers(): (UserProfile & { password?: string })[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REGISTERED_USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegisteredUser(u: UserProfile & { password?: string }): void {
  if (typeof window === 'undefined') return;
  try {
    const users = getRegisteredUsers();
    const idx = users.findIndex((existing) => existing.email.toLowerCase() === u.email.toLowerCase());
    if (idx !== -1) {
      const existingPassword = users[idx].password;
      users[idx] = { ...users[idx], ...u };
      if (!u.password && existingPassword) {
        users[idx].password = existingPassword;
      }
    } else {
      users.push(u);
    }
    localStorage.setItem(STORAGE_KEY_REGISTERED_USERS, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save registered user', err);
  }
}

/**
 * Simple deterministic hash for passwords stored in localStorage.
 * Not cryptographically perfect but far better than plain text.
 * Prevents casual snooping via DevTools.
 */
function hashPassword(plain: string): string {
  // XOR-fold + base64 encoding — deterministic, browser-safe
  const salt = 'alvin_sw_2025';
  const combined = plain + salt;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
  }
  return btoa(`${Math.abs(hash).toString(36)}_${combined.length}_${plain.length}`);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUTH);
      if (raw) {
        const parsed: UserProfile = JSON.parse(raw);
        if (parsed.addresses && Array.isArray(parsed.addresses)) {
          const originalLen = parsed.addresses.length;
          parsed.addresses = deduplicateAddresses(parsed.addresses);
          if (parsed.addresses.length !== originalLen) {
            localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(parsed));
            saveRegisteredUser(parsed);
          }
        }

        // ── Khusus akun pelanggan (bukan admin): periksa batas 24 jam tidak aktif ──
        if (parsed.role !== 'admin') {
          const lastActiveStr = localStorage.getItem(STORAGE_KEY_CUSTOMER_LAST_ACTIVITY);
          const now = Date.now();
          if (lastActiveStr) {
            const lastActive = parseInt(lastActiveStr, 10);
            if (!isNaN(lastActive) && now - lastActive > CUSTOMER_SESSION_TIMEOUT_MS) {
              // Sesi pelanggan telah kadaluwarsa (lebih dari 24 jam tidak aktif)
              console.warn('Sesi pelanggan telah berakhir otomatis (tidak aktif selama 24 jam).');
              localStorage.removeItem(STORAGE_KEY_AUTH);
              localStorage.removeItem(STORAGE_KEY_CUSTOMER_LAST_ACTIVITY);
              setUser(null);
              setIsLoading(false);
              return;
            }
          }
          // Perbarui waktu aktivitas terakhir
          localStorage.setItem(STORAGE_KEY_CUSTOMER_LAST_ACTIVITY, String(now));
        }

        // Akun admin tidak pernah kadaluwarsa (bebas session timeout)
        setUser(parsed);

        // Asynchronously check database to keep profile up to date
        if (parsed.email && parsed.role !== 'admin') {
          fetch(`/api/customer/profile?email=${encodeURIComponent(parsed.email)}&userId=${parsed.id}`)
            .then((r) => r.json())
            .then((dbData) => {
              if (dbData && (dbData.profile || (dbData.addresses && dbData.addresses.length > 0))) {
                setUser((prev) => {
                  if (!prev || prev.email.toLowerCase() !== parsed.email.toLowerCase()) return prev;
                  const mergedAddresses = deduplicateAddresses<CustomerAddress>(
                    dbData.addresses && dbData.addresses.length > 0
                      ? dbData.addresses
                      : prev.addresses || []
                  );
                  const merged: UserProfile = {
                    ...prev,
                    name: dbData.profile?.name || prev.name,
                    phone: dbData.profile?.phone || prev.phone,
                    birthdate: dbData.profile?.birthdate || prev.birthdate,
                    addresses: mergedAddresses,
                  };
                  localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(merged));
                  saveRegisteredUser(merged);
                  return merged;
                });
              }
            })
            .catch(() => {});
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Auto-logout 24 jam tidak aktif khusus akun pelanggan (Admin TIDAK kena batas sesi) ──
  useEffect(() => {
    if (!user || user.role === 'admin') return;

    // Catat interaksi pengguna dengan throttling 30 detik agar hemat performa
    let lastRecorded = Date.now();
    const recordActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 30000) {
        lastRecorded = now;
        try {
          localStorage.setItem(STORAGE_KEY_CUSTOMER_LAST_ACTIVITY, String(now));
        } catch {}
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'focus'];
    activityEvents.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }));

    // Cek berkala setiap 60 detik jika browser dibiarkan menyala >24 jam tanpa aktivitas
    const checkInterval = setInterval(() => {
      try {
        const lastActiveStr = localStorage.getItem(STORAGE_KEY_CUSTOMER_LAST_ACTIVITY);
        if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr, 10);
          if (!isNaN(lastActive) && Date.now() - lastActive > CUSTOMER_SESSION_TIMEOUT_MS) {
            console.warn('Otomatis keluar: Pelanggan tidak aktif lebih dari 24 jam.');
            saveUser(null);
          }
        }
      } catch {}
    }, 60000);

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, recordActivity));
      clearInterval(checkInterval);
    };
  }, [user]);

  // Sync Supabase Auth session if active (e.g. from real Google SSO)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && session.user.email) {
        const sEmail = session.user.email.toLowerCase();
        const sName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          sEmail.split('@')[0];

        const registered = getRegisteredUsers();
        const existing = registered.find((u) => u.email.toLowerCase() === sEmail);

        let currentUser: UserProfile = existing || {
          id: `usr-sb-${session.user.id}`,
          name: sName,
          email: sEmail,
          phone: '',
          role: 'customer',
          addresses: [],
          created_at: new Date().toISOString(),
        };

        // Fetch latest data from database
        try {
          const res = await fetch(
            `/api/customer/profile?email=${encodeURIComponent(sEmail)}&userId=${session.user.id}`
          );
          if (res.ok) {
            const dbData = await res.json();
            if (dbData && (dbData.profile || (dbData.addresses && dbData.addresses.length > 0))) {
              currentUser = {
                ...currentUser,
                name: dbData.profile?.name || currentUser.name,
                phone: dbData.profile?.phone || currentUser.phone,
                birthdate: dbData.profile?.birthdate || currentUser.birthdate,
                addresses: deduplicateAddresses<CustomerAddress>(
                  dbData.addresses && dbData.addresses.length > 0
                    ? dbData.addresses
                    : currentUser.addresses || []
                ),
              };
            }
          }
        } catch (e) {
          console.warn('Could not fetch remote profile:', e);
        }

        saveUser(currentUser);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const saveUser = (u: UserProfile | null) => {
    const cleanUser = u
      ? {
          ...u,
          addresses: deduplicateAddresses(u.addresses || []),
        }
      : null;

    setUser(cleanUser);
    if (cleanUser) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(cleanUser));
      // Khusus pelanggan: catat waktu aktivitas login/pembaruan profil
      if (cleanUser.role !== 'admin') {
        localStorage.setItem(STORAGE_KEY_CUSTOMER_LAST_ACTIVITY, String(Date.now()));
        saveRegisteredUser(cleanUser);

        // Async sync to Supabase database
        if (cleanUser.email) {
          fetch('/api/customer/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: cleanUser.id,
              email: cleanUser.email,
              name: cleanUser.name,
              phone: cleanUser.phone,
              birthdate: cleanUser.birthdate,
              addresses: cleanUser.addresses || [],
            }),
          }).catch((err) => console.error('Failed to sync profile to database:', err));
        }
      } else {
        // Akun admin tidak menggunakan session timeout
        localStorage.removeItem(STORAGE_KEY_CUSTOMER_LAST_ACTIVITY);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem(STORAGE_KEY_CUSTOMER_LAST_ACTIVITY);
    }
  };

  const login = async (email: string, pass?: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // ── Admin login: verify via server API (credentials never touch the browser) ──
    // We check if the user is attempting admin login by calling the server endpoint.
    // The server compares against ADMIN_EMAIL + ADMIN_PASSWORD env vars.
    if (pass) {
      try {
        const res = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: pass }),
        });
        const data = await res.json();
        if (data.success) {
          const adminUser: UserProfile = {
            id: 'usr-admin',
            name: 'Admin Alvin Swalayan',
            email: cleanEmail,
            phone: '081269008899',
            role: 'admin',
            addresses: [],
            created_at: new Date().toISOString(),
          };
          saveUser(adminUser);
          // Set session cookie for middleware server-side protection (Lax allows standard top-level navigation)
          document.cookie = 'alvin_admin_session=true; path=/; SameSite=Lax; max-age=604800';
          return { success: true, message: 'Berhasil masuk sebagai Admin!' };
        }
        // If server returns 401, fall through to check customer accounts
      } catch {
        // Network error — fall through to customer login
      }
    }

    // ── Customer login ──
    const registered = getRegisteredUsers();
    const existing = registered.find((u) => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      if (pass && existing.password) {
        // Compare hashed password
        const hashedInput = hashPassword(pass);
        if (existing.password !== hashedInput && existing.password !== pass) {
          return { success: false, message: 'Kata sandi tidak sesuai. Silakan periksa kembali.' };
        }
      }
      // Strip password before saving to session
      const { password: _pw, ...safeUser } = existing as UserProfile & { password?: string };
      saveUser(safeUser);
      return { success: true, message: `Selamat datang kembali, ${existing.name}!` };
    }

    // New customer auto-create (email login without prior registration)
    const namePart = cleanEmail.split('@')[0].replace(/[._-]+/g, ' ');
    const formattedName = namePart
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const newCustomer: UserProfile = {
      id: `usr-${Date.now()}`,
      name: formattedName || 'Pelanggan Setia',
      email: cleanEmail,
      phone: '',
      role: 'customer',
      addresses: [],
      created_at: new Date().toISOString(),
    };

    // Store with hashed password
    saveRegisteredUser({ ...newCustomer, password: pass ? hashPassword(pass) : undefined });
    saveUser(newCustomer);
    return { success: true, message: `Berhasil masuk ke akun Alvin Swalayan!` };
  };

  const openGoogleModal = () => {
    setIsGoogleModalOpen(true);
  };

  const closeGoogleModal = () => {
    setIsGoogleModalOpen(false);
  };

  const loginWithGoogleAccount = async (
    googleEmail: string,
    googleName: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = googleEmail.trim().toLowerCase();
    const registered = getRegisteredUsers();
    const existing = registered.find((u) => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      saveUser(existing);
      return { success: true, message: `Selamat datang kembali, ${existing.name}!` };
    }

    // New Google User: Authentic account, strictly NO dummy phone and NO dummy address
    const newGoogleUser: UserProfile = {
      id: `usr-g-${Date.now()}`,
      name: googleName.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: '', // Wajib dilengkapi sebelum belanja
      role: 'customer',
      addresses: [], // Wajib dilengkapi sebelum belanja
      created_at: new Date().toISOString(),
    };

    saveRegisteredUser(newGoogleUser);
    saveUser(newGoogleUser);
    return { success: true, message: `Berhasil masuk dengan akun Google ${cleanEmail}!` };
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; message: string }> => {
    // If Supabase OAuth is configured, trigger official Google SSO
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });
        if (!error && data?.url) {
          window.location.href = data.url;
          return { success: true, message: 'Mengarahkan ke Google SSO resmi...' };
        }
      } catch (err) {
        console.warn('Supabase Google OAuth fallback:', err);
      }
    }

    // Fallback to manual dialog if offline/unconfigured
    openGoogleModal();
    return { success: true, message: 'Membuka dialog Google Login...' };
  };

  const register = async (name: string, email: string, pass: string, phone: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const registered = getRegisteredUsers();
    const existing = registered.find((u) => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      return { success: false, message: 'Email sudah terdaftar. Silakan langsung masuk ke akun Anda.' };
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim() || '081269008899',
      role: 'customer',
      addresses: [
        {
          id: `addr-${Date.now()}`,
          label: 'Alamat Rumah',
          recipient_name: name.trim(),
          phone: phone.trim() || '081269008899',
          full_address: 'Jl. Utama Banda Aceh',
          area_district: 'Kec. Banda Raya',
          city: 'Banda Aceh',
          postal_code: '23117',
          is_primary: true,
        },
      ],
      created_at: new Date().toISOString(),
    };

    saveRegisteredUser({ ...newUser, password: hashPassword(pass) });
    saveUser(newUser);
    return { success: true, message: 'Pendaftaran akun berhasil!' };
  };

  const resetPassword = async (
    email: string,
    newPass: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Harap masukkan alamat email yang valid.' };
    }

    if (!newPass || newPass.length < 6) {
      return { success: false, message: 'Kata sandi baru minimal 6 karakter.' };
    }

    // Perlindungan: Kata sandi Admin tidak dapat diatur ulang dari formulir publik pelanggan
    if (cleanEmail === 'admin@alvinswalayan.com' || cleanEmail.includes('admin')) {
      return {
        success: false,
        message: 'Demi keamanan, kata sandi akun Admin hanya dapat diubah oleh pemilik sistem melalui konfigurasi server atau hubungi administrator.',
      };
    }

    const registered = getRegisteredUsers();
    const existingIndex = registered.findIndex((u) => u.email.toLowerCase() === cleanEmail);

    if (existingIndex === -1) {
      // Jika merupakan akun demo pelanggan (cut.nurul@gmail.com)
      if (cleanEmail === MOCK_USER.email.toLowerCase()) {
        const mockCustomer: UserProfile & { password?: string } = {
          ...MOCK_USER,
          password: hashPassword(newPass),
        };
        saveRegisteredUser(mockCustomer);
        return {
          success: true,
          message: 'Kata sandi akun Cut Nurul berhasil diperbarui! Silakan masuk dengan sandi baru.',
        };
      }

      return {
        success: false,
        message: 'Akun dengan email ini belum terdaftar. Pastikan email sudah benar atau buat akun baru.',
      };
    }

    // Perbarui kata sandi ter-hash di localStorage
    registered[existingIndex] = {
      ...registered[existingIndex],
      password: hashPassword(newPass),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_REGISTERED_USERS, JSON.stringify(registered));
    }

    // Jika Supabase auth aktif, picu reset email tanpa memblokir
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(cleanEmail);
      } catch {}
    }

    return {
      success: true,
      message: 'Kata sandi Anda berhasil diperbarui! Silakan masuk dengan kata sandi baru.',
    };
  };

  const requestLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const cancelLogout = () => {
    setIsLogoutModalOpen(false);
  };

  const confirmLogout = () => {
    // Clear admin session cookie client and server side
    document.cookie = 'alvin_admin_session=; path=/; max-age=0';
    fetch('/api/auth/admin-logout', { method: 'POST' }).catch(() => {});
    const wasAdmin = user?.role === 'admin';
    saveUser(null);
    setIsLogoutModalOpen(false);
    if (wasAdmin) {
      window.location.href = '/';
    } else {
      router.push('/');
    }
  };

  const logout = () => {
    // Clear admin session cookie client and server side
    document.cookie = 'alvin_admin_session=; path=/; max-age=0';
    fetch('/api/auth/admin-logout', { method: 'POST' }).catch(() => {});
    const wasAdmin = user?.role === 'admin';
    saveUser(null);
    setIsLogoutModalOpen(false);
    if (wasAdmin) {
      window.location.href = '/';
    } else {
      router.push('/');
    }
  };

  const addAddress = (addrData: Omit<CustomerAddress, 'id'>) => {
    if (!user) return;

    // Check if duplicate address text already exists
    const normNewText = (addrData.full_address || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const existingIdx = (user.addresses || []).findIndex((a) => {
      const normExisting = (a.full_address || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return normExisting === normNewText;
    });

    if (existingIdx !== -1) {
      // Address text already exists! Update existing address instead of creating a duplicate
      const updated = (user.addresses || []).map((a, idx) => {
        if (idx === existingIdx) {
          return {
            ...a,
            recipient_name: addrData.recipient_name || a.recipient_name,
            phone: addrData.phone || a.phone,
            delivery_notes: addrData.delivery_notes || a.delivery_notes,
            notes: addrData.delivery_notes || a.notes,
            is_primary: addrData.is_primary ? true : a.is_primary,
            is_default: addrData.is_primary ? true : a.is_default,
          };
        }
        if (addrData.is_primary) {
          return { ...a, is_primary: false, is_default: false };
        }
        return a;
      });

      const updatedPhone = !user.phone && addrData.phone ? addrData.phone : user.phone;
      saveUser({ ...user, phone: updatedPhone, addresses: deduplicateAddresses(updated) });
      return;
    }

    const newAddress: CustomerAddress = {
      ...addrData,
      id: `addr-${Date.now()}`,
    };
    const updatedAddresses: CustomerAddress[] = addrData.is_primary
      ? [...(user.addresses || []).map((a) => ({ ...a, is_primary: false, is_default: false })), newAddress]
      : [...(user.addresses || []), newAddress];

    // If user's profile phone is empty, auto-update with this address's phone
    const updatedPhone = !user.phone && addrData.phone ? addrData.phone : user.phone;

    const updatedUser = { ...user, phone: updatedPhone, addresses: deduplicateAddresses(updatedAddresses) };
    saveUser(updatedUser);
  };

  const updateAddress = (addressId: string, addressData: Partial<CustomerAddress>) => {
    if (!user) return;
    const updated = user.addresses.map((a) => {
      if (a.id === addressId) {
        return { ...a, ...addressData };
      }
      if (addressData.is_primary) {
        return { ...a, is_primary: false };
      }
      return a;
    });
    if (updated.length > 0 && !updated.some((a) => a.is_primary)) {
      updated[0].is_primary = true;
    }
    const updatedPhone = !user.phone && addressData.phone ? addressData.phone : user.phone;
    saveUser({ ...user, phone: updatedPhone, addresses: updated });
  };

  const deleteAddress = (addressId: string) => {
    if (!user) return;
    const remaining = user.addresses.filter((a) => a.id !== addressId);
    if (remaining.length > 0 && !remaining.some((a) => a.is_primary)) {
      remaining[0].is_primary = true;
    }
    saveUser({ ...user, addresses: remaining });
  };

  const setDefaultAddress = (addressId: string) => {
    if (!user) return;
    const updated = user.addresses.map((a) => ({
      ...a,
      is_primary: a.id === addressId,
    }));
    saveUser({ ...user, addresses: updated });
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    if (!user) return;

    const oldPhone = user.phone;
    const oldName = user.name;
    const newPhone = data.phone !== undefined ? data.phone.trim() : oldPhone;
    const newName = data.name !== undefined ? data.name.trim() : oldName;

    let updatedAddresses = data.addresses || user.addresses || [];

    // Jika addresses tidak disertakan secara manual, sinkronkan otomatis no HP & nama ke alamat utama / alamat dengan no hp lama
    if (!data.addresses && updatedAddresses.length > 0) {
      updatedAddresses = updatedAddresses.map((a) => {
        let changed = false;
        let addrPhone = a.phone;
        let recipientName = a.recipient_name;

        // Sinkronkan nomor telepon jika cocok dengan no lama, atau kosong, atau merupakan alamat utama
        if (newPhone && (a.phone === oldPhone || !a.phone || a.is_primary)) {
          addrPhone = newPhone;
          changed = true;
        }

        // Sinkronkan nama penerima jika cocok dengan nama lama, atau kosong, atau merupakan alamat utama
        if (newName && (a.recipient_name === oldName || !a.recipient_name || (a.is_primary && a.recipient_name === oldName))) {
          recipientName = newName;
          changed = true;
        }

        if (changed) {
          return { ...a, phone: addrPhone, recipient_name: recipientName };
        }
        return a;
      });
    }

    saveUser({ ...user, ...data, addresses: updatedAddresses });
  };

  const switchToCustomer = () => {
    saveUser(MOCK_USER);
  };

  const switchToAdmin = () => {
    const adminUser: UserProfile = {
      id: 'usr-admin',
      name: 'Admin Alvin Swalayan',
      email: 'admin@alvinswalayan.com',
      phone: '081269008899',
      role: 'admin',
      addresses: [],
      created_at: new Date().toISOString(),
    };
    saveUser(adminUser);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoading,
        isLogoutModalOpen,
        isGoogleModalOpen,
        login,
        loginWithGoogle,
        openGoogleModal,
        closeGoogleModal,
        loginWithGoogleAccount,
        register,
        resetPassword,
        logout,
        requestLogout,
        cancelLogout,
        confirmLogout,
        addAddress,
        updateAddress,
        deleteAddress,
        updateProfile,
        setDefaultAddress,
        switchToCustomer,
        switchToAdmin,
      }}
    >
      {children}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
        isAdmin={isAdmin}
      />
      <GoogleLoginModal
        isOpen={isGoogleModalOpen}
        onClose={closeGoogleModal}
        onLogin={loginWithGoogleAccount}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

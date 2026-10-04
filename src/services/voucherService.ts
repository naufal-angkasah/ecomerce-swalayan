import { Voucher } from '@/types';
import { INITIAL_VOUCHERS } from './mockData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

const STORAGE_KEY_VOUCHERS = 'alvin_vouchers_v1';

function getStoredVouchers(): Voucher[] {
  if (typeof window === 'undefined') return INITIAL_VOUCHERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOUCHERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_VOUCHERS, JSON.stringify(INITIAL_VOUCHERS));
      return INITIAL_VOUCHERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY_VOUCHERS, JSON.stringify(INITIAL_VOUCHERS));
      return INITIAL_VOUCHERS;
    }

    // Auto-merge any initial vouchers that might be missing from this browser profile (e.g. PROMOBANDARAYA, GRATISONGKIR)
    let updated = false;
    const existingCodes = new Set(parsed.map((v: Voucher) => v.code.toUpperCase()));
    for (const initV of INITIAL_VOUCHERS) {
      if (!existingCodes.has(initV.code.toUpperCase())) {
        parsed.push(initV);
        existingCodes.add(initV.code.toUpperCase());
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem(STORAGE_KEY_VOUCHERS, JSON.stringify(parsed));
    }

    return parsed;
  } catch {
    return INITIAL_VOUCHERS;
  }
}

function saveStoredVouchers(vouchers: Voucher[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_VOUCHERS, JSON.stringify(vouchers));
  } catch (err) {
    console.error('Failed to save vouchers', err);
  }
}

export interface VoucherApplicability {
  voucher: Voucher;
  isEligible: boolean;
  discountAmount: number;
  deficit: number;
  message: string;
}

export const voucherService = {
  getAll: (): Voucher[] => {
    return getStoredVouchers();
  },

  getActive: (): Voucher[] => {
    const vouchers = getStoredVouchers();
    const today = new Date().toISOString().split('T')[0];
    return vouchers.filter((v) => {
      if (!v.is_active) return false;
      if (v.start_date && today < v.start_date) return false;
      if (v.end_date && today > v.end_date) return false;
      if (v.max_usage && v.used_count >= v.max_usage) return false;
      return true;
    });
  },

  /**
   * Get all active vouchers classified by whether current subtotal meets minimum purchase requirement
   */
  getApplicableForSubtotal: (subtotal: number): VoucherApplicability[] => {
    const active = voucherService.getActive();
    const results: VoucherApplicability[] = active.map((v) => {
      const minPurchase = v.min_purchase || 0;
      const isEligible = subtotal >= minPurchase;
      const deficit = isEligible ? 0 : Math.max(0, minPurchase - subtotal);

      let discount = 0;
      if (v.discount_type === 'PERCENTAGE') {
        discount = (subtotal * v.discount_value) / 100;
        if (v.max_discount && discount > v.max_discount) {
          discount = v.max_discount;
        }
      } else {
        discount = v.discount_value;
      }
      if (discount > subtotal) {
        discount = subtotal;
      }

      let message = '';
      if (!isEligible) {
        message = `Kurang Rp ${deficit.toLocaleString('id-ID')} lagi untuk pakai voucher ini`;
      } else {
        message = `Hemat Rp ${discount.toLocaleString('id-ID')}`;
      }

      return {
        voucher: v,
        isEligible,
        discountAmount: discount,
        deficit,
        message,
      };
    });

    // Sort: eligible first (sorted by highest discount), then ineligible (sorted by lowest deficit)
    return results.sort((a, b) => {
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      if (a.isEligible && b.isEligible) return b.discountAmount - a.discountAmount;
      return a.deficit - b.deficit;
    });
  },

  validate: (
    code: string,
    subtotal: number
  ): { isValid: boolean; message: string; discountAmount: number; voucher?: Voucher } => {
    const vouchers = getStoredVouchers();
    const cleanCode = code.trim().toUpperCase();

    const voucher = vouchers.find((v) => v.code.toUpperCase() === cleanCode);

    if (!voucher) {
      return { isValid: false, message: 'Kode voucher tidak ditemukan.', discountAmount: 0 };
    }

    if (!voucher.is_active) {
      return { isValid: false, message: 'Voucher sudah tidak aktif.', discountAmount: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    if (voucher.start_date && today < voucher.start_date) {
      return { isValid: false, message: 'Voucher belum dapat digunakan.', discountAmount: 0 };
    }

    if (voucher.end_date && today > voucher.end_date) {
      return { isValid: false, message: 'Voucher sudah kedaluwarsa.', discountAmount: 0 };
    }

    if (voucher.max_usage && voucher.used_count >= voucher.max_usage) {
      return { isValid: false, message: 'Kuota pemakaian voucher telah habis.', discountAmount: 0 };
    }

    if (subtotal < voucher.min_purchase) {
      return {
        isValid: false,
        message: `Minimal belanja Rp ${voucher.min_purchase.toLocaleString('id-ID')} untuk menggunakan voucher ini.`,
        discountAmount: 0,
      };
    }

    let discount = 0;
    if (voucher.discount_type === 'PERCENTAGE') {
      discount = (subtotal * voucher.discount_value) / 100;
      if (voucher.max_discount && discount > voucher.max_discount) {
        discount = voucher.max_discount;
      }
    } else {
      discount = voucher.discount_value;
    }

    if (discount > subtotal) {
      discount = subtotal;
    }

    return {
      isValid: true,
      message: `Voucher "${voucher.code}" berhasil dipasang!`,
      discountAmount: discount,
      voucher,
    };
  },

  create: (data: Omit<Voucher, 'id' | 'used_count'>): { success: boolean; error?: string; voucher?: Voucher } => {
    const vouchers = getStoredVouchers();
    const cleanCode = data.code.trim().toUpperCase();

    if (vouchers.some((v) => v.code.toUpperCase() === cleanCode)) {
      return { success: false, error: `Kode voucher "${cleanCode}" sudah ada.` };
    }

    const newVoucher: Voucher = {
      ...data,
      id: `vch-${Date.now()}`,
      code: cleanCode,
      used_count: 0,
    };

    vouchers.unshift(newVoucher);
    saveStoredVouchers(vouchers);
    return { success: true, voucher: newVoucher };
  },

  toggleActive: (id: string): boolean => {
    const vouchers = getStoredVouchers();
    const idx = vouchers.findIndex((v) => v.id === id);
    if (idx === -1) return false;
    vouchers[idx].is_active = !vouchers[idx].is_active;
    saveStoredVouchers(vouchers);
    return true;
  },

  incrementUsage: (code: string): boolean => {
    if (!code) return false;
    const vouchers = getStoredVouchers();
    const cleanCode = code.trim().toUpperCase();
    const idx = vouchers.findIndex((v) => v.code.toUpperCase() === cleanCode);
    if (idx === -1) return false;
    vouchers[idx].used_count = (vouchers[idx].used_count || 0) + 1;
    saveStoredVouchers(vouchers);
    return true;
  },

  decrementUsage: (code: string): boolean => {
    if (!code) return false;
    const vouchers = getStoredVouchers();
    const cleanCode = code.trim().toUpperCase();
    const idx = vouchers.findIndex((v) => v.code.toUpperCase() === cleanCode);
    if (idx === -1) return false;
    vouchers[idx].used_count = Math.max(0, (vouchers[idx].used_count || 0) - 1);
    saveStoredVouchers(vouchers);
    return true;
  },
};

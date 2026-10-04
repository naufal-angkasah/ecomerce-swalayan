import { CartItem, Voucher } from '@/types';
import { voucherService } from '@/services/voucherService';

export interface CartTotalsResult {
  subtotal: number;
  discount: number;
  shipping_fee: number;
  grand_total: number;
  voucher_applied?: string;
  is_free_shipping: boolean;
}

/**
 * Centralized financial calculation using safe integer arithmetic for Indonesian Rupiah.
 * Prevents floating-point rounding errors.
 */
export function calculateCartTotals(
  items: CartItem[],
  voucher: Voucher | null = null,
  configuredShippingFee: number = 10000,
  freeShippingThreshold: number = 150000
): CartTotalsResult {
  if (!items || items.length === 0) {
    return {
      subtotal: 0,
      discount: 0,
      shipping_fee: 0,
      grand_total: 0,
      is_free_shipping: false,
    };
  }

  // 1. Calculate subtotal strictly in integer IDR
  const subtotal = items.reduce((sum, item) => {
    const rawPrice = item.product.discount_price && item.product.discount_price > 0 && item.product.discount_price < item.product.price
      ? item.product.discount_price
      : item.product.price;
    const price = Math.round(Number(rawPrice) || 0);
    const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
    return sum + price * qty;
  }, 0);

  // 2. Calculate discount strictly in integer IDR
  let discount = 0;
  if (voucher && voucher.is_active) {
    const validation = voucherService.validate(voucher.code, subtotal);
    if (validation.isValid) {
      discount = Math.min(subtotal, Math.round(validation.discountAmount || 0));
    }
  }

  // 3. Shipping fee calculation
  const is_free_shipping = subtotal >= freeShippingThreshold;
  const shipping_fee = is_free_shipping ? 0 : Math.round(configuredShippingFee);

  // 4. Grand Total calculation (never below 0)
  const grand_total = Math.max(0, subtotal - discount + shipping_fee);

  return {
    subtotal,
    discount,
    shipping_fee,
    grand_total,
    voucher_applied: discount > 0 && voucher ? voucher.code : undefined,
    is_free_shipping,
  };
}

/**
 * Generate unique order number in ALV-YYYY-XXXXXX format
 * Example: ALV-2026-000123
 */
export function generateOrderNumber(sequenceNumber?: number): string {
  const year = new Date().getFullYear();
  const seq = sequenceNumber ?? Math.floor(100000 + Math.random() * 900000);
  const padded = String(seq).padStart(6, '0');
  return `ALV-${year}-${padded}`;
}

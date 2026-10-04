'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Voucher } from '@/types';
import { voucherService } from '@/services/voucherService';
import { useAuth } from '@/context/AuthContext';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => { success: boolean; message: string };
  addMultipleToCart: (itemsToAdd: { product: Product; quantity: number; note?: string }[]) => {
    success: boolean;
    addedCount: number;
    message: string;
  };
  updateItemNote: (productId: string, note: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => { success: boolean; message?: string };
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  appliedVoucher: Voucher | null;
  discountAmount: number;
  applyVoucherCode: (code: string) => { success: boolean; message: string };
  removeVoucher: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync cart strictly with the authenticated customer
  useEffect(() => {
    // 1. Immediately wipe any legacy global cart keys from localStorage
    try {
      localStorage.removeItem('alvin_cart_items_v1');
      localStorage.removeItem('alvin_cart_voucher_v1');
    } catch {}

    // 2. If user is NOT logged in or is an ADMIN: Cart must be strictly empty!
    if (!user || user.role !== 'customer') {
      setItems([]);
      setAppliedVoucher(null);
      setIsInitialized(true);
      return;
    }

    // 3. User is logged in as a valid customer: load user-specific cart
    const userCartKey = `alvin_cart_items_${user.id}`;
    const userVoucherKey = `alvin_cart_voucher_${user.id}`;

    try {
      const raw = localStorage.getItem(userCartKey);
      if (raw) {
        setItems(JSON.parse(raw));
      } else {
        setItems([]);
      }

      const rawVoucher = localStorage.getItem(userVoucherKey);
      if (rawVoucher) {
        setAppliedVoucher(JSON.parse(rawVoucher));
      } else {
        setAppliedVoucher(null);
      }
    } catch (e) {
      console.error('Failed to load user cart', e);
      setItems([]);
      setAppliedVoucher(null);
    } finally {
      setIsInitialized(true);
    }
  }, [user]);

  // Persist cart changes ONLY for the active customer
  useEffect(() => {
    if (!isInitialized || !user || user.role !== 'customer') return;

    const userCartKey = `alvin_cart_items_${user.id}`;
    try {
      localStorage.setItem(userCartKey, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart', e);
    }
  }, [items, isInitialized, user]);

  // Persist voucher changes ONLY for the active customer
  useEffect(() => {
    if (!isInitialized || !user || user.role !== 'customer') return;

    const userVoucherKey = `alvin_cart_voucher_${user.id}`;
    try {
      if (appliedVoucher) {
        localStorage.setItem(userVoucherKey, JSON.stringify(appliedVoucher));
      } else {
        localStorage.removeItem(userVoucherKey);
      }
    } catch (e) {
      console.error('Failed to save voucher', e);
    }
  }, [appliedVoucher, isInitialized, user]);

  const addToCart = (product: Product, quantity: number = 1): { success: boolean; message: string } => {
    if (!user) {
      return {
        success: false,
        message: 'Silakan masuk ke akun Anda terlebih dahulu untuk menambah produk ke keranjang.',
      };
    }

    if (isAdmin) {
      return {
        success: false,
        message: 'Akun Admin bertugas mengelola toko dan tidak dapat membuat pesanan belanja.',
      };
    }

    if (product.stock <= 0) {
      return { success: false, message: 'Maaf, stok produk ini sedang habis.' };
    }

    const existing = items.find((item) => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + quantity > product.stock) {
      return {
        success: false,
        message: `Jumlah melebihi stok yang tersedia (Sisa stok: ${product.stock}).`,
      };
    }

    setItems((prev) => {
      const exist = prev.find((item) => item.product.id === product.id);
      if (exist) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        return [...prev, { product, quantity }];
      }
    });

    return { success: true, message: `"${product.name}" berhasil ditambahkan ke keranjang!` };
  };

  const addMultipleToCart = (
    itemsToAdd: { product: Product; quantity: number; note?: string }[]
  ): { success: boolean; addedCount: number; message: string } => {
    if (!user) {
      return {
        success: false,
        addedCount: 0,
        message: 'Silakan masuk ke akun Anda terlebih dahulu untuk menambah produk ke keranjang.',
      };
    }

    if (isAdmin) {
      return {
        success: false,
        addedCount: 0,
        message: 'Akun Admin bertugas mengelola toko dan tidak dapat membuat pesanan belanja.',
      };
    }

    if (!itemsToAdd || itemsToAdd.length === 0) {
      return { success: false, addedCount: 0, message: 'Tidak ada produk untuk ditambahkan.' };
    }

    const validEntries = itemsToAdd.filter((e) => e.product && e.quantity > 0);
    if (validEntries.length === 0) {
      return { success: false, addedCount: 0, message: 'Tidak ada produk valid untuk ditambahkan.' };
    }

    setItems((prev) => {
      const updated = [...prev];
      for (const entry of validEntries) {
        const existIdx = updated.findIndex(
          (i) =>
            i.product.id === entry.product.id ||
            (entry.product.sku && i.product.sku && i.product.sku.toLowerCase() === entry.product.sku.toLowerCase())
        );

        if (existIdx > -1) {
          updated[existIdx] = {
            ...updated[existIdx],
            quantity: updated[existIdx].quantity + entry.quantity,
            note: entry.note || updated[existIdx].note,
          };
        } else {
          updated.push({
            product: entry.product,
            quantity: entry.quantity,
            note: entry.note,
          });
        }
      }
      return updated;
    });

    return {
      success: true,
      addedCount: validEntries.length,
      message: `${validEntries.length} produk dari pesanan lama berhasil dimasukkan ke keranjang belanja.`,
    };
  };

  const updateItemNote = (productId: string, note: string) => {
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, note } : i))
    );
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number): { success: boolean; message?: string } => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return { success: true };
    }

    const item = items.find((i) => i.product.id === productId);
    if (!item) return { success: false, message: 'Produk tidak ada di keranjang.' };

    if (quantity > item.product.stock) {
      return {
        success: false,
        message: `Maksimal pembelian untuk ${item.product.name} adalah ${item.product.stock}.`,
      };
    }

    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
    return { success: true };
  };

  const clearCart = () => {
    setItems([]);
    setAppliedVoucher(null);
    if (user && user.role === 'customer') {
      try {
        localStorage.removeItem(`alvin_cart_items_${user.id}`);
        localStorage.removeItem(`alvin_cart_voucher_${user.id}`);
      } catch {}
    }
  };

  const totalItems = user && user.role === 'customer' ? items.reduce((acc, curr) => acc + curr.quantity, 0) : 0;

  const subtotal = user && user.role === 'customer'
    ? items.reduce((acc, curr) => {
        const itemPrice = curr.product.discount_price || curr.product.price;
        return acc + itemPrice * curr.quantity;
      }, 0)
    : 0;

  let discountAmount = 0;
  if (appliedVoucher && user && user.role === 'customer') {
    const validation = voucherService.validate(appliedVoucher.code, subtotal);
    if (validation.isValid) {
      discountAmount = validation.discountAmount;
    }
  }

  const applyVoucherCode = (code: string) => {
    if (!user || user.role !== 'customer') {
      return { success: false, message: 'Silakan masuk untuk menggunakan voucher promo.' };
    }
    const res = voucherService.validate(code, subtotal);
    if (res.isValid && res.voucher) {
      setAppliedVoucher(res.voucher);
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message };
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        addMultipleToCart,
        updateItemNote,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        appliedVoucher,
        discountAmount,
        applyVoucherCode,
        removeVoucher,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

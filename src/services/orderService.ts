import { Order, OrderStatus, PaymentStatus } from '@/types';
import { INITIAL_ORDERS } from './mockData';
import { productService } from './productService';
import { voucherService } from './voucherService';
import { notificationService } from './notificationService';

const STORAGE_KEY_ORDERS = 'alvin_orders_v1';

function getStoredOrders(): Order[] {
  if (typeof window === 'undefined') return INITIAL_ORDERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }

    // Auto-heal orders:
    // 1. If an order's status_timeline has a DIBATALKAN entry, its order_status MUST be DIBATALKAN.
    // 2. If any order items have missing image or placeholder.png, restore authentic image from catalog!
    let needsResave = false;
    const sanitized = parsed.map((o: Order) => {
      let orderUpdated = false;
      let status = o.order_status;
      const hasCancelledInTimeline = o.status_timeline?.some((t) => t.status === 'DIBATALKAN');
      if (hasCancelledInTimeline && o.order_status !== 'DIBATALKAN') {
        orderUpdated = true;
        status = 'DIBATALKAN' as OrderStatus;
      }

      const healedItems = (o.items || []).map((it) => {
        if (!it.product_image || it.product_image.includes('placeholder.png')) {
          const found = productService.findProduct({
            id: it.product_id,
            sku: it.sku || it.product_sku,
            name: it.product_name,
          });
          if (found?.image_url) {
            orderUpdated = true;
            return { ...it, product_image: found.image_url };
          }
        }
        return it;
      });

      if (orderUpdated) {
        needsResave = true;
        return {
          ...o,
          order_status: status,
          items: healedItems,
          updated_at: o.updated_at || new Date().toISOString(),
        };
      }
      return o;
    });

    if (needsResave) {
      saveStoredOrders(sanitized);
    }

    return sanitized;
  } catch {
    return INITIAL_ORDERS;
  }
}

function saveStoredOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch (err) {
    console.error('Failed to save orders to localStorage', err);
  }
}

/**
 * Fetches a globally-unique order number from the server API.
 * Falls back to a timestamp-based number if the server is unreachable.
 * This prevents duplicate order numbers from different devices that each
 * have their own localStorage with different order counts.
 */
async function generateUniqueOrderNumber(): Promise<string> {
  if (typeof window === 'undefined') {
    const ts = Date.now().toString().slice(-6);
    return `ALV-${new Date().getFullYear()}-${ts}`;
  }
  try {
    const res = await fetch('/api/orders/next-number');
    if (res.ok) {
      const data = await res.json();
      if (data.order_number) return data.order_number;
    }
  } catch {
    // Server unreachable — fall through to timestamp fallback
  }
  // Fallback: timestamp + 2-digit random to avoid race conditions from the same device
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 99).toString().padStart(2, '0');
  const year = new Date().getFullYear();
  return `ALV-${year}-${ts}${rand}`.slice(0, 18); // trim to reasonable length
}

function syncOrderToCloud(order: Order): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.order?.id && data.order.id !== order.id) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
          if (raw) {
            const list: Order[] = JSON.parse(raw);
            const idx = list.findIndex((o) => o.order_number === order.order_number);
            if (idx !== -1 && list[idx].id !== data.order.id) {
              (list[idx] as any).local_id = list[idx].id;
              list[idx].id = data.order.id;
              localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(list));
            }
          }
        } catch {
          // ignore
        }
      }
    })
    .catch((err) => {
      console.warn('Background Supabase order sync error:', err);
    });
}

// Priority ranking for order statuses — higher = more advanced in lifecycle
const STATUS_PRIORITY: Record<string, number> = {
  MENUNGGU_PEMBAYARAN: 0,
  DIBAYAR: 1,
  DIPROSES: 2,
  DIKIRIM: 3,
  SELESAI: 4,
  DIBATALKAN: 5,
};

function mergeOrders(local: Order[], remote: Order[]): { merged: Order[]; newOrdersCount: number } {
  const map = new Map<string, Order>();

  // 1. Seed local orders
  local.forEach((o) => {
    map.set(o.order_number || o.id, o);
  });

  let newOrdersCount = 0;

  // Helper to ensure item product_image is valid
  const healItems = (items: any[], existingItems?: any[]) => {
    return (items || []).map((ritem, idx) => {
      const localItem = existingItems?.[idx] || existingItems?.find((l) => l.sku === ritem.sku || l.product_name === ritem.product_name);
      let img = (ritem.product_image && !ritem.product_image.includes('placeholder.png'))
        ? ritem.product_image
        : (localItem?.product_image && !localItem.product_image.includes('placeholder.png'))
        ? localItem.product_image
        : undefined;

      if (!img) {
        const found = productService.findProduct({
          id: ritem.product_id,
          sku: ritem.sku || ritem.product_sku,
          name: ritem.product_name,
        });
        img = found?.image_url;
      }

      return {
        ...ritem,
        product_image: img || localItem?.product_image || ritem.product_image,
      };
    });
  };

  // 2. Merge remote orders
  remote.forEach((ro) => {
    const key = ro.order_number || ro.id;
    if (!map.has(key)) {
      map.set(key, { ...ro, items: healItems(ro.items) });
      newOrdersCount++;
    } else {
      const existing = map.get(key)!;
      const existingTime = new Date(existing.updated_at || existing.created_at).getTime();
      const remoteTime = new Date(ro.updated_at || ro.created_at).getTime();

      // Determine which copy has the more advanced status
      const localPriority = STATUS_PRIORITY[existing.order_status] ?? 0;
      const remotePriority = STATUS_PRIORITY[ro.order_status] ?? 0;

      // Keep whichever has more advanced status; if equal, prefer the one with newer updated_at
      const useRemote = remotePriority > localPriority ||
        (remotePriority === localPriority && remoteTime > existingTime);

      const resolvedItems = healItems(ro.items && ro.items.length > 0 ? ro.items : existing.items, existing.items);

      if (useRemote) {
        let mergedTimeline = existing.status_timeline && existing.status_timeline.length > 0
          ? [...existing.status_timeline]
          : (ro.status_timeline || []);

        if (ro.payment_status === 'FAILED' && !mergedTimeline.some((t) => t.note?.includes('ditolak'))) {
          mergedTimeline.push({
            status: ro.order_status,
            timestamp: ro.updated_at || new Date().toISOString(),
            note: `Bukti transfer ditolak kasir: ${ro.payment_rejection_reason || 'Foto tidak terbaca atau mutasi belum masuk'}. Menunggu pelanggan unggah ulang.`,
          });
        }

        map.set(key, {
          ...ro,
          items: resolvedItems,
          status_timeline: mergedTimeline,
          payment_proof_url: ro.payment_proof_url || existing.payment_proof_url,
          payment_rejection_reason: ro.payment_rejection_reason || existing.payment_rejection_reason,
        });
      } else {
        // Keep local order status but absorb remote cashier payment decisions
        const paymentChangedRemotely =
          ro.payment_status &&
          ro.payment_status !== existing.payment_status &&
          (ro.payment_status === 'FAILED' || ro.payment_status === 'PAID' || remoteTime >= existingTime);

        const updatedPaymentStatus = paymentChangedRemotely ? ro.payment_status : existing.payment_status;
        const updatedRejectionReason = paymentChangedRemotely && ro.payment_status === 'FAILED'
          ? (ro.payment_rejection_reason || existing.payment_rejection_reason)
          : (ro.payment_status === 'PAID' ? undefined : (ro.payment_rejection_reason || existing.payment_rejection_reason));

        let mergedTimeline = existing.status_timeline ? [...existing.status_timeline] : [];
        if (paymentChangedRemotely && ro.payment_status === 'FAILED' && !mergedTimeline.some((t) => t.note?.includes('ditolak'))) {
          mergedTimeline.push({
            status: existing.order_status,
            timestamp: ro.updated_at || new Date().toISOString(),
            note: `Bukti transfer ditolak kasir: ${ro.payment_rejection_reason || 'Foto tidak terbaca atau mutasi belum masuk'}. Menunggu pelanggan unggah ulang.`,
          });
        }

        map.set(key, {
          ...existing,
          id: ro.id || existing.id,
          payment_status: updatedPaymentStatus,
          payment_rejection_reason: updatedRejectionReason,
          status_timeline: mergedTimeline,
          items: resolvedItems,
          payment_proof_url: ro.payment_proof_url || existing.payment_proof_url,
          updated_at: remoteTime > existingTime ? ro.updated_at : existing.updated_at,
        });
      }
    }
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return { merged, newOrdersCount };
}




let sharedOrderChannel: BroadcastChannel | null = null;
function broadcastOrderEvent(type: string, order: Order): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      if (!sharedOrderChannel) {
        sharedOrderChannel = new BroadcastChannel('alvin_orders_channel');
      }
      sharedOrderChannel.postMessage({ type, order });
    }
  } catch (err) {
    console.warn('BroadcastChannel error:', err);
  }
}

export const orderService = {
  getAll: (): Order[] => {
    return getStoredOrders();
  },

  mergeRemoteOrders: (remoteOrders: Order[]): boolean => {
    if (!Array.isArray(remoteOrders) || remoteOrders.length === 0) return false;
    const current = getStoredOrders();
    const { merged, newOrdersCount } = mergeOrders(current, remoteOrders);
    saveStoredOrders(merged);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('alvin:orders_updated', { detail: { orders: merged, newOrdersCount } })
      );
    }
    return newOrdersCount > 0;
  },

  syncFromCloud: async (): Promise<Order[]> => {
    if (typeof window === 'undefined') return getStoredOrders();
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders)) {
          orderService.mergeRemoteOrders(data.orders);
        }
      }
    } catch (e) {
      console.warn('Sync from cloud error:', e);
    }

    // Auto-sync any cancelled orders so Supabase cloud database stays in sync
    const current = getStoredOrders();
    current.forEach((o) => {
      if (o.order_status === 'DIBATALKAN') {
        syncOrderToCloud(o);
      }
    });

    return current;
  },

  getById: (id: string): Order | undefined => {
    return getStoredOrders().find(
      (o) => o.id === id || o.order_number === id || (o as any).local_id === id
    );
  },

  getByOrderNumber: (orderNumber: string): Order | undefined => {
    return getStoredOrders().find((o) => o.order_number === orderNumber);
  },

  getByCustomerPhone: (phone: string): Order[] => {
    const clean = phone.replace(/\D/g, '');
    return getStoredOrders().filter((o) => o.customer_phone.replace(/\D/g, '').includes(clean));
  },

  create: async (data: Omit<Order, 'id' | 'order_number' | 'status_timeline' | 'created_at' | 'updated_at'>): Promise<Order> => {
    const orders = getStoredOrders();
    // Fetch a globally-unique order number from the server (not from localStorage count)
    // This prevents collisions when different devices have different order counts in localStorage
    const orderNumber = await generateUniqueOrderNumber();
    const now = new Date().toISOString();

    const isCod = data.payment_method === 'COD';
    const initialStatus: OrderStatus = isCod ? 'DIPROSES' : (data.order_status || 'MENUNGGU_PEMBAYARAN');
    const initialPaymentStatus = isCod ? 'PENDING' : data.payment_status;
    const initialNote = isCod
      ? 'Pesanan COD berhasil dibuat & langsung dipersiapkan toko Alvin Swalayan. Siapkan uang tunai pas saat kurir tiba.'
      : data.payment_method === 'TRANSFER_BANK'
      ? 'Pesanan dibuat. Menunggu pembayaran transfer bank ke rekening toko Alvin Swalayan.'
      : 'Pesanan berhasil dibuat di sistem Alvin Swalayan.';

    const newOrder: Order = {
      ...data,
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      order_status: initialStatus,
      payment_status: initialPaymentStatus,
      status_timeline: [
        {
          status: initialStatus,
          timestamp: now,
          note: initialNote,
        },
      ],
      created_at: now,
      updated_at: now,
    };

    // Deduct stock for each purchased item
    newOrder.items.forEach((item) => {
      if (!item.product_id) return;
      const prod = productService.getById(item.product_id);
      if (prod) {
        const remaining = Math.max(0, prod.stock - item.quantity);
        productService.update(prod.id, {
          stock: remaining,
          sales_count: (prod.sales_count || 0) + item.quantity,
        });
      }
    });

    orders.unshift(newOrder);
    saveStoredOrders(orders);

    // Increment voucher usage count if voucher was applied
    if (newOrder.voucher_code) {
      voucherService.incrementUsage(newOrder.voucher_code);
    }

    // Trigger WhatsApp notification for order creation
    notificationService.sendOrderWhatsApp(newOrder, 'ORDER_CREATED');

    // Asynchronously sync to Supabase Cloud
    syncOrderToCloud(newOrder);

    // Broadcast new order to Admin listeners across tabs and local windows
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('alvin:new_order', { detail: newOrder }));
        broadcastOrderEvent('NEW_ORDER', newOrder);
      } catch (err) {
        console.warn('Inter-tab order broadcast warning:', err);
      }
    }

    return newOrder;
  },

  updateStatus: (id: string, newStatus: OrderStatus, customNote?: string): Order | null => {
    const orders = getStoredOrders();
    const idx = orders.findIndex((o) => o.id === id || o.order_number === id);
    if (idx === -1) return null;

    const currentOrder = orders[idx];
    const prevStatus = currentOrder.order_status;
    const now = new Date().toISOString();
    const note = customNote || `Status pesanan diubah menjadi: ${newStatus}`;

    currentOrder.order_status = newStatus;
    currentOrder.updated_at = now;
    currentOrder.status_timeline.push({
      status: newStatus,
      timestamp: now,
      note,
    });

    // Handle payment status auto-sync
    if (newStatus === 'DIBAYAR') {
      currentOrder.payment_status = 'PAID';
      notificationService.sendOrderWhatsApp(currentOrder, 'PAYMENT_CONFIRMED');
    } else if (newStatus === 'DIPROSES') {
      notificationService.sendOrderWhatsApp(currentOrder, 'ORDER_PROCESSING');
    } else if (newStatus === 'DIKIRIM') {
      notificationService.sendOrderWhatsApp(currentOrder, 'ORDER_SHIPPED');
    } else if (newStatus === 'SELESAI') {
      // If COD, delivering the order marks it as paid
      if (currentOrder.payment_method === 'COD') {
        currentOrder.payment_status = 'PAID';
      }
      notificationService.sendOrderWhatsApp(currentOrder, 'ORDER_COMPLETED');
    } else if (newStatus === 'DIBATALKAN' && prevStatus !== 'DIBATALKAN') {
      // Restore stock for cancelled order
      currentOrder.items.forEach((item) => {
        if (!item.product_id) return;
        const prod = productService.getById(item.product_id);
        if (prod) {
          productService.update(prod.id, {
            stock: prod.stock + item.quantity,
            sales_count: Math.max(0, (prod.sales_count || 0) - item.quantity),
          });
        }
      });
      if (currentOrder.voucher_code) {
        voucherService.decrementUsage(currentOrder.voucher_code);
      }
      notificationService.sendOrderWhatsApp(currentOrder, 'ORDER_CANCELLED', customNote);
    }

    orders[idx] = currentOrder;
    saveStoredOrders(orders);

    // Sync status change to Supabase
    syncOrderToCloud(currentOrder);

    // Broadcast status update to all UI listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('alvin:orders_updated', { detail: { orders, newOrdersCount: 0 } })
      );
      broadcastOrderEvent('ORDER_UPDATED', currentOrder);
    }

    return currentOrder;
  },

  cancelOrder: (id: string, reason?: string, isAdminOverride: boolean = false): { success: boolean; message: string; order?: Order } => {
    const orders = getStoredOrders();
    const idx = orders.findIndex((o) => o.id === id || o.order_number === id || (o as any).local_id === id);
    if (idx === -1) return { success: false, message: 'Pesanan tidak ditemukan.' };

    const currentOrder = orders[idx];

    // Check if order can be cancelled:
    // Regular customer cannot cancel once the order is out for delivery (DIKIRIM),
    // but Admin can override to handle delivery failures/customer rejections at doorstep.
    if (!isAdminOverride && currentOrder.order_status === 'DIKIRIM') {
      return { success: false, message: 'Pesanan sedang dalam pengantaran kurir dan tidak dapat dibatalkan oleh pelanggan.' };
    }
    if (currentOrder.order_status === 'SELESAI') {
      return { success: false, message: 'Pesanan sudah selesai dan tidak dapat dibatalkan.' };
    }
    if (currentOrder.order_status === 'DIBATALKAN') {
      return { success: false, message: 'Pesanan ini sudah dibatalkan sebelumnya.' };
    }

    const cancelReason = reason || (isAdminOverride ? 'Dibatalkan oleh admin toko' : 'Dibatalkan atas permintaan pelanggan');

    // Restore stock
    currentOrder.items.forEach((item) => {
      if (!item.product_id) return;
      const prod = productService.getById(item.product_id);
      if (prod) {
        productService.update(prod.id, {
          stock: prod.stock + item.quantity,
          sales_count: Math.max(0, (prod.sales_count || 0) - item.quantity),
        });
      }
    });

    const now = new Date().toISOString();
    currentOrder.order_status = 'DIBATALKAN';
    currentOrder.updated_at = now;
    currentOrder.status_timeline.push({
      status: 'DIBATALKAN',
      timestamp: now,
      note: isAdminOverride ? `Dibatalkan oleh Admin Toko: ${cancelReason}` : `Pesanan dibatalkan: ${cancelReason}`,
    });

    if (currentOrder.voucher_code) {
      voucherService.decrementUsage(currentOrder.voucher_code);
    }

    orders[idx] = currentOrder;
    saveStoredOrders(orders);

    notificationService.sendOrderWhatsApp(currentOrder, 'ORDER_CANCELLED', cancelReason);

    syncOrderToCloud(currentOrder);

    // Broadcast cancel to all UI listeners (order detail, order list, admin)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('alvin:orders_updated', { detail: { orders, newOrdersCount: 0 } })
      );
      broadcastOrderEvent('ORDER_CANCELLED', currentOrder);
    }

    return {
      success: true,
      message: 'Pesanan berhasil dibatalkan dan stok produk telah dikembalikan.',
      order: currentOrder,
    };
  },

  uploadPaymentProof: (id: string, proofUrl: string, orderNumber?: string): Order | null => {
    const orders = getStoredOrders();
    const targetOrderNumber = orderNumber || (id.startsWith('ALV-') ? id : undefined);
    const idx = orders.findIndex(
      (o) =>
        o.id === id ||
        o.order_number === id ||
        (o as any).local_id === id ||
        (targetOrderNumber && o.order_number === targetOrderNumber)
    );

    let currentOrder: Order | null = null;
    const now = new Date().toISOString();

    if (idx !== -1) {
      currentOrder = orders[idx];
      currentOrder.payment_proof_url = proofUrl;
      currentOrder.payment_status = 'VERIFIKASI_MANUAL';
      currentOrder.payment_rejection_reason = undefined;
      currentOrder.updated_at = now;
      if (!currentOrder.status_timeline) currentOrder.status_timeline = [];
      currentOrder.status_timeline.push({
        status: currentOrder.order_status,
        timestamp: now,
        note: 'Pelanggan telah mengunggah bukti transfer bank baru. Menunggu verifikasi admin.',
      });

      orders[idx] = currentOrder;
      saveStoredOrders(orders);
    }

    // 1. Direct background POST to dedicated payment-proof API endpoint
    if (typeof window !== 'undefined') {
      fetch('/api/orders/payment-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: currentOrder?.id || id,
          orderNumber: currentOrder?.order_number || orderNumber,
          paymentProofUrl: proofUrl,
        }),
      }).catch((err) => {
        console.warn('Dedicated payment proof upload error:', err);
      });
    }

    // 2. Also run full order sync if we have the order object
    if (currentOrder) {
      syncOrderToCloud(currentOrder);
    }

    // 3. Dispatch and broadcast event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('alvin:orders_updated', { detail: { orders, newOrdersCount: 0 } })
      );
      if (currentOrder) {
        broadcastOrderEvent('PAYMENT_PROOF_UPLOADED', currentOrder);
        window.dispatchEvent(
          new CustomEvent('alvin:payment_proof_uploaded', { detail: currentOrder })
        );
      }
    }

    return currentOrder;
  },

  verifyManualPayment: (
    id: string,
    isApproved: boolean,
    orderNumber?: string,
    rejectReason?: string
  ): Order | null => {
    const orders = getStoredOrders();
    const targetOrderNumber = orderNumber || (id.startsWith('ALV-') ? id : undefined);
    const idx = orders.findIndex(
      (o) =>
        o.id === id ||
        o.order_number === id ||
        (o as any).local_id === id ||
        (targetOrderNumber && o.order_number === targetOrderNumber)
    );
    if (idx === -1) return null;

    const currentOrder = orders[idx];
    const now = new Date().toISOString();

    if (isApproved) {
      currentOrder.payment_status = 'PAID';
      currentOrder.order_status = 'DIBAYAR';
      currentOrder.payment_rejection_reason = undefined;
      currentOrder.updated_at = now;
      currentOrder.status_timeline.push({
        status: 'DIBAYAR',
        timestamp: now,
        note: 'Bukti transfer telah diverifikasi dan disetujui kasir.',
      });
      notificationService.sendOrderWhatsApp(currentOrder, 'PAYMENT_CONFIRMED');
    } else {
      currentOrder.payment_status = 'FAILED';
      currentOrder.payment_rejection_reason =
        rejectReason || 'Foto tidak terbaca atau mutasi bank belum masuk';
      currentOrder.updated_at = now;
      currentOrder.status_timeline.push({
        status: currentOrder.order_status,
        timestamp: now,
        note: `Bukti transfer ditolak kasir: ${currentOrder.payment_rejection_reason}. Menunggu pelanggan unggah ulang.`,
      });
      notificationService.sendOrderWhatsApp(currentOrder, 'PAYMENT_REJECTED', rejectReason);
    }

    orders[idx] = currentOrder;
    saveStoredOrders(orders);
    syncOrderToCloud(currentOrder);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('alvin:orders_updated', { detail: { orders, newOrdersCount: 0 } })
      );
      if (isApproved) {
        window.dispatchEvent(new CustomEvent('alvin:order_paid', { detail: currentOrder }));
        broadcastOrderEvent('PAYMENT_CONFIRMED', currentOrder);
      } else {
        window.dispatchEvent(new CustomEvent('alvin:payment_rejected', { detail: currentOrder }));
        broadcastOrderEvent('PAYMENT_REJECTED', currentOrder);
      }
    }
    return currentOrder;
  },

  updateStatusByOrderNumber: (
    orderNumber: string,
    options: {
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      note?: string;
    }
  ): Order | null => {
    const orders = getStoredOrders();
    const idx = orders.findIndex(
      (o) => o.order_number === orderNumber || o.id === orderNumber || (o as any).local_id === orderNumber
    );
    if (idx === -1) return null;

    const currentOrder = orders[idx];
    const prevStatus = currentOrder.order_status;
    const now = new Date().toISOString();
    currentOrder.order_status = options.order_status;
    currentOrder.payment_status = options.payment_status;
    currentOrder.updated_at = now;
    if (options.note) {
      currentOrder.status_timeline.push({
        status: options.order_status,
        timestamp: now,
        note: options.note,
      });
    }

    if (options.order_status === 'DIBATALKAN' && prevStatus !== 'DIBATALKAN') {
      currentOrder.items.forEach((item) => {
        if (!item.product_id) return;
        const prod = productService.getById(item.product_id);
        if (prod) {
          productService.update(prod.id, {
            stock: prod.stock + item.quantity,
            sales_count: Math.max(0, (prod.sales_count || 0) - item.quantity),
          });
        }
      });
      if (currentOrder.voucher_code) {
        voucherService.decrementUsage(currentOrder.voucher_code);
      }
    }

    orders[idx] = currentOrder;
    saveStoredOrders(orders);
    syncOrderToCloud(currentOrder);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('alvin:orders_updated', { detail: { orders, newOrdersCount: 0 } })
      );
      if (options.payment_status === 'PAID') {
        window.dispatchEvent(new CustomEvent('alvin:order_paid', { detail: currentOrder }));
        broadcastOrderEvent('ORDER_PAID', currentOrder);
      }
    }
    return currentOrder;
  },
};

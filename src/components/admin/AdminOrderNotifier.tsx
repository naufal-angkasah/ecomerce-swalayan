'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Order } from '@/types';
import { orderService } from '@/services/orderService';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatRupiah } from '@/lib/utils';
import {
  triggerNewOrderAlert,
  triggerBatchOrderAlert,
  triggerPaymentProofAlert,
  clearAudioQueue,
  getPaymentMethodLabel,
  playOrderChime,
  unlockAudio,
} from '@/lib/audio/orderNotifier';
import {
  Volume2,
  VolumeX,
  Bell,
  X,
  ShoppingCart,
  Banknote,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Layers,
  FileImage,
} from 'lucide-react';

const STORAGE_KEY_SOUND = 'alvin_admin_sound_enabled';

interface BatchOrderItem {
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
}

interface OrderAlertData {
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  payment_method: string;
  delivery_address?: string;
  created_at: string;
  type?: 'NEW' | 'PAID' | 'BATCH' | 'PROOF';
  batch_count?: number;
  batch_orders?: BatchOrderItem[];
  payment_proof_url?: string;
}

export function AdminOrderNotifier() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  const [activeAlert, setActiveAlert] = useState<OrderAlertData | null>(null);

  // Set of known order numbers & IDs to prevent duplicate alerts
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  // Map of known order payment statuses to detect payment transitions (e.g. QRIS PENDING -> PAID)
  const knownOrderStatusesRef = useRef<Map<string, string>>(new Map());
  // Map of known order proof URLs to detect when customer uploads/changes proof photo
  const knownProofUrlsRef = useRef<Map<string, string>>(new Map());
  // Set of processed proof alert dedupe keys
  const knownProofKeysRef = useRef<Set<string>>(new Set());
  // Flag tracking if initial cloud snapshot has finished loading
  const isInitialLoadedRef = useRef<boolean>(false);
  // Original document title for background notification blinking
  const originalDocTitleRef = useRef<string>('');
  const unreadAlertCountRef = useRef<number>(0);

  // Synchronize ref to prevent stale closures in async/network callbacks
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Load sound preference from localStorage & attach auto-unlock listeners
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SOUND);
      if (saved !== null) {
        setSoundEnabled(saved === 'true');
        soundEnabledRef.current = saved === 'true';
      }
    } catch {}

    // Auto-unlock browser audio pipeline on first user interaction anywhere on the page
    const handleFirstUserInteraction = () => {
      unlockAudio();
    };
    window.addEventListener('click', handleFirstUserInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
      window.removeEventListener('touchstart', handleFirstUserInteraction);
    };
  }, []);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    soundEnabledRef.current = nextVal;
    try {
      localStorage.setItem(STORAGE_KEY_SOUND, String(nextVal));
    } catch {}

    if (nextVal) {
      unlockAudio();
      playOrderChime();
    } else {
      clearAudioQueue();
    }
  };

  const handleTestNotification = () => {
    unlockAudio();
    triggerNewOrderAlert({
      order_number: `ALV-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_name: 'Cut Nurul Fadhilah',
      customer_phone: '081269008899',
      total_amount: 85000,
      payment_method: 'MIDTRANS_QRIS',
    });

    setActiveAlert({
      order_number: `ALV-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_name: 'Cut Nurul Fadhilah',
      customer_phone: '081269008899',
      total_amount: 85000,
      payment_method: 'MIDTRANS_QRIS',
      delivery_address: 'Batoh, Lueng Bata, Banda Aceh',
      created_at: new Date().toISOString(),
      type: 'NEW',
    });
  };

  const handleTestBatchNotification = () => {
    unlockAudio();
    triggerBatchOrderAlert(3);

    setActiveAlert({
      order_number: 'BATCH-3-DEMO',
      customer_name: '3 Pesanan Masuk Bersamaan',
      total_amount: 245000,
      payment_method: 'MULTIPLE',
      created_at: new Date().toISOString(),
      type: 'BATCH',
      batch_count: 3,
      batch_orders: [
        {
          order_number: `ALV-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
          customer_name: 'Rahmat Hidayat',
          total_amount: 75000,
          payment_method: 'COD',
        },
        {
          order_number: `ALV-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
          customer_name: 'Siti Aminah',
          total_amount: 110000,
          payment_method: 'TRANSFER_BANK',
        },
        {
          order_number: `ALV-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
          customer_name: 'Tengku Muhammad',
          total_amount: 60000,
          payment_method: 'MIDTRANS_QRIS',
        },
      ],
    });
  };

  const handleTestProofNotification = () => {
    unlockAudio();
    const demoNumber = `ALV-DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
    triggerPaymentProofAlert({
      order_number: demoNumber,
      customer_name: 'Cut Siti Rahmah',
      total_amount: 85000,
    });

    setActiveAlert({
      order_number: demoNumber,
      customer_name: 'Cut Siti Rahmah',
      customer_phone: '081269001122',
      total_amount: 85000,
      payment_method: 'TRANSFER_BANK',
      delivery_address: 'Batoh, Lueng Bata, Banda Aceh',
      created_at: new Date().toISOString(),
      type: 'PROOF',
      payment_proof_url:
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    });
  };

  const triggerPaymentProofNotification = (order: Order) => {
    if (!order || !order.order_number) return;
    if (order.order_status === 'DIBATALKAN') return;

    const proofSig = order.payment_proof_url ? order.payment_proof_url.slice(-30) : 'v1';
    const dedupeKey = `${order.order_number}_PROOF_${proofSig}`;
    if (knownProofKeysRef.current.has(dedupeKey)) return;
    knownProofKeysRef.current.add(dedupeKey);

    if (order.payment_proof_url) {
      knownProofUrlsRef.current.set(order.order_number, order.payment_proof_url);
    }

    // Play chime and Indonesian voice if sound enabled
    if (soundEnabledRef.current) {
      triggerPaymentProofAlert({
        order_number: order.order_number,
        customer_name: order.customer_name,
        total_amount: order.total_amount,
      });
    }

    // Set document title alert
    try {
      if (typeof document !== 'undefined') {
        if (!originalDocTitleRef.current) {
          originalDocTitleRef.current = document.title || 'Panel Kasir - Alvin Swalayan';
        }
        unreadAlertCountRef.current += 1;
        document.title = `📷 BUKTI TRANSFER! (${unreadAlertCountRef.current}) - Alvin Swalayan`;
      }
    } catch {}

    // Set floating alert modal
    setActiveAlert({
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      total_amount: order.total_amount,
      payment_method: order.payment_method,
      delivery_address: order.delivery_address,
      created_at: new Date().toISOString(),
      type: 'PROOF',
      payment_proof_url: order.payment_proof_url,
    });
  };

  const triggerOrderNotification = (order: Order, type: 'NEW' | 'PAID' = 'NEW') => {
    if (!order || !order.order_number) return;

    const dedupeKey = `${order.order_number}_${type}`;
    if (knownOrderIdsRef.current.has(dedupeKey)) return;
    knownOrderIdsRef.current.add(dedupeKey);
    knownOrderIdsRef.current.add(order.order_number);
    if (order.id) knownOrderIdsRef.current.add(order.id);

    // Play chime and Indonesian voice if sound enabled (via sequential queue)
    if (soundEnabledRef.current) {
      triggerNewOrderAlert({
        order_number: order.order_number,
        customer_name: order.customer_name,
        payment_method: order.payment_method,
        total_amount: order.total_amount,
        is_paid: type === 'PAID',
      });
    }

    // Set document title alert so cashier sees new order even when minimized
    try {
      if (typeof document !== 'undefined') {
        if (!originalDocTitleRef.current) {
          originalDocTitleRef.current = document.title || 'Panel Kasir - Alvin Swalayan';
        }
        unreadAlertCountRef.current += 1;
        const prefix = type === 'PAID' ? '💳 LUNAS!' : '🔔 PESANAN MASUK!';
        document.title = `${prefix} (${unreadAlertCountRef.current}) - Alvin Swalayan`;
      }
    } catch {}

    // Set floating alert modal
    setActiveAlert({
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      total_amount: order.total_amount,
      payment_method: order.payment_method,
      delivery_address: order.delivery_address,
      created_at: order.created_at,
      type,
    });
  };

  const triggerBatchNotification = (orders: Order[]) => {
    if (!orders || orders.length === 0) return;

    // Mark all as known
    orders.forEach((o) => {
      const dedupeKey = `${o.order_number}_NEW`;
      knownOrderIdsRef.current.add(dedupeKey);
      knownOrderIdsRef.current.add(o.order_number);
      if (o.id) knownOrderIdsRef.current.add(o.id);
      knownOrderStatusesRef.current.set(
        o.order_number,
        (o.payment_status || '').toUpperCase()
      );
    });

    const count = orders.length;
    const combinedTotal = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Audio announcement via batch queue
    if (soundEnabledRef.current) {
      triggerBatchOrderAlert(count);
    }

    // Set document title alert
    try {
      if (typeof document !== 'undefined') {
        if (!originalDocTitleRef.current) {
          originalDocTitleRef.current = document.title || 'Panel Kasir - Alvin Swalayan';
        }
        unreadAlertCountRef.current += count;
        document.title = `🔔 (${count} PESANAN BARU!) - Alvin Swalayan`;
      }
    } catch {}

    // Set floating batch alert modal
    setActiveAlert({
      order_number: `BATCH-${count}-ORDERS`,
      customer_name: `${count} Pesanan Masuk Bersamaan`,
      total_amount: combinedTotal,
      payment_method: 'MULTIPLE',
      created_at: new Date().toISOString(),
      type: 'BATCH',
      batch_count: count,
      batch_orders: orders.map((o) => ({
        order_number: o.order_number,
        customer_name: o.customer_name || 'Pembeli',
        total_amount: o.total_amount || 0,
        payment_method: o.payment_method || 'COD',
      })),
    });
  };

  const handleDismissAlert = () => {
    setActiveAlert(null);
    unreadAlertCountRef.current = 0;
    clearAudioQueue();
    if (typeof document !== 'undefined' && originalDocTitleRef.current) {
      document.title = originalDocTitleRef.current;
    }
  };

  useEffect(() => {
    // 1. Listen for local window CustomEvents
    const handleLocalNewOrder = (e: Event) => {
      const customEvent = e as CustomEvent<Order>;
      if (customEvent.detail) {
        triggerOrderNotification(customEvent.detail, 'NEW');
      }
    };
    const handleLocalOrderPaid = (e: Event) => {
      const customEvent = e as CustomEvent<Order>;
      if (customEvent.detail) {
        if (customEvent.detail.payment_method !== 'COD' && customEvent.detail.order_status !== 'SELESAI') {
          triggerOrderNotification(customEvent.detail, 'PAID');
        }
      }
    };
    const handleLocalProofUploaded = (e: Event) => {
      const customEvent = e as CustomEvent<Order>;
      if (customEvent.detail) {
        triggerPaymentProofNotification(customEvent.detail);
      }
    };
    window.addEventListener('alvin:new_order', handleLocalNewOrder);
    window.addEventListener('alvin:order_paid', handleLocalOrderPaid);
    window.addEventListener('alvin:payment_proof_uploaded', handleLocalProofUploaded);

    // 2. Listen for inter-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('alvin_orders_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'NEW_ORDER' && event.data.order) {
            triggerOrderNotification(event.data.order, 'NEW');
          } else if (event.data?.type === 'ORDER_PAID' && event.data.order) {
            if (event.data.order.payment_method !== 'COD' && event.data.order.order_status !== 'SELESAI') {
              triggerOrderNotification(event.data.order, 'PAID');
            }
          } else if (event.data?.type === 'PAYMENT_PROOF_UPLOADED' && event.data.order) {
            triggerPaymentProofNotification(event.data.order);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    // 3. Listen for localStorage changes across other tabs
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'alvin_orders_v1' && e.newValue) {
        try {
          const orders: Order[] = JSON.parse(e.newValue);
          if (Array.isArray(orders) && orders.length > 0) {
            const newest = orders[0];
            const isKnown =
              knownOrderIdsRef.current.has(newest.order_number) ||
              (newest.id ? knownOrderIdsRef.current.has(newest.id) : false);
            if (!isKnown) {
              triggerOrderNotification(newest, 'NEW');
            }
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // 4. Polling check for multi-device cross-browser orders from Cloud API
    const checkCloudOrders = async () => {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const data = await res.json();
          if (data.orders && Array.isArray(data.orders)) {
            orderService.mergeRemoteOrders(data.orders);

            // On initial check on component mount:
            if (!isInitialLoadedRef.current) {
              isInitialLoadedRef.current = true;
              const now = Date.now();
              data.orders.forEach((o: Order) => {
                const orderTime = new Date(o.created_at).getTime();
                // If created more than 90 seconds ago, treat as historical already-known order
                if (now - orderTime > 90000) {
                  knownOrderIdsRef.current.add(o.order_number);
                  if (o.id) knownOrderIdsRef.current.add(o.id);
                  knownOrderStatusesRef.current.set(o.order_number, (o.payment_status || '').toUpperCase());
                }
                // Record existing payment proof URLs so historical uploads don't alert on mount
                if (o.payment_proof_url) {
                  knownProofUrlsRef.current.set(o.order_number, o.payment_proof_url);
                }
              });
            }

            // Categorize newly discovered orders, payment settlements, and proof uploads
            const newOrdersToNotify: Order[] = [];
            const paidOrdersToNotify: Order[] = [];
            const proofOrdersToNotify: Order[] = [];

            data.orders.forEach((o: Order) => {
              const isKnown =
                knownOrderIdsRef.current.has(o.order_number) ||
                (o.id ? knownOrderIdsRef.current.has(o.id) : false);

              const currPayStatus = (o.payment_status || '').toUpperCase();
              const prevPayStatus = knownOrderStatusesRef.current.get(o.order_number);
              const prevProof = knownProofUrlsRef.current.get(o.order_number);
              const currProof = o.payment_proof_url;

              if (!isKnown) {
                newOrdersToNotify.push(o);
                if (currProof) {
                  knownProofUrlsRef.current.set(o.order_number, currProof);
                }
              } else {
                // Check if customer uploaded or updated payment proof
                if (
                  o.order_status !== 'DIBATALKAN' &&
                  currProof &&
                  currProof !== prevProof &&
                  currPayStatus !== 'PAID'
                ) {
                  proofOrdersToNotify.push(o);
                  knownProofUrlsRef.current.set(o.order_number, currProof);
                }

                // Check if payment was settled
                if (
                  prevPayStatus &&
                  prevPayStatus !== 'PAID' &&
                  currPayStatus === 'PAID'
                ) {
                  if (o.payment_method !== 'COD' && o.order_status !== 'SELESAI') {
                    paidOrdersToNotify.push(o);
                  }
                }
              }

              // Update tracked status
              knownOrderStatusesRef.current.set(o.order_number, currPayStatus);
            });

            // Trigger batch alert if 2 or more new orders, or single alert if exactly 1
            if (newOrdersToNotify.length === 1) {
              triggerOrderNotification(newOrdersToNotify[0], 'NEW');
            } else if (newOrdersToNotify.length > 1) {
              triggerBatchNotification(newOrdersToNotify);
            }

            // Trigger payment settlements sequentially
            paidOrdersToNotify.forEach((o) => {
              triggerOrderNotification(o, 'PAID');
            });

            // Trigger payment proof notifications sequentially
            proofOrdersToNotify.forEach((o) => {
              triggerPaymentProofNotification(o);
            });
          }
        }
      } catch (err) {
        // Fallback check to localStorage
        try {
          const raw = localStorage.getItem('alvin_orders_v1');
          if (raw) {
            const orders: Order[] = JSON.parse(raw);
            if (Array.isArray(orders) && orders.length > 0) {
              const newOrders: Order[] = [];
              const proofOrders: Order[] = [];
              orders.forEach((o) => {
                const isKnown =
                  knownOrderIdsRef.current.has(o.order_number) ||
                  (o.id ? knownOrderIdsRef.current.has(o.id) : false);
                const prevProof = knownProofUrlsRef.current.get(o.order_number);
                const currProof = o.payment_proof_url;

                if (!isKnown) {
                  newOrders.push(o);
                  if (currProof) knownProofUrlsRef.current.set(o.order_number, currProof);
                } else if (
                  o.order_status !== 'DIBATALKAN' &&
                  currProof &&
                  currProof !== prevProof &&
                  (o.payment_status || '').toUpperCase() !== 'PAID'
                ) {
                  proofOrders.push(o);
                  knownProofUrlsRef.current.set(o.order_number, currProof);
                }
              });

              if (newOrders.length === 1) {
                triggerOrderNotification(newOrders[0], 'NEW');
              } else if (newOrders.length > 1) {
                triggerBatchNotification(newOrders);
              }

              proofOrders.forEach((o) => {
                triggerPaymentProofNotification(o);
              });
            }
          }
        } catch {}
      }
    };

    // Initial check on mount
    checkCloudOrders();

    // 5. Supabase Realtime WebSocket
    const supabaseClient = getSupabaseClient();
    let realtimeChannel: any = null;
    if (supabaseClient) {
      try {
        realtimeChannel = supabaseClient
          .channel('realtime_admin_orders')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            () => {
              checkCloudOrders();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase Realtime subscription error:', err);
      }
    }

    // 6. Immediate check when tab is unminimized, switched to, or focused
    const handleImmediateRefresh = () => {
      checkCloudOrders();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleImmediateRefresh);
    }
    window.addEventListener('focus', handleImmediateRefresh);

    // 7. Web Worker Heartbeat (unthrottled timer: ticks every 8s even when browser tab is minimized!)
    let worker: Worker | null = null;
    try {
      const workerBlob = new Blob(
        [
          `
          let intervalId = null;
          self.onmessage = function(e) {
            if (e.data === 'START') {
              if (intervalId) clearInterval(intervalId);
              intervalId = setInterval(function() {
                self.postMessage('TICK');
              }, 8000); // 8 seconds steady interval in background thread
            } else if (e.data === 'STOP') {
              if (intervalId) clearInterval(intervalId);
              intervalId = null;
            }
          };
          `,
        ],
        { type: 'application/javascript' }
      );
      worker = new Worker(URL.createObjectURL(workerBlob));
      worker.onmessage = (e) => {
        if (e.data === 'TICK') {
          checkCloudOrders();
        }
      };
      worker.postMessage('START');
    } catch (err) {
      console.warn('Web Worker heartbeat fallback:', err);
    }

    // 8. Main thread fallback interval (runs every 8s)
    const fallbackInterval = setInterval(() => {
      checkCloudOrders();
    }, 8000);

    return () => {
      window.removeEventListener('alvin:new_order', handleLocalNewOrder);
      window.removeEventListener('alvin:order_paid', handleLocalOrderPaid);
      window.removeEventListener('alvin:payment_proof_uploaded', handleLocalProofUploaded);
      window.removeEventListener('storage', handleStorageEvent);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleImmediateRefresh);
      }
      window.removeEventListener('focus', handleImmediateRefresh);
      if (bc) bc.close();
      if (supabaseClient && realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
      }
      if (worker) {
        worker.postMessage('STOP');
        worker.terminate();
      }
      clearInterval(fallbackInterval);
    };
  }, []);

  const isCod = activeAlert ? /cod/i.test(activeAlert.payment_method) : false;
  const isTransfer = activeAlert ? /transfer|bank/i.test(activeAlert.payment_method) : false;
  const isPaidAlert = activeAlert?.type === 'PAID';
  const isBatchAlert = activeAlert?.type === 'BATCH';
  const isProofAlert = activeAlert?.type === 'PROOF';

  return (
    <>
      {/* Header Sound Control Button Group */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleSound}
          title={soundEnabled ? 'Suara notifikasi pesanan aktif (Klik untuk membisukan)' : 'Suara notifikasi dibisukan (Klik untuk mengaktifkan)'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
            soundEnabled
              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-xs'
              : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
          }`}
        >
          {soundEnabled ? (
            <>
              <Volume2 size={14} className="text-amber-600 animate-pulse" />
              <span className="hidden sm:inline">Suara: ON</span>
            </>
          ) : (
            <>
              <VolumeX size={14} className="text-gray-400" />
              <span className="hidden sm:inline">Suara: OFF</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleTestNotification}
          title="Tes suara bel kasir dan pengumuman pesanan tunggal"
          className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Bell size={13} className="text-[#E5391B]" />
          <span className="hidden md:inline">Tes Suara</span>
        </button>

        <button
          type="button"
          onClick={handleTestBatchNotification}
          title="Tes pengumuman suara pesanan masuk bersamaan / beruntun"
          className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Layers size={13} className="text-orange-600" />
          <span className="hidden md:inline">Tes Batch</span>
        </button>

        <button
          type="button"
          onClick={handleTestProofNotification}
          title="Tes suara bel kasir dan pengumuman bukti transfer baru masuk"
          className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
        >
          <FileImage size={13} className="text-blue-600" />
          <span className="hidden md:inline">Tes Bukti Bayar</span>
        </button>
      </div>

      {/* Prominent Floating Alert Banner for New Incoming Orders & Payments */}
      {activeAlert && (
        <div className={`fixed top-5 right-5 z-50 max-w-sm sm:max-w-md w-full bg-white rounded-2xl shadow-2xl border-2 overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300 ring-4 ${
          isPaidAlert
            ? 'border-emerald-600 ring-emerald-500/10'
            : isProofAlert
            ? 'border-blue-600 ring-blue-500/10'
            : isBatchAlert
            ? 'border-orange-500 ring-orange-500/10'
            : 'border-[#E5391B] ring-red-500/10'
        }`}>
          {/* Header Banner */}
          <div className={`px-4 py-3 flex items-center justify-between text-white ${
            isPaidAlert
              ? 'bg-emerald-600'
              : isProofAlert
              ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700'
              : isBatchAlert
              ? 'bg-gradient-to-r from-orange-600 to-[#E5391B]'
              : 'bg-[#E5391B]'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full bg-white flex items-center justify-center font-black animate-bounce shadow-xs ${
                isPaidAlert
                  ? 'text-emerald-600'
                  : isProofAlert
                  ? 'text-blue-600'
                  : isBatchAlert
                  ? 'text-orange-600'
                  : 'text-[#E5391B]'
              }`}>
                {isPaidAlert ? (
                  <CheckCircle2 size={16} />
                ) : isProofAlert ? (
                  <FileImage size={16} />
                ) : isBatchAlert ? (
                  <Layers size={16} />
                ) : (
                  <Bell size={16} />
                )}
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">
                  {isPaidAlert
                    ? 'Pembayaran Lunas Diterima!'
                    : isProofAlert
                    ? 'Bukti Transfer Baru Diunggah!'
                    : isBatchAlert
                    ? `${activeAlert.batch_count || 2} Pesanan Baru Sekaligus!`
                    : 'Pesanan Baru Masuk!'}
                </h3>
                <p className="text-[10px] text-white/90 font-mono">
                  {isBatchAlert
                    ? 'Masuk pada waktu berdekatan'
                    : isProofAlert
                    ? `Perlu Verifikasi Kasir • ${activeAlert.order_number}`
                    : activeAlert.order_number}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissAlert}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors cursor-pointer"
              title="Tutup pemberitahuan"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 space-y-3 bg-white text-xs">
            {isBatchAlert ? (
              <>
                {/* Batch Summary Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Total Pesanan:</span>
                    <span className="font-extrabold text-[#222222] text-sm block">
                      {activeAlert.batch_count} Pesanan Masuk
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-semibold">Total Nilai Belanja:</span>
                    <span className="font-black text-base block text-orange-600">
                      {formatRupiah(activeAlert.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Batch Order Items List */}
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">
                    Rincian Pesanan Masuk:
                  </span>
                  {activeAlert.batch_orders?.map((item, idx) => {
                    const itemIsCod = /cod/i.test(item.payment_method);
                    const itemIsTransfer = /transfer|bank/i.test(item.payment_method);
                    return (
                      <div
                        key={item.order_number || idx}
                        className="bg-gray-50 p-2 rounded-xl border border-gray-200/70 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-extrabold text-gray-900 block truncate text-[11px]">
                            {item.customer_name}
                          </span>
                          <span className="font-mono text-[10px] text-gray-500 block">
                            {item.order_number}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-gray-900 block text-xs">
                            {formatRupiah(item.total_amount)}
                          </span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md inline-block ${
                            itemIsCod
                              ? 'bg-amber-100 text-amber-900'
                              : itemIsTransfer
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {getPaymentMethodLabel(item.payment_method)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* Proof Upload Notification Banner with Thumbnail */}
                {isProofAlert && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-start gap-2.5">
                    {activeAlert.payment_proof_url ? (
                      <img
                        src={activeAlert.payment_proof_url}
                        alt="Pratinjau Bukti Transfer"
                        className="w-14 h-14 object-cover rounded-lg border border-blue-300 shrink-0 shadow-xs"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                        <FileImage size={20} />
                      </div>
                    )}
                    <div className="text-[11px] leading-relaxed">
                      <span className="font-bold text-blue-950 block">Bukti Pembayaran Diterima</span>
                      <span className="text-blue-800">
                        Pelanggan telah mengunggah foto struk transfer. Harap periksa mutasi rekening dan verifikasi pesanan.
                      </span>
                    </div>
                  </div>
                )}

                {/* Customer & Amount */}
                <div className="flex items-start justify-between border-b border-gray-100 pb-2.5">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Pemesan:</span>
                    <span className="font-extrabold text-[#222222] text-sm block">
                      {activeAlert.customer_name}
                    </span>
                    {activeAlert.customer_phone && (
                      <span className="text-[11px] text-gray-500 font-mono block">
                        {activeAlert.customer_phone}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-semibold">Total Belanja:</span>
                    <span className={`font-black text-base block ${
                      isPaidAlert
                        ? 'text-emerald-600'
                        : isProofAlert
                        ? 'text-blue-600'
                        : 'text-[#E5391B]'
                    }`}>
                      {formatRupiah(activeAlert.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Payment Method Badge */}
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">
                    Metode Pembayaran:
                  </span>
                  <div className="flex items-center gap-2">
                    {isCod ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                        <Banknote size={14} className="text-amber-700" />
                        <span>Bayar di Tempat (COD Tunai)</span>
                      </span>
                    ) : isTransfer ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-100 text-blue-900 border border-blue-300">
                        <CreditCard size={14} className="text-blue-700" />
                        <span>Transfer Bank (BSI / BAS)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <img src="/images/payments/qris.png" alt="QRIS" className="h-3.5 w-auto object-contain" />
                        <span>QRIS {isPaidAlert ? '(Lunas)' : ''}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Address */}
                {activeAlert.delivery_address && (
                  <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                    📍 {activeAlert.delivery_address}
                  </p>
                )}
              </>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Link
                href={isBatchAlert ? '/admin/orders' : `/admin/orders?highlight=${activeAlert.order_number}`}
                onClick={handleDismissAlert}
                className={`flex-1 text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors ${
                  isProofAlert
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : isPaidAlert
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-[#E5391B] hover:bg-[#C62818]'
                }`}
              >
                {isProofAlert ? (
                  <>
                    <FileImage size={14} />
                    <span>Periksa & Verifikasi Bukti</span>
                    <ArrowRight size={13} />
                  </>
                ) : isBatchAlert ? (
                  <>
                    <ShoppingCart size={14} />
                    <span>Buka Daftar Pesanan</span>
                    <ArrowRight size={13} />
                  </>
                ) : (
                  <>
                    <ShoppingCart size={14} />
                    <span>Buka Rincian Pesanan</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </Link>
              <button
                type="button"
                onClick={() => {
                  unlockAudio();
                  if (isProofAlert) {
                    triggerPaymentProofAlert({
                      order_number: activeAlert.order_number,
                      customer_name: activeAlert.customer_name,
                      total_amount: activeAlert.total_amount,
                    });
                  } else if (isBatchAlert) {
                    triggerBatchOrderAlert(activeAlert.batch_count || 2);
                  } else {
                    triggerNewOrderAlert({
                      order_number: activeAlert.order_number,
                      payment_method: activeAlert.payment_method,
                      is_paid: activeAlert.type === 'PAID',
                    });
                  }
                }}
                className="border border-gray-300 hover:bg-gray-100 text-gray-700 py-2 px-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                title="Bunyikan Ulang Bel Notifikasi"
              >
                <Volume2 size={13} className={isProofAlert ? 'text-blue-600' : 'text-[#E5391B]'} />
                <span className="hidden sm:inline">Bunyikan</span>
              </button>
              <button
                type="button"
                onClick={handleDismissAlert}
                className="border border-gray-300 hover:bg-gray-100 text-gray-700 py-2 px-3 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

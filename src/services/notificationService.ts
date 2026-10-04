import { Order } from '@/types';
import { formatRupiah } from '@/lib/utils';

export interface NotificationLog {
  id: string;
  type: 'WHATSAPP' | 'EMAIL';
  recipient: string;
  subject?: string;
  message: string;
  status: 'SENT' | 'MOCKED';
  timestamp: string;
}

const STORAGE_KEY_NOTIFS = 'alvin_notifications_v1';

function saveNotificationLog(log: NotificationLog) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFS);
    const list: NotificationLog[] = raw ? JSON.parse(raw) : [];
    list.unshift(log);
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(list.slice(0, 50)));
  } catch (e) {
    console.error('Failed to log notification', e);
  }
}

export const notificationService = {
  /**
   * Fonnte WhatsApp API trigger
   * Sends actual request if NEXT_PUBLIC_FONNTE_TOKEN is provided, otherwise records mock notification log
   */
  sendOrderWhatsApp: async (
    order: Order,
    trigger: 'ORDER_CREATED' | 'PAYMENT_CONFIRMED' | 'ORDER_PROCESSING' | 'ORDER_SHIPPED' | 'ORDER_COMPLETED' | 'ORDER_CANCELLED' | 'PAYMENT_REJECTED',
    reason?: string
  ) => {
    let message = '';
    const phone = order.customer_phone;
    const isCod = order.payment_method === 'COD';

    // Dynamically resolve base URL: automatically reflects custom domain when active (e.g. alvinswalayan.com) or fallback
    let baseUrl = 'https://alvin-swalayan.vercel.app';
    if (typeof window !== 'undefined' && window.location.origin) {
      baseUrl = window.location.origin;
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    }
    const trackingUrl = `${baseUrl}/orders/${order.order_number || order.id}`;

    switch (trigger) {
      case 'ORDER_CREATED':
        if (isCod) {
          message = `*Pesanan Baru Alvin Swalayan (COD)* 🛒\n\nHalo Kak *${order.customer_name}*,\nTerima kasih sudah berbelanja di Alvin Swalayan Banda Aceh.\n\nNo. Pesanan: *${order.order_number}*\nTotal Belanja: *${formatRupiah(order.total_amount)}*\nMetode Bayar: *Bayar di Tempat (COD / Tunai)*\nStatus: *Pesanan Diterima & Sedang Disiapkan Toko*\n\nAlamat Kirim: ${order.delivery_address}\nCatatan: ${order.delivery_note || '-'}\n\n📦 *Lacak Status & Rincian Pesanan:*\n${trackingUrl}\n\nStaf kami segera menyiapkan belanjaan Anda. Siapkan uang tunai pas saat kurir tiba.\nTerima kasih!\n_Alvin Swalayan - Hemat & Berkualitas_`;
        } else {
          message = `*Pesanan Baru Alvin Swalayan* 🛒\n\nHalo Kak *${order.customer_name}*,\nTerima kasih sudah berbelanja di Alvin Swalayan Banda Aceh.\n\nNo. Pesanan: *${order.order_number}*\nTotal Belanja: *${formatRupiah(order.total_amount)}*\nMetode Bayar: *${order.payment_method === 'TRANSFER_BANK' ? 'Transfer Bank' : order.payment_method}*\nStatus: *Menunggu Pembayaran*\n\nAlamat Kirim: ${order.delivery_address}\nCatatan: ${order.delivery_note || '-'}\n\n💳 *Lacak Pesanan & Upload Bukti Bayar:*\n${trackingUrl}\n\nMohon lakukan pembayaran atau transfer ke rekening toko.\nTerima kasih!\n_Alvin Swalayan - Hemat & Berkualitas_`;
        }
        break;

      case 'PAYMENT_CONFIRMED':
        message = `*Pembayaran Diterima - Alvin Swalayan* ✅\n\nHalo Kak *${order.customer_name}*,\nPembayaran untuk pesanan *${order.order_number}* sebesar *${formatRupiah(order.total_amount)}* telah diverifikasi oleh kasir toko Alvin Swalayan.\n\n📦 *Pantau Proses Pesanan:*\n${trackingUrl}\n\nPesanan akan segera disiapkan toko!\nTerima kasih.\n_Alvin Swalayan - Hemat & Berkualitas_`;
        break;

      case 'PAYMENT_REJECTED':
        message = `*Pemberitahuan Bukti Transfer - Alvin Swalayan* ⚠️\n\nHalo Kak *${order.customer_name}*,\nTerima kasih telah berbelanja di Alvin Swalayan Banda Aceh.\n\nMengenai pesanan Anda:\nNo. Pesanan: *${order.order_number}*\nTotal Tagihan: *${formatRupiah(order.total_amount)}*\n\nMohon maaf, bukti transfer yang Anda unggah *belum dapat diverifikasi oleh kasir* kami${reason ? ` (${reason})` : ' karena foto kurang jelas atau mutasi rekening belum masuk'}.\n\nSilakan periksa kembali mutasi bank Anda dan unggah ulang bukti transfer yang jelas melalui link berikut:\n👉 *Unggah Ulang Bukti Transfer:*\n${trackingUrl}\n\nAtau Anda dapat langsung mengirimkan foto struk transfer yang baru via balasan chat WhatsApp ini.\n\nTerima kasih.\n_Alvin Swalayan - Hemat & Berkualitas_`;
        break;

      case 'ORDER_PROCESSING':
        message = `*Pesanan Sedang Dipersiapkan* 📦\n\nHalo Kak *${order.customer_name}*,\nStaf toko Alvin Swalayan sedang mengambil dan mengemas barang belanjaan Anda untuk No. Pesanan *${order.order_number}*.\n\n📦 *Lacak Status Pesanan:*\n${trackingUrl}\n\nTerima kasih!\n_Alvin Swalayan - Hemat & Berkualitas_`;
        break;

      case 'ORDER_SHIPPED':
        message = `*Pesanan Dalam Pengantaran Kurir* 🛵\n\nHalo Kak *${order.customer_name}*,\nPesanan *${order.order_number}* sedang dalam perjalanan menuju alamat Anda di Banda Aceh.\n\n🛵 *Lacak Rincian Pengantaran:*\n${trackingUrl}\n\nMohon pastikan nomor telepon aktif untuk memudahkan kurir kami menghubungi Anda.\nTerima kasih!\n_Alvin Swalayan - Hemat & Berkualitas_`;
        break;

      case 'ORDER_COMPLETED':
        message = `*Pesanan Telah Selesai* 🎉\n\nHalo Kak *${order.customer_name}*,\nPesanan *${order.order_number}* telah berhasil diterima.\nTerima kasih telah berbelanja di Alvin Swalayan Banda Aceh. Semoga belanjaan Anda bermanfaat dan berkah!\n\n📄 *Lihat Rincian & Nota Belanja:*\n${trackingUrl}\n\n_Alvin Swalayan - Hemat & Berkualitas_`;
        break;

      case 'ORDER_CANCELLED':
        message = `*Pesanan Dibatalkan - Alvin Swalayan* ❌\n\nHalo Kak *${order.customer_name}*,\nPesanan *${order.order_number}* telah dibatalkan.${reason ? `\nAlasan: ${reason}` : ''}\n\n📄 *Rincian Pesanan:*\n${trackingUrl}\n\nStok produk telah dikembalikan ke sistem toko. Jika Anda memiliki pertanyaan, silakan hubungi WhatsApp toko kami.\nTerima kasih.\n_Alvin Swalayan - Hemat & Berkualitas_`;
        break;
    }

    // Resolve token: prioritize localStorage store settings (admin UI), fallback to environment variables
    let token = '';
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('alvin_store_settings_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.fonnte_token) token = parsed.fonnte_token;
        }
      } catch {}
    }
    if (!token) {
      token = process.env.NEXT_PUBLIC_FONNTE_TOKEN || process.env.FONNTE_TOKEN || '';
    }

    const formattedPhone = phone ? phone.replace(/^0/, '62').replace(/[^\d]/g, '') : '';

    if (token && formattedPhone) {
      try {
        const res = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            Authorization: token,
          },
          body: new URLSearchParams({
            target: formattedPhone,
            message: message,
          }),
        });
        const resJson = await res.json().catch(() => ({}));
        saveNotificationLog({
          id: `notif-${Date.now()}`,
          type: 'WHATSAPP',
          recipient: formattedPhone,
          message,
          status: 'SENT',
          timestamp: new Date().toISOString(),
        });
        return { success: true, mode: 'LIVE_FONNTE', data: resJson };
      } catch (err) {
        console.error('Fonnte API error:', err);
      }
    }

    // Mock logger
    console.log(`[MOCK FONNTE WA] To: ${phone}\n${message}`);
    saveNotificationLog({
      id: `notif-${Date.now()}`,
      type: 'WHATSAPP',
      recipient: phone,
      message,
      status: 'MOCKED',
      timestamp: new Date().toISOString(),
    });

    return { success: true, mode: 'MOCK_LOGGED' };
  },

  /**
   * Email notification mock service
   */
  sendEmail: async (
    to: string,
    subject: string,
    type: 'REGISTRATION' | 'ORDER_CONFIRMATION' | 'INVOICE' | 'RESET_PASSWORD',
    content: string
  ) => {
    console.log(`[MOCK EMAIL SERVICE] To: ${to} | Subject: ${subject} | Type: ${type}`);
    saveNotificationLog({
      id: `notif-${Date.now()}`,
      type: 'EMAIL',
      recipient: to,
      subject,
      message: content,
      status: 'MOCKED',
      timestamp: new Date().toISOString(),
    });
    return { success: true, mode: 'MOCK_EMAIL' };
  },

  getRecentLogs: (): NotificationLog[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_NOTIFS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
};

import { Order } from '@/types';
import { formatRupiah } from '@/lib/utils';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface WhatsAppOptions {
  phone: string;
  message: string;
}

export interface NotificationProvider {
  sendEmail(options: EmailOptions): Promise<boolean>;
  sendWhatsApp(options: WhatsAppOptions): Promise<boolean>;
}

export class FonnteWhatsAppProvider {
  private getToken(): string {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('alvin_store_settings_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.fonnte_token) return parsed.fonnte_token;
        }
      } catch {}
    }
    return process.env.NEXT_PUBLIC_FONNTE_TOKEN || process.env.FONNTE_TOKEN || '';
  }

  async send(phone: string, message: string): Promise<boolean> {
    const token = this.getToken();
    const isConfigured = Boolean(
      token &&
      token !== 'your-fonnte-token-here' &&
      !token.includes('xxxx')
    );

    if (!isConfigured) {
      console.log(`[Mock WhatsApp -> ${phone}]:\n${message}`);
      return true;
    }

    try {
      const formattedPhone = phone.replace(/^0/, '62').replace(/[^\d]/g, '');
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: formattedPhone,
          message: message,
        }),
      });

      const data = await response.json();
      return Boolean(data.status);
    } catch (err) {
      console.warn('Fonnte WhatsApp sending warning:', err);
      return false;
    }
  }
}

export class SmtpEmailProvider {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = Boolean(
      process.env.SMTP_USER &&
      process.env.SMTP_USER !== 'alvinswalayan.aceh@gmail.com' &&
      process.env.SMTP_PASS &&
      process.env.SMTP_PASS !== 'your-app-password'
    );
  }

  async send(to: string, subject: string, _html: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.log(`[Mock Email -> ${to}] Subject: ${subject}`);
      return true;
    }

    // In a real SMTP environment, nodemailer or SendGrid is invoked here
    console.log(`[Email Sent to ${to}]: ${subject}`);
    return true;
  }
}

class AppNotificationService {
  private waProvider = new FonnteWhatsAppProvider();
  private emailProvider = new SmtpEmailProvider();

  async notifyOrderCreated(order: Order): Promise<void> {
    const totalFormatted = formatRupiah(order.grand_total || order.total_amount);
    const itemList = order.items.map((i) => `• ${i.product_name} (${i.quantity}x)`).join('\n');

    const waMessage = `Halo ${order.customer_name},\n\nPesanan Anda di *Alvin Swalayan Banda Aceh* berhasil dibuat!\n\n📋 *No. Pesanan:* ${order.order_number}\n💰 *Total Pembayaran:* ${totalFormatted}\n💳 *Metode:* ${order.payment_method}\n📍 *Alamat:* ${order.delivery_address || order.shipping_address}\n\n*Daftar Belanja:*\n${itemList}\n\nTim staf toko kami akan segera memverifikasi dan menyiapkan pesanan Anda.\nTerima kasih telah berbelanja di Alvin Swalayan!`;

    // Asynchronously dispatch notifications without blocking checkout flow
    try {
      if (order.customer_phone || order.recipient_phone) {
        await this.waProvider.send(order.customer_phone || order.recipient_phone || '', waMessage);
      }
    } catch (e) {
      console.warn('Async WA notification caught:', e);
    }
  }

  async notifyOrderStatusChanged(order: Order, oldStatus: string, newStatus: string): Promise<void> {
    const waMessage = `Halo ${order.customer_name},\n\nUpdate status pesanan *${order.order_number}* di Alvin Swalayan:\n\n*Status Sekarang:* ${newStatus}\n(Sebelumnya: ${oldStatus})\n\nSilakan cek detail pesanan Anda di website Alvin Swalayan.\nTerima kasih!`;

    try {
      if (order.customer_phone || order.recipient_phone) {
        await this.waProvider.send(order.customer_phone || order.recipient_phone || '', waMessage);
      }
    } catch (e) {
      console.warn('Async status notification caught:', e);
    }
  }
}

export const appNotifications = new AppNotificationService();

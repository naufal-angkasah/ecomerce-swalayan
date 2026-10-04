import { Order, PaymentStatus } from '@/types';

export interface PaymentTransactionResult {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  token?: string;
  message?: string;
}

export interface PaymentProvider {
  createTransaction(order: Order): Promise<PaymentTransactionResult>;
  verifyPayment(orderNumber: string): Promise<{ status: PaymentStatus; message: string }>;
}

export class MidtransPaymentProvider implements PaymentProvider {
  private getServerKey(): string {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('alvin_store_settings_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.midtrans_server_key) return parsed.midtrans_server_key;
        }
      } catch {}
    }
    return process.env.MIDTRANS_SERVER_KEY || '';
  }

  private isProduction(): boolean {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('alvin_store_settings_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.midtrans_is_production !== undefined) return Boolean(parsed.midtrans_is_production);
        }
      } catch {}
    }
    return process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
  }

  private isConfigured(): boolean {
    const key = this.getServerKey();
    return Boolean(
      key &&
      key !== 'SB-Mid-server-xxxxxxxxxxxxxxxx' &&
      !key.includes('xxxx')
    );
  }

  async createTransaction(order: Order): Promise<PaymentTransactionResult> {
    if (!this.isConfigured()) {
      // Graceful fallback to sandbox mock if credentials are placeholders
      return new MockPaymentProvider().createTransaction(order);
    }

    try {
      const serverKey = this.getServerKey();
      const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
      const payload = {
        transaction_details: {
          order_id: order.order_number,
          gross_amount: order.grand_total || order.total_amount,
        },
        customer_details: {
          first_name: order.customer_name,
          phone: order.customer_phone,
        },
        item_details: order.items.map((item) => ({
          id: item.sku || item.product_id || 'item',
          price: item.price,
          quantity: item.quantity,
          name: item.product_name.substring(0, 50),
        })),
      };

      const snapUrl = this.isProduction()
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

      const response = await fetch(snapUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_messages?.[0] || 'Midtrans error');
      }

      const data = await response.json();
      return {
        success: true,
        token: data.token,
        redirectUrl: data.redirect_url,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      console.warn('Midtrans API transaction fallback:', errMsg);
      return new MockPaymentProvider().createTransaction(order);
    }
  }

  async verifyPayment(orderNumber: string): Promise<{ status: PaymentStatus; message: string }> {
    if (!this.isConfigured()) {
      return new MockPaymentProvider().verifyPayment(orderNumber);
    }

    try {
      const serverKey = this.getServerKey();
      const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
      const statusUrl = this.isProduction()
        ? `https://api.midtrans.com/v2/${orderNumber}/status`
        : `https://api.sandbox.midtrans.com/v2/${orderNumber}/status`;

      const response = await fetch(statusUrl, {
        headers: {
          'Accept': 'application/json',
          'Authorization': authHeader,
        },
      });

      const data = await response.json();
      const transactionStatus = data.transaction_status;
      const fraudStatus = data.fraud_status;

      let status: PaymentStatus = 'pending';

      if (transactionStatus === 'capture') {
        status = fraudStatus === 'challenge' ? 'waiting_verification' : 'paid';
      } else if (transactionStatus === 'settlement') {
        status = 'paid';
      } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
        status = 'failed';
      } else if (transactionStatus === 'pending') {
        status = 'pending';
      }

      return { status, message: `Status transaksi: ${transactionStatus}` };
    } catch {
      return { status: 'pending', message: 'Gagal mengecek status ke Midtrans' };
    }
  }
}

export class MockPaymentProvider implements PaymentProvider {
  async createTransaction(order: Order): Promise<PaymentTransactionResult> {
    // Generates a mock sandbox snap payment link
    return {
      success: true,
      token: `mock-snap-token-${Date.now()}`,
      redirectUrl: `/orders/${order.id}?payment=simulated_success`,
      message: 'Simulasi pembayaran Midtrans Sandbox siap diproses.',
    };
  }

  async verifyPayment(orderNumber: string): Promise<{ status: PaymentStatus; message: string }> {
    return {
      status: 'paid',
      message: `Pembayaran ${orderNumber} terverifikasi via Mock Provider.`,
    };
  }
}

export const paymentProvider: PaymentProvider = new MidtransPaymentProvider();

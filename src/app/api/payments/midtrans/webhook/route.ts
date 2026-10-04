import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { orderService } from '@/services/orderService';
import { PaymentStatus, OrderStatus } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';

    // Validate Signature Key if serverKey is set
    if (serverKey && !serverKey.includes('xxxx')) {
      if (!signature_key) {
        return NextResponse.json({ message: 'Missing signature key' }, { status: 403 });
      }
      const payloadToHash = `${order_id}${status_code}${gross_amount}${serverKey}`;
      const calculatedSignature = crypto.createHash('sha512').update(payloadToHash).digest('hex');

      const sigBuffer = Buffer.from(signature_key, 'utf-8');
      const calcBuffer = Buffer.from(calculatedSignature, 'utf-8');
      if (
        sigBuffer.length !== calcBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, calcBuffer)
      ) {
        return NextResponse.json({ message: 'Invalid signature key' }, { status: 403 });
      }
    }

    // Determine target payment and order status
    let paymentStatus: PaymentStatus = 'pending';
    let orderStatus: OrderStatus = 'DIPROSES';

    if (transaction_status === 'capture') {
      if (fraud_status === 'challenge') {
        paymentStatus = 'waiting_verification';
        orderStatus = 'MENUNGGU_PEMBAYARAN';
      } else if (fraud_status === 'accept') {
        paymentStatus = 'paid';
        orderStatus = 'DIPROSES';
      }
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'paid';
      orderStatus = 'DIPROSES';
    } else if (transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire') {
      paymentStatus = 'failed';
      orderStatus = 'DIBATALKAN';
    } else if (transaction_status === 'pending') {
      paymentStatus = 'pending';
      orderStatus = 'MENUNGGU_PEMBAYARAN';
    }

    // Update order status in orderService
    const updated = orderService.updateStatusByOrderNumber(order_id, {
      payment_status: paymentStatus,
      order_status: orderStatus,
      note: `Webhook Midtrans: ${transaction_status} (Status: ${paymentStatus})`,
    });

    return NextResponse.json({
      status: 'success',
      message: 'Webhook processed successfully',
      updated: Boolean(updated),
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Internal webhook error';
    console.error('Midtrans Webhook Error:', errMessage);
    return NextResponse.json(
      { status: 'error', message: errMessage },
      { status: 500 }
    );
  }
}

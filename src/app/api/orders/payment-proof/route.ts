import { NextResponse } from 'next/server';
import { getServerSupabase, isServerSupabaseConfigured } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    if (!isServerSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Supabase server is not configured' },
        { status: 503 }
      );
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client unavailable' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { orderId, orderNumber, paymentProofUrl } = body;

    if (!paymentProofUrl) {
      return NextResponse.json(
        { error: 'File / URL bukti transfer wajib dilampirkan.' },
        { status: 400 }
      );
    }

    if (!orderNumber && !orderId) {
      return NextResponse.json(
        { error: 'Nomor pesanan (orderNumber / orderId) wajib disertakan.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const updatePayload = {
      payment_proof_url: paymentProofUrl,
      payment_status: 'waiting_verification',
      payment_rejection_reason: null,
      updated_at: now,
    };

    // 1. Try finding by order_number first (most reliable identifier across devices)
    if (orderNumber) {
      const { data: updatedByNumber, error: errNum } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('order_number', orderNumber)
        .select('id, order_number, payment_proof_url, payment_status, status')
        .maybeSingle();

      if (!errNum && updatedByNumber) {
        return NextResponse.json({
          success: true,
          message: 'Bukti transfer berhasil disimpan ke database cloud.',
          order: updatedByNumber,
        });
      }
    }

    // 2. Fallback: try finding by id (if valid UUID)
    if (orderId && UUID_REGEX.test(orderId)) {
      const { data: updatedById, error: errId } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select('id, order_number, payment_proof_url, payment_status, status')
        .maybeSingle();

      if (!errId && updatedById) {
        return NextResponse.json({
          success: true,
          message: 'Bukti transfer berhasil disimpan ke database cloud.',
          order: updatedById,
        });
      }
    }

    // 3. Fallback: search if order exists by order_number or partial match
    if (orderId && !UUID_REGEX.test(orderId)) {
      const { data: updatedByAlt, error: errAlt } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('order_number', orderId)
        .select('id, order_number, payment_proof_url, payment_status, status')
        .maybeSingle();

      if (!errAlt && updatedByAlt) {
        return NextResponse.json({
          success: true,
          message: 'Bukti transfer berhasil disimpan ke database cloud.',
          order: updatedByAlt,
        });
      }
    }

    return NextResponse.json(
      {
        success: false,
        warning: 'Pesanan belum tercatat di database cloud atau nomor pesanan tidak cocok.',
      },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('Error in POST /api/orders/payment-proof:', err);
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan pada server saat mengunggah bukti transfer.' },
      { status: 500 }
    );
  }
}

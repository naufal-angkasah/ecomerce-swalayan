import { NextResponse } from 'next/server';
import { getServerSupabase, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@/types';

function mapOrderStatus(status?: string): 'pending' | 'confirmed' | 'processing' | 'ready' | 'shipped' | 'completed' | 'cancelled' {
  switch (status) {
    case 'MENUNGGU_PEMBAYARAN':
      return 'pending';
    case 'DIBAYAR':
      return 'confirmed';
    case 'DIPROSES':
      return 'processing';
    case 'DIKIRIM':
      return 'shipped';
    case 'SELESAI':
      return 'completed';
    case 'DIBATALKAN':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function mapPaymentStatus(status?: string): 'pending' | 'waiting_verification' | 'paid' | 'failed' | 'expired' | 'rejected' | 'cancelled' {
  switch (status) {
    case 'VERIFIKASI_MANUAL':
      return 'waiting_verification';
    case 'PAID':
      return 'paid';
    case 'FAILED':
      return 'failed';
    case 'EXPIRED':
      return 'expired';
    case 'REJECTED':
      return 'rejected';
    case 'PENDING':
    default:
      return 'pending';
  }
}

function mapPaymentMethod(method?: string): 'cod' | 'bank_transfer' | 'midtrans' {
  switch (method) {
    case 'TRANSFER_BANK':
      return 'bank_transfer';
    case 'MIDTRANS_QRIS':
      return 'midtrans';
    case 'COD':
    default:
      return 'cod';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  if (!isServerSupabaseConfigured) {
    return NextResponse.json(
      { error: 'Supabase is not configured on server' },
      { status: 503 }
    );
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const {
      order_number,
      user_id,
      customer_name,
      customer_phone,
      delivery_address,
      delivery_note,
      items,
      subtotal,
      delivery_fee,
      discount_amount,
      voucher_code,
      total_amount,
      payment_method,
      payment_status,
      order_status,
      payment_proof_url,
      payment_rejection_reason,
    } = body;

    if (!order_number || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }

    // Verify user_id in profiles if valid UUID
    let validUserId: string | null = null;
    if (user_id) {
      const cleanId = String(user_id).replace(/^usr-sb-/, '');
      if (UUID_REGEX.test(cleanId)) {
        const { data: prof } = await supabase.from('profiles').select('id').eq('id', cleanId).maybeSingle();
        if (prof) validUserId = cleanId;
      }
    }

    const recipientName = (customer_name || 'Pelanggan').trim();
    const recipientPhone = (customer_phone || '-').trim();
    const shippingAddressText = typeof delivery_address === 'string'
      ? delivery_address.trim()
      : delivery_address?.address_line || 'Banda Aceh';

    const orderRow: any = {
      order_number,
      user_id: validUserId,
      status: mapOrderStatus(order_status),
      payment_status: mapPaymentStatus(payment_status),
      payment_method: mapPaymentMethod(payment_method),
      subtotal: Math.round(Number(subtotal) || 0),
      discount: Math.round(Number(discount_amount) || 0),
      shipping_fee: Math.round(Number(delivery_fee) || 0),
      grand_total: Math.round(Number(total_amount) || 0),
      voucher_code: voucher_code || null,
      customer_note: delivery_note || null,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      shipping_address: shippingAddressText,
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (payment_proof_url !== undefined) {
      orderRow.payment_proof_url = payment_proof_url;
    }
    if (payment_rejection_reason !== undefined) {
      orderRow.payment_rejection_reason = payment_rejection_reason || null;
    }

    // 1. Insert/Upsert order
    const { data: insertedOrder, error: orderErr } = await supabase
      .from('orders')
      .upsert(orderRow, { onConflict: 'order_number' })
      .select('id, order_number')
      .single();

    if (orderErr) {
      console.error('Failed to insert order to Supabase:', orderErr.message);
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }

    // 2. Insert order items
    if (insertedOrder && items.length > 0) {
      const orderItemsRows = await Promise.all(
        items.map(async (item: any) => {
          let productId = null;
          if (item.product_id && UUID_REGEX.test(item.product_id)) {
            productId = item.product_id;
          } else if (item.sku || item.product_sku) {
            const skuVal = item.sku || item.product_sku;
            const { data: p } = await supabase
              .from('products')
              .select('id')
              .eq('sku', skuVal)
              .maybeSingle();
            if (p) productId = p.id;
          }

          return {
            order_id: insertedOrder.id,
            product_id: productId,
            product_name: item.product_name || item.name || 'Produk',
            sku: item.sku || item.product_sku || 'SKU-UNKNOWN',
            price: Math.round(Number(item.price) || 0),
            quantity: Number(item.quantity) || 1,
            subtotal: Math.round(Number(item.subtotal || item.price * item.quantity) || 0),
            variant: item.note || item.notes || item.variant || null,
          };
        })
      );

      // Clean existing items if updating
      await supabase.from('order_items').delete().eq('order_id', insertedOrder.id);
      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsRows);
      if (itemsErr) {
        console.warn('Warning: Failed to insert order items to Supabase:', itemsErr.message);
      }
    }

    return NextResponse.json({ success: true, order: insertedOrder });
  } catch (err: any) {
    console.error('POST /api/orders error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  if (!isServerSupabaseConfigured) {
    return NextResponse.json(
      { error: 'Supabase is not configured on server' },
      { status: 503 }
    );
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(image_url))')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedOrders = (data || []).map((o: any) => {
      let frontendStatus: OrderStatus = 'MENUNGGU_PEMBAYARAN';
      if (o.status === 'confirmed') frontendStatus = 'DIBAYAR';
      else if (o.status === 'processing') frontendStatus = 'DIPROSES';
      else if (o.status === 'shipped') frontendStatus = 'DIKIRIM';
      else if (o.status === 'completed') frontendStatus = 'SELESAI';
      else if (o.status === 'cancelled') frontendStatus = 'DIBATALKAN';

      let frontendPaymentStatus: PaymentStatus = 'PENDING';
      if (o.payment_status === 'paid') frontendPaymentStatus = 'PAID';
      else if (o.payment_status === 'waiting_verification') frontendPaymentStatus = 'VERIFIKASI_MANUAL';
      else if (o.payment_status === 'failed') frontendPaymentStatus = 'FAILED';
      else if (o.payment_status === 'expired') frontendPaymentStatus = 'EXPIRED';
      else if (o.payment_status === 'rejected') frontendPaymentStatus = 'REJECTED';

      let frontendPaymentMethod: PaymentMethod = 'COD';
      if (o.payment_method === 'bank_transfer') frontendPaymentMethod = 'TRANSFER_BANK';
      else if (o.payment_method === 'midtrans') frontendPaymentMethod = 'MIDTRANS_QRIS';

      const mappedItems = (o.order_items || []).map((it: any) => ({
        id: it.id,
        product_id: it.product_id,
        product_name: it.product_name,
        sku: it.sku,
        product_sku: it.sku,
        product_image: it.products?.image_url || undefined,
        price: it.price,
        quantity: it.quantity,
        subtotal: it.subtotal,
        note: it.variant || it.note || undefined,
        variant: it.variant || undefined,
      }));

      return {
        id: o.id,
        order_number: o.order_number,
        user_id: o.user_id,
        customer_name: o.recipient_name,
        customer_phone: o.recipient_phone,
        delivery_address: o.shipping_address,
        delivery_note: o.customer_note || undefined,
        items: mappedItems,
        subtotal: o.subtotal,
        delivery_fee: o.shipping_fee,
        discount_amount: o.discount,
        voucher_code: o.voucher_code || undefined,
        total_amount: o.grand_total,
        payment_method: frontendPaymentMethod,
        payment_status: frontendPaymentStatus,
        payment_proof_url: o.payment_proof_url || undefined,
        payment_rejection_reason: o.payment_rejection_reason || undefined,
        order_status: frontendStatus,
        status_timeline: [
          {
            status: frontendStatus,
            timestamp: o.created_at,
            note: `Pesanan ${o.order_number} tercatat di sistem toko.`,
          },
        ],
        created_at: o.created_at,
        updated_at: o.updated_at,
      };
    });

    return NextResponse.json({ orders: formattedOrders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

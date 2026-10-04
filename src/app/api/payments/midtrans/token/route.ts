import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order, serverKey: customServerKey, isProduction: customIsProduction } = body;

    if (!order || !order.order_number) {
      return NextResponse.json({ error: 'Data pesanan tidak valid' }, { status: 400 });
    }

    const serverKey =
      customServerKey ||
      process.env.MIDTRANS_SERVER_KEY ||
      '';

    const isProduction =
      customIsProduction !== undefined
        ? Boolean(customIsProduction)
        : process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';

    const snapApiUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

    const grossAmount = Math.round(Number(order.grand_total || order.total_amount || 0));

    const payload = {
      transaction_details: {
        order_id: order.order_number,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: order.customer_name || 'Pelanggan',
        phone: order.customer_phone || '',
      },
      item_details: (order.items || []).map((item: any) => ({
        id: (item.sku || item.product_id || 'item').substring(0, 50),
        price: Math.round(Number(item.price) || 0),
        quantity: Number(item.quantity) || 1,
        name: (item.product_name || item.name || 'Produk').substring(0, 50),
      })),
      callbacks: {
        finish: `${req.nextUrl.origin}/orders/${order.order_number || order.id}`,
      },
    };

    const response = await fetch(snapApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error_messages ? data.error_messages.join(', ') : data.message || 'Gagal membuat transaksi Midtrans';
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      token: data.token,
      redirect_url: data.redirect_url,
      isProduction,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan saat memproses Midtrans' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serverKey: customKey, isProduction: customIsProd } = body;

    const serverKey =
      customKey ||
      process.env.MIDTRANS_SERVER_KEY ||
      '';

    const isProduction =
      customIsProd !== undefined
        ? Boolean(customIsProd)
        : process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';

    const snapApiUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

    // Perform a test transaction request with a test order
    const testOrderId = `TEST-${Date.now()}`;
    const payload = {
      transaction_details: {
        order_id: testOrderId,
        gross_amount: 10000,
      },
      customer_details: {
        first_name: 'Test Customer',
        phone: '081269008899',
      },
      item_details: [
        {
          id: 'TEST-ITEM',
          price: 10000,
          quantity: 1,
          name: 'Tes Verifikasi Akses Midtrans',
        },
      ],
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
      const errMsg = data.error_messages ? data.error_messages.join(', ') : data.message || 'Kredensial Midtrans tidak valid';
      return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      environment: isProduction ? 'PRODUCTION' : 'SANDBOX',
      token: data.token,
      redirect_url: data.redirect_url,
      message: `Koneksi Midtrans ${isProduction ? 'PRODUCTION' : 'SANDBOX'} Berhasil & Siap Menerima Transaksi!`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal menghubungi server Midtrans' },
      { status: 500 }
    );
  }
}

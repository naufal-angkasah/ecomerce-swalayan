import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body.token || process.env.NEXT_PUBLIC_FONNTE_TOKEN || process.env.FONNTE_TOKEN;

    if (!token) {
      return NextResponse.json({ error: 'Token Fonnte belum diisi.' }, { status: 400 });
    }

    // Query device status from Fonnte API
    const response = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        {
          success: false,
          error: data.reason || data.message || 'Token Fonnte tidak valid atau belum terhubung.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      device: data.device,
      name: data.name,
      device_status: data.device_status,
      package: data.package,
      quota: data.quota,
      expired: data.expired,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal menghubungi server Fonnte.' },
      { status: 500 }
    );
  }
}

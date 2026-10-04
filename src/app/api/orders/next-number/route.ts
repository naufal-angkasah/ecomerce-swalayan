import { NextResponse } from 'next/server';
import { getServerSupabase, isServerSupabaseConfigured } from '@/lib/supabase/server';

/**
 * GET /api/orders/next-number
 *
 * Returns a globally-unique order number by finding the MAX existing order number
 * in Supabase for the current year and incrementing it.
 *
 * Uses MAX(order_number) instead of COUNT(*) to correctly handle gaps, deleted orders,
 * and any situation where count != highest sequence number.
 *
 * Returns: { order_number: "ALV-2026-000042" }
 */
export async function GET() {
  const year = new Date().getFullYear();
  const prefix = `ALV-${year}-`;

  const timestampFallback = () => {
    // Timestamp + 2-digit random for collision resistance when server is unavailable
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(10 + Math.random() * 89); // 10-98
    return NextResponse.json({ order_number: `ALV-${year}-T${ts}${rand}` });
  };

  if (!isServerSupabaseConfigured) {
    return timestampFallback();
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return timestampFallback();
  }

  try {
    // Find the MAX order_number for current year — this correctly handles gaps and deletions.
    // COUNT(*) + 1 would fail if, e.g., count=7 but max sequence is already 10.
    const { data, error } = await supabase
      .from('orders')
      .select('order_number')
      .like('order_number', `${prefix}%`)
      .order('order_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to fetch max order number:', error.message);
      return timestampFallback();
    }

    let nextSeq = 1;
    if (data && data.length > 0) {
      const maxOrderNumber: string = data[0].order_number;
      // Parse sequence from "ALV-2026-000042" → 42
      const seqPart = maxOrderNumber.replace(prefix, '').replace(/\D/g, '');
      const parsed = parseInt(seqPart, 10);
      if (!isNaN(parsed) && parsed > 0) {
        nextSeq = parsed + 1;
      }
    }

    const padded = String(nextSeq).padStart(6, '0');
    const order_number = `${prefix}${padded}`;

    return NextResponse.json({ order_number });
  } catch (err: any) {
    console.error('GET /api/orders/next-number error:', err);
    return timestampFallback();
  }
}

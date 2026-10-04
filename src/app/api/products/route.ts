import { NextResponse } from 'next/server';
import { getServerSupabase, isServerSupabaseConfigured } from '@/lib/supabase/server';

/**
 * Validates the internal API secret key from request headers.
 * Rejects requests that don't carry the correct x-api-key header.
 */
function validateApiKey(req: Request): boolean {
  const apiKey = req.headers.get('x-api-key');
  const expectedKey = process.env.API_SECRET_KEY;
  if (!expectedKey) return false; // Deny if env not set
  return apiKey === expectedKey;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      .from('products')
      .select('*, categories(slug)')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { products: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // 🔐 Require internal API key
  if (!validateApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      sku,
      name,
      slug,
      brand,
      category,
      unit,
      price,
      discount_price,
      stock,
      minimum_stock,
      image_url,
      description,
      is_active,
      is_featured,
      is_best_seller,
    } = body;

    if (!sku || !name) {
      return NextResponse.json({ error: 'SKU and name are required' }, { status: 400 });
    }

    // Resolve category id
    let category_id = null;
    if (category) {
      const { data: catData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .maybeSingle();
      if (catData) {
        category_id = catData.id;
      }
    }

    const payload = {
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      brand: brand || 'Alvin Swalayan',
      category_id,
      unit: unit || '1 Pcs',
      price: Math.round(Number(price) || 0),
      discount_price: discount_price && Number(discount_price) > 0 ? Math.round(Number(discount_price)) : null,
      stock: Number(stock) >= 0 ? Number(stock) : 0,
      minimum_stock: Number(minimum_stock) || 5,
      image_url: image_url || null,
      description: description || '',
      status: is_active !== false ? 'active' : 'inactive',
      is_featured: Boolean(is_featured),
      is_best_seller: Boolean(is_best_seller),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'sku' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  // 🔐 Require internal API key
  if (!validateApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    const { searchParams } = new URL(req.url);
    const skuParam = searchParams.get('sku');
    const idParam = searchParams.get('id');

    // Parse potential JSON body for bulk deletion
    let body: { skus?: string[]; ids?: string[] } | null = null;
    try {
      body = await req.json();
    } catch {
      // Body may be empty for standard query param DELETE
    }

    // 1. Bulk delete by SKUs
    if (body?.skus && Array.isArray(body.skus) && body.skus.length > 0) {
      const cleanSkus = body.skus.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
      if (cleanSkus.length > 0) {
        const { error } = await supabase.from('products').delete().in('sku', cleanSkus);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, count: cleanSkus.length });
      }
    }

    // 2. Bulk delete by IDs
    if (body?.ids && Array.isArray(body.ids) && body.ids.length > 0) {
      const cleanIds = body.ids.map((id) => String(id).trim()).filter(Boolean);
      if (cleanIds.length > 0) {
        const { error } = await supabase.from('products').delete().in('id', cleanIds);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, count: cleanIds.length });
      }
    }

    // 3. Single delete by SKU query parameter
    if (skuParam) {
      const cleanSku = skuParam.trim().toUpperCase();
      const { error } = await supabase.from('products').delete().eq('sku', cleanSku);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // 4. Single delete by ID query parameter
    if (idParam) {
      const { error } = await supabase.from('products').delete().eq('id', idParam.trim());
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'SKU, ID, or batch skus/ids required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

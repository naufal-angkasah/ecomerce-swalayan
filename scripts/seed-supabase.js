const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv(key) {
  if (process.env[key]) return process.env[key];
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const l of lines) {
      const trimmed = l.trim();
      if (trimmed.startsWith(`${key}=`)) {
        return trimmed.slice(key.length + 1).replace(/^"|"$/g, '').trim();
      }
    }
  }
  return '';
}

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
if (!url || !serviceKey) {
  console.error('Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

async function main() {
  console.log('Connecting to Supabase...');

  // 1. Fetch categories
  const { data: categories, error: catErr } = await supabase.from('categories').select('id, slug');
  if (catErr) {
    console.error('Failed to fetch categories:', catErr.message);
    process.exit(1);
  }
  const categoryMap = new Map();
  categories.forEach((c) => categoryMap.set(c.slug, c.id));
  console.log(`Loaded ${categories.length} categories.`);

  // 2. Read mockData.ts to extract INITIAL_PRODUCTS
  // We can load mock products by evaluating mockData.ts or parsing JSON
  // Let's create a temporary transpiled script or extract directly
  const mockPath = path.join(__dirname, '..', 'src', 'services', 'mockData.ts');
  const mockContent = fs.readFileSync(mockPath, 'utf8');

  // Find INITIAL_PRODUCTS array block
  const startIdx = mockContent.indexOf('export const INITIAL_PRODUCTS: Product[] = [');
  const endIdx = mockContent.indexOf('export const INITIAL_VOUCHERS');
  if (startIdx === -1 || endIdx === -1) {
    console.error('Could not locate INITIAL_PRODUCTS in mockData.ts');
    process.exit(1);
  }

  const rawArrayStr = mockContent
    .slice(startIdx, endIdx)
    .replace('export const INITIAL_PRODUCTS: Product[] =', 'const INITIAL_PRODUCTS =')
    .concat('module.exports = { INITIAL_PRODUCTS };');

  // Strip TypeScript types or comments if any, using Function or eval
  const cleanedStr = rawArrayStr
    .replace(/:\s*Product\[\]/g, '')
    .replace(/as const/g, '');

  let INITIAL_PRODUCTS = [];
  try {
    const fn = new Function('module', 'exports', cleanedStr);
    const m = { exports: {} };
    fn(m, m.exports);
    INITIAL_PRODUCTS = m.exports.INITIAL_PRODUCTS;
  } catch (err) {
    console.error('Failed to parse INITIAL_PRODUCTS:', err.message);
    process.exit(1);
  }

  console.log(`Extracted ${INITIAL_PRODUCTS.length} products to seed.`);

  // 3. Transform and upsert products into Supabase
  let successCount = 0;
  for (const p of INITIAL_PRODUCTS) {
    const categoryId = categoryMap.get(p.category) || categoryMap.get('sembako');
    const row = {
      sku: p.sku.toUpperCase(),
      name: p.name,
      slug: p.slug,
      brand: p.brand || 'Alvin Swalayan',
      category_id: categoryId,
      unit: p.unit || '1 Pcs',
      price: Math.round(p.price),
      discount_price: p.discount_price && p.discount_price > 0 ? Math.round(p.discount_price) : null,
      stock: p.stock >= 0 ? p.stock : 10,
      minimum_stock: p.minimum_stock || 5,
      image_url: p.image_url,
      description: p.description || '',
      status: p.is_active !== false ? 'active' : 'inactive',
      is_featured: !!p.is_featured,
      is_best_seller: !!p.is_best_seller,
    };

    const { error: upsertErr } = await supabase.from('products').upsert(row, { onConflict: 'sku' });
    if (upsertErr) {
      console.error(`Failed on SKU ${p.sku}:`, upsertErr.message);
    } else {
      successCount++;
    }
  }

  console.log(`Successfully seeded ${successCount} / ${INITIAL_PRODUCTS.length} products into Supabase!`);

  // 4. Seed Vouchers
  const { data: existingVouchers } = await supabase.from('vouchers').select('id');
  if (!existingVouchers || existingVouchers.length === 0) {
    const defaultVouchers = [
      {
        code: 'HEMATALVIN',
        name: 'Diskon Belanja Rp 10.000',
        type: 'fixed',
        value: 10000,
        minimum_purchase: 100000,
        usage_limit: 100,
        is_active: true,
      },
      {
        code: 'ONGKIRGRATIS',
        name: 'Gratis Ongkir Banda Aceh',
        type: 'fixed',
        value: 10000,
        minimum_purchase: 75000,
        usage_limit: 200,
        is_active: true,
      },
      {
        code: 'ALVINBARU',
        name: 'Diskon Pengguna Baru 10%',
        type: 'percentage',
        value: 10,
        minimum_purchase: 50000,
        maximum_discount: 20000,
        usage_limit: 50,
        is_active: true,
      },
    ];
    const { error: vErr } = await supabase.from('vouchers').upsert(defaultVouchers, { onConflict: 'code' });
    if (!vErr) console.log('Successfully seeded default vouchers.');
  }

  // 5. Seed Promo Banners
  const { data: existingBanners } = await supabase.from('promo_banners').select('id');
  if (!existingBanners || existingBanners.length === 0) {
    const defaultBanners = [
      {
        title: 'Super Brand Day - Harga Spesial Mie Sedaap & Aneka Mie Instan',
        image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=1200&h=400&q=80',
        target_url: '/catalog?category=makanan',
        badge_text: 'SUPER BRAND DAY',
        is_active: true,
        sort_order: 1,
      },
      {
        title: 'Paket Hemat Kebutuhan Rumah Tangga - Tisu, Sabun & Deterjen',
        image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=1200&h=400&q=80',
        target_url: '/catalog?category=rumah-tangga',
        badge_text: 'PAKET HEMAT',
        is_active: true,
        sort_order: 2,
      },
      {
        title: 'Festival Sembako Murah Banda Aceh - Beras Ramos & Minyak Goreng Pilihan',
        image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&h=400&q=80',
        target_url: '/catalog?category=sembako',
        badge_text: 'SEMBAKO HEMAT',
        is_active: true,
        sort_order: 3,
      },
      {
        title: 'Kopi Aceh Ulee Kareng & Minuman Segar Keluarga',
        image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&h=400&q=80',
        target_url: '/catalog?category=minuman',
        badge_text: 'KHAS ACEH',
        is_active: true,
        sort_order: 4,
      },
    ];
    const { error: bErr } = await supabase.from('promo_banners').insert(defaultBanners);
    if (!bErr) console.log('Successfully seeded default promo banners.');
  }

  console.log('--- ALL SEEDING COMPLETED SUCCESSFULLY ---');
}

main().catch(console.error);

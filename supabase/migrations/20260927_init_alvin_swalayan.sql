-- ====================================================================
-- ALVIN SWALAYAN BANDA ACEH — DATABASE SCHEMA & INITIAL MIGRATION
-- Database: PostgreSQL (Supabase Compatible)
-- ====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE (Customer & Admin RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ADDRESSES TABLE (Multiple addresses, single default)
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Rumah',
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  province TEXT DEFAULT 'Aceh',
  city TEXT DEFAULT 'Banda Aceh',
  district TEXT NOT NULL,
  village TEXT,
  postal_code TEXT,
  full_address TEXT NOT NULL,
  notes TEXT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CATEGORIES TABLE (14 Dynamic Categories)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NULL,
  image_url TEXT NULL,
  icon_name TEXT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  brand TEXT NULL,
  variant TEXT NULL,
  description TEXT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  discount_price INTEGER NULL CHECK (discount_price IS NULL OR discount_price < price),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  minimum_stock INTEGER DEFAULT 5,
  weight_gram INTEGER NULL,
  unit TEXT DEFAULT '1 pcs',
  image_url TEXT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock')),
  is_featured BOOLEAN DEFAULT false,
  is_best_seller BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CART ITEMS TABLE (Persistent Database Cart for Authenticated Customers)
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- 6. VOUCHERS TABLE
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value INTEGER NOT NULL CHECK (value > 0),
  minimum_purchase INTEGER DEFAULT 0,
  maximum_discount INTEGER NULL,
  usage_limit INTEGER NULL,
  used_count INTEGER DEFAULT 0,
  start_at TIMESTAMPTZ DEFAULT now(),
  end_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ORDERS TABLE (Immutable address & financial snapshots)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'ready', 'shipped', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'waiting_verification', 'paid', 'failed', 'expired', 'rejected', 'cancelled')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'bank_transfer', 'midtrans')),
  subtotal INTEGER NOT NULL,
  discount INTEGER DEFAULT 0,
  shipping_fee INTEGER DEFAULT 0,
  grand_total INTEGER NOT NULL,
  voucher_code TEXT NULL,
  customer_note TEXT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  payment_proof_url TEXT NULL,
  payment_rejection_reason TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. ORDER ITEMS TABLE (Immutable product snapshots)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  brand TEXT NULL,
  variant TEXT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. ORDER STATUS HISTORY TABLE (Audit Log)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. PROMO BANNERS TABLE
CREATE TABLE IF NOT EXISTS public.promo_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  target_url TEXT DEFAULT '/catalog',
  badge_text TEXT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- INDEXES FOR HIGH QUERY PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cart_user_product ON public.cart_items(user_id, product_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view & edit own profile; Admin can view all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Addresses: Users can manage own addresses; Admin can view
CREATE POLICY "Users manage own addresses" ON public.addresses
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Categories: Publicly readable; Admin manages
CREATE POLICY "Categories are viewable by everyone" ON public.categories
  FOR SELECT USING (true);
CREATE POLICY "Admin manages categories" ON public.categories
  FOR ALL USING (public.is_admin());

-- Products: Active products are viewable by everyone; Admin manages all
CREATE POLICY "Products viewable by everyone" ON public.products
  FOR SELECT USING (status != 'inactive' OR public.is_admin());
CREATE POLICY "Admin manages products" ON public.products
  FOR ALL USING (public.is_admin());

-- Cart: Users manage only own cart items
CREATE POLICY "Users manage own cart" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id);

-- Vouchers: Active vouchers viewable; Admin manages
CREATE POLICY "Vouchers viewable by everyone" ON public.vouchers
  FOR SELECT USING (true);
CREATE POLICY "Admin manages vouchers" ON public.vouchers
  FOR ALL USING (public.is_admin());

-- Orders: Users view own orders; Admin manages all
CREATE POLICY "Users view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manages all orders" ON public.orders
  FOR ALL USING (public.is_admin());

-- Order Items: Viewable if order is viewable
CREATE POLICY "Users view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

-- Promo Banners: Public readable; Admin manages
CREATE POLICY "Banners viewable by everyone" ON public.promo_banners
  FOR SELECT USING (true);
CREATE POLICY "Admin manages banners" ON public.promo_banners
  FOR ALL USING (public.is_admin());

-- ====================================================================
-- ATOMIC STOCK DEDUCTION FUNCTION (Prevents Race Conditions)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.deduct_product_stock(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_rows_affected INTEGER;
BEGIN
  UPDATE public.products
  SET
    stock = stock - p_quantity,
    status = CASE WHEN (stock - p_quantity) <= 0 THEN 'out_of_stock' ELSE status END,
    updated_at = now()
  WHERE id = p_product_id AND stock >= p_quantity;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- SEED 14 SUPERMARKET CATEGORIES (Master Prompt Section 5)
-- ====================================================================
INSERT INTO public.categories (name, slug, description, sort_order) VALUES
  ('Sembako', 'sembako', 'Beras, minyak goreng, gula, tepung, telur, dan bumbu dapur pokok', 1),
  ('Minuman', 'minuman', 'Kopi Aceh, teh, air mineral, susu, sirup, dan jus segar', 2),
  ('Mie & Makanan Instan', 'makanan', 'Mi instan, sarden, kornet, kecap, saus, dan makanan siap saji', 3),
  ('Snack & Biskuit', 'snack', 'Keripik, biskuit, cokelat, permen, dan camilan keluarga', 4),
  ('Susu & Breakfast', 'susu-sarapan', 'Susu UHT, krimer, sereal, havermut, selai, dan kopi sachet', 5),
  ('Bumbu & Bahan Masak', 'bumbu-masak', 'Kecap, saus tiram, penyedap rasa, garam, santan, dan minyak wijen', 6),
  ('Perawatan Diri', 'personal-care', 'Sabun mandi, sampo, pasta gigi, sikat gigi, deodorant, dan perawatan kulit', 7),
  ('Rumah Tangga', 'rumah-tangga', 'Deterjen, sabun cuci piring, pembersih lantai, pewangi pakaian, dan tissue', 8),
  ('Bayi & Anak', 'bayi-anak', 'Popok bayi, susu formula anak, bubur bayi, minyak telon, dan lotion', 9),
  ('Kebutuhan Sekolah', 'sekolah', 'Buku tulis, pulpen, pensil, penghapus, penggaris, dan alat tulis kantor', 10),
  ('Produk Segar', 'produk-segar', 'Buah-buahan pilihan, sayuran segar harian, bawang, dan bumbu basah', 11),
  ('Frozen Food', 'frozen-food', 'Nugget, sosis, bakso, kentang beku, dan olahan beku siap masak', 12),
  ('Kesehatan & P3K', 'kesehatan', 'Minyak kayu putih, tolak angin, plester, vitamin C, dan obat bebas', 13),
  ('Pet Care', 'pet-care', 'Makanan kucing, pasir kucing, snack hewan peliharaan, dan sampo', 14)
ON CONFLICT (slug) DO NOTHING;

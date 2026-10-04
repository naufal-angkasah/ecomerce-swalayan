export type ProductCategory =
  | 'sembako'
  | 'minuman'
  | 'makanan'
  | 'snack'
  | 'susu-sarapan'
  | 'bumbu-masak'
  | 'personal-care'
  | 'rumah-tangga'
  | 'bayi-anak'
  | 'sekolah'
  | 'produk-segar'
  | 'frozen-food'
  | 'kesehatan'
  | 'pet-care'
  | 'lainnya';

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  iconName?: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export type ProductStatus = 'active' | 'inactive' | 'out_of_stock';

export interface Product {
  id: string;
  category_id?: string;
  category: ProductCategory | string;
  sku: string; // Unique constraint
  name: string;
  slug: string; // Unique constraint
  brand?: string;
  variant?: string;
  description: string;
  price: number; // Regular price in IDR
  discount_price?: number; // Discounted price if promo active
  stock: number;
  minimum_stock?: number;
  weight_gram?: number;
  unit: string; // e.g. "1 kg", "2 Liter", "85 gr", "Kotak 100g", "Botol 600ml"
  image_url: string;
  status?: ProductStatus;
  is_active?: boolean;
  is_featured?: boolean; // Produk Pilihan Alvin
  is_best_seller?: boolean; // Terlaris Minggu Ini
  is_discount?: boolean; // Sedang Diskon
  sales_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  note?: string; // Catatan khusus per barang (contoh: "Pilihkan yang agak mengkal")
}

export interface CustomerAddress {
  id: string;
  user_id?: string;
  label: string; // e.g. "Rumah", "Kantor", "Kos"
  recipient_name: string;
  phone: string;
  province?: string;
  city: string; // "Banda Aceh"
  district?: string; // e.g. "Banda Raya", "Kuta Alam"
  village?: string; // Gampong / Desa
  postal_code?: string;
  full_address: string;
  notes?: string;
  delivery_notes?: string; // backwards compatibility
  area_district?: string; // backwards compatibility
  is_default?: boolean;
  is_primary?: boolean; // backwards compatibility
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  birthdate?: string;
  role: 'customer' | 'admin';
  avatar_url?: string;
  addresses: CustomerAddress[];
  created_at: string;
  updated_at?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'MENUNGGU_PEMBAYARAN'
  | 'DIBAYAR'
  | 'DIPROSES'
  | 'DIKIRIM'
  | 'SELESAI'
  | 'DIBATALKAN';

export type PaymentMethod =
  | 'cod'
  | 'bank_transfer'
  | 'midtrans'
  | 'COD'
  | 'TRANSFER_BANK'
  | 'MIDTRANS_QRIS';

export type PaymentStatus =
  | 'pending'
  | 'waiting_verification'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'rejected'
  | 'cancelled'
  | 'VERIFIKASI_MANUAL'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'REJECTED';

export interface OrderItem {
  id: string;
  order_id?: string;
  product_id?: string;
  product_name: string;
  sku?: string;
  product_sku?: string;
  product_image?: string;
  image_url?: string;
  brand?: string;
  variant?: string;
  unit?: string;
  price: number;
  unit_price?: number;
  quantity: number;
  subtotal: number;
  note?: string; // Catatan khusus kesegaran/permintaan per barang
  notes?: string;
  created_at?: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status: string;
  new_status: string;
  changed_by?: string;
  note?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string; // e.g. "ALV-2026-000001"
  user_id?: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  shipping_address?: string;
  delivery_note?: string;
  customer_note?: string;
  recipient_name?: string;
  recipient_phone?: string;
  items: OrderItem[];
  items_count?: number;
  subtotal: number;
  delivery_fee?: number;
  shipping_fee?: number;
  shipping_cost?: number;
  discount_amount: number;
  discount?: number;
  voucher_discount?: number;
  voucher_code?: string;
  total_amount: number;
  grand_total?: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_proof_url?: string; // For manual bank transfer
  payment_rejection_reason?: string;
  order_status: OrderStatus;
  status?: OrderStatus;
  status_timeline: {
    status: OrderStatus;
    timestamp: string;
    note: string;
  }[];
  status_history?: OrderStatusHistory[];
  created_at: string;
  updated_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  name?: string;
  discount_type: 'PERCENTAGE' | 'NOMINAL' | 'percentage' | 'fixed';
  type?: 'percentage' | 'fixed';
  discount_value: number; // e.g. 10 (%) or 15000 (Rp)
  value?: number;
  max_discount?: number;
  maximum_discount?: number;
  min_purchase: number;
  minimum_purchase?: number;
  usage_limit?: number;
  max_usage?: number;
  used_count: number;
  start_date?: string;
  start_at?: string;
  end_date?: string;
  end_at?: string;
  is_active: boolean;
  created_at?: string;
}

export interface StoreSettings {
  store_name: string;
  store_phone: string;
  store_email: string;
  store_address: string;
  shipping_fee: number;
  free_delivery_threshold: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  secondary_bank_name?: string;
  secondary_bank_account_number?: string;
  secondary_bank_account_name?: string;
  cod_enabled: boolean;
  cod_max_amount?: number;
  bank_transfer_enabled: boolean;
  midtrans_enabled: boolean;
  midtrans_client_key?: string;
  midtrans_server_key?: string;
  midtrans_is_production?: boolean;
  maintenance_mode: boolean;
  fonnte_token?: string;
  updated_at?: string;
}

export interface CSVRowPreview {
  rowIndex: number;
  action: 'NEW' | 'UPDATE' | 'SKIP' | 'ERROR';
  sku: string;
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  unit: string;
  price: number;
  discount_price?: number;
  stock: number;
  status?: string;
  is_featured?: boolean;
  is_best_seller?: boolean;
  image_url: string;
  description: string;
  errors: string[];
  existingProductId?: string;
  existingProduct?: Product;
  matchedBy?: 'sku' | 'name' | 'both';
}

export interface CSVImportResult {
  totalRows: number;
  newCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  duplicateCount: number;
  previewRows: CSVRowPreview[];
}

export interface PromoBanner {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  badge_text?: string;
  is_active: boolean;
  order: number;
  created_at: string;
}

export interface BannerSettings {
  autoplay_duration: number; // in seconds (e.g. 4)
  autoplay_enabled: boolean;
}

import { Product, ProductCategory, CSVImportResult, CSVRowPreview } from '@/types';
import { INITIAL_PRODUCTS } from './mockData';
import { slugify } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export interface SearchDetailedResult {
  query: string;
  exactMatches: Product[];
  relatedProducts: Product[];
  relatedSectionTitle: string;
  relatedSectionSubtitle?: string;
  matchedCategory?: {
    slug: string;
    name: string;
  };
  matchedBrand?: string;
  totalFound: number;
}

export interface SearchHistoryItem {
  query: string;
  count: number;
  lastSearchedAt: number;
}

// Local storage keys
const STORAGE_KEY_PRODUCTS = 'alvin_products_v2';
const STORAGE_KEY_SEARCH_HISTORY = 'alvin_search_history_v1';

function formatSearchKeyword(str: string): string {
  const trimmed = str.trim();
  if (!trimmed) return '';
  if (trimmed !== trimmed.toLowerCase() && trimmed !== trimmed.toUpperCase()) {
    return trimmed;
  }
  return trimmed
    .split(/\s+/)
    .map((w) => {
      const lower = w.toLowerCase();
      if (['uht', 'abc', 'bca', 'bri', 'bni', 'bsi', 'cod'].includes(lower)) {
        return lower.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

function getStoredProducts(): Product[] {
  if (typeof window === 'undefined') return INITIAL_PRODUCTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (!raw) {
      // Migrate from v1 if present, upgrading rice product images
      const legacyRaw = localStorage.getItem('alvin_products_v1');
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw);
          if (Array.isArray(legacy)) {
            const updated = legacy.map((p) => {
              if (p.id === 'prod-001' && p.image_url?.includes('photo-1586201375761-83865001e31c')) {
                return { ...p, image_url: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=600&q=80' };
              }
              if (p.id === 'prod-003' && p.image_url?.includes('photo-1586201375761-83865001e31c')) {
                return { ...p, image_url: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=600&q=80' };
              }
              return p;
            });
            localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updated));
            return updated;
          }
        } catch {
          // fallback to INITIAL_PRODUCTS
        }
      }
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }

    // Auto-heal any stale image references in stored array
    let patched = false;
    const healed = parsed.map((p) => {
      if (p.id === 'prod-001' && p.image_url?.includes('photo-1586201375761-83865001e31c')) {
        patched = true;
        return { ...p, image_url: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=600&q=80' };
      }
      if (p.id === 'prod-003' && p.image_url?.includes('photo-1586201375761-83865001e31c')) {
        patched = true;
        return { ...p, image_url: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=600&q=80' };
      }
      return p;
    });
    if (patched) {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(healed));
    }
    return healed;
  } catch {
    return INITIAL_PRODUCTS;
  }
}

let sharedProductChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    sharedProductChannel = new BroadcastChannel('alvin_products_channel');
  } catch (err) {
    console.warn('BroadcastChannel error on products:', err);
  }
}

function broadcastProductsUpdated(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('alvin:products_updated', { detail: { timestamp: Date.now() } }));
    if (sharedProductChannel) {
      sharedProductChannel.postMessage({ type: 'products_updated', timestamp: Date.now() });
    }
  } catch (err) {
    console.warn('Failed to broadcast product update:', err);
  }
}

function saveStoredProducts(products: Product[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    broadcastProductsUpdated();
  } catch (err) {
    console.error('Failed to save products to localStorage', err);
  }
}

// ─── Pending Sync Queue ─────────────────────────────────────────────────────
// Stores failed cloud sync operations so they can be retried automatically.
const STORAGE_KEY_PENDING_SYNCS = 'alvin_pending_syncs_v1';

type PendingSyncItem =
  | { type: 'upsert'; product: Product; timestamp: string }
  | { type: 'delete'; sku: string; timestamp: string };

function getPendingSyncs(): PendingSyncItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING_SYNCS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingSyncs(items: PendingSyncItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PENDING_SYNCS, JSON.stringify(items));
  } catch {}
}

function addToPendingQueue(item: PendingSyncItem): void {
  const queue = getPendingSyncs();
  // Avoid duplicating the same product — replace if already queued
  const filtered = queue.filter((q) => {
    if (q.type === 'upsert' && item.type === 'upsert') return q.product.id !== item.product.id;
    if (q.type === 'delete' && item.type === 'delete') return q.sku !== item.sku;
    return true;
  });
  filtered.push(item);
  savePendingSyncs(filtered);
}

function removeFromPendingQueue(item: PendingSyncItem): void {
  const queue = getPendingSyncs();
  const filtered = queue.filter((q) => {
    if (q.type === 'upsert' && item.type === 'upsert') return q.product.id !== item.product.id;
    if (q.type === 'delete' && item.type === 'delete') return q.sku !== item.sku;
    return true;
  });
  savePendingSyncs(filtered);
}

/** Returns true if cloud sync succeeded, false if it failed (and queues for retry). */
async function syncProductToCloud(product: Product): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '',
      },
      body: JSON.stringify(product),
    });
    if (res.ok) {
      removeFromPendingQueue({ type: 'upsert', product, timestamp: '' });
      return true;
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.warn('Cloud sync failed, queued for retry:', err);
    addToPendingQueue({ type: 'upsert', product, timestamp: new Date().toISOString() });
    return false;
  }
}

/** Returns true if cloud delete succeeded, false if it failed (and queues for retry). */
async function deleteProductFromCloud(sku: string): Promise<boolean> {
  if (typeof window === 'undefined' || !sku) return false;
  try {
    const res = await fetch(`/api/products?sku=${encodeURIComponent(sku)}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '',
      },
    });
    if (res.ok) {
      removeFromPendingQueue({ type: 'delete', sku, timestamp: '' });
      return true;
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.warn('Cloud delete failed, queued for retry:', err);
    addToPendingQueue({ type: 'delete', sku, timestamp: new Date().toISOString() });
    return false;
  }
}

export function normalizeProductName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    // Replace punctuation like parentheses, brackets, slashes, dashes, commas, quotes with spaces
    .replace(/[()[\]{}\-_,./"']/g, ' ')
    // Normalize spacing between numbers and common units (e.g. 600ml -> 600 ml, 2liter -> 2 liter)
    .replace(/(\d+)\s*(ml|mili|liter|ltr|lt|l|kg|kilo|gram|gr|g|pcs|pc|pack|sak|sachet|btl|botol|klg|kaleng|dus|box|kotak|lembar|butir)\b/gi, '$1 $2')
    // Standardize unit synonyms
    .replace(/\bmili\b/gi, 'ml')
    .replace(/\b(ltr|lt)\b/gi, 'liter')
    .replace(/\bkilo\b/gi, 'kg')
    .replace(/\b(gram|gr)\b/gi, 'g')
    .replace(/\bpc\b/gi, 'pcs')
    .replace(/\bbtl\b/gi, 'botol')
    .replace(/\bklg\b/gi, 'kaleng')
    // Collapse multiple whitespace
    .replace(/\s+/g, ' ')
    .trim();
}


async function deleteProductsFromCloud(skus: string[], ids?: string[]): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if ((!skus || skus.length === 0) && (!ids || ids.length === 0)) return true;

  try {
    const res = await fetch('/api/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus, ids }),
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('API products batch delete failed, falling back to direct client supabase:', err);
  }

  // Fallback: direct Supabase client call
  if (isSupabaseConfigured && supabase) {
    try {
      if (skus && skus.length > 0) {
        const cleanSkus = skus.map((s) => s.trim().toUpperCase());
        await supabase.from('products').delete().in('sku', cleanSkus);
      }
      if (ids && ids.length > 0) {
        await supabase.from('products').delete().in('id', ids);
      }
      return true;
    } catch (e) {
      console.warn('Direct client Supabase delete error:', e);
    }
  }

  return false;
}

/** How many operations are still waiting to be synced to cloud. */
export function getPendingSyncsCount(): number {
  return getPendingSyncs().length;
}

/**
 * Retry all pending cloud sync operations.
 * Returns { retried, succeeded, failed }.
 */
export async function retryPendingSyncs(): Promise<{ retried: number; succeeded: number; failed: number }> {
  const queue = getPendingSyncs();
  if (queue.length === 0) return { retried: 0, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;

  for (const item of queue) {
    if (item.type === 'upsert') {
      const ok = await syncProductToCloud(item.product);
      if (ok) succeeded++; else failed++;
    } else if (item.type === 'delete') {
      const ok = await deleteProductFromCloud(item.sku);
      if (ok) succeeded++; else failed++;
    }
  }

  return { retried: queue.length, succeeded, failed };
}

export const productService = {
  getAll: (onlyActive: boolean = true): Product[] => {
    const products = getStoredProducts();
    if (onlyActive) {
      const active = products.filter((p) => p.is_active);
      // Auto-deduplicate by normalized name so customer storefront never shows duplicate items with conflicting prices
      const seenNames = new Set<string>();
      const deduplicated: Product[] = [];
      for (const p of active) {
        const key = normalizeProductName(p.name);
        if (!seenNames.has(key)) {
          seenNames.add(key);
          deduplicated.push(p);
        }
      }
      return deduplicated;
    }
    return products;
  },

  getByCategory: (category: ProductCategory | string): Product[] => {
    return getStoredProducts().filter(
      (p) => p.is_active && p.category.toLowerCase() === category.toLowerCase()
    );
  },

  getBySlug: (slug: string): Product | undefined => {
    return getStoredProducts().find((p) => p.slug === slug);
  },

  getById: (id: string): Product | undefined => {
    if (!id) return undefined;
    const products = getStoredProducts();
    const byId = products.find((p) => p.id === id);
    if (byId) return byId;
    return products.find((p) => p.sku && p.sku.toLowerCase() === id.toLowerCase());
  },

  findProduct: (query: { id?: string; sku?: string; name?: string }): Product | undefined => {
    const products = getStoredProducts();
    if (query.id) {
      const match = products.find((p) => p.id === query.id || p.sku === query.id);
      if (match) return match;
    }
    if (query.sku) {
      const cleanSku = query.sku.trim().toLowerCase();
      const match = products.find((p) => p.sku && p.sku.trim().toLowerCase() === cleanSku);
      if (match) return match;
    }
    if (query.name) {
      const cleanName = query.name.trim().toLowerCase();
      const exact = products.find((p) => p.name && p.name.trim().toLowerCase() === cleanName);
      if (exact) return exact;
      const partial = products.find(
        (p) => p.name && (p.name.toLowerCase().includes(cleanName) || cleanName.includes(p.name.toLowerCase()))
      );
      if (partial) return partial;
    }
    return undefined;
  },

  getDiscounts: (limit: number = 8): Product[] => {
    const discounted = getStoredProducts().filter(
      (p) => p.is_active && p.discount_price && p.discount_price < p.price
    );

    // Sort by discount percentage descending
    const sorted = [...discounted].sort((a, b) => {
      const discA = ((a.price - (a.discount_price || a.price)) / a.price);
      const discB = ((b.price - (b.discount_price || b.price)) / b.price);
      return discB - discA;
    });

    // Diversify across categories so products shown are visually distinct and varied
    const selected: Product[] = [];
    const usedCategories = new Set<string>();

    // Pass 1: Select the top discounted item from each category
    for (const p of sorted) {
      if (!usedCategories.has(p.category)) {
        selected.push(p);
        usedCategories.add(p.category);
        if (selected.length >= limit) break;
      }
    }

    // Pass 2: Fill remaining slots if limit not yet reached
    if (selected.length < limit) {
      const selectedIds = new Set(selected.map((p) => p.id));
      for (const p of sorted) {
        if (!selectedIds.has(p.id)) {
          selected.push(p);
          if (selected.length >= limit) break;
        }
      }
    }

    return selected.slice(0, limit);
  },

  getFeatured: (limit: number = 8): Product[] => {
    return getStoredProducts()
      .filter((p) => p.is_active && p.is_featured)
      .slice(0, limit);
  },

  getBestSellers: (limit: number = 8): Product[] => {
    return getStoredProducts()
      .filter((p) => p.is_active)
      .sort((a, b) => {
        if (a.is_best_seller && !b.is_best_seller) return -1;
        if (!a.is_best_seller && b.is_best_seller) return 1;
        return (b.sales_count || 0) - (a.sales_count || 0);
      })
      .slice(0, limit);
  },

  /**
   * Safely compute match score for a product against a search query.
   * Returns > 0 if matched, 0 if not matched.
   * Supports:
   * 1. Safe access on all fields (name, brand, sku, unit, category).
   * 2. Direct exact phrase match (score 100).
   * 3. Multi-keyword token match (ALL tokens match across any product fields, score 90).
   * 4. Fuzzy token match (ratio >= 60% for queries with >= 3 words, score proportional).
   * NOTE: description is excluded — prevents false positives for short single-word queries.
   */
  matchSearch: (p: Product, searchStr: string): number => {
    if (!p) return 0;
    if (!searchStr || !searchStr.trim()) return 100;
    const query = searchStr.toLowerCase().trim();

    const name = String(p.name || '').toLowerCase();
    const brand = String(p.brand || '').toLowerCase();
    const sku = String(p.sku || '').toLowerCase();
    const unit = String(p.unit || '').toLowerCase();
    const category = String(p.category || '').toLowerCase().replace(/-/g, ' ');

    // 1. Direct name match (highest priority)
    if (name.startsWith(query)) return 150;
    if (name.includes(query)) return 120;

    // 2. Brand or SKU direct match
    if (brand.includes(query) || sku.includes(query)) return 100;

    // 3. Category direct match — only for multi-char queries >= 4 chars (avoid "buku" matching unrelated)
    if (query.length >= 4 && category.includes(query)) return 85;

    // 4. Tokenized search — only applies to multi-word queries (single word MUST match name/brand/sku)
    const tokens = query.split(/\s+/).filter(Boolean);
    if (tokens.length <= 1) return 0;

    const mainText = [name, brand, sku, unit, category].join(' ');

    const allInMain = tokens.every((t) => mainText.includes(t));
    if (allInMain) return 90;

    let matchedInMain = 0;
    for (const t of tokens) {
      if (mainText.includes(t)) matchedInMain++;
    }
    if (matchedInMain === tokens.length) return 80;
    if (tokens.length >= 3 && matchedInMain / tokens.length >= 0.6) {
      return Math.round((matchedInMain / tokens.length) * 60);
    }

    return 0;
  },

  /**
   * Comprehensive, intelligent search engine that separates exact/direct product matches
   * from relevant complementary products, categorizes user intent, and recommends similar brands.
   */
  searchDetailed: (query: string, sort?: 'cheapest' | 'expensive' | 'newest' | 'bestseller'): SearchDetailedResult => {
    const rawQuery = (query || '').trim();
    if (!rawQuery) {
      return {
        query: '',
        exactMatches: [],
        relatedProducts: [],
        relatedSectionTitle: '',
        totalFound: 0,
      };
    }

    // Synonym & Typo Mapping dictionary (e.g. masaco -> masako, ajinamoto -> ajinomoto)
    const typoMap: Record<string, string> = {
      'masaco': 'masako',
      'ajinamoto': 'ajinomoto',
      'royko': 'royco',
      'indomi': 'indomie',
      'sedap': 'sedaap',
      'ulekareng': 'ulee kareng',
      'telor': 'telur',
    };

    let q = rawQuery.toLowerCase();
    for (const [typo, fixed] of Object.entries(typoMap)) {
      if (q === typo) {
        q = fixed;
        break;
      }
    }

    const allProducts = productService.getAll(true);
    const tokens = q.split(/\s+/).filter(Boolean);

    // 1. Detect if query matches a known Brand directly
    const allBrands: string[] = Array.from(
      new Set(allProducts.map((p) => p.brand || '').filter((b): b is string => Boolean(b)))
    );
    const matchedBrand = allBrands.find(
      (b) => b && (b.toLowerCase() === q || b.toLowerCase().includes(q) || q.includes(b.toLowerCase()))
    );

    // 2. Category Keywords Mapping
    const categoryKeywords: Record<
      string,
      { slug: string; name: string; relatedTitle: string; relatedSubtitle: string }
    > = {
      bumbu: {
        slug: 'bumbu-masak',
        name: 'Bumbu & Bahan Masak',
        relatedTitle: 'Bahan Dapur Pokok & Sembako Terkait',
        relatedSubtitle: 'Minyak goreng, tepung terigu, beras, dan bahan memasak pokok keluarga',
      },
      kopi: {
        slug: 'minuman',
        name: 'Kopi & Minuman',
        relatedTitle: 'Teman Ngopi & Produk Terkait Relevan',
        relatedSubtitle: 'Gula pasir, krimer kental manis, biskuit celup, dan pelengkap minuman',
      },
      teh: {
        slug: 'minuman',
        name: 'Teh & Minuman',
        relatedTitle: 'Teman Ngeteh & Camilan Keluarga',
        relatedSubtitle: 'Gula pasir, biskuit renyah, madu, dan aneka camilan',
      },
      minuman: {
        slug: 'minuman',
        name: 'Minuman',
        relatedTitle: 'Camilan & Snack Teman Minum',
        relatedSubtitle: 'Biskuit, wafer, keripik, dan camilan santai',
      },
      beras: {
        slug: 'sembako',
        name: 'Sembako',
        relatedTitle: 'Kebutuhan Sembako & Bahan Pokok Terkait',
        relatedSubtitle: 'Minyak goreng, telur, gula pasir, dan tepung terigu',
      },
      minyak: {
        slug: 'sembako',
        name: 'Sembako',
        relatedTitle: 'Bahan Memasak & Sembako Terkait',
        relatedSubtitle: 'Tepung terigu, margarin, bumbu masak, dan telur ayam',
      },
      gula: {
        slug: 'sembako',
        name: 'Sembako',
        relatedTitle: 'Kopi, Teh & Susu Pelengkap',
        relatedSubtitle: 'Kopi bubuk khas Aceh, teh celup, krimer, dan sirup',
      },
      mie: {
        slug: 'makanan',
        name: 'Mie & Makanan Instan',
        relatedTitle: 'Pelengkap & Bahan Masak Terkait',
        relatedSubtitle: 'Telur ayam, saus sambal, kornet, kecap, dan sosis',
      },
      snack: {
        slug: 'snack',
        name: 'Snack & Biskuit',
        relatedTitle: 'Minuman Segar & Teman Nyemil',
        relatedSubtitle: 'Susu UHT, teh kotak, jus buah, dan minuman segar',
      },
      biskuit: {
        slug: 'snack',
        name: 'Snack & Biskuit',
        relatedTitle: 'Teman Ngeteh & Ngopi Pilihan',
        relatedSubtitle: 'Kopi bubuk, teh celup, susu kental manis, dan cokelat',
      },
      sabun: {
        slug: 'personal-care',
        name: 'Perawatan Diri',
        relatedTitle: 'Perawatan Tubuh & Kebersihan Keluarga',
        relatedSubtitle: 'Sampo rambut, pasta gigi, sikat gigi, dan sabun cuci tangan',
      },
      shampoo: {
        slug: 'personal-care',
        name: 'Perawatan Diri',
        relatedTitle: 'Perawatan Rambut & Tubuh Terkait',
        relatedSubtitle: 'Sabun mandi, conditioner, minyak rambut, dan perawatan diri',
      },
      deterjen: {
        slug: 'rumah-tangga',
        name: 'Rumah Tangga',
        relatedTitle: 'Kebersihan & Perlengkapan Rumah Tangga',
        relatedSubtitle: 'Pewangi pakaian, sabun cuci piring, dan pembersih lantai',
      },
      sunlight: {
        slug: 'rumah-tangga',
        name: 'Rumah Tangga',
        relatedTitle: 'Pembersih & Perlengkapan Rumah Tangga Terkait',
        relatedSubtitle: 'Pembersih lantai, spons cuci, deterjen pakaian, dan tissue',
      },
    };

    let catConfig:
      | { slug: string; name: string; relatedTitle: string; relatedSubtitle: string }
      | undefined;
    for (const [kw, cfg] of Object.entries(categoryKeywords)) {
      if (q === kw || q.startsWith(kw) || q.includes(kw)) {
        catConfig = cfg;
        break;
      }
    }

    const helperCategoryName = (slug?: string): string => {
      if (!slug) return 'Kebutuhan Harian';
      const map: Record<string, string> = {
        'sembako': 'Sembako',
        'minuman': 'Minuman',
        'kopi-teh': 'Kopi & Teh',
        'makanan': 'Mie & Makanan Instan',
        'mie-pasta': 'Mie & Pasta',
        'snack': 'Snack & Biskuit',
        'makanan-ringan': 'Makanan Ringan',
        'biskuit-kue': 'Biskuit & Kue',
        'susu-sarapan': 'Susu & Breakfast',
        'bumbu-masak': 'Bumbu & Bahan Masak',
        'bumbu-dapur': 'Bumbu & Bahan Masak',
        'personal-care': 'Perawatan Diri',
        'rumah-tangga': 'Rumah Tangga',
        'bayi-anak': 'Bayi & Anak',
      };
      return map[slug] || slug.replace(/-/g, ' ');
    };

    // Step 1: Collect Exact / Direct Matches
    const exactMatches: Product[] = [];
    const exactIds = new Set<string>();

    allProducts.forEach((p) => {
      const name = (p.name || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();

      let isMatch = false;

      // Check Brand match
      if (brand === q || (brand && q.startsWith(brand)) || (q && brand.startsWith(q))) {
        isMatch = true;
      }
      // Check Name match
      else if (name.startsWith(q) || name.includes(q)) {
        // Special case: if user searched 'bumbu', filter out snacks or noodles with bumbu in name
        if (
          q === 'bumbu' &&
          (pCat === 'snack' || pCat === 'makanan-ringan' || pCat === 'mie-pasta' || pCat === 'makanan')
        ) {
          isMatch = false;
        } else {
          isMatch = true;
        }
      }
      // Check Category match ONLY IF the query is an actual general category name (e.g. 'sembako', 'minuman', 'snack')
      else if (
        catConfig &&
        ['sembako', 'minuman', 'snack', 'bumbu', 'perawatan diri', 'rumah tangga'].includes(q) &&
        (pCat === catConfig.slug ||
          pCat.includes(catConfig.slug) ||
          (catConfig.slug === 'bumbu-masak' && (pCat === 'bumbu-dapur' || pCat === 'bumbu-masak')))
      ) {
        isMatch = true;
      }
      // Check SKU match
      else if (sku.includes(q)) {
        isMatch = true;
      }
      // Multi-token match across Name + Brand
      else if (tokens.length > 1 && tokens.every((t) => (name + ' ' + brand).includes(t))) {
        isMatch = true;
      }

      if (isMatch) {
        exactMatches.push(p);
        exactIds.add(p.id);
      }
    });

    // Sort exact matches by relevance
    exactMatches.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aBrand = (a.brand || '').toLowerCase();
      const bBrand = (b.brand || '').toLowerCase();

      const aStarts = aName.startsWith(q) || aBrand === q;
      const bStarts = bName.startsWith(q) || bBrand === q;
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return (b.sales_count || 0) - (a.sales_count || 0);
    });

    const applySort = (list: Product[], s?: string) => {
      if (!s) return;
      switch (s) {
        case 'cheapest':
          list.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
          break;
        case 'expensive':
          list.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
          break;
        case 'bestseller':
          list.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
          break;
        case 'newest':
          list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
      }
    };

    if (sort) {
      applySort(exactMatches, sort);
    }

    // Step 2: Determine Related Products & Category Context
    const relatedProducts: Product[] = [];
    let relatedSectionTitle = '';
    let relatedSectionSubtitle = '';

    const detectedCategorySlug =
      exactMatches[0]?.category || (catConfig ? catConfig.slug : undefined);

    if (matchedBrand) {
      // User searched a brand (e.g. Royco) -> show other brands in same category (e.g. Masako, Sasa, Ajinomoto)
      const siblingProducts = allProducts.filter(
        (p) =>
          !exactIds.has(p.id) &&
          (p.category === detectedCategorySlug ||
            (detectedCategorySlug === 'bumbu-masak' &&
              (p.category === 'bumbu-masak' || p.category === 'bumbu-dapur')))
      );

      siblingProducts.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
      relatedProducts.push(...siblingProducts.slice(0, 10));

      if (detectedCategorySlug?.includes('bumbu')) {
        relatedSectionTitle = 'Pilihan Bumbu & Penyedap Masakan Terkait';
        relatedSectionSubtitle =
          'Produk bumbu dapur populer lainnya seperti Masako, Sasa, Ajinomoto, dan Saori';
      } else {
        relatedSectionTitle = `Produk Serupa di Kategori ${helperCategoryName(detectedCategorySlug)}`;
        relatedSectionSubtitle =
          'Pilihan merek alternatif dan produk terlaris di kategori yang sama';
      }
    } else if (q === 'kopi' || q.includes('kopi')) {
      // Coffee search -> companion items (Gula pasir, Krimer Kental Manis, Biskuit, Susu)
      const companionItems = allProducts.filter(
        (p) =>
          !exactIds.has(p.id) &&
          ((p.description || '').toLowerCase().includes('kopi') ||
            p.name.toLowerCase().includes('gula') ||
            p.name.toLowerCase().includes('frisian flag') ||
            p.name.toLowerCase().includes('indomilk') ||
            p.name.toLowerCase().includes('kental manis') ||
            p.name.toLowerCase().includes('roma') ||
            p.name.toLowerCase().includes('khong guan') ||
            p.name.toLowerCase().includes('oreo') ||
            p.name.toLowerCase().includes('biskuit') ||
            p.name.toLowerCase().includes('dancow') ||
            p.name.toLowerCase().includes('energen') ||
            p.name.toLowerCase().includes('milo') ||
            p.category === 'susu-sarapan' ||
            p.category === 'kopi-teh' ||
            p.category === 'snack' ||
            p.category === 'minuman')
      );

      companionItems.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        // Priority ranking: Kental manis, biskuit, gula first
        const getPriority = (name: string) => {
          if (name.includes('frisian flag') || name.includes('kental manis') || name.includes('indomilk')) return 1;
          if (name.includes('roma') || name.includes('khong guan') || name.includes('biskuit')) return 2;
          if (name.includes('gula')) return 3;
          if (name.includes('oreo') || name.includes('dancow') || name.includes('energen')) return 4;
          return 5;
        };

        const pA = getPriority(aName);
        const pB = getPriority(bName);
        if (pA !== pB) return pA - pB;
        return (b.sales_count || 0) - (a.sales_count || 0);
      });

      relatedProducts.push(...companionItems.slice(0, 8));

      // Backfill with top snacks/drinks if companion items are fewer than 8
      if (relatedProducts.length < 8) {
        const backfills = allProducts.filter(
          (p) =>
            !exactIds.has(p.id) &&
            !relatedProducts.some((r) => r.id === p.id) &&
            (p.category === 'snack' || p.category === 'susu-sarapan' || p.category === 'minuman')
        );
        backfills.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
        relatedProducts.push(...backfills.slice(0, 8 - relatedProducts.length));
      }

      relatedSectionTitle = 'Teman Ngopi & Produk Terkait Relevan';
      relatedSectionSubtitle =
        'Gula pasir, krimer kental manis, biskuit celup, dan pelengkap minuman hangat';
    } else if (catConfig) {
      let complementarySlug = 'sembako';
      if (catConfig.slug === 'sembako') complementarySlug = 'bumbu-masak';
      else if (catConfig.slug === 'minuman') complementarySlug = 'snack';
      else if (catConfig.slug === 'makanan') complementarySlug = 'sembako';

      const pairedItems = allProducts.filter(
        (p) =>
          !exactIds.has(p.id) &&
          (p.category === complementarySlug || p.category.includes(complementarySlug))
      );
      pairedItems.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
      relatedProducts.push(...pairedItems.slice(0, 8));

      // Backfill if fewer than 8
      if (relatedProducts.length < 8) {
        const backfills = allProducts.filter(
          (p) => !exactIds.has(p.id) && !relatedProducts.some((r) => r.id === p.id)
        );
        backfills.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
        relatedProducts.push(...backfills.slice(0, 8 - relatedProducts.length));
      }

      relatedSectionTitle = catConfig.relatedTitle;
      relatedSectionSubtitle = catConfig.relatedSubtitle;
    } else {
      if (detectedCategorySlug) {
        const sameCategoryItems = allProducts.filter(
          (p) => !exactIds.has(p.id) && p.category === detectedCategorySlug
        );
        sameCategoryItems.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
        relatedProducts.push(...sameCategoryItems.slice(0, 8));

        if (relatedProducts.length < 8) {
          const backfills = allProducts.filter(
            (p) => !exactIds.has(p.id) && !relatedProducts.some((r) => r.id === p.id)
          );
          backfills.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
          relatedProducts.push(...backfills.slice(0, 8 - relatedProducts.length));
        }

        relatedSectionTitle = `Produk Terkait di Kategori ${helperCategoryName(detectedCategorySlug)}`;
        relatedSectionSubtitle = 'Pilihan produk terlaris lainnya yang sering dibeli pelanggan';
      } else {
        const bestSellers = allProducts
          .filter((p) => !exactIds.has(p.id))
          .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
          .slice(0, 8);
        relatedProducts.push(...bestSellers);

        relatedSectionTitle = 'Rekomendasi Produk Paling Laris di Toko';
        relatedSectionSubtitle = 'Produk kebutuhan sehari-hari favorit keluarga di Alvin Swalayan';
      }
    }

    const finalRelatedProducts = relatedProducts.slice(0, 8);

    if (sort) {
      applySort(finalRelatedProducts, sort);
    }

    return {
      query: rawQuery,
      exactMatches,
      relatedProducts: finalRelatedProducts,
      relatedSectionTitle,
      relatedSectionSubtitle,
      matchedCategory: detectedCategorySlug
        ? { slug: detectedCategorySlug, name: helperCategoryName(detectedCategorySlug) }
        : undefined,
      matchedBrand,
      totalFound: exactMatches.length,
    };
  },

  search: (
    query: string,
    category?: string,
    brand?: string,
    minPrice?: number,
    maxPrice?: number,
    sort?: 'cheapest' | 'expensive' | 'newest' | 'bestseller'
  ): Product[] => {
    // If standard query without explicit filters, use searchDetailed exact matches
    if (query && query.trim() && (!category || category === 'semua') && (!brand || brand === 'semua')) {
      const detailed = productService.searchDetailed(query, sort);
      if (detailed.exactMatches.length > 0) {
        let list = detailed.exactMatches;
        if (minPrice !== undefined && minPrice > 0) {
          list = list.filter((p) => (p.discount_price || p.price) >= minPrice);
        }
        if (maxPrice !== undefined && maxPrice > 0) {
          list = list.filter((p) => (p.discount_price || p.price) <= maxPrice);
        }
        return list;
      }
    }

    let list = getStoredProducts().filter((p) => p.is_active);

    if (query && query.trim()) {
      const scoredList: { product: Product; score: number }[] = [];
      list.forEach((p) => {
        const score = productService.matchSearch(p, query);
        if (score > 0) {
          scoredList.push({ product: p, score });
        }
      });
      // Sort by relevance score descending unless explicit sort requested
      if (!sort) {
        scoredList.sort((a, b) => b.score - a.score);
      }
      list = scoredList.map((item) => item.product);
    }

    if (category && category !== 'semua') {
      list = list.filter((p) => p.category === category);
    }

    if (brand && brand !== 'semua') {
      list = list.filter((p) => (p.brand || '').toLowerCase() === brand.toLowerCase());
    }

    if (minPrice !== undefined && minPrice > 0) {
      list = list.filter((p) => (p.discount_price || p.price) >= minPrice);
    }

    if (maxPrice !== undefined && maxPrice > 0) {
      list = list.filter((p) => (p.discount_price || p.price) <= maxPrice);
    }

    if (sort) {
      switch (sort) {
        case 'cheapest':
          list.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
          break;
        case 'expensive':
          list.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
          break;
        case 'bestseller':
          list.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
          break;
        case 'newest':
          list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
      }
    }

    return list;
  },

  /**
   * Records a user's search query into local analytics storage.
   * Increments search frequency and updates recency timestamp.
   * Ensures non-empty, meaningful queries and prevents 0-result keywords from bloating recommendations.
   */
  recordSearchQuery: (query: string, matchCount?: number): void => {
    if (typeof window === 'undefined') return;
    const raw = (query || '').trim();
    if (!raw || raw.length < 2) return;

    // Ignore queries if explicitly checked and returned 0 results
    if (matchCount !== undefined && matchCount <= 0) return;

    // Filter out pure numbers or special symbols
    if (/^[^a-zA-Z]+$/.test(raw)) return;

    try {
      const formatted = formatSearchKeyword(raw);
      const key = raw.toLowerCase();
      const storedRaw = localStorage.getItem(STORAGE_KEY_SEARCH_HISTORY);
      const historyMap: Record<string, SearchHistoryItem> = storedRaw ? JSON.parse(storedRaw) : {};

      const existing = historyMap[key];
      if (existing) {
        existing.count = (existing.count || 0) + 1;
        existing.lastSearchedAt = Date.now();
        if (formatted.length > 0) existing.query = formatted;
      } else {
        historyMap[key] = {
          query: formatted,
          count: 1,
          lastSearchedAt: Date.now(),
        };
      }

      // Limit storage entries to top 60 to prevent unbounded localStorage growth
      const entries = Object.entries(historyMap);
      if (entries.length > 60) {
        entries.sort((a, b) => b[1].count - a[1].count || b[1].lastSearchedAt - a[1].lastSearchedAt);
        const trimmedMap: Record<string, SearchHistoryItem> = {};
        entries.slice(0, 60).forEach(([k, v]) => {
          trimmedMap[k] = v;
        });
        localStorage.setItem(STORAGE_KEY_SEARCH_HISTORY, JSON.stringify(trimmedMap));
      } else {
        localStorage.setItem(STORAGE_KEY_SEARCH_HISTORY, JSON.stringify(historyMap));
      }
    } catch (err) {
      console.error('Failed to record search query', err);
    }
  },

  /**
   * Option 3 (Hybrid Dynamic Popular Searches):
   * Combines real customer search frequency & recency with top-selling catalog staples.
   * Every returned keyword is verified against current catalog products to guarantee
   * that clicking it returns relevant, non-empty results.
   */
  getPopularSearches: (limit = 8): string[] => {
    const result: string[] = [];
    const seen = new Set<string>();

    const addTerm = (term: string) => {
      const clean = term.trim();
      const key = clean.toLowerCase();
      if (!key || key.length < 2 || seen.has(key)) return;

      // Verify keyword actually matches products in catalog so chip never produces 0 results
      const testRes = productService.searchDetailed(clean);
      if (testRes.exactMatches.length > 0 || testRes.relatedProducts.length > 0) {
        seen.add(key);
        result.push(clean);
      }
    };

    // 1. First Priority: Real Customer Search History (Frequency + Recency)
    if (typeof window !== 'undefined') {
      try {
        const storedRaw = localStorage.getItem(STORAGE_KEY_SEARCH_HISTORY);
        if (storedRaw) {
          const historyMap: Record<string, SearchHistoryItem> = JSON.parse(storedRaw);
          const sortedItems = Object.values(historyMap).sort((a, b) => {
            // Sort by search frequency first, then recency
            if (b.count !== a.count) return b.count - a.count;
            return b.lastSearchedAt - a.lastSearchedAt;
          });

          for (const item of sortedItems) {
            if (result.length >= limit) break;
            addTerm(item.query);
          }
        }
      } catch {}
    }

    // 2. Second Priority: Top Selling & Popular Staples from Alvin Swalayan Catalog
    if (result.length < limit) {
      const catalogStapleCandidates = [
        'Minyak Goreng',
        'Beras',
        'Kopi Ulee Kareng',
        'Indomie',
        'Gula Pasir',
        'Telur Ayam',
        'Royco',
        'Sunlight',
        'Masako',
        'Teh Botol',
        'Bimoli',
        'Susu UHT',
        'Sania',
        'Gulaku',
        'Rojolele',
        'Dancow',
      ];

      for (const staple of catalogStapleCandidates) {
        if (result.length >= limit) break;
        addTerm(staple);
      }

      // If still under limit, backfill with top brands from active catalog
      if (result.length < limit) {
        const catalogProducts = getStoredProducts().filter((p) => p.is_active !== false);
        const topProducts = [...catalogProducts].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
        for (const p of topProducts) {
          if (result.length >= limit) break;
          if (p.brand && p.brand !== 'Alvin Swalayan') {
            addTerm(p.brand);
          }
        }
      }
    }

    return result.slice(0, limit);
  },

  /**
   * Resets local search history analytics (useful for testing or cache reset).
   */
  clearSearchHistory: (): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY_SEARCH_HISTORY);
    } catch {}
  },

  getAllBrands: (onlyAvailable = true): string[] => {
    let products = getStoredProducts();
    if (onlyAvailable) {
      products = products.filter(
        (p) => p.is_active !== false && p.status !== 'inactive' && (p.stock || 0) > 0
      );
    }
    const brands = Array.from(
      new Set(products.map((p) => (p.brand || 'Alvin Swalayan').trim()).filter(Boolean))
    );
    return brands.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  },

  /**
   * Get available brands that actually have stock > 0, optionally filtered by category, discount, or query.
   * Returns sorted array of { name: string, count: number }.
   */
  getAvailableBrandsWithCount: (
    category?: string,
    onlyDiscount?: boolean,
    searchQuery?: string
  ): { name: string; count: number }[] => {
    let products = getStoredProducts().filter(
      (p) => p.is_active !== false && p.status !== 'inactive' && (p.stock || 0) > 0
    );

    if (searchQuery && searchQuery.trim()) {
      products = products.filter((p) => productService.matchSearch(p, searchQuery) > 0);
    }

    if (category && category !== 'semua') {
      products = products.filter((p) => p.category === category);
    }

    if (onlyDiscount) {
      products = products.filter(
        (p) => p.is_discount || (p.discount_price !== undefined && p.discount_price < p.price)
      );
    }

    const brandCountMap = new Map<string, number>();
    for (const p of products) {
      const b = (p.brand || 'Alvin Swalayan').trim();
      if (b) {
        brandCountMap.set(b, (brandCountMap.get(b) || 0) + 1);
      }
    }

    return Array.from(brandCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  },

  /**
   * Create product with strict UNIQUE SKU check
   */
  create: async (data: Omit<Product, 'id' | 'slug' | 'created_at' | 'updated_at' | 'sales_count'>): Promise<{ success: boolean; error?: string; product?: Product; cloudSynced?: boolean }> => {
    const products = getStoredProducts();
    const cleanSku = data.sku.trim().toUpperCase();

    // Check UNIQUE SKU
    const existing = products.find((p) => p.sku.toUpperCase() === cleanSku);
    if (existing) {
      return {
        success: false,
        error: `SKU "${cleanSku}" sudah digunakan oleh produk "${existing.name}". SKU harus unik!`,
      };
    }

    const newProduct: Product = {
      status: 'active',
      minimum_stock: 5,
      is_featured: false,
      is_best_seller: false,
      is_active: true,
      ...data,
      id: `prod-${Date.now()}`,
      sku: cleanSku,
      slug: slugify(`${data.name}-${cleanSku}`),
      sales_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    products.unshift(newProduct);
    saveStoredProducts(products);

    // Background cloud sync — non-blocking so UI and modal close instantly (0ms)
    syncProductToCloud(newProduct).catch((err) => {
      console.warn('Background product create sync:', err);
    });

    return { success: true, product: newProduct, cloudSynced: true };
  },

  /**
   * Update existing product
   */
  update: async (id: string, data: Partial<Product>): Promise<{ success: boolean; error?: string; product?: Product; cloudSynced?: boolean }> => {
    const products = getStoredProducts();
    const index = products.findIndex((p) => p.id === id);

    if (index === -1) {
      return { success: false, error: 'Produk tidak ditemukan.' };
    }

    if (data.sku) {
      const cleanSku = data.sku.trim().toUpperCase();
      const existing = products.find((p) => p.sku.toUpperCase() === cleanSku && p.id !== id);
      if (existing) {
        return {
          success: false,
          error: `SKU "${cleanSku}" sudah digunakan oleh produk lain ("${existing.name}").`,
        };
      }
      data.sku = cleanSku;
    }

    const updated = {
      ...products[index],
      ...data,
      updated_at: new Date().toISOString(),
    };

    products[index] = updated;
    saveStoredProducts(products);

    // Background cloud sync — non-blocking so UI and modal close instantly (0ms)
    syncProductToCloud(updated).catch((err) => {
      console.warn('Background product update sync:', err);
    });

    return { success: true, product: updated, cloudSynced: true };
  },

  toggleActive: async (id: string): Promise<boolean> => {
    const products = getStoredProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return false;
    products[index].is_active = !products[index].is_active;
    products[index].updated_at = new Date().toISOString();
    saveStoredProducts(products);
    syncProductToCloud(products[index]); // background — toggle is frequent, don't block UI
    return true;
  },

  toggleFeatured: async (id: string): Promise<boolean> => {
    const products = getStoredProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return false;
    products[index].is_featured = !products[index].is_featured;
    products[index].updated_at = new Date().toISOString();
    saveStoredProducts(products);
    syncProductToCloud(products[index]);
    return true;
  },

  toggleBestSeller: async (id: string): Promise<boolean> => {
    const products = getStoredProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return false;
    products[index].is_best_seller = !products[index].is_best_seller;
    products[index].updated_at = new Date().toISOString();
    saveStoredProducts(products);
    syncProductToCloud(products[index]);
    return true;
  },

  delete: async (id: string): Promise<boolean> => {
    const products = getStoredProducts();
    const target = products.find((p) => p.id === id);
    const filtered = products.filter((p) => p.id !== id);
    saveStoredProducts(filtered);
    if (target?.sku) {
      // Await so failed deletes are queued for retry
      await deleteProductFromCloud(target.sku);
    }
    return true;
  },

  /**
   * Parse and validate CSV data with Intelligent Duplicate Detection (by SKU and Name)
   * Expected CSV Header: sku,name,brand,category,unit,price,discount_price,stock,description,image_url
   */
  parseCSV: (
    csvContent: string,
    defaultDuplicateStrategy: 'UPDATE' | 'SKIP' = 'UPDATE'
  ): CSVImportResult => {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return {
        totalRows: 0,
        newCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        duplicateCount: 0,
        previewRows: [],
      };
    }

    const existingProducts = getStoredProducts();
    const existingSkuMap = new Map<string, Product>();
    const existingNameMap = new Map<string, Product>();

    existingProducts.forEach((p) => {
      if (p.sku) existingSkuMap.set(p.sku.trim().toUpperCase(), p);
      if (p.name) existingNameMap.set(normalizeProductName(p.name), p);
    });

    const rows = lines.slice(1);
    const previewRows: CSVRowPreview[] = [];
    const seenBatchSkus = new Set<string>();
    const seenBatchNames = new Set<string>();

    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    rows.forEach((line, index) => {
      // Support basic comma separated, handling simple quoted values
      const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());

      const sku = (cols[0] || '').toUpperCase();
      const name = cols[1] || '';
      const brand = cols[2] || 'Alvin Swalayan';
      const category = (cols[3] || 'sembako').toLowerCase();
      const unit = cols[4] || '1 Pcs';
      const price = parseFloat(cols[5] || '0');
      const discount_price = cols[6] ? parseFloat(cols[6]) : undefined;
      const stock = parseInt(cols[7] || '0', 10);
      const description = cols[8] || '';
      const image_url =
        cols[9] ||
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

      const errors: string[] = [];

      if (!sku) errors.push('SKU wajib diisi.');
      if (!name) errors.push('Nama produk wajib diisi.');
      if (isNaN(price) || price <= 0) errors.push('Harga harus berupa angka lebih dari 0.');
      if (isNaN(stock) || stock < 0) errors.push('Stok harus berupa angka 0 atau lebih.');
      if (cols[6] && discount_price !== undefined && !isNaN(discount_price)) {
        if (discount_price < 0) errors.push('Harga diskon tidak boleh bernilai negatif.');
        if (discount_price >= price) errors.push('Harga diskon harus lebih rendah dari harga normal.');
      }

      // Check within current batch for duplicates
      if (sku) {
        if (seenBatchSkus.has(sku)) {
          errors.push(`Duplikasi SKU "${sku}" dalam file CSV yang diunggah.`);
        } else {
          seenBatchSkus.add(sku);
        }
      }

      const normalizedName = normalizeProductName(name);
      if (name) {
        if (seenBatchNames.has(normalizedName)) {
          seenBatchNames.add(normalizedName);
        } else {
          seenBatchNames.add(normalizedName);
        }
      }

      // Match against existing products in store database (by SKU or Name)
      const matchBySku = sku ? existingSkuMap.get(sku) : undefined;
      const matchByName = normalizedName ? existingNameMap.get(normalizedName) : undefined;
      const existingProduct = matchBySku || matchByName;
      const isDuplicate = Boolean(existingProduct);

      let matchedBy: 'sku' | 'name' | 'both' | undefined = undefined;
      if (matchBySku && matchByName) {
        matchedBy = 'both';
      } else if (matchBySku) {
        matchedBy = 'sku';
      } else if (matchByName) {
        matchedBy = 'name';
      }

      let action: 'NEW' | 'UPDATE' | 'SKIP' | 'ERROR' = 'NEW';
      if (errors.length > 0) {
        action = 'ERROR';
        errorCount++;
      } else if (isDuplicate) {
        duplicateCount++;
        action = defaultDuplicateStrategy; // Either 'UPDATE' (replace) or 'SKIP' (keep)
        if (action === 'UPDATE') {
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        action = 'NEW';
        newCount++;
      }

      previewRows.push({
        rowIndex: index + 2, // 1-based line accounting for header
        action,
        sku,
        name,
        brand,
        category,
        unit,
        price,
        discount_price: discount_price && discount_price > 0 ? discount_price : undefined,
        stock,
        status: 'active',
        is_featured: false,
        is_best_seller: false,
        description,
        image_url,
        errors,
        existingProductId: existingProduct?.id,
        existingProduct,
        matchedBy,
      });
    });

    return {
      totalRows: rows.length,
      newCount,
      updatedCount,
      skippedCount,
      errorCount,
      duplicateCount,
      previewRows,
    };
  },

  /**
   * Commit CSV import after admin confirmation.
   * Returns counts and whether cloud sync succeeded.
   */
  commitCSVImport: async (
    validRows: CSVRowPreview[]
  ): Promise<{ inserted: number; updated: number; skipped: number; cloudSynced: boolean }> => {
    const products = getStoredProducts();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const syncQueue: Product[] = []; // collect products to sync to cloud after save

    // Use a base timestamp + per-row counter to avoid ID collision in tight loops
    const baseTs = Date.now();

    validRows.forEach((row, rowIdx) => {
      if (row.action === 'ERROR') return;
      if (row.action === 'SKIP') {
        skipped++;
        return;
      }

      const validCategory: ProductCategory = [
        'sembako',
        'bumbu-dapur',
        'minuman',
        'kopi-teh',
        'makanan-ringan',
        'biskuit-kue',
        'mie-pasta',
        'makanan-kaleng-instan',
        'sarapan-sereal',
        'susu-olahan',
        'perawatan-tubuh',
        'kebersihan-rumah',
        'ibu-bayi',
        'kebutuhan-lainnya',
      ].includes(row.category as ProductCategory)
        ? (row.category as ProductCategory)
        : 'sembako';

      if (row.action === 'UPDATE') {
        // Find existing product by ID, SKU, or Name
        const index = products.findIndex(
          (p) =>
            (row.existingProductId && p.id === row.existingProductId) ||
            (row.sku && p.sku.toUpperCase() === row.sku.toUpperCase()) ||
            (row.name && normalizeProductName(p.name) === normalizeProductName(row.name))
        );

        if (index !== -1) {
          products[index] = {
            ...products[index],
            name: row.name,
            brand: row.brand,
            category: validCategory,
            unit: row.unit,
            price: row.price,
            discount_price: row.discount_price,
            stock: row.stock,
            is_discount: !!(row.discount_price && row.discount_price < row.price),
            description: row.description || products[index].description,
            image_url: row.image_url || products[index].image_url,
            updated_at: new Date().toISOString(),
          };
          syncQueue.push(products[index]);
          updated++;
        } else {
          // Fallback: insert as new with collision-safe ID
          const newProduct: Product = {
            id: `prod-${baseTs}-${rowIdx}`,
            sku: row.sku.toUpperCase(),
            name: row.name,
            slug: slugify(`${row.name}-${row.sku}`),
            brand: row.brand,
            category: validCategory,
            unit: row.unit,
            price: row.price,
            discount_price: row.discount_price,
            stock: row.stock,
            image_url: row.image_url,
            description: row.description,
            is_active: true,
            is_featured: false,
            is_best_seller: false,
            is_discount: !!(row.discount_price && row.discount_price < row.price),
            sales_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          products.unshift(newProduct);
          syncQueue.push(newProduct);
          inserted++;
        }
      } else if (row.action === 'NEW') {
        const newProduct: Product = {
          id: `prod-${baseTs}-${rowIdx}`,
          sku: row.sku.toUpperCase(),
          name: row.name,
          slug: slugify(`${row.name}-${row.sku}`),
          brand: row.brand,
          category: validCategory,
          unit: row.unit,
          price: row.price,
          discount_price: row.discount_price,
          stock: row.stock,
          image_url: row.image_url,
          description: row.description,
          is_active: true,
          is_featured: false,
          is_best_seller: false,
          is_discount: !!(row.discount_price && row.discount_price < row.price),
          sales_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        products.unshift(newProduct);
        syncQueue.push(newProduct);
        inserted++;
      }
    });

    saveStoredProducts(products);

    // Sync all affected products to Supabase cloud in parallel
    let cloudSynced = false;
    if (syncQueue.length > 0) {
      const results = await Promise.all(syncQueue.map((p) => syncProductToCloud(p)));
      cloudSynced = results.every(Boolean);
    } else {
      cloudSynced = true; // nothing to sync = no failure
    }

    return { inserted, updated, skipped, cloudSynced };
  },

  /**
   * Find existing duplicate products in the catalog grouped by normalized Name or SKU,
   * regardless of whether their prices, units, or formatting differ.
   */
  findExistingDuplicates: (): {
    key: string;
    count: number;
    products: Product[];
    hasPriceDifference: boolean;
    minPrice: number;
    maxPrice: number;
  }[] => {
    const products = getStoredProducts();
    const groupMap = new Map<string, Product[]>();

    products.forEach((p) => {
      const normName = normalizeProductName(p.name);
      const key = normName || (p.sku ? p.sku.trim().toUpperCase() : p.id);
      const list = groupMap.get(key) || [];
      list.push(p);
      groupMap.set(key, list);
    });

    const duplicates: {
      key: string;
      count: number;
      products: Product[];
      hasPriceDifference: boolean;
      minPrice: number;
      maxPrice: number;
    }[] = [];

    groupMap.forEach((list) => {
      if (list.length > 1) {
        // Smart sorting so the best candidate is automatically set as Primary (index 0):
        // 1. Valid custom photo over placeholder
        // 2. In stock over out of stock
        // 3. Has active discount price
        // 4. Most recently updated
        list.sort((a, b) => {
          const isPlaceholder = (url?: string) => !url || url.includes('unsplash.com/photo-1542838132-92c53300491e');
          const aHasImg = !isPlaceholder(a.image_url);
          const bHasImg = !isPlaceholder(b.image_url);
          if (aHasImg && !bHasImg) return -1;
          if (!aHasImg && bHasImg) return 1;

          if (a.stock > 0 && b.stock <= 0) return -1;
          if (a.stock <= 0 && b.stock > 0) return 1;

          const aDiscount = !!(a.discount_price && a.discount_price < a.price);
          const bDiscount = !!(b.discount_price && b.discount_price < b.price);
          if (aDiscount && !bDiscount) return -1;
          if (!aDiscount && bDiscount) return 1;

          const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bTime - aTime;
        });

        const prices = list.map((p) => p.discount_price || p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const hasPriceDifference = minPrice !== maxPrice;

        duplicates.push({
          key: list[0].name,
          count: list.length,
          products: list,
          hasPriceDifference,
          minPrice,
          maxPrice,
        });
      }
    });

    return duplicates;
  },

  /**
   * Clean up and merge duplicate products in the catalog:
   * Keeps the primary product in each duplicate group and permanently deletes
   * all redundant copies from both local storage AND the Supabase database.
   */
  cleanDuplicates: async (
    customGroups?: { key: string; count: number; products: Product[] }[]
  ): Promise<{
    removedCount: number;
    remainingCount: number;
    deletedSkus: string[];
    cloudSynced: boolean;
    error?: string;
  }> => {
    const products = getStoredProducts();
    const groups = customGroups || productService.findExistingDuplicates();

    if (groups.length === 0) {
      return {
        removedCount: 0,
        remainingCount: products.length,
        deletedSkus: [],
        cloudSynced: true,
      };
    }

    // Identify which product IDs and SKUs to remove
    const idsToRemove = new Set<string>();
    const skusToRemove = new Set<string>();

    groups.forEach((group) => {
      // Index 0 is kept as Primary
      const redundantProducts = group.products.slice(1);
      redundantProducts.forEach((p) => {
        idsToRemove.add(p.id);
        if (p.sku) skusToRemove.add(p.sku.trim().toUpperCase());
      });
    });

    // Filter local storage list
    const remainingProducts = products.filter(
      (p) => !idsToRemove.has(p.id) && !skusToRemove.has(p.sku.trim().toUpperCase())
    );

    const removedCount = products.length - remainingProducts.length;

    // Save cleaned list locally
    saveStoredProducts(remainingProducts);

    // Synchronize removal with Supabase Database
    const deletedSkus = Array.from(skusToRemove);
    const deletedIds = Array.from(idsToRemove);
    let cloudSynced = false;

    if (deletedSkus.length > 0 || deletedIds.length > 0) {
      try {
        cloudSynced = await deleteProductsFromCloud(deletedSkus, deletedIds);
      } catch (err) {
        console.warn('Error deleting duplicates from Supabase:', err);
      }
    }

    return {
      removedCount,
      remainingCount: remainingProducts.length,
      deletedSkus,
      cloudSynced,
    };
  },

  deductStock: (items: { productId: string; quantity: number }[]): boolean => {
    const products = getStoredProducts();
    let changed = false;

    for (const item of items) {
      const idx = products.findIndex((p) => p.id === item.productId);
      if (idx !== -1) {
        products[idx].stock = Math.max(0, products[idx].stock - item.quantity);
        products[idx].sales_count = (products[idx].sales_count || 0) + item.quantity;
        products[idx].updated_at = new Date().toISOString();
        changed = true;
      }
    }

    if (changed) {
      saveStoredProducts(products);
    }
    return true;
  },

  restoreStock: (items: { productId: string; quantity: number }[]): void => {
    const products = getStoredProducts();
    let changed = false;

    for (const item of items) {
      const idx = products.findIndex((p) => p.id === item.productId);
      if (idx !== -1) {
        products[idx].stock += item.quantity;
        products[idx].sales_count = Math.max(0, (products[idx].sales_count || 0) - item.quantity);
        products[idx].updated_at = new Date().toISOString();
        changed = true;
      }
    }

    if (changed) {
      saveStoredProducts(products);
    }
  },

  syncFromSupabase: async (): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      let fetchedItems: any[] = [];

      // 1. First attempt: fetch via server API endpoint (bypasses RLS) with cache-busting
      if (typeof window !== 'undefined') {
        const apiRes = await fetch(`/api/products?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        }).catch(() => null);
        if (apiRes && apiRes.ok) {
          const json = await apiRes.json();
          if (Array.isArray(json.products) && json.products.length > 0) {
            fetchedItems = json.products;
          }
        }
      }

      // 2. Fallback attempt: direct client Supabase query
      if (fetchedItems.length === 0 && isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('products')
          .select('*, categories(slug)')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          fetchedItems = data;
        } else if (error) {
          return { success: false, count: 0, error: error.message };
        }
      }

      if (fetchedItems.length > 0) {
        const mappedProducts: Product[] = fetchedItems.map((item: any) => {
          const catSlug = (item.categories as any)?.slug || 'sembako';
          return {
            id: item.id,
            sku: item.sku,
            name: item.name,
            slug: item.slug,
            brand: item.brand || 'Alvin Swalayan',
            category: catSlug,
            unit: item.unit || '1 Pcs',
            price: Number(item.price),
            discount_price: item.discount_price ? Number(item.discount_price) : undefined,
            stock: Number(item.stock),
            minimum_stock: item.minimum_stock || 5,
            image_url: item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
            description: item.description || '',
            is_active: item.status === 'active',
            is_featured: !!item.is_featured,
            is_best_seller: !!item.is_best_seller,
            is_discount: !!(item.discount_price && item.discount_price < item.price),
            sales_count: 0,
            created_at: item.created_at,
            updated_at: item.updated_at,
          };
        });

        // Deduplicate incoming products by normalized name and SKU so stale database duplicates don't pollute local catalog
        const seenNames = new Set<string>();
        const seenSkus = new Set<string>();
        const uniqueProducts: Product[] = [];

        mappedProducts.forEach((p) => {
          const nameKey = normalizeProductName(p.name);
          const skuKey = p.sku.trim().toUpperCase();
          if (!seenNames.has(nameKey) && !seenSkus.has(skuKey)) {
            seenNames.add(nameKey);
            seenSkus.add(skuKey);
            uniqueProducts.push(p);
          }
        });

        saveStoredProducts(uniqueProducts);
        return { success: true, count: uniqueProducts.length };
      }

      return { success: true, count: 0 };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Gagal sinkronisasi dari Supabase' };
    }
  },

  /**
   * Subscribe to real-time product updates across tabs and storage events.
   * Returns an unsubscribe function.
   */
  subscribe: (callback: () => void): (() => void) => {
    if (typeof window === 'undefined') return () => {};

    const handleUpdate = () => {
      callback();
    };

    window.addEventListener('alvin:products_updated', handleUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PRODUCTS) {
        handleUpdate();
      }
    };
    window.addEventListener('storage', handleStorage);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('alvin_products_channel');
        bc.onmessage = () => {
          handleUpdate();
        };
      } catch {}
    }

    return () => {
      window.removeEventListener('alvin:products_updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
      if (bc) {
        bc.close();
      }
    };
  },

  resetToInitial: (): void => {
    saveStoredProducts(INITIAL_PRODUCTS);
  },
};

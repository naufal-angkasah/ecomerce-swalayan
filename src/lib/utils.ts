/**
 * Helper to format currency in Rupiah (IDR)
 * e.g. 15000 -> "Rp 15.000"
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s+/g, ' ');
}

/**
 * Format date string to Indonesian format
 * e.g. "2026-09-24T11:00:00Z" -> "24 September 2026, 11:00 WIB"
 */
export function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d) + ' WIB';
  } catch {
    return dateStr;
  }
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(price: number, discountPrice?: number): number {
  if (!discountPrice || discountPrice >= price || price <= 0) return 0;
  return Math.round(((price - discountPrice) / price) * 100);
}

/**
 * Generate slug from product name and brand
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Translate order status to Indonesian badge style and human label
 */
export function getOrderStatusMeta(status: string) {
  switch (status) {
    case 'MENUNGGU_PEMBAYARAN':
      return {
        label: 'Menunggu Pembayaran',
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        step: 1,
      };
    case 'DIBAYAR':
      return {
        label: 'Pembayaran Diterima',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        step: 2,
      };
    case 'DIPROSES':
      return {
        label: 'Sedang Diproses Toko',
        color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        step: 3,
      };
    case 'DIKIRIM':
      return {
        label: 'Sedang Dikirim',
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        step: 4,
      };
    case 'SELESAI':
      return {
        label: 'Pesanan Selesai',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        step: 5,
      };
    case 'DIBATALKAN':
      return {
        label: 'Pesanan Dibatalkan',
        color: 'bg-red-100 text-red-800 border-red-300',
        step: 0,
      };
    default:
      return {
        label: status,
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        step: 1,
      };
  }
}

/**
 * Convert Google Drive sharing links to direct embeddable image URLs
 * e.g. https://drive.google.com/file/d/1Xyz.../view?usp=sharing
 * -> https://drive.google.com/thumbnail?id=1Xyz...&sz=w1200
 */
export function convertGoogleDriveUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Check if it's a Google Drive link
  if (trimmed.includes('drive.google.com')) {
    const fileIdMatch =
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);

    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1200`;
    }
  }

  return trimmed;
}

/**
 * Compress an uploaded image file into a Base64 data URL for local storage
 */
export function compressImageFile(file: File, maxDimension = 1000, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(readerEvent.target?.result as string);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Deduplicate customer addresses by normalized address text, recipient name, and phone.
 * Preserves primary address setting and keeps the most complete record.
 */
export function deduplicateAddresses<T extends {
  id?: string;
  full_address?: string;
  recipient_name?: string;
  phone?: string;
  is_primary?: boolean;
  is_default?: boolean;
}>(addresses: T[]): T[] {
  if (!Array.isArray(addresses)) return [];
  const seen = new Set<string>();
  const result: T[] = [];

  for (const addr of addresses) {
    if (!addr) continue;
    const rawText = addr.full_address || '';
    if (!rawText.trim()) continue;

    // Normalize text: lowercase, remove non-alphanumeric except spaces, collapse whitespace
    const normText = rawText
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const normRecipient = (addr.recipient_name || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const normPhone = (addr.phone || '').replace(/\D/g, '');

    const key = `${normText}::${normRecipient}::${normPhone}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push({ ...addr });
    } else {
      // If the duplicate had is_primary/is_default = true, transfer to the kept record
      if (addr.is_primary || addr.is_default) {
        const kept = result.find((r) => {
          const rText = (r.full_address || '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          const rRecipient = (r.recipient_name || '').toLowerCase().replace(/\s+/g, ' ').trim();
          const rPhone = (r.phone || '').replace(/\D/g, '');
          return `${rText}::${rRecipient}::${rPhone}` === key;
        });
        if (kept) {
          kept.is_primary = true;
          kept.is_default = true;
        }
      }
    }
  }

  // Ensure exactly one is_primary if non-empty
  if (result.length > 0) {
    const hasPrimary = result.some((a) => a.is_primary || a.is_default);
    if (!hasPrimary) {
      result[0].is_primary = true;
      result[0].is_default = true;
    }
  }

  return result;
}


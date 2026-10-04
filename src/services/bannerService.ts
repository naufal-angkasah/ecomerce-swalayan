import { PromoBanner, BannerSettings } from '@/types';

const STORAGE_KEY_BANNERS = 'alvin_banners_v1';
const STORAGE_KEY_SETTINGS = 'alvin_banner_settings_v1';

export const DEFAULT_BANNER_SETTINGS: BannerSettings = {
  autoplay_duration: 4, // 4 detik
  autoplay_enabled: true,
};

export const INITIAL_BANNERS: PromoBanner[] = [
  {
    id: 'bnr-1',
    title: 'Super Brand Day - Harga Spesial Mie Sedaap & Aneka Mie Instan',
    image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=1200&h=400&q=80',
    target_url: '/catalog?category=makanan',
    badge_text: 'SUPER BRAND DAY',
    is_active: true,
    order: 1,
    created_at: '2026-09-20T08:00:00Z',
  },
  {
    id: 'bnr-2',
    title: 'Paket Hemat Kebutuhan Rumah Tangga - Tisu, Sabun & Deterjen',
    image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=1200&h=400&q=80',
    target_url: '/catalog?category=rumah-tangga',
    badge_text: 'PAKET HEMAT',
    is_active: true,
    order: 2,
    created_at: '2026-09-21T08:00:00Z',
  },
  {
    id: 'bnr-3',
    title: 'Festival Sembako Murah Banda Aceh - Beras Ramos & Minyak Goreng Pilihan',
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&h=400&q=80',
    target_url: '/catalog?category=sembako',
    badge_text: 'SEMBAKO HEMAT',
    is_active: true,
    order: 3,
    created_at: '2026-09-22T08:00:00Z',
  },
  {
    id: 'bnr-4',
    title: 'Kopi Aceh Ulee Kareng & Minuman Segar Keluarga',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&h=400&q=80',
    target_url: '/catalog?category=minuman',
    badge_text: 'KHAS ACEH',
    is_active: true,
    order: 4,
    created_at: '2026-09-23T08:00:00Z',
  },
  {
    id: 'bnr-5',
    title: 'Flash Sale Diskon Spesial Minggu Ini - Hemat Belanja Harian',
    image_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&h=400&q=80',
    target_url: '/catalog?discount=true',
    badge_text: 'SEDANG DISKON',
    is_active: true,
    order: 5,
    created_at: '2026-09-24T08:00:00Z',
  },
];

export const PRESET_BANNER_TEMPLATES = [
  {
    title: 'Super Brand Day Mie Sedaap',
    image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=1200&h=400&q=80',
    target_url: '/catalog?category=makanan',
    badge_text: 'SUPER BRAND DAY',
  },
  {
    title: 'Paket Hemat Tisu & Kebersihan',
    image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=1200&h=400&q=80',
    target_url: '/catalog?category=rumah-tangga',
    badge_text: 'PAKET HEMAT',
  },
  {
    title: 'Beras & Minyak Goreng Hemat',
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&h=400&q=80',
    target_url: '/catalog?category=sembako',
    badge_text: 'SEMBAKO MURAH',
  },
  {
    title: 'Kopi Tradisional Aceh & Susu',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&h=400&q=80',
    target_url: '/catalog?category=minuman',
    badge_text: 'KOPI ACEH',
  },
  {
    title: 'Diskon Belanja Gajian',
    image_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&h=400&q=80',
    target_url: '/catalog?discount=true',
    badge_text: 'PROMO GAJIAN',
  },
];

function getStoredBanners(): PromoBanner[] {
  if (typeof window === 'undefined') return INITIAL_BANNERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BANNERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_BANNERS, JSON.stringify(INITIAL_BANNERS));
      return INITIAL_BANNERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY_BANNERS, JSON.stringify(INITIAL_BANNERS));
      return INITIAL_BANNERS;
    }
    return parsed;
  } catch {
    return INITIAL_BANNERS;
  }
}

function saveStoredBanners(banners: PromoBanner[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_BANNERS, JSON.stringify(banners));
  } catch (err) {
    console.error('Failed to save banners', err);
  }
}

function getStoredSettings(): BannerSettings {
  if (typeof window === 'undefined') return DEFAULT_BANNER_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(DEFAULT_BANNER_SETTINGS));
      return DEFAULT_BANNER_SETTINGS;
    }
    return { ...DEFAULT_BANNER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BANNER_SETTINGS;
  }
}

function saveStoredSettings(settings: BannerSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save banner settings', err);
  }
}

export const bannerService = {
  getAll: (): PromoBanner[] => {
    return getStoredBanners().sort((a, b) => a.order - b.order);
  },

  getActive: (): PromoBanner[] => {
    return getStoredBanners()
      .filter((b) => b.is_active)
      .sort((a, b) => a.order - b.order);
  },

  getById: (id: string): PromoBanner | undefined => {
    return getStoredBanners().find((b) => b.id === id);
  },

  create: (bannerData: Omit<PromoBanner, 'id' | 'created_at'>): PromoBanner => {
    const banners = getStoredBanners();
    const newBanner: PromoBanner = {
      ...bannerData,
      id: `bnr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    banners.push(newBanner);
    saveStoredBanners(banners);
    return newBanner;
  },

  update: (id: string, updates: Partial<PromoBanner>): PromoBanner | null => {
    const banners = getStoredBanners();
    const index = banners.findIndex((b) => b.id === id);
    if (index === -1) return null;
    banners[index] = { ...banners[index], ...updates };
    saveStoredBanners(banners);
    return banners[index];
  },

  delete: (id: string): boolean => {
    const banners = getStoredBanners();
    const filtered = banners.filter((b) => b.id !== id);
    if (filtered.length === banners.length) return false;
    saveStoredBanners(filtered);
    return true;
  },

  getSettings: (): BannerSettings => {
    return getStoredSettings();
  },

  updateSettings: (updates: Partial<BannerSettings>): BannerSettings => {
    const current = getStoredSettings();
    const updated: BannerSettings = {
      ...current,
      ...updates,
      autoplay_duration: Math.max(1, Math.min(60, updates.autoplay_duration ?? current.autoplay_duration)),
    };
    saveStoredSettings(updated);
    return updated;
  },

  resetToDefaults: (): PromoBanner[] => {
    saveStoredBanners(INITIAL_BANNERS);
    saveStoredSettings(DEFAULT_BANNER_SETTINGS);
    return INITIAL_BANNERS;
  },
};

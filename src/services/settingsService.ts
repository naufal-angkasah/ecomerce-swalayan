import { StoreSettings } from '@/types';
import { DEFAULT_STORE_SETTINGS } from '@/lib/constants';

const STORAGE_KEY_SETTINGS = 'alvin_store_settings_v1';

function getStoredSettings(): StoreSettings {
  if (typeof window === 'undefined') return DEFAULT_STORE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(DEFAULT_STORE_SETTINGS));
      return DEFAULT_STORE_SETTINGS;
    }
    return {
      ...DEFAULT_STORE_SETTINGS,
      ...JSON.parse(raw),
    };
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

function saveStoredSettings(settings: StoreSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save store settings to localStorage', err);
  }
}

export const settingsService = {
  get: (): StoreSettings => {
    return getStoredSettings();
  },

  update: (data: Partial<StoreSettings>): StoreSettings => {
    const current = getStoredSettings();
    const updated: StoreSettings = {
      ...current,
      ...data,
      updated_at: new Date().toISOString(),
    };
    saveStoredSettings(updated);
    return updated;
  },

  reset: (): StoreSettings => {
    saveStoredSettings(DEFAULT_STORE_SETTINGS);
    return DEFAULT_STORE_SETTINGS;
  },
};

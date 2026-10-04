import { CategoryInfo } from '@/types';
import { CATEGORIES } from '@/lib/constants';

const STORAGE_KEY_CATEGORIES = 'alvin_categories_v1';

function getStoredCategories(): CategoryInfo[] {
  if (typeof window === 'undefined') return CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(CATEGORIES));
      return CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < CATEGORIES.length) {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(CATEGORIES));
      return CATEGORIES;
    }
    return parsed;
  } catch {
    return CATEGORIES;
  }
}

function saveStoredCategories(categories: CategoryInfo[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
  } catch (err) {
    console.error('Failed to save categories to localStorage', err);
  }
}

export const categoryService = {
  getAll: (): CategoryInfo[] => {
    return getStoredCategories();
  },

  getById: (id: string): CategoryInfo | undefined => {
    return getStoredCategories().find((c) => c.id === id || c.slug === id);
  },

  create: (
    data: Omit<CategoryInfo, 'id' | 'is_active' | 'sort_order'> & {
      is_active?: boolean;
      sort_order?: number;
    }
  ): { success: boolean; category?: CategoryInfo; error?: string } => {
    const categories = getStoredCategories();
    const slug = data.slug.toLowerCase().trim();

    if (categories.some((c) => c.slug === slug)) {
      return { success: false, error: `Kategori dengan slug "${slug}" sudah ada.` };
    }

    const newCategory: CategoryInfo = {
      is_active: true,
      sort_order: categories.length + 1,
      ...data,
      id: slug,
      slug,
    };

    categories.push(newCategory);
    saveStoredCategories(categories);
    return { success: true, category: newCategory };
  },

  update: (id: string, data: Partial<CategoryInfo>): { success: boolean; category?: CategoryInfo; error?: string } => {
    const categories = getStoredCategories();
    const idx = categories.findIndex((c) => c.id === id || c.slug === id);
    if (idx === -1) {
      return { success: false, error: 'Kategori tidak ditemukan.' };
    }

    const updated = {
      ...categories[idx],
      ...data,
    };

    categories[idx] = updated;
    saveStoredCategories(categories);
    return { success: true, category: updated };
  },

  delete: (id: string): { success: boolean; error?: string } => {
    const categories = getStoredCategories();
    const filtered = categories.filter((c) => c.id !== id && c.slug !== id);
    if (filtered.length === categories.length) {
      return { success: false, error: 'Kategori tidak ditemukan.' };
    }

    saveStoredCategories(filtered);
    return { success: true };
  },

  resetToInitial: (): void => {
    saveStoredCategories(CATEGORIES);
  },
};

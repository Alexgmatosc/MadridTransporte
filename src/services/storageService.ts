import type { FavoriteStop } from '../types/emt';

const FAVORITES_KEY = 'emt_madrid_favorites_v1';
const LAST_STOP_KEY = 'emt_madrid_last_stop_id_v1';
const THEME_KEY = 'emt_madrid_theme_v1';

export function getFavorites(): FavoriteStop[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

export function isFavorite(stopId: string): boolean {
  const list = getFavorites();
  return list.some((f) => f.id === stopId);
}

export function addFavorite(stop: {
  id: string;
  name: string;
  address?: string;
  lines?: string[];
}): FavoriteStop[] {
  const current = getFavorites();
  const existing = current.find((f) => f.id === stop.id);
  if (existing) {
    return current;
  }
  const updated: FavoriteStop[] = [
    {
      id: stop.id,
      name: stop.name,
      address: stop.address,
      lines: stop.lines,
      addedAt: Date.now(),
    },
    ...current,
  ];
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save favorite:', e);
  }
  return updated;
}

export function removeFavorite(stopId: string): FavoriteStop[] {
  const current = getFavorites();
  const updated = current.filter((f) => f.id !== stopId);
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove favorite:', e);
  }
  return updated;
}

export function toggleFavorite(stop: {
  id: string;
  name: string;
  address?: string;
  lines?: string[];
}): { isFav: boolean; favorites: FavoriteStop[] } {
  if (isFavorite(stop.id)) {
    const favs = removeFavorite(stop.id);
    return { isFav: false, favorites: favs };
  } else {
    const favs = addFavorite(stop);
    return { isFav: true, favorites: favs };
  }
}

export function getLastVisitedStopId(): string | null {
  try {
    return localStorage.getItem(LAST_STOP_KEY);
  } catch {
    return null;
  }
}

export function setLastVisitedStopId(stopId: string): void {
  try {
    localStorage.setItem(LAST_STOP_KEY, stopId);
  } catch (e) {
    console.error('Failed to save last stop:', e);
  }
}

export type ThemePreference = 'light' | 'dark' | 'system';

export function getThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_KEY) as ThemePreference;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'system';
}

export function setThemePreference(theme: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error('Failed to save theme:', e);
  }
}

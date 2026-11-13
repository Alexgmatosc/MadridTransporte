import type { FavoriteStop } from '../types/emt';
import type { FavoriteMetroStation } from '../types/metro';
import type { FavoriteCercaniasStation } from '../types/cercanias';
import type { TransportMode } from '../types/transport';

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

/* =========================================================================
 * Metro de Madrid Storage Extensions
 * ========================================================================= */

const METRO_FAVORITES_KEY = 'metro_madrid_favorites_v1';
const LAST_METRO_STATION_KEY = 'metro_madrid_last_station_id_v1';
const TRANSPORT_MODE_KEY = 'madrid_transporte_mode_v1';

export function getFavoriteMetroStations(): FavoriteMetroStation[] {
  try {
    const raw = localStorage.getItem(METRO_FAVORITES_KEY);
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

export function isFavoriteMetroStation(stationId: string): boolean {
  const list = getFavoriteMetroStations();
  return list.some((f) => f.id === stationId);
}

export function addFavoriteMetroStation(station: {
  id: string;
  name: string;
  lines: string[];
  address?: string;
}): FavoriteMetroStation[] {
  const current = getFavoriteMetroStations();
  const existing = current.find((f) => f.id === station.id);
  if (existing) {
    return current;
  }
  const updated: FavoriteMetroStation[] = [
    {
      id: station.id,
      name: station.name,
      lines: station.lines,
      address: station.address,
      addedAt: Date.now(),
    },
    ...current,
  ];
  try {
    localStorage.setItem(METRO_FAVORITES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save metro favorite:', e);
  }
  return updated;
}

export function removeFavoriteMetroStation(stationId: string): FavoriteMetroStation[] {
  const current = getFavoriteMetroStations();
  const updated = current.filter((f) => f.id !== stationId);
  try {
    localStorage.setItem(METRO_FAVORITES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove metro favorite:', e);
  }
  return updated;
}

export function toggleFavoriteMetroStation(station: {
  id: string;
  name: string;
  lines: string[];
  address?: string;
}): { isFav: boolean; favorites: FavoriteMetroStation[] } {
  if (isFavoriteMetroStation(station.id)) {
    const favs = removeFavoriteMetroStation(station.id);
    return { isFav: false, favorites: favs };
  } else {
    const favs = addFavoriteMetroStation(station);
    return { isFav: true, favorites: favs };
  }
}

export function getLastVisitedMetroStationId(): string | null {
  try {
    return localStorage.getItem(LAST_METRO_STATION_KEY);
  } catch {
    return null;
  }
}

export function setLastVisitedMetroStationId(stationId: string): void {
  try {
    localStorage.setItem(LAST_METRO_STATION_KEY, stationId);
  } catch (e) {
    console.error('Failed to save last metro station:', e);
  }
}

export function getTransportModePreference(): TransportMode {
  try {
    const saved = localStorage.getItem(TRANSPORT_MODE_KEY) as TransportMode;
    if (saved === 'all' || saved === 'bus' || saved === 'metro' || saved === 'cercanias') {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'all';
}

export function setTransportModePreference(mode: TransportMode): void {
  try {
    localStorage.setItem(TRANSPORT_MODE_KEY, mode);
  } catch (e) {
    console.error('Failed to save transport mode preference:', e);
  }
}

/* =========================================================================
 * Renfe Cercanías Madrid Storage Extensions
 * ========================================================================= */

const CERCANIAS_FAVORITES_KEY = 'cercanias_madrid_favorites_v1';
const LAST_CERCANIAS_STATION_KEY = 'cercanias_madrid_last_station_id_v1';

export function getFavoriteCercaniasStations(): FavoriteCercaniasStation[] {
  try {
    const raw = localStorage.getItem(CERCANIAS_FAVORITES_KEY);
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

export function isFavoriteCercaniasStation(stationId: string): boolean {
  const list = getFavoriteCercaniasStations();
  return list.some((f) => f.id === stationId);
}

export function addFavoriteCercaniasStation(station: {
  id: string;
  name: string;
  lines: string[];
  address?: string;
}): FavoriteCercaniasStation[] {
  const current = getFavoriteCercaniasStations();
  const existing = current.find((f) => f.id === station.id);
  if (existing) {
    return current;
  }
  const updated: FavoriteCercaniasStation[] = [
    {
      id: station.id,
      name: station.name,
      lines: station.lines,
      address: station.address,
      addedAt: Date.now(),
    },
    ...current,
  ];
  try {
    localStorage.setItem(CERCANIAS_FAVORITES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save cercanias favorite:', e);
  }
  return updated;
}

export function removeFavoriteCercaniasStation(
  stationId: string
): FavoriteCercaniasStation[] {
  const current = getFavoriteCercaniasStations();
  const updated = current.filter((f) => f.id !== stationId);
  try {
    localStorage.setItem(CERCANIAS_FAVORITES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove cercanias favorite:', e);
  }
  return updated;
}

export function toggleFavoriteCercaniasStation(station: {
  id: string;
  name: string;
  lines: string[];
  address?: string;
}): { isFav: boolean; favorites: FavoriteCercaniasStation[] } {
  if (isFavoriteCercaniasStation(station.id)) {
    const favs = removeFavoriteCercaniasStation(station.id);
    return { isFav: false, favorites: favs };
  } else {
    const favs = addFavoriteCercaniasStation(station);
    return { isFav: true, favorites: favs };
  }
}

export function getLastVisitedCercaniasStationId(): string | null {
  try {
    return localStorage.getItem(LAST_CERCANIAS_STATION_KEY);
  } catch {
    return null;
  }
}

export function setLastVisitedCercaniasStationId(stationId: string): void {
  try {
    localStorage.setItem(LAST_CERCANIAS_STATION_KEY, stationId);
  } catch (e) {
    console.error('Failed to save last cercanias station:', e);
  }
}

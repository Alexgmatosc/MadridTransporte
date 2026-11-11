import type { Stop } from '../types/emt';

let stopsCache: Stop[] | null = null;
let stopsLoadingPromise: Promise<Stop[]> | null = null;

/**
 * Normalizes text for diacritic-insensitive search:
 * "Alcalá" -> "alcala", "Príncipe" -> "principe"
 */
export function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Loads all stops from public/data/stops.json
 */
export async function loadStops(): Promise<Stop[]> {
  if (stopsCache) {
    return stopsCache;
  }

  if (stopsLoadingPromise) {
    return stopsLoadingPromise;
  }

  stopsLoadingPromise = fetch('/data/stops.json')
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load stops.json: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data: Stop[]) => {
      stopsCache = data;
      return data;
    })
    .catch((err) => {
      stopsLoadingPromise = null;
      throw err;
    });

  return stopsLoadingPromise;
}

/**
 * Synchronously retrieves stops if already loaded
 */
export function getCachedStops(): Stop[] {
  return stopsCache || [];
}

/**
 * Sets stops cache directly (used for testing or preloading)
 */
export function setCachedStops(stops: Stop[]): void {
  stopsCache = stops;
}

/**
 * Retrieves a specific stop by its ID
 */
export function getStopById(id: string): Stop | undefined {
  if (!stopsCache) return undefined;
  const searchId = id.trim();
  return stopsCache.find((s) => s.id === searchId);
}

export interface NearestStop extends Stop {
  distanceMeters: number;
}

/**
 * Finds nearest stops to user's geographic coordinates
 */
export function findNearestStops(
  lat: number,
  lon: number,
  limit = 20,
  maxRadiusMeters = 5000
): NearestStop[] {
  if (!stopsCache) return [];

  const withDistances: NearestStop[] = [];

  for (const stop of stopsCache) {
    if (!stop.lat || !stop.lon) continue;
    const distanceMeters = calculateDistanceMeters(lat, lon, stop.lat, stop.lon);
    if (distanceMeters <= maxRadiusMeters) {
      withDistances.push({
        ...stop,
        distanceMeters,
      });
    }
  }

  withDistances.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return withDistances.slice(0, limit);
}

/**
 * Searches stops by:
 * - ID (exact match top, prefix match)
 * - Line number / name (e.g. "53", "C1", "N20")
 * - Stop name (fuzzy diacritic-insensitive)
 * - Postal street address
 */
export function searchStops(query: string, limit = 50): Stop[] {
  if (!stopsCache) return [];
  const rawQ = query.trim();
  if (!rawQ) return [];

  const normQ = normalizeString(rawQ);
  const upperQ = rawQ.toUpperCase();

  const exactIdMatches: Stop[] = [];
  const prefixIdMatches: Stop[] = [];
  const exactLineMatches: Stop[] = [];
  const textMatches: Stop[] = [];

  for (const stop of stopsCache) {
    const isExactId = stop.id === rawQ;
    if (isExactId) {
      exactIdMatches.push(stop);
      continue;
    }

    const isPrefixId = stop.id.startsWith(rawQ);
    if (isPrefixId) {
      prefixIdMatches.push(stop);
      continue;
    }

    // Check if line served matches query
    const servesLine = stop.lines.some((l) => l.toUpperCase() === upperQ);
    if (servesLine) {
      exactLineMatches.push(stop);
      continue;
    }

    // Name or address match
    const normName = normalizeString(stop.name);
    const normAddr = normalizeString(stop.address);

    if (normName.includes(normQ) || normAddr.includes(normQ)) {
      textMatches.push(stop);
    }
  }

  const combined = [
    ...exactIdMatches,
    ...prefixIdMatches,
    ...exactLineMatches,
    ...textMatches,
  ];

  return combined.slice(0, limit);
}

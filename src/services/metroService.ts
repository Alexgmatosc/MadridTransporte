import type { MetroStation } from '../types/metro';
import { getMetroLine } from '../data/metroLines';

let metroStationsCache: MetroStation[] | null = null;
let metroStationsLoadingPromise: Promise<MetroStation[]> | null = null;

export interface NearestMetroStation extends MetroStation {
  distanceMeters: number;
}

/**
 * Normalizes text for diacritic-insensitive, case-insensitive comparison:
 * e.g., "Ópera" -> "opera", "Chamartín" -> "chamartin"
 */
export function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Calculates Haversine distance between two geographic coordinates in meters.
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
 * Loads all 242 Metro stations from public/data/metro_stations.json
 * with in-memory memoized caching and concurrency deduplication.
 */
export async function loadMetroStations(): Promise<MetroStation[]> {
  if (metroStationsCache) {
    return metroStationsCache;
  }

  if (metroStationsLoadingPromise) {
    return metroStationsLoadingPromise;
  }

  metroStationsLoadingPromise = fetch('/data/metro_stations.json')
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load metro_stations.json: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data: MetroStation[]) => {
      metroStationsCache = data;
      return data;
    })
    .catch((err) => {
      metroStationsLoadingPromise = null;
      throw err;
    });

  return metroStationsLoadingPromise;
}

/**
 * Synchronously retrieves cached stations if already loaded.
 */
export function getCachedMetroStations(): MetroStation[] {
  return metroStationsCache || [];
}

/**
 * Manually populates the cache (primarily for unit tests).
 */
export function setCachedMetroStations(stations: MetroStation[] | null): void {
  metroStationsCache = stations;
}

/**
 * Clears the in-memory stations cache.
 */
export function clearMetroStationsCache(): void {
  metroStationsCache = null;
  metroStationsLoadingPromise = null;
}

/**
 * Normalizes input line query (e.g. "L1", "linea 1", "r", "ml1") to canonical line ID.
 */
function resolveLineQuery(raw: string): string | null {
  const lineConfig = getMetroLine(raw);
  if (lineConfig) {
    return lineConfig.id;
  }
  const upper = raw.trim().toUpperCase();
  const stripped = upper.replace(/^LÍNEA\s*/i, '').replace(/^LINEA\s*/i, '').replace(/^L/i, '');
  if (stripped) {
    const fallbackConfig = getMetroLine(stripped);
    if (fallbackConfig) return fallbackConfig.id;
  }
  return null;
}

/**
 * Searches metro stations by:
 * - Station name (diacritic-insensitive, e.g. "opera" -> "Ópera")
 * - Station ID / code (master ID and subsidiary platform codes)
 * - Serving line (e.g. "1", "L1", "Linea 2", "R", "Ramal", "ML1")
 * - Address substring
 */
export async function searchMetroStations(
  query: string,
  limit = 30
): Promise<MetroStation[]> {
  const stations = await loadMetroStations();
  const rawQ = query.trim();
  if (!rawQ) return [];

  const normQ = normalizeString(rawQ);
  const targetLine = resolveLineQuery(rawQ);

  const exactCodeMatches: MetroStation[] = [];
  const exactNameMatches: MetroStation[] = [];
  const prefixNameMatches: MetroStation[] = [];
  const lineMatches: MetroStation[] = [];
  const textMatches: MetroStation[] = [];

  const seenIds = new Set<string>();

  for (const station of stations) {
    const cleanId = station.id.replace(/^0+/, '');
    const cleanQ = rawQ.replace(/^0+/, '');
    const isCodeMatch =
      station.id === rawQ ||
      cleanId === cleanQ ||
      (station.allCodes &&
        station.allCodes.some((c) => c === rawQ || c.replace(/^0+/, '') === cleanQ));

    if (isCodeMatch) {
      exactCodeMatches.push(station);
      seenIds.add(station.id);
      continue;
    }

    const normName = normalizeString(station.name);
    if (normName === normQ) {
      exactNameMatches.push(station);
      seenIds.add(station.id);
      continue;
    }

    if (normName.startsWith(normQ)) {
      prefixNameMatches.push(station);
      seenIds.add(station.id);
      continue;
    }

    // Line match: station serves the queried line
    if (
      targetLine &&
      station.lines.some((l) => l.toUpperCase() === targetLine.toUpperCase())
    ) {
      lineMatches.push(station);
      seenIds.add(station.id);
      continue;
    }

    // Substring name or address match
    const normAddr = normalizeString(station.address || '');
    if (normName.includes(normQ) || normAddr.includes(normQ)) {
      textMatches.push(station);
      seenIds.add(station.id);
    }
  }

  const combined = [
    ...exactCodeMatches,
    ...exactNameMatches,
    ...prefixNameMatches,
    ...lineMatches,
    ...textMatches,
  ];

  return combined.slice(0, limit);
}

/**
 * Finds nearest Metro stations to the given latitude and longitude coordinates.
 * Uses Haversine distance, sorted closest first.
 */
export async function findNearestMetroStations(
  lat: number,
  lon: number,
  limit = 20,
  maxRadiusMeters = 5000
): Promise<NearestMetroStation[]> {
  const stations = await loadMetroStations();
  const withDistances: NearestMetroStation[] = [];

  for (const station of stations) {
    if (!station.lat || !station.lon) continue;
    const distanceMeters = calculateDistanceMeters(lat, lon, station.lat, station.lon);
    if (distanceMeters <= maxRadiusMeters) {
      withDistances.push({
        ...station,
        distanceMeters,
      });
    }
  }

  withDistances.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return withDistances.slice(0, limit);
}

/**
 * Retrieves a metro station by station code.
 * Checks both the master ID and subsidiary platform codes (`allCodes`),
 * matching padded ("0112") and unpadded ("112") representations.
 */
export async function getMetroStationByCode(code: string): Promise<MetroStation | null> {
  const stations = await loadMetroStations();
  const cleanCode = code.trim();
  if (!cleanCode) return null;

  const unpadded = cleanCode.replace(/^0+/, '') || '0';
  const padded = cleanCode.padStart(4, '0');

  for (const station of stations) {
    const stationUnpadded = station.id.replace(/^0+/, '');
    if (
      station.id === cleanCode ||
      station.id === padded ||
      stationUnpadded === unpadded
    ) {
      return station;
    }

    if (station.allCodes) {
      const matchAll = station.allCodes.some((c) => {
        const cUnpadded = c.replace(/^0+/, '');
        return c === cleanCode || c === padded || cUnpadded === unpadded;
      });
      if (matchAll) {
        return station;
      }
    }
  }

  return null;
}

/**
 * Alias for getMetroStationByCode.
 */
export async function getMetroStationById(id: string): Promise<MetroStation | null> {
  return getMetroStationByCode(id);
}

/**
 * Retrieves all stations serving a specific Metro or Metro Ligero line.
 * Accepts line aliases like "1", "L1", "Linea 1", "R", "Ramal", "ML1".
 */
export async function getMetroStationsByLine(lineId: string): Promise<MetroStation[]> {
  const stations = await loadMetroStations();
  const target = resolveLineQuery(lineId) || lineId.trim().toUpperCase();
  if (!target) return [];

  const matched = stations.filter((s) =>
    s.lines.some((l) => l.toUpperCase() === target.toUpperCase())
  );

  return matched.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

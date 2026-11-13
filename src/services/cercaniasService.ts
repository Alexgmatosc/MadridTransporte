import type { CercaniasStation } from '../types/cercanias';
import { getCercaniasLine } from '../data/cercaniasLines';

let cercaniasStationsCache: CercaniasStation[] | null = null;
let cercaniasStationsLoadingPromise: Promise<CercaniasStation[]> | null = null;

export interface NearestCercaniasStation extends CercaniasStation {
  distanceMeters: number;
}

/**
 * Normalizes text for diacritic-insensitive, case-insensitive comparison:
 * e.g., "Príncipe Pío" -> "principe pio", "Chamartín" -> "chamartin"
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
 * Loads all Cercanías Madrid stations from public/data/cercanias_stations.json
 * with in-memory memoized caching and concurrency deduplication.
 */
export async function loadCercaniasStations(): Promise<CercaniasStation[]> {
  if (cercaniasStationsCache) {
    return cercaniasStationsCache;
  }

  if (cercaniasStationsLoadingPromise) {
    return cercaniasStationsLoadingPromise;
  }

  cercaniasStationsLoadingPromise = fetch('/data/cercanias_stations.json')
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load cercanias_stations.json: ${res.statusText}`);
      }
      return res.json() as Promise<CercaniasStation[]>;
    })
    .then((data) => {
      cercaniasStationsCache = data;
      return data;
    })
    .catch((err) => {
      cercaniasStationsLoadingPromise = null;
      throw err;
    });

  return cercaniasStationsLoadingPromise;
}

/**
 * Synchronously retrieves cached Cercanías stations if already loaded.
 */
export function getCachedCercaniasStations(): CercaniasStation[] {
  return cercaniasStationsCache || [];
}

/**
 * Manually populates the in-memory cache (primarily for unit tests).
 */
export function setCachedCercaniasStations(stations: CercaniasStation[] | null): void {
  cercaniasStationsCache = stations;
  cercaniasStationsLoadingPromise = null;
}

/**
 * Clears the in-memory Cercanías stations cache.
 */
export function clearCercaniasStationsCache(): void {
  cercaniasStationsCache = null;
  cercaniasStationsLoadingPromise = null;
}

/**
 * Normalizes input line query (e.g. "C5", "5", "c4a", "Linea C10") to canonical Cercanías line ID.
 */
function resolveLineQuery(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lineConfig = getCercaniasLine(trimmed);
  return lineConfig ? lineConfig.id : null;
}

/**
 * Checks whether a station matches a given GTFS stop ID or alias.
 */
function stationMatchesId(station: CercaniasStation, targetId: string): boolean {
  if (station.id === targetId) return true;
  if (station.stopIds && station.stopIds.includes(targetId)) return true;
  return false;
}

/**
 * Searches Cercanías Madrid stations by:
 * - Station ID / GTFS stopId (e.g. "18000", "18101", "70001")
 * - Station name (diacritic-insensitive, e.g. "principe pio" -> "Madrid-Príncipe Pío")
 * - Serving line (e.g. "C5", "5", "C4a", "10")
 * - Optional address substring
 */
export async function searchCercaniasStations(
  query: string,
  limit = 30
): Promise<CercaniasStation[]> {
  const stations = await loadCercaniasStations();
  const rawQ = query.trim();
  if (!rawQ) return [];

  const normQ = normalizeString(rawQ);
  const targetLine = resolveLineQuery(rawQ);

  const exactCodeMatches: CercaniasStation[] = [];
  const exactNameMatches: CercaniasStation[] = [];
  const prefixNameMatches: CercaniasStation[] = [];
  const lineMatches: CercaniasStation[] = [];
  const textMatches: CercaniasStation[] = [];

  for (const station of stations) {
    if (stationMatchesId(station, rawQ)) {
      exactCodeMatches.push(station);
      continue;
    }

    const normName = normalizeString(station.name);
    const normWithoutMadrid = normName.replace(/^madrid-/, '');

    if (normName === normQ || normWithoutMadrid === normQ) {
      exactNameMatches.push(station);
      continue;
    }

    if (normName.startsWith(normQ) || normWithoutMadrid.startsWith(normQ)) {
      prefixNameMatches.push(station);
      continue;
    }

    if (
      targetLine &&
      station.lines.some((l) => l.toUpperCase() === targetLine.toUpperCase())
    ) {
      lineMatches.push(station);
      continue;
    }

    const normAddr = normalizeString(station.address || '');
    if (normName.includes(normQ) || normAddr.includes(normQ)) {
      textMatches.push(station);
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
 * Finds nearest Cercanías Madrid stations to the given latitude and longitude coordinates.
 * Uses Haversine distance, sorted closest first.
 */
export async function findNearestCercaniasStations(
  lat: number,
  lon: number,
  limit = 20,
  maxDistanceMeters = 10000
): Promise<NearestCercaniasStation[]> {
  const stations = await loadCercaniasStations();
  const withDistances: NearestCercaniasStation[] = [];

  for (const station of stations) {
    if (!station.lat || !station.lon) continue;
    const distanceMeters = calculateDistanceMeters(lat, lon, station.lat, station.lon);
    if (distanceMeters <= maxDistanceMeters) {
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
 * Retrieves a Cercanías station by its canonical GTFS stop_id or any alias in stopIds.
 */
export async function getCercaniasStationById(
  id: string
): Promise<CercaniasStation | null> {
  const stations = await loadCercaniasStations();
  const cleanId = id.trim();
  if (!cleanId) return null;

  for (const station of stations) {
    if (stationMatchesId(station, cleanId)) {
      return station;
    }
  }

  return null;
}

/**
 * Retrieves all Cercanías stations serving a specific line (e.g. "C5", "5", "C4a").
 */
export async function getCercaniasStationsByLine(
  lineId: string
): Promise<CercaniasStation[]> {
  const stations = await loadCercaniasStations();
  const target = resolveLineQuery(lineId) || lineId.trim().toUpperCase();
  if (!target) return [];

  const matched = stations.filter((s) =>
    s.lines.some((l) => l.toUpperCase() === target.toUpperCase())
  );

  return matched.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

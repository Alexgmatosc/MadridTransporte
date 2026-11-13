import { calculateDistanceMeters, loadStops } from './stopsService';
import { loadMetroStations } from './metroService';
import { loadCercaniasStations } from './cercaniasService';

export type InterchangeTransportType = 'bus' | 'metro' | 'cercanias';

export interface InterchangeConnection {
  type: InterchangeTransportType;
  id: string;
  name: string;
  lines: string[];
  distanceMeters: number;
}

export interface FindNearbyInterchangesOptions {
  lat: number;
  lon: number;
  excludeType: InterchangeTransportType;
  excludeId: string;
  radiusMeters?: number;
  limit?: number;
}

const DEFAULT_RADIUS_METERS = 200;
const DEFAULT_LIMIT = 8;
const MAX_BUS_CONNECTIONS_FROM_OTHER_MODE = 4;

function isValidCoordinate(lat: unknown, lon: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    (lat !== 0 || lon !== 0)
  );
}

function compareConnections(a: InterchangeConnection, b: InterchangeConnection): number {
  if (a.distanceMeters !== b.distanceMeters) {
    return a.distanceMeters - b.distanceMeters;
  }
  if (a.type !== b.type) {
    return a.type.localeCompare(b.type);
  }
  return a.id.localeCompare(b.id);
}

/**
 * Finds nearby transport interchange connections across the OTHER transport modes
 * within `radiusMeters` (default 200m) using Haversine distance.
 *
 * - Metro -> searches Cercanías + Bus
 * - Cercanías -> searches Metro + Bus
 * - Bus -> searches Metro + Cercanías
 *
 * Prioritizes rail modes (Metro & Cercanías) and caps EMT Bus stops to the
 * 4 nearest stops so busy avenues do not crowd out rail connections.
 */
export async function findNearbyInterchanges(
  options: FindNearbyInterchangesOptions
): Promise<InterchangeConnection[]> {
  const {
    lat,
    lon,
    excludeType,
    excludeId,
    radiusMeters = DEFAULT_RADIUS_METERS,
    limit = DEFAULT_LIMIT,
  } = options;

  if (!isValidCoordinate(lat, lon) || radiusMeters < 0 || limit <= 0) {
    return [];
  }

  const shouldSearchMetro = excludeType !== 'metro';
  const shouldSearchCercanias = excludeType !== 'cercanias';
  const shouldSearchBus = excludeType !== 'bus';

  const [metroStations, cercaniasStations, busStops] = await Promise.all([
    shouldSearchMetro ? loadMetroStations().catch(() => []) : Promise.resolve([]),
    shouldSearchCercanias ? loadCercaniasStations().catch(() => []) : Promise.resolve([]),
    shouldSearchBus ? loadStops().catch(() => []) : Promise.resolve([]),
  ]);

  const deduped = new Map<string, InterchangeConnection>();

  const registerConnection = (conn: InterchangeConnection) => {
    if (conn.type === excludeType && conn.id === excludeId) return;
    const key = `${conn.type}:${conn.id}`;
    const existing = deduped.get(key);
    if (!existing || conn.distanceMeters < existing.distanceMeters) {
      deduped.set(key, conn);
    }
  };

  for (const station of metroStations) {
    if (!isValidCoordinate(station.lat, station.lon)) continue;
    const distanceMeters = calculateDistanceMeters(lat, lon, station.lat, station.lon);
    if (distanceMeters <= radiusMeters) {
      registerConnection({
        type: 'metro',
        id: station.id,
        name: station.name,
        lines: [...(station.lines || [])],
        distanceMeters,
      });
    }
  }

  for (const station of cercaniasStations) {
    if (!isValidCoordinate(station.lat, station.lon)) continue;
    const distanceMeters = calculateDistanceMeters(lat, lon, station.lat, station.lon);
    if (distanceMeters <= radiusMeters) {
      registerConnection({
        type: 'cercanias',
        id: station.id,
        name: station.name,
        lines: [...(station.lines || [])],
        distanceMeters,
      });
    }
  }

  for (const stop of busStops) {
    if (!isValidCoordinate(stop.lat, stop.lon)) continue;
    const distanceMeters = calculateDistanceMeters(lat, lon, stop.lat, stop.lon);
    if (distanceMeters <= radiusMeters) {
      registerConnection({
        type: 'bus',
        id: stop.id,
        name: stop.name,
        lines: [...(stop.lines || [])],
        distanceMeters,
      });
    }
  }

  const railConnections: InterchangeConnection[] = [];
  const busConnections: InterchangeConnection[] = [];

  for (const conn of deduped.values()) {
    if (conn.type === 'bus') {
      busConnections.push(conn);
    } else {
      railConnections.push(conn);
    }
  }

  railConnections.sort(compareConnections);
  busConnections.sort(compareConnections);

  // Cap EMT bus stops when coming from Metro/Cercanías so a single corridor doesn't flood the strip
  const cappedBus = busConnections.slice(0, MAX_BUS_CONNECTIONS_FROM_OTHER_MODE);

  // Prioritize Metro & Cercanías within `limit`, then fill remaining slots with closest EMT stops
  const selectedRail = railConnections.slice(0, limit);
  const remainingSlots = Math.max(0, limit - selectedRail.length);
  const selectedBus = cappedBus.slice(0, remainingSlots);

  const combined = [...selectedRail, ...selectedBus];
  combined.sort(compareConnections);
  return combined;
}

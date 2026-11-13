import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCercaniasStationResponse,
  buildCercaniasTrainsResponse,
} from '../src/services/cercaniasParser.ts';
import type {
  CercaniasMeta,
  CercaniasStation,
  GtfsRtFeed,
} from '../src/types/cercanias.ts';

export const RENFE_GTFS_RT_URLS = {
  tripUpdates: 'https://gtfsrt.renfe.com/trip_updates.json',
  vehiclePositions: 'https://gtfsrt.renfe.com/vehicle_positions.json',
  alerts: 'https://gtfsrt.renfe.com/alerts.json',
} as const;

export const RENFE_FETCH_TIMEOUT_MS = 8000;

export const NO_STORE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export interface CercaniasApiRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
}

interface StaticCatalogCache {
  stations: CercaniasStation[];
  stationByStopId: Map<string, CercaniasStation>;
  meta: CercaniasMeta;
}

let staticCache: StaticCatalogCache | null = null;
let staticLoadPromise: Promise<StaticCatalogCache> | null = null;

async function readJsonFromDataDir<T>(filename: string): Promise<T> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), 'public', 'data', filename),
    path.resolve(currentDir, '..', 'public', 'data', filename),
  ];

  let lastError: unknown;
  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Unable to load ${filename}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

async function getStaticCatalog(): Promise<StaticCatalogCache> {
  if (staticCache) {
    return staticCache;
  }
  if (staticLoadPromise) {
    return staticLoadPromise;
  }

  staticLoadPromise = Promise.all([
    readJsonFromDataDir<CercaniasStation[]>('cercanias_stations.json'),
    readJsonFromDataDir<CercaniasMeta>('cercanias_meta.json'),
  ])
    .then(([stations, meta]) => {
      const stationByStopId = new Map<string, CercaniasStation>();
      for (const station of stations) {
        stationByStopId.set(station.id, station);
        for (const sid of station.stopIds ?? []) {
          stationByStopId.set(sid, station);
        }
      }
      staticCache = { stations, stationByStopId, meta };
      return staticCache;
    })
    .catch((err) => {
      staticLoadPromise = null;
      throw err;
    });

  return staticLoadPromise;
}

async function fetchGtfsRtFeed(url: string): Promise<GtfsRtFeed> {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(RENFE_FETCH_TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} from ${url}`);
  }

  const data = (await response.json()) as GtfsRtFeed;
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid JSON payload from ${url}`);
  }

  return data;
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(body));
}

function getQueryParam(
  urlParams: URLSearchParams,
  reqQuery: Record<string, string | string[] | undefined> | undefined,
  key: string
): string {
  const fromUrl = urlParams.get(key);
  if (fromUrl !== null) {
    return fromUrl.trim();
  }
  const raw = reqQuery?.[key];
  if (Array.isArray(raw)) {
    return (raw[0] ?? '').trim();
  }
  return typeof raw === 'string' ? raw.trim() : '';
}

export default async function handler(
  req: CercaniasApiRequest,
  res: ServerResponse
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
      res.setHeader(key, value);
    }
    res.end();
    return;
  }

  if (req.method && req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed. Use GET.' });
    return;
  }

  const parsedUrl = new URL(req.url ?? '/', 'http://localhost');
  const params = parsedUrl.searchParams;

  const mode = getQueryParam(params, req.query, 'mode').toLowerCase();
  const stationParam = getQueryParam(params, req.query, 'station');
  const stopIdsParam = getQueryParam(params, req.query, 'stopIds');
  const trainsParam = getQueryParam(params, req.query, 'trains');

  const isTrainsMode =
    mode === 'trains' || stationParam.toLowerCase() === 'all';
  const includeTrains =
    trainsParam === '1' || trainsParam.toLowerCase() === 'true';

  if (!isTrainsMode && !stationParam) {
    sendJson(res, 400, {
      error: 'Missing required query parameter: station (or mode=trains).',
    });
    return;
  }

  let catalog: StaticCatalogCache;
  try {
    catalog = await getStaticCatalog();
  } catch (err) {
    sendJson(res, 500, {
      error: 'Failed to load Cercanías static catalog.',
      details: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (isTrainsMode) {
    const [vehicleResult, alertsResult] = await Promise.allSettled([
      fetchGtfsRtFeed(RENFE_GTFS_RT_URLS.vehiclePositions),
      fetchGtfsRtFeed(RENFE_GTFS_RT_URLS.alerts),
    ]);

    if (vehicleResult.status === 'rejected') {
      sendJson(res, 502, {
        error: 'Failed to fetch Renfe GTFS-RT vehicle_positions feed.',
        details:
          vehicleResult.reason instanceof Error
            ? vehicleResult.reason.message
            : String(vehicleResult.reason),
      });
      return;
    }

    const payload = buildCercaniasTrainsResponse(catalog.meta, {
      vehiclePositions: vehicleResult.value,
      alerts: alertsResult.status === 'fulfilled' ? alertsResult.value : null,
    });

    sendJson(res, 200, payload);
    return;
  }

  const extraStopIds = stopIdsParam
    ? stopIdsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const matchedStation =
    catalog.stationByStopId.get(stationParam) ??
    extraStopIds
      .map((sid) => catalog.stationByStopId.get(sid))
      .find((st): st is CercaniasStation => Boolean(st));

  const metaStopName = catalog.meta.stops[stationParam];

  if (!matchedStation && !metaStopName) {
    sendJson(res, 404, {
      error: `Unknown Cercanías Madrid station: ${stationParam}`,
      stationId: stationParam,
    });
    return;
  }

  const mergedStopIds = Array.from(
    new Set<string>([
      stationParam,
      ...(matchedStation?.stopIds ?? []),
      ...extraStopIds,
    ])
  );

  const [tripUpdatesResult, vehicleResult, alertsResult] = await Promise.allSettled([
    fetchGtfsRtFeed(RENFE_GTFS_RT_URLS.tripUpdates),
    fetchGtfsRtFeed(RENFE_GTFS_RT_URLS.vehiclePositions),
    fetchGtfsRtFeed(RENFE_GTFS_RT_URLS.alerts),
  ]);

  if (tripUpdatesResult.status === 'rejected') {
    sendJson(res, 502, {
      error: 'Failed to fetch Renfe GTFS-RT trip_updates feed.',
      details:
        tripUpdatesResult.reason instanceof Error
          ? tripUpdatesResult.reason.message
          : String(tripUpdatesResult.reason),
    });
    return;
  }

  const payload = buildCercaniasStationResponse(
    {
      stationId: matchedStation?.id ?? stationParam,
      stationName: matchedStation?.name ?? metaStopName ?? stationParam,
      stopIds: mergedStopIds,
      lines: matchedStation?.lines,
    },
    catalog.meta,
    {
      tripUpdates: tripUpdatesResult.value,
      vehiclePositions: vehicleResult.status === 'fulfilled' ? vehicleResult.value : null,
      alerts: alertsResult.status === 'fulfilled' ? alertsResult.value : null,
    },
    {
      includeTrains,
    }
  );

  sendJson(res, 200, payload);
}

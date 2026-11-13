import type {
  CercaniasAlert,
  CercaniasStationResponse,
  CercaniasTrainPosition,
  CercaniasTrainsResponse,
} from '../types/cercanias';

export interface FetchCercaniasOptions {
  includeTrains?: boolean;
  signal?: AbortSignal;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return '';
    const parsed = JSON.parse(text) as { error?: unknown; details?: unknown };
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim();
    }
    return text.slice(0, 200);
  } catch {
    return '';
  }
}

/**
 * Fetches live Renfe Cercanías Madrid arrivals and alerts for a given station
 * via the `/api/cercanias` serverless endpoint with strict no-store caching.
 */
export async function fetchCercaniasEstimates(
  stationId: string,
  stopIds?: string[],
  options: FetchCercaniasOptions = {}
): Promise<CercaniasStationResponse> {
  const cleanId = (stationId || '').trim();
  if (!cleanId) {
    throw new Error('El código de estación de Cercanías es obligatorio.');
  }

  const params = new URLSearchParams();
  params.set('station', cleanId);

  const cleanStopIds = (stopIds ?? []).map((id) => id.trim()).filter(Boolean);
  if (cleanStopIds.length > 0) {
    params.set('stopIds', cleanStopIds.join(','));
  }

  if (options.includeTrains) {
    params.set('trains', '1');
  }

  params.set('_t', String(Date.now()));

  const url = `/api/cercanias?${params.toString()}`;
  const response = await fetch(url, {
    cache: 'no-store',
    signal: options.signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new Error(
      detail ||
        `No se pudieron cargar las estimaciones de Cercanías (HTTP ${response.status}).`
    );
  }

  const data = (await response.json()) as Partial<CercaniasStationResponse>;
  if (!data || typeof data !== 'object' || !Array.isArray(data.arrivals)) {
    throw new Error('Respuesta inválida del servicio de Cercanías.');
  }

  return {
    stationId: data.stationId ?? cleanId,
    stationName: data.stationName ?? cleanId,
    arrivals: data.arrivals,
    alerts: Array.isArray(data.alerts) ? data.alerts : [],
    ...(Array.isArray(data.trains) ? { trains: data.trains } : {}),
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
    ...(typeof data.feedTimestamp === 'number'
      ? { feedTimestamp: data.feedTimestamp }
      : {}),
    ...(typeof data.isStale === 'boolean' ? { isStale: data.isStale } : {}),
    source: data.source ?? 'realtime',
    ...(typeof data.error === 'string' ? { error: data.error } : {}),
  };
}

/**
 * Fetches live Renfe Cercanías Madrid train GPS positions and active alerts
 * via `/api/cercanias?mode=trains` with strict no-store caching.
 */
export async function fetchCercaniasTrains(options: {
  signal?: AbortSignal;
} = {}): Promise<{
  trains: CercaniasTrainPosition[];
  alerts: CercaniasAlert[];
  timestamp: number;
  isStale?: boolean;
}> {
  const params = new URLSearchParams();
  params.set('mode', 'trains');
  params.set('_t', String(Date.now()));

  const url = `/api/cercanias?${params.toString()}`;
  const response = await fetch(url, {
    cache: 'no-store',
    signal: options.signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new Error(
      detail ||
        `No se pudieron cargar los trenes en vivo de Cercanías (HTTP ${response.status}).`
    );
  }

  const data = (await response.json()) as Partial<CercaniasTrainsResponse>;
  if (!data || typeof data !== 'object' || !Array.isArray(data.trains)) {
    throw new Error('Respuesta inválida al consultar trenes en vivo de Cercanías.');
  }

  return {
    trains: data.trains,
    alerts: Array.isArray(data.alerts) ? data.alerts : [],
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
    ...(typeof data.isStale === 'boolean' ? { isStale: data.isStale } : {}),
  };
}

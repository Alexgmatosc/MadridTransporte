import {
  CERCANIAS_LINES,
  normalizeCercaniasLineKey,
} from '../data/cercaniasLines.ts';
import type {
  CercaniasAlert,
  CercaniasArrival,
  CercaniasMeta,
  CercaniasStationResponse,
  CercaniasTrainPosition,
  CercaniasTrainsResponse,
  GtfsRtAlert,
  GtfsRtEntity,
  GtfsRtFeed,
  GtfsRtStopTimeUpdate,
  GtfsRtTranslatedText,
} from '../types/cercanias.ts';

export const DEFAULT_MAX_PAST_SECONDS = 120; // 2 minutes
export const DEFAULT_MAX_FUTURE_SECONDS = 7200; // 120 minutes (2 hours)
export const DEFAULT_STALE_THRESHOLD_SECONDS = 300; // 5 minutes

export interface CercaniasStationTarget {
  stationId: string;
  stationName?: string;
  stopIds?: string[];
  lines?: string[];
}

export interface CercaniasRawFeeds {
  tripUpdates?: GtfsRtFeed | null;
  vehiclePositions?: GtfsRtFeed | null;
  alerts?: GtfsRtFeed | null;
}

export interface BuildCercaniasOptions {
  nowMs?: number;
  includeTrains?: boolean;
  maxPastSeconds?: number;
  maxFutureSeconds?: number;
  staleThresholdSeconds?: number;
}

/**
 * Safely parses a GTFS-RT timestamp (string or number Unix seconds) into Unix seconds.
 * Normalizes accidental millisecond timestamps (> 1e12) down to seconds.
 */
export function parseUnixSeconds(value?: string | number | null): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(num) || num <= 0) {
    return undefined;
  }
  return num > 1e12 ? Math.floor(num / 1000) : num;
}

/**
 * Determines whether a GTFS-RT feed header timestamp is stale (> 5 minutes / 300s old).
 * Returns false if timestamp is missing or in the future.
 */
export function isFeedStale(
  headerTimestamp?: string | number | null,
  nowMs: number = Date.now(),
  maxAgeSeconds: number = DEFAULT_STALE_THRESHOLD_SECONDS
): boolean {
  const tsSec = parseUnixSeconds(headerTimestamp);
  if (tsSec === undefined) {
    return false;
  }
  const nowSec = nowMs / 1000;
  if (tsSec > nowSec) {
    return false;
  }
  return nowSec - tsSec > maxAgeSeconds;
}

/**
 * Extracts platform/track number from Renfe vehicle label, e.g.:
 * - "C5-20703-PLATF.(1)" -> "1"
 * - "C4a-10402-PLATF.(2B)" -> "2B"
 * - "C2-12345-PLATF.()" -> undefined
 */
export function extractPlatformFromLabel(label?: string | null): string | undefined {
  if (!label) return undefined;
  const trimmed = label.trim();
  if (!trimmed) return undefined;

  const parenMatch = trimmed.match(/PLATF\.?\s*\(([^)]*)\)/i);
  if (parenMatch) {
    const candidate = parenMatch[1].trim();
    if (!candidate || candidate === '?' || candidate === '-') {
      return undefined;
    }
    return candidate;
  }

  const inlineMatch = trimmed.match(/\bPLATF\.?\s*([A-Za-z0-9]+)/i);
  if (inlineMatch) {
    const candidate = inlineMatch[1].trim();
    if (!candidate || candidate === '?' || candidate === '-') {
      return undefined;
    }
    return candidate;
  }

  return undefined;
}

/**
 * Extracts rolling stock train number from vehicle label, e.g. "C5-20703-PLATF.(1)" -> "20703".
 */
export function extractTrainIdFromLabel(label?: string | null): string | undefined {
  if (!label) return undefined;
  const match = label.trim().match(/^[A-Za-z0-9]+-(\d+)(?:-|$)/);
  return match ? match[1] : undefined;
}

function getTranslatedText(translated?: GtfsRtTranslatedText): string {
  const list = translated?.translation;
  if (!Array.isArray(list) || list.length === 0) return '';

  const spanish = list.find(
    (item) => item?.language?.toLowerCase().startsWith('es') && item.text?.trim()
  );
  if (spanish?.text) return spanish.text.trim();

  const first = list.find((item) => item?.text?.trim());
  return first?.text ? first.text.trim() : '';
}

function isMadridRouteId(routeId: string | undefined, meta: CercaniasMeta): boolean {
  if (!routeId) return false;
  const clean = routeId.trim();
  if (!clean) return false;
  return clean.startsWith('10T') || Boolean(meta.routes[clean]);
}

function isMadridTripId(tripId: string | undefined): boolean {
  if (!tripId) return false;
  return tripId.trim().startsWith('10');
}

function isOtherNucleusPrefix(id: string | undefined): boolean {
  if (!id) return false;
  const clean = id.trim();
  return /^\d{2}/.test(clean) && !clean.startsWith('10');
}

/**
 * Checks whether a GTFS-RT entity (tripUpdate, vehicle, or alert) belongs to
 * Renfe Cercanías Madrid (Núcleo 10).
 */
export function isMadridCercaniasEntity(
  entity: GtfsRtEntity | null | undefined,
  meta: CercaniasMeta
): boolean {
  if (!entity || entity.isDeleted) {
    return false;
  }

  if (entity.tripUpdate) {
    const { trip, stopTimeUpdate } = entity.tripUpdate;
    const routeId = trip?.routeId?.trim() || '';
    const tripId = trip?.tripId?.trim() || '';

    if (routeId) {
      return isMadridRouteId(routeId, meta);
    }

    if (tripId) {
      if (isMadridTripId(tripId)) return true;
      if (isOtherNucleusPrefix(tripId)) return false;
    }

    if (Array.isArray(stopTimeUpdate)) {
      return stopTimeUpdate.some((stu) => Boolean(stu.stopId && meta.stops[stu.stopId]));
    }

    return false;
  }

  if (entity.vehicle) {
    const { trip, stopId } = entity.vehicle;
    const routeId = trip?.routeId?.trim() || '';
    const tripId = trip?.tripId?.trim() || '';

    if (routeId) {
      return isMadridRouteId(routeId, meta);
    }

    if (tripId) {
      if (isMadridTripId(tripId)) return true;
      if (isOtherNucleusPrefix(tripId)) return false;
    }

    if (stopId && meta.stops[stopId]) {
      return true;
    }

    return false;
  }

  if (entity.alert) {
    const alert = entity.alert;
    const informed = alert.informedEntity ?? [];

    for (const ie of informed) {
      if (isMadridRouteId(ie.routeId, meta)) return true;
      if (ie.stopId && meta.stops[ie.stopId]) return true;
      if (isMadridRouteId(ie.trip?.routeId, meta)) return true;
      if (isMadridTripId(ie.trip?.tripId)) return true;
    }

    const header = getTranslatedText(alert.headerText);
    const desc = getTranslatedText(alert.descriptionText);
    const combined = `${header} ${desc}`;
    if (/#MadC/i.test(combined)) {
      return true;
    }

    return false;
  }

  return false;
}

/**
 * Resolves canonical Madrid Cercanías line code (e.g. "C5", "C4a") from routeId, tripId, or label.
 */
export function resolveCercaniasLine(
  routeId?: string,
  tripId?: string,
  label?: string,
  meta?: CercaniasMeta
): string {
  const cleanRoute = routeId?.trim() || '';
  if (cleanRoute) {
    const metaRoute = meta?.routes[cleanRoute];
    if (metaRoute?.line && CERCANIAS_LINES[metaRoute.line]) {
      return metaRoute.line;
    }
    const normRoute = normalizeCercaniasLineKey(cleanRoute);
    if (CERCANIAS_LINES[normRoute]) {
      return normRoute;
    }
  }

  const cleanTrip = tripId?.trim() || '';
  if (cleanTrip) {
    const normTrip = normalizeCercaniasLineKey(cleanTrip);
    if (CERCANIAS_LINES[normTrip]) {
      return normTrip;
    }
    const embedded = cleanTrip.match(/(C(?:10|[1-9][ab]?))(?:\b|_|-|$)/i);
    if (embedded) {
      const normEmbedded = normalizeCercaniasLineKey(embedded[1]);
      if (CERCANIAS_LINES[normEmbedded]) {
        return normEmbedded;
      }
    }
  }

  const cleanLabel = label?.trim() || '';
  if (cleanLabel) {
    const prefix = cleanLabel.split('-')[0];
    if (prefix) {
      const normLabel = normalizeCercaniasLineKey(prefix);
      if (CERCANIAS_LINES[normLabel]) {
        return normLabel;
      }
    }
  }

  return 'C';
}

function resolveTripEndpoints(
  routeId: string | undefined,
  line: string,
  stopTimeUpdates: GtfsRtStopTimeUpdate[],
  meta: CercaniasMeta
): { origin?: string; destination: string } {
  const metaRoute = routeId ? meta.routes[routeId] : undefined;

  let lastStopId = '';
  for (let i = stopTimeUpdates.length - 1; i >= 0; i--) {
    const sid = stopTimeUpdates[i]?.stopId?.trim();
    if (sid) {
      lastStopId = sid;
      break;
    }
  }

  let destination = (lastStopId && meta.stops[lastStopId]) || '';

  if (!destination && metaRoute?.destination) {
    destination = metaRoute.destination;
  }
  if (!destination && CERCANIAS_LINES[line]?.destination) {
    destination = CERCANIAS_LINES[line].destination as string;
  }
  if (!destination) {
    destination = line;
  }

  let origin = metaRoute?.origin || undefined;
  if (!origin && stopTimeUpdates.length > 0) {
    const firstStopId = stopTimeUpdates[0]?.stopId?.trim();
    const firstStopName = firstStopId ? meta.stops[firstStopId] : undefined;
    if (firstStopName && firstStopName !== destination) {
      origin = firstStopName;
    }
  }

  return { origin, destination };
}

function formatArrivalEta(etaMinutes: number | null, isCanceled: boolean): string {
  if (isCanceled) {
    return 'Suprimido';
  }
  if (etaMinutes === null) {
    return 'Sin estimación';
  }
  if (etaMinutes <= 0) {
    return 'Llegando';
  }
  return `${etaMinutes} min`;
}

function computeDelayMinutes(delaySeconds: number | undefined): number {
  if (delaySeconds === undefined || !Number.isFinite(delaySeconds)) {
    return 0;
  }
  if (Math.abs(delaySeconds) < 60) {
    return 0;
  }
  return Math.round(delaySeconds / 60);
}

function deriveArrivalStatus(
  isCanceled: boolean,
  delayMinutes: number
): 'EN_HORA' | 'RETRASO' | 'SUPRIMIDO' {
  if (isCanceled) {
    return 'SUPRIMIDO';
  }
  if (delayMinutes >= 1) {
    return 'RETRASO';
  }
  return 'EN_HORA';
}

function isAlertActive(alert: GtfsRtAlert, nowSec: number): boolean {
  const periods = alert.activePeriod;
  if (!Array.isArray(periods) || periods.length === 0) {
    return true;
  }
  return periods.some((period) => {
    const start = parseUnixSeconds(period.start);
    const end = parseUnixSeconds(period.end);
    if (start !== undefined && nowSec < start) return false;
    if (end !== undefined && nowSec > end) return false;
    return true;
  });
}

function extractLinesFromAlertText(text: string): string[] {
  const lines = new Set<string>();
  const hashtagMatches = text.matchAll(/#Mad(C(?:10|[1-9][ab]?))\b/gi);
  for (const m of hashtagMatches) {
    const norm = normalizeCercaniasLineKey(m[1]);
    if (CERCANIAS_LINES[norm]) {
      lines.add(norm);
    }
  }

  const proseMatches = text.matchAll(/\bL[ií]nea\s+(C-?(?:10|[1-9][ab]?))\b/gi);
  for (const m of proseMatches) {
    const norm = normalizeCercaniasLineKey(m[1]);
    if (CERCANIAS_LINES[norm]) {
      lines.add(norm);
    }
  }

  return Array.from(lines);
}

function inferAlertSeverity(text: string): 'info' | 'warning' | 'severe' {
  const lower = text.toLowerCase();
  if (
    /suprimid|suspendid|interrumpid|cortad|sin servicio|descarril|cierre/.test(lower)
  ) {
    return 'severe';
  }
  if (
    /retraso|demora|modificad|obras|incidencia|afectad|desv[ií]o|aver[ií]a/.test(lower)
  ) {
    return 'warning';
  }
  return 'info';
}

function sortLineCodes(lines: string[]): string[] {
  return [...lines].sort((a, b) => {
    const ma = a.match(/^C(\d+)([ab]?)$/i);
    const mb = b.match(/^C(\d+)([ab]?)$/i);
    if (ma && mb) {
      const diff = Number(ma[1]) - Number(mb[1]);
      if (diff !== 0) return diff;
      return ma[2].localeCompare(mb[2]);
    }
    return a.localeCompare(b);
  });
}

/**
 * Normalizes live train positions from Renfe GTFS-RT VehiclePositions feed (Núcleo 10 only).
 */
export function parseCercaniasTrainPositions(
  vehicleFeed: GtfsRtFeed | null | undefined,
  meta: CercaniasMeta,
  nowMs: number = Date.now()
): CercaniasTrainPosition[] {
  const entities = vehicleFeed?.entity;
  if (!Array.isArray(entities) || entities.length === 0) {
    return [];
  }

  const headerTs = parseUnixSeconds(vehicleFeed?.header?.timestamp);
  const fallbackTs = headerTs ?? Math.floor(nowMs / 1000);
  const positions: CercaniasTrainPosition[] = [];

  for (const entity of entities) {
    if (!isMadridCercaniasEntity(entity, meta) || !entity.vehicle) {
      continue;
    }

    const v = entity.vehicle;
    const lat = v.position?.latitude;
    const lon = v.position?.longitude;
    if (
      typeof lat !== 'number' ||
      typeof lon !== 'number' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      continue;
    }

    const tripId = v.trip?.tripId?.trim() || '';
    const routeId = v.trip?.routeId?.trim() || undefined;
    const label = v.vehicle?.label?.trim() || undefined;
    const stopId = v.stopId?.trim() || undefined;
    const line = resolveCercaniasLine(routeId, tripId, label, meta);
    const platform = extractPlatformFromLabel(label);
    const stopName = stopId ? meta.stops[stopId] : undefined;
    const timestamp = parseUnixSeconds(v.timestamp) ?? fallbackTs;
    const vehicleId = v.vehicle?.id?.trim() || tripId || entity.id || '';

    positions.push({
      vehicleId,
      ...(label ? { label } : {}),
      tripId,
      ...(routeId ? { routeId } : {}),
      line,
      lat,
      lon,
      ...(v.currentStatus ? { currentStatus: v.currentStatus } : {}),
      ...(stopId ? { stopId } : {}),
      ...(stopName ? { stopName } : {}),
      ...(platform ? { platform } : {}),
      timestamp,
    });
  }

  return positions;
}

/**
 * Normalizes active Madrid Cercanías service alerts from Renfe GTFS-RT Alerts feed.
 */
export function parseCercaniasAlerts(
  alertsFeed: GtfsRtFeed | null | undefined,
  meta: CercaniasMeta,
  nowMs: number = Date.now()
): CercaniasAlert[] {
  const entities = alertsFeed?.entity;
  if (!Array.isArray(entities) || entities.length === 0) {
    return [];
  }

  const nowSec = Math.floor(nowMs / 1000);
  const alerts: CercaniasAlert[] = [];

  for (const entity of entities) {
    if (!isMadridCercaniasEntity(entity, meta) || !entity.alert) {
      continue;
    }

    const alert = entity.alert;
    if (!isAlertActive(alert, nowSec)) {
      continue;
    }

    const header = getTranslatedText(alert.headerText);
    const description = getTranslatedText(alert.descriptionText) || header;
    if (!description) {
      continue;
    }

    const linesSet = new Set<string>();
    const routeIdsSet = new Set<string>();
    const stopIdsSet = new Set<string>();

    for (const ie of alert.informedEntity ?? []) {
      const rId = ie.routeId?.trim() || ie.trip?.routeId?.trim();
      if (rId && isMadridRouteId(rId, meta)) {
        routeIdsSet.add(rId);
        const resolved = resolveCercaniasLine(rId, ie.trip?.tripId, undefined, meta);
        if (resolved !== 'C') {
          linesSet.add(resolved);
        }
      }
      const sId = ie.stopId?.trim();
      if (sId && meta.stops[sId]) {
        stopIdsSet.add(sId);
      }
    }

    for (const textLine of extractLinesFromAlertText(`${header} ${description}`)) {
      linesSet.add(textLine);
    }

    let activeFrom: number | undefined;
    let activeUntil: number | undefined;
    if (Array.isArray(alert.activePeriod) && alert.activePeriod.length > 0) {
      const matchingPeriod =
        alert.activePeriod.find((p) => {
          const start = parseUnixSeconds(p.start);
          const end = parseUnixSeconds(p.end);
          return (start === undefined || nowSec >= start) && (end === undefined || nowSec <= end);
        }) ?? alert.activePeriod[0];

      activeFrom = parseUnixSeconds(matchingPeriod.start);
      activeUntil = parseUnixSeconds(matchingPeriod.end);
    }

    const routeIds = Array.from(routeIdsSet);
    const stopIds = Array.from(stopIdsSet);

    alerts.push({
      id: entity.id || `alert-${alerts.length + 1}`,
      lines: sortLineCodes(Array.from(linesSet)),
      ...(routeIds.length > 0 ? { routeIds } : {}),
      ...(stopIds.length > 0 ? { stopIds } : {}),
      ...(header ? { header } : {}),
      description,
      severity: inferAlertSeverity(`${header} ${description}`),
      ...(activeFrom !== undefined ? { activeFrom } : {}),
      ...(activeUntil !== undefined ? { activeUntil } : {}),
    });
  }

  return alerts;
}

interface IndexedPlatformEntry {
  platform: string;
  stopId?: string;
  tripId?: string;
  trainId?: string;
}

function buildPlatformLookup(
  vehicleFeed: GtfsRtFeed | null | undefined,
  meta: CercaniasMeta
): {
  byTripId: Map<string, IndexedPlatformEntry[]>;
  byStopId: Map<string, IndexedPlatformEntry[]>;
} {
  const byTripId = new Map<string, IndexedPlatformEntry[]>();
  const byStopId = new Map<string, IndexedPlatformEntry[]>();

  const entities = vehicleFeed?.entity;
  if (!Array.isArray(entities)) {
    return { byTripId, byStopId };
  }

  for (const entity of entities) {
    if (!isMadridCercaniasEntity(entity, meta) || !entity.vehicle) {
      continue;
    }

    const v = entity.vehicle;
    const label = v.vehicle?.label;
    const platform = extractPlatformFromLabel(label);
    if (!platform) {
      continue;
    }

    const tripId = v.trip?.tripId?.trim() || undefined;
    const stopId = v.stopId?.trim() || undefined;
    const trainId = extractTrainIdFromLabel(label) || v.vehicle?.id?.trim() || undefined;

    const entry: IndexedPlatformEntry = { platform, stopId, tripId, trainId };

    if (tripId) {
      const list = byTripId.get(tripId) ?? [];
      list.push(entry);
      byTripId.set(tripId, list);
    }

    if (stopId) {
      const list = byStopId.get(stopId) ?? [];
      list.push(entry);
      byStopId.set(stopId, list);
    }
  }

  return { byTripId, byStopId };
}

function matchArrivalPlatform(
  tripId: string,
  trainId: string | undefined,
  targetStopIds: Set<string>,
  lookup: {
    byTripId: Map<string, IndexedPlatformEntry[]>;
    byStopId: Map<string, IndexedPlatformEntry[]>;
  }
): string | undefined {
  if (tripId) {
    const tripEntries = lookup.byTripId.get(tripId) ?? [];
    if (tripEntries.length > 0) {
      // Prefer entry whose stopId matches one of the station's stopIds,
      // then entry without stopId, then first entry matching tripId.
      const exactStopMatch = tripEntries.find((e) => e.stopId && targetStopIds.has(e.stopId));
      if (exactStopMatch) {
        return exactStopMatch.platform;
      }
      const noStopMatch = tripEntries.find((e) => !e.stopId);
      if (noStopMatch) {
        return noStopMatch.platform;
      }
      return tripEntries[0].platform;
    }
  }

  // Fallback by stopId + trainId if tripId was absent on vehicle
  for (const sid of targetStopIds) {
    const stopEntries = lookup.byStopId.get(sid) ?? [];
    for (const entry of stopEntries) {
      if (entry.tripId && tripId && entry.tripId !== tripId) {
        continue;
      }
      if (trainId && entry.trainId && entry.trainId === trainId) {
        return entry.platform;
      }
      if (!entry.tripId && !trainId) {
        return entry.platform;
      }
    }
  }

  return undefined;
}

function filterAlertsForStation(
  allAlerts: CercaniasAlert[],
  targetStopIds: Set<string>,
  stationLines: Set<string>
): CercaniasAlert[] {
  return allAlerts.filter((alert) => {
    const hasScopedStops = Array.isArray(alert.stopIds) && alert.stopIds.length > 0;
    const hasScopedLines = alert.lines.length > 0;

    if (hasScopedStops && alert.stopIds!.some((sid) => targetStopIds.has(sid))) {
      return true;
    }

    if (hasScopedStops) {
      // Alert is explicitly scoped to other stops
      return false;
    }

    if (hasScopedLines) {
      if (stationLines.size === 0) {
        return true;
      }
      return alert.lines.some((line) => stationLines.has(line.toUpperCase()));
    }

    // Network-wide Madrid alert (no stop or line filter)
    return true;
  });
}

/**
 * Builds a complete CercaniasStationResponse from Renfe GTFS-RT feeds and static metadata.
 * - Filters strictly to Madrid Núcleo 10
 * - Supports multiple GTFS stop_id aliases per station (e.g. Vallecas ["70005", "70001"])
 * - Filters arrivals within [-2 min, +120 min] and sorts ascending by etaMinutes
 * - Resolves line, destination, delay, status (EN_HORA/RETRASO/SUPRIMIDO), and platform
 */
export function buildCercaniasStationResponse(
  target: CercaniasStationTarget,
  meta: CercaniasMeta,
  feeds: CercaniasRawFeeds,
  options: BuildCercaniasOptions = {}
): CercaniasStationResponse {
  const nowMs = options.nowMs ?? Date.now();
  const nowSec = nowMs / 1000;
  const maxPastSeconds = options.maxPastSeconds ?? DEFAULT_MAX_PAST_SECONDS;
  const maxFutureSeconds = options.maxFutureSeconds ?? DEFAULT_MAX_FUTURE_SECONDS;
  const staleThresholdSeconds =
    options.staleThresholdSeconds ?? DEFAULT_STALE_THRESHOLD_SECONDS;

  const targetStopIds = new Set<string>(
    [target.stationId, ...(target.stopIds ?? [])].map((s) => s.trim()).filter(Boolean)
  );

  const stationName =
    target.stationName?.trim() || meta.stops[target.stationId] || target.stationId;

  const platformLookup = buildPlatformLookup(feeds.vehiclePositions, meta);

  interface SortableArrival {
    arrival: CercaniasArrival;
    sortTimeSec: number;
  }

  const sortableArrivals: SortableArrival[] = [];
  const tripEntities = feeds.tripUpdates?.entity ?? [];

  for (const entity of tripEntities) {
    if (!isMadridCercaniasEntity(entity, meta) || !entity.tripUpdate) {
      continue;
    }

    const tripUpdate = entity.tripUpdate;
    const trip = tripUpdate.trip;
    const stopTimeUpdates = tripUpdate.stopTimeUpdate ?? [];
    if (stopTimeUpdates.length === 0) {
      continue;
    }

    const matchingStus = stopTimeUpdates.filter(
      (stu) => stu.stopId && targetStopIds.has(stu.stopId.trim())
    );
    if (matchingStus.length === 0) {
      continue;
    }

    const tripId = trip?.tripId?.trim() || entity.id || '';
    const routeId = trip?.routeId?.trim() || undefined;
    const label = tripUpdate.vehicle?.label?.trim() || undefined;
    const line = resolveCercaniasLine(routeId, tripId, label, meta);
    const { origin, destination } = resolveTripEndpoints(
      routeId,
      line,
      stopTimeUpdates,
      meta
    );

    const vehicleTrainId = tripId
      ? platformLookup.byTripId.get(tripId)?.find((e) => e.trainId)?.trainId
      : undefined;
    const tripIdTrainMatch = tripId.match(/[A-Za-z](\d{4,6})(?:C(?:10|[1-9][ab]?))?$/i);
    const trainId =
      extractTrainIdFromLabel(label) ||
      tripUpdate.vehicle?.id?.trim() ||
      vehicleTrainId ||
      (tripIdTrainMatch ? tripIdTrainMatch[1] : undefined);

    const platform =
      extractPlatformFromLabel(label) ||
      matchArrivalPlatform(tripId, trainId, targetStopIds, platformLookup);

    const tripCanceled = trip?.scheduleRelationship === 'CANCELED';

    for (const stu of matchingStus) {
      const stopCanceled = stu.scheduleRelationship === 'SKIPPED';
      const isCanceled = tripCanceled || stopCanceled;

      const eventTimeSec =
        parseUnixSeconds(stu.arrival?.time) ?? parseUnixSeconds(stu.departure?.time);

      if (eventTimeSec !== undefined) {
        const diffSec = eventTimeSec - nowSec;
        if (diffSec < -maxPastSeconds || diffSec > maxFutureSeconds) {
          continue;
        }
      } else if (!isCanceled) {
        // Non-canceled stop without any predicted time cannot provide an ETA
        continue;
      }

      const rawDelay =
        stu.arrival?.delay ?? stu.departure?.delay ?? tripUpdate.delay;
      const delaySeconds =
        typeof rawDelay === 'number' && Number.isFinite(rawDelay)
          ? Math.round(rawDelay)
          : undefined;
      const delayMinutes = computeDelayMinutes(delaySeconds);
      const status = deriveArrivalStatus(isCanceled, delayMinutes);

      const etaMinutes =
        eventTimeSec !== undefined
          ? Math.max(0, Math.round((eventTimeSec - nowSec) / 60))
          : null;
      const eta = formatArrivalEta(etaMinutes, isCanceled);

      const estimatedTime =
        eventTimeSec !== undefined
          ? new Date(eventTimeSec * 1000).toISOString()
          : undefined;
      const scheduledTime =
        eventTimeSec !== undefined && delaySeconds !== undefined
          ? new Date((eventTimeSec - delaySeconds) * 1000).toISOString()
          : undefined;

      const arrival: CercaniasArrival = {
        tripId,
        ...(routeId ? { routeId } : {}),
        line,
        destination,
        ...(origin ? { origin } : {}),
        ...(scheduledTime ? { scheduledTime } : {}),
        ...(estimatedTime ? { estimatedTime } : {}),
        etaMinutes,
        eta,
        ...(delaySeconds !== undefined ? { delaySeconds } : {}),
        delayMinutes,
        status,
        ...(isCanceled ? { isCanceled: true } : {}),
        ...(platform ? { platform } : {}),
        ...(trainId ? { trainId } : {}),
        isRealtime: true,
      };

      sortableArrivals.push({
        arrival,
        sortTimeSec: eventTimeSec ?? Number.MAX_SAFE_INTEGER,
      });
    }
  }

  sortableArrivals.sort((a, b) => {
    const aMin = a.arrival.etaMinutes ?? Number.MAX_SAFE_INTEGER;
    const bMin = b.arrival.etaMinutes ?? Number.MAX_SAFE_INTEGER;
    if (aMin !== bMin) return aMin - bMin;
    if (a.sortTimeSec !== b.sortTimeSec) return a.sortTimeSec - b.sortTimeSec;
    return a.arrival.line.localeCompare(b.arrival.line);
  });

  const arrivals = sortableArrivals.map((item) => item.arrival);

  const stationLines = new Set<string>(
    [...(target.lines ?? []), ...arrivals.map((a) => a.line)].map((l) => l.toUpperCase())
  );
  const allAlerts = parseCercaniasAlerts(feeds.alerts, meta, nowMs);
  const alerts = filterAlertsForStation(allAlerts, targetStopIds, stationLines);

  const feedTimestamp = parseUnixSeconds(feeds.tripUpdates?.header?.timestamp);
  const isStale = isFeedStale(
    feeds.tripUpdates?.header?.timestamp,
    nowMs,
    staleThresholdSeconds
  );

  const trains = options.includeTrains
    ? parseCercaniasTrainPositions(feeds.vehiclePositions, meta, nowMs)
    : undefined;

  return {
    stationId: target.stationId,
    stationName,
    arrivals,
    alerts,
    ...(trains !== undefined ? { trains } : {}),
    timestamp: nowMs,
    ...(feedTimestamp !== undefined ? { feedTimestamp } : {}),
    isStale,
    source: 'realtime',
  };
}

/**
 * Builds a compact overview response of all live Madrid Cercanías trains and active alerts.
 */
export function buildCercaniasTrainsResponse(
  meta: CercaniasMeta,
  feeds: Pick<CercaniasRawFeeds, 'vehiclePositions' | 'alerts'>,
  options: Pick<BuildCercaniasOptions, 'nowMs' | 'staleThresholdSeconds'> = {}
): CercaniasTrainsResponse {
  const nowMs = options.nowMs ?? Date.now();
  const staleThresholdSeconds =
    options.staleThresholdSeconds ?? DEFAULT_STALE_THRESHOLD_SECONDS;

  const trains = parseCercaniasTrainPositions(feeds.vehiclePositions, meta, nowMs);
  const alerts = parseCercaniasAlerts(feeds.alerts, meta, nowMs);
  const feedTimestamp = parseUnixSeconds(feeds.vehiclePositions?.header?.timestamp);
  const isStale = isFeedStale(
    feeds.vehiclePositions?.header?.timestamp,
    nowMs,
    staleThresholdSeconds
  );

  return {
    trains,
    alerts,
    timestamp: nowMs,
    ...(feedTimestamp !== undefined ? { feedTimestamp } : {}),
    isStale,
  };
}

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import cercaniasMetaJson from '../../../public/data/cercanias_meta.json';
import type { CercaniasMeta, GtfsRtFeed } from '../../types/cercanias';
import {
  buildCercaniasStationResponse,
  buildCercaniasTrainsResponse,
  extractPlatformFromLabel,
  isFeedStale,
  isMadridCercaniasEntity,
  parseCercaniasAlerts,
  parseCercaniasTrainPositions,
  resolveCercaniasLine,
} from '../cercaniasParser';
import { fetchCercaniasEstimates, fetchCercaniasTrains } from '../cercaniasApi';

const metaData = cercaniasMetaJson as CercaniasMeta;

const NOW_SEC = 1794550000;
const NOW_MS = NOW_SEC * 1000;

function createMockTripUpdatesFeed(
  overrides: Partial<GtfsRtFeed> = {}
): GtfsRtFeed {
  return {
    header: {
      gtfsRealtimeVersion: '2.0',
      timestamp: String(NOW_SEC - 20),
    },
    entity: [
      // 1. Madrid C5 arriving at Atocha (18000) in 4 min, on time, terminus Humanes (35012)
      {
        id: 'TU_C5_ON_TIME',
        tripUpdate: {
          trip: {
            tripId: '1016V20703C5',
            routeId: '10T0017C5',
            scheduleRelationship: 'SCHEDULED',
          },
          delay: 0,
          stopTimeUpdate: [
            {
              stopId: '35607',
              departure: { time: String(NOW_SEC - 1800), delay: 0 },
            },
            {
              stopId: '18000',
              arrival: { time: String(NOW_SEC + 240), delay: 0 },
              departure: { time: String(NOW_SEC + 270), delay: 0 },
            },
            {
              stopId: '35012',
              arrival: { time: String(NOW_SEC + 1800), delay: 0 },
            },
          ],
        },
      },
      // 2. Madrid C4a arriving at Atocha (18000) in 9 min, delayed +3 min (180s), terminus Parla (37012)
      {
        id: 'TU_C4A_DELAYED',
        tripUpdate: {
          trip: {
            tripId: '1016V10402C4a',
            routeId: '10T0013C4a',
            scheduleRelationship: 'SCHEDULED',
          },
          stopTimeUpdate: [
            {
              stopId: '19003',
              departure: { time: String(NOW_SEC - 1500), delay: 180 },
            },
            {
              stopId: '18000',
              arrival: { time: String(NOW_SEC + 540), delay: 180 },
            },
            {
              stopId: '37012',
              arrival: { time: String(NOW_SEC + 1900), delay: 180 },
            },
          ],
        },
      },
      // 3. Madrid C10 arriving at Atocha (18000) in 1 min (SKIPPED -> SUPRIMIDO), no routeId!
      {
        id: 'TU_C10_SKIPPED',
        tripUpdate: {
          trip: {
            tripId: '1016V30101C10',
          },
          stopTimeUpdate: [
            {
              stopId: '18000',
              arrival: { time: String(NOW_SEC + 60) },
              scheduleRelationship: 'SKIPPED',
            },
            {
              stopId: '98305',
              arrival: { time: String(NOW_SEC + 1500) },
            },
          ],
        },
      },
      // 4. Madrid C2 CANCELED trip at Atocha (18000) in 15 min -> SUPRIMIDO
      {
        id: 'TU_C2_CANCELED',
        tripUpdate: {
          trip: {
            tripId: '1016V20099C2',
            routeId: '10T0005C2',
            scheduleRelationship: 'CANCELED',
          },
          stopTimeUpdate: [
            {
              stopId: '18000',
              arrival: { time: String(NOW_SEC + 900) },
            },
            {
              stopId: '17000',
              arrival: { time: String(NOW_SEC + 1600) },
            },
          ],
        },
      },
      // 5. Past Madrid train (> 2 min ago, should be filtered out)
      {
        id: 'TU_C5_PAST',
        tripUpdate: {
          trip: {
            tripId: '1016V20700C5',
            routeId: '10T0017C5',
          },
          stopTimeUpdate: [
            {
              stopId: '18000',
              arrival: { time: String(NOW_SEC - 180) },
            },
            {
              stopId: '35012',
              arrival: { time: String(NOW_SEC + 900) },
            },
          ],
        },
      },
      // 6. Far future Madrid train (> 120 min ahead, should be filtered out)
      {
        id: 'TU_C3_TOO_FAR',
        tripUpdate: {
          trip: {
            tripId: '1016V30999C3',
            routeId: '10T0007C3',
          },
          stopTimeUpdate: [
            {
              stopId: '18000',
              arrival: { time: String(NOW_SEC + 7500) },
            },
            {
              stopId: '60200',
              arrival: { time: String(NOW_SEC + 10000) },
            },
          ],
        },
      },
      // 7. Barcelona Rodalies train (30...) -> MUST be ignored even if somehow queried
      {
        id: 'TU_BCN_30',
        tripUpdate: {
          trip: {
            tripId: '3016V12345R1',
            routeId: '30T0001R1',
          },
          stopTimeUpdate: [
            {
              stopId: '18000', // Even with colliding/malformed stopId, routeId 30T excludes it
              arrival: { time: String(NOW_SEC + 120) },
            },
          ],
        },
      },
      // 8. Sevilla Cercanías train (50...) without routeId -> MUST be ignored
      {
        id: 'TU_SVQ_50',
        tripUpdate: {
          trip: {
            tripId: '5016V54321C1',
          },
          stopTimeUpdate: [
            {
              stopId: '51003',
              arrival: { time: String(NOW_SEC + 120) },
            },
          ],
        },
      },
    ],
    ...overrides,
  };
}

function createMockVehiclePositionsFeed(
  overrides: Partial<GtfsRtFeed> = {}
): GtfsRtFeed {
  return {
    header: {
      gtfsRealtimeVersion: '2.0',
      timestamp: String(NOW_SEC - 15),
    },
    entity: [
      {
        id: 'VP_C5_20703',
        vehicle: {
          trip: {
            tripId: '1016V20703C5',
            routeId: '10T0017C5',
          },
          position: {
            latitude: 40.4052,
            longitude: -3.6899,
          },
          currentStatus: 'INCOMING_AT',
          stopId: '18000',
          timestamp: String(NOW_SEC - 10),
          vehicle: {
            id: '20703',
            label: 'C5-20703-PLATF.(1)',
          },
        },
      },
      {
        id: 'VP_C4A_10402',
        vehicle: {
          trip: {
            tripId: '1016V10402C4a',
          },
          position: {
            latitude: 40.4169,
            longitude: -3.7029,
          },
          currentStatus: 'STOPPED_AT',
          stopId: '18101',
          timestamp: String(NOW_SEC - 5),
          vehicle: {
            id: '10402',
            label: 'C4a-10402-PLATF.(2B)',
          },
        },
      },
      // Barcelona vehicle -> MUST be excluded
      {
        id: 'VP_BCN_30',
        vehicle: {
          trip: {
            tripId: '3016V12345R1',
            routeId: '30T0001R1',
          },
          position: {
            latitude: 41.3851,
            longitude: 2.1734,
          },
          stopId: '71801',
          vehicle: {
            id: '99999',
            label: 'R1-99999-PLATF.(4)',
          },
        },
      },
    ],
    ...overrides,
  };
}

function createMockAlertsFeed(overrides: Partial<GtfsRtFeed> = {}): GtfsRtFeed {
  return {
    header: {
      gtfsRealtimeVersion: '2.0',
      timestamp: String(NOW_SEC - 30),
    },
    entity: [
      // Madrid C5 alert via routeId + #MadC5
      {
        id: 'AVISO_MAD_C5',
        alert: {
          activePeriod: [{ start: String(NOW_SEC - 3600) }],
          informedEntity: [{ routeId: '10T0017C5' }, { routeId: '10T0018C5' }],
          descriptionText: {
            translation: [
              {
                text: '#MadC5 Por obras de mejora, frecuencias de paso modificadas en la línea C-5.',
                language: 'es',
              },
            ],
          },
        },
      },
      // Madrid alert detected only via #MadC4a hashtag in text
      {
        id: 'AVISO_MAD_TEXT',
        alert: {
          activePeriod: [{ start: String(NOW_SEC - 600), end: String(NOW_SEC + 3600) }],
          informedEntity: [],
          headerText: {
            translation: [{ text: 'Incidencia #MadC4a', language: 'es' }],
          },
          descriptionText: {
            translation: [
              {
                text: 'Demoras puntuales por avería en señalización.',
                language: 'es',
              },
            ],
          },
        },
      },
      // Madrid stop-scoped alert for Vallecas (70001)
      {
        id: 'AVISO_VALLECAS_STOP',
        alert: {
          activePeriod: [{ start: String(NOW_SEC - 600) }],
          informedEntity: [{ stopId: '70001' }],
          descriptionText: {
            translation: [{ text: 'Ascensor fuera de servicio en Vallecas.', language: 'es' }],
          },
        },
      },
      // Expired Madrid alert -> must be filtered out
      {
        id: 'AVISO_EXPIRED',
        alert: {
          activePeriod: [
            { start: String(NOW_SEC - 7200), end: String(NOW_SEC - 100) },
          ],
          informedEntity: [{ routeId: '10T0017C5' }],
          descriptionText: {
            translation: [{ text: '#MadC5 Incidencia resuelta.', language: 'es' }],
          },
        },
      },
      // Barcelona alert -> must be excluded
      {
        id: 'AVISO_BCN',
        alert: {
          activePeriod: [{ start: String(NOW_SEC - 3600) }],
          informedEntity: [{ routeId: '30T0001R1' }],
          descriptionText: {
            translation: [{ text: '#RodR1 Demoras en Barcelona.', language: 'es' }],
          },
        },
      },
    ],
    ...overrides,
  };
}

describe('Hito 2: Cercanías Madrid GTFS-RT Parser, Serverless API & Client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // =========================================================================
  // 1. PURE PARSER UTILITIES
  // =========================================================================
  describe('Pure Parser Helpers (cercaniasParser.ts)', () => {
    it('extracts platform numbers from Renfe vehicle labels and ignores empty placeholders', () => {
      expect(extractPlatformFromLabel('C5-20703-PLATF.(1)')).toBe('1');
      expect(extractPlatformFromLabel('C4a-10402-PLATF.(2B)')).toBe('2B');
      expect(extractPlatformFromLabel('C2-11111-PLATF. (10)')).toBe('10');
      expect(extractPlatformFromLabel('C5-20703-PLATF.()')).toBeUndefined();
      expect(extractPlatformFromLabel('C5-20703-PLATF.(?)')).toBeUndefined();
      expect(extractPlatformFromLabel('C5-20703-PLATF.(-)')).toBeUndefined();
      expect(extractPlatformFromLabel(undefined)).toBeUndefined();
    });

    it('resolves canonical Cercanías Madrid line codes from routeId and tripId', () => {
      expect(resolveCercaniasLine(undefined, '1016V20703C5', undefined, metaData)).toBe('C5');
      expect(resolveCercaniasLine('10T0013C4a', '1016V10402C4a', undefined, metaData)).toBe('C4a');
      expect(resolveCercaniasLine('10T0003C10', undefined, undefined, metaData)).toBe('C10');
      expect(resolveCercaniasLine('10T0087C8b', undefined, undefined, metaData)).toBe('C8b');
      expect(resolveCercaniasLine(undefined, undefined, 'C7-21500-PLATF.(3)', metaData)).toBe('C7');
    });

    it('strictly filters entities to Madrid Núcleo 10 and rejects other nuclei (30..., 50...)', () => {
      const tripFeed = createMockTripUpdatesFeed();
      const entities = tripFeed.entity!;

      expect(isMadridCercaniasEntity(entities[0], metaData)).toBe(true); // 10T0017C5
      expect(isMadridCercaniasEntity(entities[2], metaData)).toBe(true); // tripId 1016V30101C10
      expect(isMadridCercaniasEntity(entities[6], metaData)).toBe(false); // 30T0001R1 Barcelona
      expect(isMadridCercaniasEntity(entities[7], metaData)).toBe(false); // 5016V54321C1 Sevilla
    });

    it('detects stale feeds (> 300s old) and treats fresh, future, or missing timestamps as non-stale', () => {
      expect(isFeedStale(String(NOW_SEC - 301), NOW_MS)).toBe(true);
      expect(isFeedStale(NOW_SEC - 400, NOW_MS)).toBe(true);
      expect(isFeedStale(String(NOW_SEC - 300), NOW_MS)).toBe(false);
      expect(isFeedStale(String(NOW_SEC - 30), NOW_MS)).toBe(false);
      expect(isFeedStale(String(NOW_SEC + 120), NOW_MS)).toBe(false); // Future timestamp
      expect(isFeedStale(undefined, NOW_MS)).toBe(false);
    });
  });

  // =========================================================================
  // 2. ARRIVALS, DELAYS, CANCELLATIONS, PLATFORMS & STATION ALIASES
  // =========================================================================
  describe('buildCercaniasStationResponse', () => {
    it('normalizes arrivals, delays, SKIPPED/CANCELED status, platforms, destinations and sorts by ETA', () => {
      const response = buildCercaniasStationResponse(
        {
          stationId: '18000',
          stationName: 'Madrid-Atocha Cercanías',
          stopIds: ['18000'],
          lines: ['C1', 'C2', 'C3', 'C4', 'C4a', 'C4b', 'C5', 'C7', 'C10'],
        },
        metaData,
        {
          tripUpdates: createMockTripUpdatesFeed(),
          vehiclePositions: createMockVehiclePositionsFeed(),
          alerts: createMockAlertsFeed(),
        },
        { nowMs: NOW_MS }
      );

      expect(response.stationId).toBe('18000');
      expect(response.stationName).toBe('Madrid-Atocha Cercanías');
      expect(response.isStale).toBe(false);
      expect(response.source).toBe('realtime');

      // Should include only the 4 valid in-window Madrid trains (filters out past, >2h, Barcelona, Sevilla)
      expect(response.arrivals).toHaveLength(4);

      // Sorted ascending by etaMinutes: 1 min (C10 SKIPPED), 4 min (C5), 9 min (C4a), 15 min (C2 CANCELED)
      expect(response.arrivals.map((a) => a.line)).toEqual(['C10', 'C5', 'C4a', 'C2']);

      const [c10, c5, c4a, c2] = response.arrivals;

      // SKIPPED stop -> SUPRIMIDO
      expect(c10.etaMinutes).toBe(1);
      expect(c10.eta).toBe('Suprimido');
      expect(c10.status).toBe('SUPRIMIDO');
      expect(c10.isCanceled).toBe(true);
      expect(c10.destination).toBe('Madrid-Aeropuerto T4');

      // On-time C5 with platform from vehicle_positions
      expect(c5.etaMinutes).toBe(4);
      expect(c5.eta).toBe('4 min');
      expect(c5.delayMinutes).toBe(0);
      expect(c5.status).toBe('EN_HORA');
      expect(c5.destination).toBe('Humanes');
      expect(c5.origin).toBe('Móstoles-El Soto');
      expect(c5.platform).toBe('1');
      expect(c5.trainId).toBe('20703');

      // Delayed C4a (+180s = 3 min) with platform from vehicle_positions (matched by tripId)
      expect(c4a.etaMinutes).toBe(9);
      expect(c4a.eta).toBe('9 min');
      expect(c4a.delaySeconds).toBe(180);
      expect(c4a.delayMinutes).toBe(3);
      expect(c4a.status).toBe('RETRASO');
      expect(c4a.destination).toBe('Parla');
      expect(c4a.platform).toBe('2B');

      // CANCELED trip -> SUPRIMIDO
      expect(c2.etaMinutes).toBe(15);
      expect(c2.eta).toBe('Suprimido');
      expect(c2.status).toBe('SUPRIMIDO');
      expect(c2.isCanceled).toBe(true);
      expect(c2.destination).toBe('Madrid-Chamartín-Clara Campoamor');

      // Alerts: C5 + C4a included, Vallecas-only stop alert & Barcelona & expired excluded
      expect(response.alerts.map((a) => a.id)).toEqual(['AVISO_MAD_C5', 'AVISO_MAD_TEXT']);
    });

    it('formats arriving trains (etaMinutes === 0) as "Llegando" and falls back to meta.routes destination when last stopId is unknown', () => {
      const feed: GtfsRtFeed = {
        header: { timestamp: String(NOW_SEC) },
        entity: [
          {
            id: 'TU_ARRIVING',
            tripUpdate: {
              trip: {
                tripId: '1016V20799C5',
                routeId: '10T0017C5',
              },
              stopTimeUpdate: [
                {
                  stopId: '18000',
                  arrival: { time: String(NOW_SEC + 15), delay: 20 }, // < 60s delay => EN_HORA
                },
                {
                  stopId: '99999', // Unknown stopId -> falls back to meta.routes["10T0017C5"].destination
                  arrival: { time: String(NOW_SEC + 1200) },
                },
              ],
            },
          },
        ],
      };

      const res = buildCercaniasStationResponse(
        { stationId: '18000' },
        metaData,
        { tripUpdates: feed },
        { nowMs: NOW_MS }
      );

      expect(res.arrivals).toHaveLength(1);
      expect(res.arrivals[0].etaMinutes).toBe(0);
      expect(res.arrivals[0].eta).toBe('Llegando');
      expect(res.arrivals[0].delayMinutes).toBe(0);
      expect(res.arrivals[0].status).toBe('EN_HORA');
      expect(res.arrivals[0].destination).toBe('Humanes');
    });

    it('merges arrivals across multiple stopId aliases (e.g. Vallecas ["70005", "70001"])', () => {
      const feed: GtfsRtFeed = {
        header: { timestamp: String(NOW_SEC - 10) },
        entity: [
          {
            id: 'TU_VALLECAS_70005',
            tripUpdate: {
              trip: { tripId: '1016V11111C2', routeId: '10T0005C2' },
              stopTimeUpdate: [
                { stopId: '70005', arrival: { time: String(NOW_SEC + 480) } },
                { stopId: '17000', arrival: { time: String(NOW_SEC + 1500) } },
              ],
            },
          },
          {
            id: 'TU_VALLECAS_70001',
            tripUpdate: {
              trip: { tripId: '1016V22222C7', routeId: '10T0059C7' },
              stopTimeUpdate: [
                { stopId: '70001', arrival: { time: String(NOW_SEC + 180) } },
                { stopId: '70103', arrival: { time: String(NOW_SEC + 1800) } },
              ],
            },
          },
        ],
      };

      const res = buildCercaniasStationResponse(
        {
          stationId: '70005',
          stationName: 'Vallecas',
          stopIds: ['70005', '70001'],
          lines: ['C2', 'C7'],
        },
        metaData,
        {
          tripUpdates: feed,
          alerts: createMockAlertsFeed(),
        },
        { nowMs: NOW_MS }
      );

      expect(res.arrivals).toHaveLength(2);
      expect(res.arrivals[0].line).toBe('C7');
      expect(res.arrivals[0].etaMinutes).toBe(3);
      expect(res.arrivals[0].destination).toBe('Alcalá de Henares');
      expect(res.arrivals[1].line).toBe('C2');
      expect(res.arrivals[1].etaMinutes).toBe(8);
      expect(res.arrivals[1].destination).toBe('Madrid-Chamartín-Clara Campoamor');

      // Stop-scoped alert for alias 70001 should also match Vallecas!
      expect(res.alerts.map((a) => a.id)).toContain('AVISO_VALLECAS_STOP');
    });

    it('marks response as isStale when header.timestamp is older than 5 minutes', () => {
      const staleFeed = createMockTripUpdatesFeed({
        header: { timestamp: String(NOW_SEC - 420) },
      });

      const res = buildCercaniasStationResponse(
        { stationId: '18000' },
        metaData,
        { tripUpdates: staleFeed },
        { nowMs: NOW_MS }
      );

      expect(res.isStale).toBe(true);
      expect(res.feedTimestamp).toBe(NOW_SEC - 420);
    });
  });

  // =========================================================================
  // 3. LIVE TRAINS & ALERTS PARSERS
  // =========================================================================
  describe('parseCercaniasTrainPositions & parseCercaniasAlerts', () => {
    it('extracts only Madrid Núcleo 10 trains with coordinates, line, platform, and stopName', () => {
      const trains = parseCercaniasTrainPositions(
        createMockVehiclePositionsFeed(),
        metaData,
        NOW_MS
      );

      expect(trains).toHaveLength(2);
      expect(trains[0]).toMatchObject({
        vehicleId: '20703',
        tripId: '1016V20703C5',
        line: 'C5',
        platform: '1',
        stopId: '18000',
        stopName: 'Madrid-Atocha Cercanías',
        currentStatus: 'INCOMING_AT',
      });
      expect(trains[1]).toMatchObject({
        vehicleId: '10402',
        tripId: '1016V10402C4a',
        line: 'C4a',
        platform: '2B',
        stopId: '18101',
        stopName: 'Sol',
      });
    });

    it('builds compact overview via buildCercaniasTrainsResponse', () => {
      const overview = buildCercaniasTrainsResponse(
        metaData,
        {
          vehiclePositions: createMockVehiclePositionsFeed(),
          alerts: createMockAlertsFeed(),
        },
        { nowMs: NOW_MS }
      );

      expect(overview.trains).toHaveLength(2);
      expect(overview.alerts).toHaveLength(3); // C5, C4a, Vallecas (excludes expired & BCN)
      expect(overview.isStale).toBe(false);
      expect(overview.timestamp).toBe(NOW_MS);
    });

    it('parses alerts from routeIds, stopIds, and #MadC hashtags with severity inference', () => {
      const alerts = parseCercaniasAlerts(createMockAlertsFeed(), metaData, NOW_MS);
      expect(alerts).toHaveLength(3);

      expect(alerts[0]).toMatchObject({
        id: 'AVISO_MAD_C5',
        lines: ['C5'],
        severity: 'warning',
      });
      expect(alerts[1]).toMatchObject({
        id: 'AVISO_MAD_TEXT',
        lines: ['C4a'],
        header: 'Incidencia #MadC4a',
      });
      expect(alerts[2]).toMatchObject({
        id: 'AVISO_VALLECAS_STOP',
        stopIds: ['70001'],
      });
    });
  });

  // =========================================================================
  // 4. CLIENT API (src/services/cercaniasApi.ts)
  // =========================================================================
  describe('Client API (cercaniasApi.ts)', () => {
    it('fetchCercaniasEstimates calls /api/cercanias with cache: no-store, stopIds, and cache-buster _t', async () => {
      const mockPayload = {
        stationId: '70005',
        stationName: 'Vallecas',
        arrivals: [
          {
            tripId: '1016V11111C2',
            line: 'C2',
            destination: 'Guadalajara',
            etaMinutes: 5,
            eta: '5 min',
            delayMinutes: 0,
            status: 'EN_HORA',
            isRealtime: true,
          },
        ],
        alerts: [],
        timestamp: NOW_MS,
        isStale: false,
        source: 'realtime',
      };

      const fetchSpy = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      globalThis.fetch = fetchSpy;

      const result = await fetchCercaniasEstimates('70005', ['70005', '70001']);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toContain('/api/cercanias?');
      expect(calledUrl).toContain('station=70005');
      expect(calledUrl).toContain('stopIds=70005%2C70001');
      expect(calledUrl).toMatch(/_t=\d+/);
      expect(init.cache).toBe('no-store');

      expect(result.stationName).toBe('Vallecas');
      expect(result.arrivals).toHaveLength(1);
      expect(result.arrivals[0].line).toBe('C2');
    });

    it('fetchCercaniasEstimates throws descriptive errors for empty ID, HTTP 502, and invalid payloads', async () => {
      await expect(fetchCercaniasEstimates('   ')).rejects.toThrow(
        /obligatorio/i
      );

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Renfe upstream unavailable' }), {
          status: 502,
        })
      );
      await expect(fetchCercaniasEstimates('18000')).rejects.toThrow(
        'Renfe upstream unavailable'
      );

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response('<html>fallback</html>', { status: 200 })
      );
      await expect(fetchCercaniasEstimates('18000')).rejects.toThrow();
    });

    it('fetchCercaniasTrains calls /api/cercanias?mode=trains with cache: no-store and handles HTTP errors', async () => {
      const fetchSpy = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            trains: [
              {
                vehicleId: '20703',
                tripId: '1016V20703C5',
                line: 'C5',
                lat: 40.4052,
                lon: -3.6899,
                timestamp: NOW_SEC,
              },
            ],
            alerts: [],
            timestamp: NOW_MS,
            isStale: false,
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy;

      const result = await fetchCercaniasTrains();
      const [calledUrl, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toContain('/api/cercanias?');
      expect(calledUrl).toContain('mode=trains');
      expect(calledUrl).toMatch(/_t=\d+/);
      expect(init.cache).toBe('no-store');
      expect(result.trains).toHaveLength(1);

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Vehicle feed error' }), { status: 502 })
      );
      await expect(fetchCercaniasTrains()).rejects.toThrow('Vehicle feed error');
    });
  });
});

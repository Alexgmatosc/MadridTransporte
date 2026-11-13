import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler, { RENFE_GTFS_RT_URLS } from '../cercanias.ts';
import type { GtfsRtFeed } from '../../src/types/cercanias.ts';

function invokeHandler(
  url: string,
  method = 'GET'
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  return new Promise((resolve) => {
    const req = new EventEmitter() as IncomingMessage;
    req.url = url;
    req.method = method;

    const headers: Record<string, string> = {};
    const chunks: string[] = [];

    const mockRes = {
      statusCode: 200,
      headersSent: false,
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      end(chunk?: unknown) {
        mockRes.headersSent = true;
        if (chunk !== undefined) {
          chunks.push(String(chunk));
        }
        resolve({
          statusCode: mockRes.statusCode,
          headers,
          body: chunks.join(''),
        });
      },
    };

    void handler(req, mockRes as unknown as ServerResponse);
  });
}

describe('Hito 2: Vercel Serverless Handler (api/cercanias.ts)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns station arrivals with strict no-store headers and degrades gracefully if alerts/vehicles fail', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const tripFeed: GtfsRtFeed = {
      header: { timestamp: String(nowSec - 15) },
      entity: [
        {
          id: 'LIVE_C5',
          tripUpdate: {
            trip: { tripId: '1016V20703C5', routeId: '10T0017C5' },
            stopTimeUpdate: [
              {
                stopId: '18000',
                arrival: { time: String(nowSec + 300), delay: 0 },
              },
              {
                stopId: '35012',
                arrival: { time: String(nowSec + 1800) },
              },
            ],
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr === RENFE_GTFS_RT_URLS.tripUpdates) {
        return Promise.resolve(
          new Response(JSON.stringify(tripFeed), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(new Response('Upstream timeout', { status: 503 }));
    });

    const res = await invokeHandler('/api/cercanias?station=18000');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers['pragma']).toBe('no-cache');
    expect(res.headers['expires']).toBe('0');

    const json = JSON.parse(res.body) as {
      stationId: string;
      stationName: string;
      arrivals: Array<{ line: string; destination: string }>;
      alerts: unknown[];
      trains?: unknown[];
    };
    expect(json.stationId).toBe('18000');
    expect(json.stationName).toBe('Madrid-Atocha Cercanías');
    expect(json.arrivals).toHaveLength(1);
    expect(json.arrivals[0].line).toBe('C5');
    expect(json.arrivals[0].destination).toBe('Humanes');
    expect(json.alerts).toEqual([]);
    expect(json.trains).toBeUndefined();
  });

  it('resolves Vallecas stopId aliases (70005 and 70001) when querying ?station=70005', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const tripFeed: GtfsRtFeed = {
      header: { timestamp: String(nowSec - 10) },
      entity: [
        {
          id: 'VALLECAS_ALIAS',
          tripUpdate: {
            trip: { tripId: '1016V22222C7', routeId: '10T0059C7' },
            stopTimeUpdate: [
              { stopId: '70001', arrival: { time: String(nowSec + 240) } },
              { stopId: '70103', arrival: { time: String(nowSec + 1800) } },
            ],
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr === RENFE_GTFS_RT_URLS.tripUpdates) {
        return Promise.resolve(new Response(JSON.stringify(tripFeed), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ entity: [] }), { status: 200 }));
    });

    const res = await invokeHandler('/api/cercanias?station=70005');
    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body) as {
      stationName: string;
      arrivals: Array<{ line: string; destination: string }>;
    };
    expect(json.stationName).toBe('Vallecas');
    expect(json.arrivals).toHaveLength(1);
    expect(json.arrivals[0].line).toBe('C7');
    expect(json.arrivals[0].destination).toBe('Alcalá de Henares');
  });

  it('returns HTTP 502 with descriptive JSON error when trip_updates.json fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

    const res = await invokeHandler('/api/cercanias?station=18000');

    expect(res.statusCode).toBe(502);
    expect(res.headers['cache-control']).toContain('no-store');
    const json = JSON.parse(res.body) as { error: string };
    expect(json.error).toContain('trip_updates');
  });

  it('returns HTTP 400 when station & mode are missing and HTTP 404 for unknown stations', async () => {
    const missingRes = await invokeHandler('/api/cercanias');
    expect(missingRes.statusCode).toBe(400);

    const unknownRes = await invokeHandler('/api/cercanias?station=99999');
    expect(unknownRes.statusCode).toBe(404);
  });

  it('supports ?mode=trains returning live Madrid train positions and active alerts', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const vpFeed: GtfsRtFeed = {
      header: { timestamp: String(nowSec - 10) },
      entity: [
        {
          id: 'VP_MAD',
          vehicle: {
            trip: { tripId: '1016V20703C5', routeId: '10T0017C5' },
            position: { latitude: 40.4052, longitude: -3.6899 },
            stopId: '18000',
            vehicle: { id: '20703', label: 'C5-20703-PLATF.(1)' },
          },
        },
        {
          id: 'VP_BCN',
          vehicle: {
            trip: { tripId: '3016V12345R1', routeId: '30T0001R1' },
            position: { latitude: 41.3851, longitude: 2.1734 },
            stopId: '71801',
            vehicle: { id: '99999', label: 'R1-99999-PLATF.(4)' },
          },
        },
      ],
    };
    const alertsFeed: GtfsRtFeed = {
      header: { timestamp: String(nowSec - 10) },
      entity: [
        {
          id: 'AVISO_LIVE',
          alert: {
            activePeriod: [{ start: String(nowSec - 300) }],
            informedEntity: [{ routeId: '10T0017C5' }],
            descriptionText: {
              translation: [{ text: '#MadC5 Aviso activo', language: 'es' }],
            },
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr === RENFE_GTFS_RT_URLS.vehiclePositions) {
        return Promise.resolve(new Response(JSON.stringify(vpFeed), { status: 200 }));
      }
      if (urlStr === RENFE_GTFS_RT_URLS.alerts) {
        return Promise.resolve(new Response(JSON.stringify(alertsFeed), { status: 200 }));
      }
      return Promise.reject(new Error(`Unexpected URL: ${urlStr}`));
    });

    const res = await invokeHandler('/api/cercanias?mode=trains');
    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body) as {
      trains: Array<{ line: string; platform?: string }>;
      alerts: unknown[];
    };
    expect(json.trains).toHaveLength(1);
    expect(json.trains[0].line).toBe('C5');
    expect(json.trains[0].platform).toBe('1');
    expect(json.alerts).toHaveLength(1);
  });
});

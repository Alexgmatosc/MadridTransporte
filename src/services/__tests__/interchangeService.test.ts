import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import stopsJson from '../../../public/data/stops.json';
import metroStationsJson from '../../../public/data/metro_stations.json';
import cercaniasStationsJson from '../../../public/data/cercanias_stations.json';
import type { Stop } from '../../types/emt';
import type { MetroStation } from '../../types/metro';
import type { CercaniasStation } from '../../types/cercanias';
import { setCachedStops } from '../stopsService';
import { setCachedMetroStations, clearMetroStationsCache } from '../metroService';
import { setCachedCercaniasStations, clearCercaniasStationsCache } from '../cercaniasService';
import { findNearbyInterchanges } from '../interchangeService';

const stopsData = stopsJson as Stop[];
const metroStationsData = metroStationsJson as MetroStation[];
const cercaniasStationsData = cercaniasStationsJson as CercaniasStation[];

describe('Hito 5: interchangeService.ts Spatial Multimodal Matching', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    setCachedStops(stopsData);
    setCachedMetroStations(metroStationsData);
    setCachedCercaniasStations(cercaniasStationsData);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearMetroStationsCache();
    clearCercaniasStationsCache();
  });

  it('finds Cercanías Sol (< 200 m) from Metro Sol (0112), sorted ascending and excluding metro mode', async () => {
    const metroSol = metroStationsData.find((s) => s.id === '0112')!;
    expect(metroSol).toBeDefined();

    const results = await findNearbyInterchanges({
      lat: metroSol.lat,
      lon: metroSol.lon,
      excludeType: 'metro',
      excludeId: metroSol.id,
    });

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.type === 'metro')).toBe(false);

    const cercaniasSol = results.find((r) => r.type === 'cercanias' && r.id === '18101');
    expect(cercaniasSol).toBeDefined();
    expect(cercaniasSol!.name).toBe('Sol');
    expect(cercaniasSol!.distanceMeters).toBeLessThan(200);
    expect(cercaniasSol!.lines).toEqual(expect.arrayContaining(['C3', 'C4']));

    for (let i = 0; i < results.length; i++) {
      expect(results[i].distanceMeters).toBeLessThanOrEqual(200);
      if (i > 0) {
        expect(results[i].distanceMeters).toBeGreaterThanOrEqual(results[i - 1].distanceMeters);
      }
    }
  });

  it('finds Metro Sol from Cercanías Sol (18101) within 200 m and excludes cercanias mode', async () => {
    const cercaniasSol = cercaniasStationsData.find((s) => s.id === '18101')!;
    expect(cercaniasSol).toBeDefined();

    const results = await findNearbyInterchanges({
      lat: cercaniasSol.lat,
      lon: cercaniasSol.lon,
      excludeType: 'cercanias',
      excludeId: cercaniasSol.id,
    });

    expect(results.some((r) => r.type === 'cercanias')).toBe(false);
    const metroSol = results.find((r) => r.type === 'metro' && r.id === '0112');
    expect(metroSol).toBeDefined();
    expect(metroSol!.name).toBe('Sol');
    expect(metroSol!.distanceMeters).toBeLessThan(60);
    expect(metroSol!.lines).toEqual(expect.arrayContaining(['1', '2', '3']));
  });

  it('at Atocha Cercanías (18000), finds Metro Atocha and caps EMT bus stops to 4 closest within 200 m', async () => {
    const cercaniasAtocha = cercaniasStationsData.find((s) => s.id === '18000')!;
    expect(cercaniasAtocha).toBeDefined();

    const results = await findNearbyInterchanges({
      lat: cercaniasAtocha.lat,
      lon: cercaniasAtocha.lon,
      excludeType: 'cercanias',
      excludeId: cercaniasAtocha.id,
    });

    // Metro Atocha (0116) is ~6 m away
    const metroAtocha = results.find((r) => r.type === 'metro' && r.id === '0116');
    expect(metroAtocha).toBeDefined();
    expect(metroAtocha!.distanceMeters).toBeLessThan(30);

    // Atocha has ~10 EMT bus stops within 200 m, but results cap bus stops to at most 4
    const busResults = results.filter((r) => r.type === 'bus');
    expect(busResults.length).toBe(4);
    expect(busResults.every((b) => b.distanceMeters <= 200)).toBe(true);

    // Monotonically sorted ascending
    for (let i = 1; i < results.length; i++) {
      expect(results[i].distanceMeters).toBeGreaterThanOrEqual(results[i - 1].distanceMeters);
    }

    // No duplicates by (type, id)
    const keys = results.map((r) => `${r.type}:${r.id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('from EMT Bus stop 1401 (Estación De Atocha), finds both Metro Atocha and Cercanías Atocha < 200 m', async () => {
    const busAtocha = stopsData.find((s) => s.id === '1401')!;
    expect(busAtocha).toBeDefined();

    const results = await findNearbyInterchanges({
      lat: busAtocha.lat,
      lon: busAtocha.lon,
      excludeType: 'bus',
      excludeId: busAtocha.id,
    });

    expect(results.some((r) => r.type === 'bus')).toBe(false);
    expect(results.some((r) => r.type === 'metro' && r.id === '0116')).toBe(true);
    expect(results.some((r) => r.type === 'cercanias' && r.id === '18000')).toBe(true);
    expect(results.every((r) => r.distanceMeters <= 200)).toBe(true);
  });

  it('respects custom radiusMeters and limit while prioritizing rail modes over bus', async () => {
    const cercaniasAtocha = cercaniasStationsData.find((s) => s.id === '18000')!;

    // Strict 25 m radius at Atocha only includes Metro Atocha (6 m), not EMT stops (>= 31 m)
    const tightRadius = await findNearbyInterchanges({
      lat: cercaniasAtocha.lat,
      lon: cercaniasAtocha.lon,
      excludeType: 'cercanias',
      excludeId: cercaniasAtocha.id,
      radiusMeters: 25,
    });
    expect(tightRadius.map((r) => `${r.type}:${r.id}`)).toEqual(['metro:0116']);

    // Limit of 2 includes Metro Atocha + 1 nearest EMT bus stop
    const limited = await findNearbyInterchanges({
      lat: cercaniasAtocha.lat,
      lon: cercaniasAtocha.lon,
      excludeType: 'cercanias',
      excludeId: cercaniasAtocha.id,
      limit: 2,
    });
    expect(limited).toHaveLength(2);
    expect(limited[0]).toMatchObject({ type: 'metro', id: '0116' });
    expect(limited[1].type).toBe('bus');
  });

  it('deduplicates identical (type, id) records and excludes matching (excludeType, excludeId)', async () => {
    setCachedMetroStations([
      {
        id: '0112',
        name: 'Sol',
        address: 'Puerta del Sol',
        lat: 40.41688,
        lon: -3.70326,
        lines: ['1', '2'],
      },
      {
        id: '0112',
        name: 'Sol Dup',
        address: 'Puerta del Sol',
        lat: 40.41689,
        lon: -3.70327,
        lines: ['1', '2', '3'],
      },
    ]);
    setCachedStops([]);
    setCachedCercaniasStations([]);

    const results = await findNearbyInterchanges({
      lat: 40.41688,
      lon: -3.70326,
      excludeType: 'cercanias',
      excludeId: '18101',
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('0112');
    expect(results[0].distanceMeters).toBe(0);
  });

  it('fails softly if one dataset loader rejects and returns empty array for isolated/invalid coordinates', async () => {
    clearMetroStationsCache();
    clearCercaniasStationsCache();

    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('metro_stations.json')) {
        return Promise.reject(new Error('Metro dataset unavailable'));
      }
      if (urlStr.includes('cercanias_stations.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(cercaniasStationsData),
        } as Response);
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });

    // From EMT stop 1401 (Atocha): Metro fails softly, Cercanías Atocha still resolves
    const partial = await findNearbyInterchanges({
      lat: 40.40678,
      lon: -3.68973,
      excludeType: 'bus',
      excludeId: '1401',
    });
    expect(partial.some((r) => r.type === 'cercanias' && r.id === '18000')).toBe(true);

    // Isolated location (Barcelona) & invalid coordinates
    expect(
      await findNearbyInterchanges({
        lat: 41.3879,
        lon: 2.16992,
        excludeType: 'bus',
        excludeId: '0',
      })
    ).toEqual([]);

    expect(
      await findNearbyInterchanges({
        lat: Number.NaN,
        lon: -3.7,
        excludeType: 'bus',
        excludeId: '0',
      })
    ).toEqual([]);

    expect(
      await findNearbyInterchanges({
        lat: 0,
        lon: 0,
        excludeType: 'bus',
        excludeId: '0',
      })
    ).toEqual([]);
  });
});

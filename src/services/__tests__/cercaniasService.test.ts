import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import cercaniasStationsJson from '../../../public/data/cercanias_stations.json';
import cercaniasMetaJson from '../../../public/data/cercanias_meta.json';
import type { CercaniasMeta, CercaniasStation } from '../../types/cercanias';
import {
  CERCANIAS_LINES,
  CERCANIAS_LINES_LIST,
  getCercaniasLine,
  getCercaniasLineColor,
  formatCercaniasLineBadge,
  normalizeCercaniasLineKey,
} from '../../data/cercaniasLines';
import {
  loadCercaniasStations,
  getCachedCercaniasStations,
  setCachedCercaniasStations,
  clearCercaniasStationsCache,
  getCercaniasStationById,
  searchCercaniasStations,
  findNearestCercaniasStations,
  getCercaniasStationsByLine,
  calculateDistanceMeters,
  normalizeString,
} from '../cercaniasService';

const stationsData = cercaniasStationsJson as CercaniasStation[];
const metaData = cercaniasMetaJson as CercaniasMeta;

const VALID_CERCANIAS_LINES = new Set(Object.keys(CERCANIAS_LINES));

describe('Hito 1: Cercanías Madrid Static Dataset, Line Metadata & Service', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearCercaniasStationsCache();
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/data/cercanias_stations.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(stationsData),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled fetch URL: ${urlStr}`));
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearCercaniasStationsCache();
  });

  // =========================================================================
  // 1. GENERATED STATIC DATASETS INTEGRITY
  // =========================================================================
  describe('Generated public/data/cercanias_stations.json & cercanias_meta.json Integrity', () => {
    it('keeps cercanias_stations.json compact (<50 KB) and cercanias_meta.json (<30 KB)', () => {
      const encoder = new TextEncoder();
      const stationsBytes = encoder.encode(JSON.stringify(stationsData)).length;
      const metaBytes = encoder.encode(JSON.stringify(metaData)).length;

      expect(stationsBytes).toBeGreaterThan(2000);
      expect(stationsBytes).toBeLessThan(50 * 1024);
      expect(metaBytes).toBeGreaterThan(1000);
      expect(metaBytes).toBeLessThan(30 * 1024);
    });

    it('contains ~95 unique Cercanías Madrid stations with valid coordinates, lines, and stopIds', () => {
      expect(stationsData.length).toBeGreaterThanOrEqual(90);
      expect(stationsData.length).toBeLessThanOrEqual(105);

      const seenIds = new Set<string>();
      for (const station of stationsData) {
        expect(station.id).toMatch(/^\d{5}$/);
        expect(seenIds.has(station.id)).toBe(false);
        seenIds.add(station.id);

        expect(station.name.trim().length).toBeGreaterThan(1);

        // Madrid + Guadalajara / Azuqueca / Aranjuez / Sierra bounding box
        expect(station.lat).toBeGreaterThan(40.0);
        expect(station.lat).toBeLessThan(40.9);
        expect(station.lon).toBeGreaterThan(-4.35);
        expect(station.lon).toBeLessThan(-3.1);

        expect(Array.isArray(station.lines)).toBe(true);
        expect(station.lines.length).toBeGreaterThan(0);
        for (const line of station.lines) {
          expect(VALID_CERCANIAS_LINES.has(line)).toBe(true);
        }

        expect(Array.isArray(station.stopIds)).toBe(true);
        expect(station.stopIds!.length).toBeGreaterThan(0);
        expect(station.stopIds).toContain(station.id);
        for (const sid of station.stopIds!) {
          expect(sid).toMatch(/^\d{5}$/);
          expect(metaData.stops[sid]).toBe(station.name);
        }
      }
    });

    it('contains accurate coordinates and lines for major hubs and key stations', () => {
      const byId = new Map(stationsData.map((s) => [s.id, s]));

      const sol = byId.get('18101');
      expect(sol).toBeDefined();
      expect(sol!.name).toBe('Sol');
      expect(sol!.lat).toBeCloseTo(40.4169, 2);
      expect(sol!.lon).toBeCloseTo(-3.7029, 2);
      expect(sol!.lines).toEqual(expect.arrayContaining(['C3', 'C4', 'C4a', 'C4b']));

      const atocha = byId.get('18000');
      expect(atocha).toBeDefined();
      expect(atocha!.name).toContain('Atocha');
      expect(atocha!.lat).toBeCloseTo(40.4066, 2);
      expect(atocha!.lon).toBeCloseTo(-3.6894, 2);
      expect(atocha!.lines).toEqual(expect.arrayContaining(['C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C10']));

      const chamartin = byId.get('17000');
      expect(chamartin).toBeDefined();
      expect(chamartin!.name).toContain('Chamartín');
      expect(chamartin!.lat).toBeCloseTo(40.4712, 2);
      expect(chamartin!.lon).toBeCloseTo(-3.683, 2);
      expect(chamartin!.lines).toEqual(expect.arrayContaining(['C1', 'C2', 'C3', 'C4', 'C7', 'C8a', 'C8b', 'C10']));

      const nuevosMin = byId.get('18002');
      expect(nuevosMin).toBeDefined();
      expect(nuevosMin!.name).toContain('Nuevos Ministerios');

      const principePio = byId.get('10000');
      expect(principePio).toBeDefined();
      expect(principePio!.name).toContain('Príncipe Pío');
      expect(principePio!.lines).toEqual(expect.arrayContaining(['C7', 'C10']));

      const fuenlabrada = byId.get('35002');
      expect(fuenlabrada).toBeDefined();
      expect(fuenlabrada!.name).toBe('Fuenlabrada');
      expect(fuenlabrada!.lines).toEqual(['C5']);

      const guadalajara = byId.get('70200');
      expect(guadalajara).toBeDefined();
      expect(guadalajara!.name).toBe('Guadalajara');

      const aranjuez = byId.get('60200');
      expect(aranjuez).toBeDefined();
      expect(aranjuez!.name).toBe('Aranjuez');

      const villalba = byId.get('10200');
      expect(villalba).toBeDefined();
      expect(villalba!.name).toBe('Villalba de Guadarrama');

      // Vallecas supports both Renfe (70005) and CRTM (70001) stopIds
      const vallecas = stationsData.find((s) => s.name === 'Vallecas');
      expect(vallecas).toBeDefined();
      expect(vallecas!.stopIds).toEqual(expect.arrayContaining(['70005', '70001']));
      expect(metaData.stops['70005']).toBe('Vallecas');
      expect(metaData.stops['70001']).toBe('Vallecas');
    });

    it('maps Nucleo 10 GTFS routeIds to valid lines and clean origin/destination names', () => {
      const routeIds = Object.keys(metaData.routes);
      expect(routeIds.length).toBeGreaterThanOrEqual(38);

      for (const rid of routeIds) {
        expect(rid.startsWith('10T')).toBe(true);
        const entry = metaData.routes[rid];
        expect(VALID_CERCANIAS_LINES.has(entry.line)).toBe(true);
        expect(typeof entry.origin).toBe('string');
        expect(typeof entry.destination).toBe('string');
        expect(entry.origin.length > 0 || entry.destination.length > 0).toBe(true);
      }

      expect(metaData.routes['10T0017C5']).toEqual({
        line: 'C5',
        origin: 'Móstoles-El Soto',
        destination: 'Humanes',
      });
      expect(metaData.routes['10T0001C1']).toEqual({
        line: 'C1',
        origin: 'Madrid-Príncipe Pío',
        destination: 'Madrid-Aeropuerto T4',
      });
    });
  });

  // =========================================================================
  // 2. OFFICIAL LINE METADATA & COLOR NORMALIZATION
  // =========================================================================
  describe('cercaniasLines.ts Official Colors & Normalization', () => {
    it('defines all 14 official Cercanías Madrid lines with valid hex colors', () => {
      const expectedIds = [
        'C1',
        'C2',
        'C3',
        'C3a',
        'C4',
        'C4a',
        'C4b',
        'C5',
        'C7',
        'C8',
        'C8a',
        'C8b',
        'C9',
        'C10',
      ];
      expect(CERCANIAS_LINES_LIST).toHaveLength(14);
      for (const id of expectedIds) {
        expect(CERCANIAS_LINES[id]).toBeDefined();
        expect(CERCANIAS_LINES[id].color).toMatch(/^#[0-9A-F]{6}$/);
        expect(['#FFFFFF', '#000000']).toContain(CERCANIAS_LINES[id].textColor);
      }
    });

    it('matches official CRTM/Renfe colors and accessible contrast text', () => {
      expect(getCercaniasLineColor('C1')).toBe('#75B6E0');
      expect(getCercaniasLineColor('C2')).toBe('#00943D');
      expect(getCercaniasLineColor('C3')).toBe('#952585');
      expect(getCercaniasLineColor('C4')).toBe('#2C2A86');
      expect(getCercaniasLineColor('C5')).toBe('#FECB00');
      expect(getCercaniasLineColor('C7')).toBe('#E5202A');
      expect(getCercaniasLineColor('C8')).toBe('#868584');
      expect(getCercaniasLineColor('C9')).toBe('#915419');
      expect(getCercaniasLineColor('C10')).toBe('#BCCF00');

      // High-luminance backgrounds use black text
      expect(formatCercaniasLineBadge('C5')).toEqual({
        label: 'C5',
        bg: '#FECB00',
        text: '#000000',
      });
      expect(formatCercaniasLineBadge('C10')).toEqual({
        label: 'C10',
        bg: '#BCCF00',
        text: '#000000',
      });
    });

    it('normalizes aliases, case variants, numeric codes, routeIds, and tripIds', () => {
      expect(normalizeCercaniasLineKey('c5')).toBe('C5');
      expect(normalizeCercaniasLineKey('5')).toBe('C5');
      expect(normalizeCercaniasLineKey('C-5')).toBe('C5');
      expect(normalizeCercaniasLineKey('Línea C5')).toBe('C5');
      expect(normalizeCercaniasLineKey('L5')).toBe('C5');
      expect(normalizeCercaniasLineKey('4a')).toBe('C4a');
      expect(normalizeCercaniasLineKey('C8B')).toBe('C8b');
      expect(normalizeCercaniasLineKey('10')).toBe('C10');
      expect(normalizeCercaniasLineKey('10T0017C5')).toBe('C5');
      expect(normalizeCercaniasLineKey('1016V20703C5')).toBe('C5');
      expect(normalizeCercaniasLineKey('10T0013C4a')).toBe('C4a');

      expect(getCercaniasLine('1016V20703C5')?.id).toBe('C5');
      expect(getCercaniasLine('10T0003C10')?.id).toBe('C10');
      expect(getCercaniasLine('unknown-99')).toBeUndefined();
      expect(getCercaniasLineColor('unknown-99')).toBe('#D52B1E');
    });
  });

  // =========================================================================
  // 3. CERCANIAS SERVICE: CACHING, SEARCH & HAVERSINE
  // =========================================================================
  describe('cercaniasService.ts Caching, Search & Haversine Nearest Lookup', () => {
    it('memoizes loadCercaniasStations and deduplicates concurrent fetch calls', async () => {
      expect(getCachedCercaniasStations()).toEqual([]);

      const [first, second, third] = await Promise.all([
        loadCercaniasStations(),
        loadCercaniasStations(),
        loadCercaniasStations(),
      ]);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(first).toBe(second);
      expect(second).toBe(third);
      expect(first.length).toBe(stationsData.length);
      expect(getCachedCercaniasStations().length).toBe(stationsData.length);

      // Subsequent call uses cache without fetching again
      await loadCercaniasStations();
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('recovers loading promise after fetch failure so subsequent retries succeed', async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network offline'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(stationsData),
        } as Response);

      await expect(loadCercaniasStations()).rejects.toThrow('Network offline');

      const recovered = await loadCercaniasStations();
      expect(recovered.length).toBe(stationsData.length);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('supports manual cache population via setCachedCercaniasStations', async () => {
      const mockStations: CercaniasStation[] = [
        {
          id: '99999',
          name: 'Estación Prueba',
          lat: 40.42,
          lon: -3.7,
          lines: ['C5'],
          stopIds: ['99999'],
        },
      ];
      setCachedCercaniasStations(mockStations);
      expect(getCachedCercaniasStations()).toEqual(mockStations);

      const loaded = await loadCercaniasStations();
      expect(loaded).toEqual(mockStations);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('retrieves stations by canonical ID and alias stopIds via getCercaniasStationById', async () => {
      const sol = await getCercaniasStationById('18101');
      expect(sol?.name).toBe('Sol');

      const atocha = await getCercaniasStationById(' 18000 ');
      expect(atocha?.name).toBe('Madrid-Atocha Cercanías');

      // Vallecas works with both Renfe ID 70005 and CRTM ID 70001
      const vallecasRenfe = await getCercaniasStationById('70005');
      const vallecasCrtm = await getCercaniasStationById('70001');
      expect(vallecasRenfe?.name).toBe('Vallecas');
      expect(vallecasCrtm?.name).toBe('Vallecas');
      expect(vallecasRenfe?.id).toBe(vallecasCrtm?.id);

      expect(await getCercaniasStationById('')).toBeNull();
      expect(await getCercaniasStationById('00000')).toBeNull();
    });

    it('searches stations diacritic-insensitively by name, line, and ID', async () => {
      expect(normalizeString('Móstoles-El Soto')).toBe('mostoles-el soto');

      // With and without accents
      const pioAccented = await searchCercaniasStations('Príncipe Pío');
      const pioPlain = await searchCercaniasStations('principe pio');
      expect(pioAccented[0].id).toBe('10000');
      expect(pioPlain[0].id).toBe('10000');

      const chamartinPlain = await searchCercaniasStations('chamartin');
      expect(chamartinPlain[0].id).toBe('17000');

      const mostolesPlain = await searchCercaniasStations('mostoles');
      expect(mostolesPlain.some((s) => s.id === '35606')).toBe(true);
      expect(mostolesPlain.some((s) => s.id === '35607')).toBe(true);

      // By station ID (canonical & alias)
      const bySolId = await searchCercaniasStations('18101');
      expect(bySolId[0].name).toBe('Sol');
      const byVallecasAlias = await searchCercaniasStations('70001');
      expect(byVallecasAlias[0].name).toBe('Vallecas');

      // By line ("C5" and "5")
      const byC5 = await searchCercaniasStations('C5', 50);
      const by5 = await searchCercaniasStations('5', 50);
      expect(byC5.length).toBeGreaterThanOrEqual(20);
      expect(by5.map((s) => s.id)).toEqual(byC5.map((s) => s.id));
      expect(byC5.some((s) => s.id === '35002')).toBe(true); // Fuenlabrada
      expect(byC5.some((s) => s.id === '18000')).toBe(true); // Atocha

      // Empty query & limit
      expect(await searchCercaniasStations('   ')).toEqual([]);
      expect((await searchCercaniasStations('C5', 3)).length).toBe(3);
    });

    it('sorts nearest stations monotonically by Haversine distance and respects maxDistanceMeters', async () => {
      // Puerta del Sol coordinates
      const nearSol = await findNearestCercaniasStations(40.41688, -3.70326, 20, 10000);
      expect(nearSol.length).toBeGreaterThan(5);
      expect(nearSol[0].name).toBe('Sol');
      expect(nearSol[0].distanceMeters).toBeLessThan(50);

      for (let i = 1; i < nearSol.length; i++) {
        expect(nearSol[i].distanceMeters).toBeGreaterThanOrEqual(nearSol[i - 1].distanceMeters);
      }

      // Atocha (~1.6 km from Sol)
      const atocha = nearSol.find((s) => s.id === '18000');
      expect(atocha).toBeDefined();
      expect(atocha!.distanceMeters).toBeGreaterThan(1300);
      expect(atocha!.distanceMeters).toBeLessThan(2000);

      // Atocha coordinates -> Atocha must be closest
      const nearAtocha = await findNearestCercaniasStations(40.4066, -3.6894, 5, 5000);
      expect(nearAtocha[0].id).toBe('18000');
      expect(nearAtocha[0].distanceMeters).toBeLessThan(50);

      // Chamartín coordinates -> Chamartín must be closest
      const nearChamartin = await findNearestCercaniasStations(40.4712, -3.683, 5, 5000);
      expect(nearChamartin[0].id).toBe('17000');
      expect(nearChamartin[0].distanceMeters).toBeLessThan(50);

      // Zero distance self-check & far location outside radius
      expect(calculateDistanceMeters(40.41688, -3.70326, 40.41688, -3.70326)).toBe(0);
      const farAway = await findNearestCercaniasStations(41.3879, 2.16992, 10, 10000);
      expect(farAway).toEqual([]);
    });

    it('lists stations serving a specific line sorted alphabetically in Spanish', async () => {
      const c9Stations = await getCercaniasStationsByLine('C9');
      expect(c9Stations.map((s) => s.name)).toEqual([
        'Cercedilla',
        'Los Cotos',
        'Puerto de Navacerrada',
      ]);

      const c5ViaNum = await getCercaniasStationsByLine('5');
      expect(c5ViaNum.some((s) => s.name === 'Fuenlabrada')).toBe(true);
      expect(await getCercaniasStationsByLine('')).toEqual([]);
    });
  });
});

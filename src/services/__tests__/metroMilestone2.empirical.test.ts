import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import metroStationsJson from '../../../public/data/metro_stations.json';
import {
  loadMetroStations,
  searchMetroStations,
  findNearestMetroStations,
  getMetroStationByCode,
  getMetroStationsByLine,
  calculateDistanceMeters,
  clearMetroStationsCache,
} from '../metroService';
import { METRO_LINES } from '../../data/metroLines';

describe('Empirical Adversarial Challenge — Metro Dataset & Spatial Service (Milestone 2)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearMetroStationsCache();
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/data/metro_stations.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(metroStationsJson),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled fetch URL in test: ${urlStr}`));
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearMetroStationsCache();
  });

  describe('1. Dataset Integrity & Coordinate Bounding Box', () => {
    it('contains exactly 242 unique physical stations', () => {
      expect(metroStationsJson).toHaveLength(242);

      const ids = new Set<string>();
      const names = new Set<string>();

      for (const station of metroStationsJson) {
        expect(ids.has(station.id)).toBe(false);
        ids.add(station.id);

        expect(names.has(station.name)).toBe(false);
        names.add(station.name);
      }
    });

    it('ensures every station is strictly within Community of Madrid GPS bounds (lat 40.1 to 40.7, lon -4.0 to -3.3)', () => {
      const LAT_MIN = 40.1;
      const LAT_MAX = 40.7;
      const LON_MIN = -4.0;
      const LON_MAX = -3.3;

      for (const station of metroStationsJson) {
        expect(typeof station.lat).toBe('number');
        expect(typeof station.lon).toBe('number');
        expect(Number.isNaN(station.lat)).toBe(false);
        expect(Number.isNaN(station.lon)).toBe(false);

        expect(station.lat).toBeGreaterThanOrEqual(LAT_MIN);
        expect(station.lat).toBeLessThanOrEqual(LAT_MAX);
        expect(station.lon).toBeGreaterThanOrEqual(LON_MIN);
        expect(station.lon).toBeLessThanOrEqual(LON_MAX);
      }
    });

    it('ensures all stations have valid non-empty lines and valid line IDs', () => {
      const validLineIds = new Set(Object.keys(METRO_LINES));

      for (const station of metroStationsJson) {
        expect(Array.isArray(station.lines)).toBe(true);
        expect(station.lines.length).toBeGreaterThanOrEqual(1);

        for (const lineId of station.lines) {
          expect(validLineIds.has(lineId)).toBe(true);
        }
      }
    });

    it('validates allCodes arrays for multi-line stations', () => {
      const multiLineStations = metroStationsJson.filter((s) => s.lines.length > 1);
      expect(multiLineStations.length).toBeGreaterThanOrEqual(35);

      for (const station of multiLineStations) {
        expect(Array.isArray(station.allCodes)).toBe(true);
        expect(station.allCodes!.length).toBeGreaterThanOrEqual(1);
        for (const code of station.allCodes!) {
          expect(typeof code).toBe('string');
          expect(code.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('2. Interchange Stations Verification', () => {
    const keyInterchanges: Array<{
      name: string;
      expectedId: string;
      expectedLines: string[];
      expectedAllCodes: string[];
    }> = [
      {
        name: 'Sol',
        expectedId: '0112',
        expectedLines: ['1', '2', '3'],
        expectedAllCodes: ['0112', '0208', '0306'],
      },
      {
        name: 'Nuevos Ministerios',
        expectedId: '0618',
        expectedLines: ['6', '8', '10'],
        expectedAllCodes: ['0618', '0801', '1007'],
      },
      {
        name: 'Avenida de América',
        expectedId: '0411',
        expectedLines: ['4', '6', '7', '9'],
        expectedAllCodes: ['0411', '0616', '0710', '0910'],
      },
      {
        name: 'Príncipe Pío',
        expectedId: '0625',
        expectedLines: ['6', '10', 'R'],
        expectedAllCodes: ['0002', '0625', '1012'],
      },
      {
        name: 'Plaza de Castilla',
        expectedId: '0101',
        expectedLines: ['1', '9', '10'],
        expectedAllCodes: ['0101', '0904', '1004'],
      },
      {
        name: 'Cuatro Caminos',
        expectedId: '0106',
        expectedLines: ['1', '2', '6'],
        expectedAllCodes: ['0106', '0215', '0619'],
      },
      {
        name: 'Alonso Martínez',
        expectedId: '0404',
        expectedLines: ['4', '5', '10'],
        expectedAllCodes: ['0404', '0512', '1009'],
      },
      {
        name: 'Argüelles',
        expectedId: '0310',
        expectedLines: ['3', '4', '6'],
        expectedAllCodes: ['0310', '0401', '0624'],
      },
      {
        name: 'Ópera',
        expectedId: '0209',
        expectedLines: ['2', '5', 'R'],
        expectedAllCodes: ['0001', '0209', '0516'],
      },
      {
        name: 'Chamartín',
        expectedId: '0151',
        expectedLines: ['1', '10'],
        expectedAllCodes: ['0151', '1003'],
      },
      {
        name: 'Puerta del Sur',
        expectedId: '1021',
        expectedLines: ['10', '12'],
        expectedAllCodes: ['1021', '1201'],
      },
      {
        name: 'Moncloa',
        expectedId: '0311',
        expectedLines: ['3', '6'],
        expectedAllCodes: ['0311', '0623'],
      },
      {
        name: 'Legazpi',
        expectedId: '0301',
        expectedLines: ['3', '6'],
        expectedAllCodes: ['0301', '0607'],
      },
      {
        name: 'Casa de Campo',
        expectedId: '0530',
        expectedLines: ['5', '10'],
        expectedAllCodes: ['0530', '1015'],
      },
      {
        name: 'Pinar de Chamartín',
        expectedId: '0153',
        expectedLines: ['1', '4', 'ML1'],
        expectedAllCodes: ['0153', '0423'],
      },
    ];

    for (const interchange of keyInterchanges) {
      it(`verifies interchange station "${interchange.name}" lines and master/platform codes`, async () => {
        const station = metroStationsJson.find((s) => s.name === interchange.name);
        expect(station).toBeDefined();
        expect(station!.id).toBe(interchange.expectedId);

        for (const line of interchange.expectedLines) {
          expect(station!.lines).toContain(line);
        }

        for (const code of interchange.expectedAllCodes) {
          expect(station!.allCodes).toContain(code);
        }
      });
    }

    it('resolves interchange stations by any of their subsidiary codes via getMetroStationByCode', async () => {
      for (const interchange of keyInterchanges) {
        for (const code of interchange.expectedAllCodes) {
          const resolved = await getMetroStationByCode(code);
          expect(resolved?.name).toBe(interchange.name);

          // Test unpadded code as well (e.g. "0112" -> "112")
          const unpadded = code.replace(/^0+/, '') || '0';
          const resolvedUnpadded = await getMetroStationByCode(unpadded);
          expect(resolvedUnpadded?.name).toBe(interchange.name);
        }
      }
    });
  });

  describe('3. Search Edge Cases & Adversarial Inputs', () => {
    it('handles empty and whitespace queries safely', async () => {
      expect(await searchMetroStations('')).toEqual([]);
      expect(await searchMetroStations(' ')).toEqual([]);
      expect(await searchMetroStations('   \t\n  ')).toEqual([]);
    });

    it('handles Spanish diacritics and special characters correctly', async () => {
      const diacriticPairs = [
        { query: 'Plaza de Espana', expectedStation: 'Plaza de España' },
        { query: 'plaza de espana', expectedStation: 'Plaza de España' },
        { query: 'Argüelles', expectedStation: 'Argüelles' },
        { query: 'Arguelles', expectedStation: 'Argüelles' },
        { query: 'arguelles', expectedStation: 'Argüelles' },
        { query: 'Nuevos Ministerios', expectedStation: 'Nuevos Ministerios' },
        { query: 'nuevos ministerios', expectedStation: 'Nuevos Ministerios' },
        { query: 'Ópera', expectedStation: 'Ópera' },
        { query: 'opera', expectedStation: 'Ópera' },
        { query: 'OPERA', expectedStation: 'Ópera' },
        { query: 'Guzmán el Bueno', expectedStation: 'Guzmán el Bueno' },
        { query: 'Guzman el Bueno', expectedStation: 'Guzmán el Bueno' },
        { query: 'guzman el bueno', expectedStation: 'Guzmán el Bueno' },
        { query: 'Santiago Bernabéu', expectedStation: 'Santiago Bernabéu' },
        { query: 'Santiago Bernabeu', expectedStation: 'Santiago Bernabéu' },
        { query: 'santiago bernabeu', expectedStation: 'Santiago Bernabéu' },
        { query: 'Rubén Darío', expectedStation: 'Rubén Darío' },
        { query: 'Ruben Dario', expectedStation: 'Rubén Darío' },
        { query: 'Méndez Álvaro', expectedStation: 'Méndez Álvaro' },
        { query: 'Mendez Alvaro', expectedStation: 'Méndez Álvaro' },
        { query: 'Núñez de Balboa', expectedStation: 'Núñez de Balboa' },
        { query: 'Nunez de Balboa', expectedStation: 'Núñez de Balboa' },
      ];

      for (const pair of diacriticPairs) {
        const results = await searchMetroStations(pair.query);
        expect(results.length).toBeGreaterThan(0);
        const names = results.map((r) => r.name);
        expect(names).toContain(pair.expectedStation);
      }
    });

    it('survives regex metacharacters and special syntax without throwing or crashing', async () => {
      const adversarialQueries = [
        '(', ')', '[', ']', '{', '}', '*', '+', '?', '^', '$', '\\', '|', '/', '.',
        '.*', '.*+?', '((()))', '[a-z]+', '.*(?=.*)',
        '<script>alert("xss")</script>',
        "' OR 1=1 --",
        'DROP TABLE stations;',
        '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`',
        '🚇 🇪🇸 🚉',
      ];

      for (const q of adversarialQueries) {
        expect(() => searchMetroStations(q)).not.toThrow();
        const results = await searchMetroStations(q);
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('handles extremely long inputs safely without hanging', async () => {
      const longQuery = 'A'.repeat(10000);
      const start = performance.now();
      const results = await searchMetroStations(longQuery);
      const duration = performance.now() - start;

      expect(results).toEqual([]);
      expect(duration).toBeLessThan(100); // Must execute in < 100ms
    });

    it('supports line search keywords ("1", "L1", "Linea 1", "R", "Ramal", "Circular", "MetroSur")', async () => {
      const rResults = await searchMetroStations('Ramal');
      expect(rResults.map((s) => s.name)).toEqual(expect.arrayContaining(['Ópera', 'Príncipe Pío']));

      const circularResults = await searchMetroStations('Circular');
      expect(circularResults.length).toBeGreaterThan(15);
      for (const st of circularResults) {
        expect(st.lines).toContain('6');
      }

      const metroSurResults = await searchMetroStations('MetroSur');
      expect(metroSurResults.length).toBeGreaterThan(15);
      for (const st of metroSurResults) {
        expect(st.lines).toContain('12');
      }

      const l1Results = await searchMetroStations('L1');
      expect(l1Results.length).toBeGreaterThan(20);
      for (const st of l1Results) {
        expect(st.lines).toContain('1');
      }
    });

    it('respects search limit parameter', async () => {
      const limit5 = await searchMetroStations('Madrid', 5);
      expect(limit5.length).toBeLessThanOrEqual(5);

      const limit0 = await searchMetroStations('Sol', 0);
      expect(limit0).toEqual([]);
    });
  });

  describe('4. Spatial Search Robustness (findNearestMetroStations)', () => {
    it('returns stations sorted strictly ascending by Haversine distance', async () => {
      const results = await findNearestMetroStations(40.41688, -3.70326, 15, 10000);
      expect(results.length).toBeGreaterThan(5);

      for (let i = 1; i < results.length; i++) {
        expect(results[i].distanceMeters).toBeGreaterThanOrEqual(results[i - 1].distanceMeters);
      }
    });

    it('returns empty array when coordinates are far outside Madrid with standard radius', async () => {
      // Barcelona coordinates: 41.3851, 2.1734 (~500 km away)
      const farResults = await findNearestMetroStations(41.3851, 2.1734, 10, 5000);
      expect(farResults).toEqual([]);

      // London coordinates: 51.5074, -0.1278 (~1200 km away)
      const londonResults = await findNearestMetroStations(51.5074, -0.1278, 10, 5000);
      expect(londonResults).toEqual([]);
    });

    it('accurately computes Haversine distances for benchmark points', () => {
      // Coords for Sol: 40.41688, -3.70326
      // Identical point = 0m
      expect(calculateDistanceMeters(40.41688, -3.70326, 40.41688, -3.70326)).toBe(0);

      // Sol to Atocha Renfe (approx 1.5 - 1.8 km)
      const solToAtocha = calculateDistanceMeters(40.41688, -3.70326, 40.407, -3.691);
      expect(solToAtocha).toBeGreaterThan(1400);
      expect(solToAtocha).toBeLessThan(1800);
    });
  });

  describe('5. Line Filtering & Line Catalog (getMetroStationsByLine)', () => {
    it('retrieves accurate station counts across all 12 Metro lines and Ramal', async () => {
      const lineCounts: Record<string, number> = {
        '1': 33,
        '2': 21,
        '3': 20,
        '4': 23,
        '5': 33,
        '6': 28,
        '7': 31,
        '8': 8,
        '9': 29,
        '10': 32,
        '11': 7,
        '12': 28,
        'R': 2,
      };

      for (const [lineId, expectedCount] of Object.entries(lineCounts)) {
        const stationsOnLine = await getMetroStationsByLine(lineId);
        expect(stationsOnLine).toHaveLength(expectedCount);

        for (const st of stationsOnLine) {
          expect(st.lines).toContain(lineId);
        }
      }
    });

    it('returns empty array for invalid line identifier', async () => {
      expect(await getMetroStationsByLine('999')).toEqual([]);
      expect(await getMetroStationsByLine('')).toEqual([]);
      expect(await getMetroStationsByLine('invalid_line')).toEqual([]);
    });
  });

  describe('6. Concurrency & Cache Deduplication', () => {
    it('deduplicates concurrent loadMetroStations calls to a single Promise execution', async () => {
      clearMetroStationsCache();
      const [res1, res2, res3] = await Promise.all([
        loadMetroStations(),
        loadMetroStations(),
        loadMetroStations(),
      ]);

      expect(res1).toBe(res2);
      expect(res2).toBe(res3);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import metroStationsJson from '../../../public/data/metro_stations.json';
import {
  loadMetroStations,
  searchMetroStations,
  findNearestMetroStations,
  getMetroStationsByLine,
  calculateDistanceMeters,
  getCachedMetroStations,
  clearMetroStationsCache,
} from '../metroService';

describe('Empirical Challenger 2: Metro Service & Spatial Layer Stress Tests', () => {
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
      return Promise.reject(new Error(`Unhandled fetch URL: ${urlStr}`));
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearMetroStationsCache();
  });

  // =========================================================================
  // 1. HAVERSINE DISTANCE ORDERING AROUND KNOWN LANDMARKS
  // =========================================================================
  describe('Haversine Distance Ordering & Spatial Monotonicity', () => {
    // Known Madrid Landmarks
    const LANDMARKS = {
      Sol: { name: 'Puerta del Sol', lat: 40.41688, lon: -3.70326, expectedClosest: 'Sol' },
      Chamartin: { name: 'Chamartín', lat: 40.47203, lon: -3.68259, expectedClosest: 'Chamartín' },
      Atocha: { name: 'Atocha', lat: 40.40659, lon: -3.68938, expectedClosest: 'Atocha' },
    };

    it('verifies Puerta del Sol closest station is Sol and distances strictly increase', async () => {
      const results = await findNearestMetroStations(
        LANDMARKS.Sol.lat,
        LANDMARKS.Sol.lon,
        150,
        10000
      );

      expect(results.length).toBeGreaterThan(130);

      // Closest must be Sol (distance = 0)
      const first = results[0];
      expect(first.name).toBe(LANDMARKS.Sol.expectedClosest);
      expect(first.distanceMeters).toBeLessThanOrEqual(5);

      // Verify strict monotonic non-decreasing ordering across all stations
      for (let i = 1; i < results.length; i++) {
        expect(results[i].distanceMeters).toBeGreaterThanOrEqual(results[i - 1].distanceMeters);
      }

      // Sol neighborhood stations in top 10
      const top10Names = results.slice(0, 10).map((s) => s.name);
      expect(top10Names).toContain('Sol');
      expect(
        top10Names.some((n) =>
          ['Gran Vía', 'Sevilla', 'Ópera', 'Callao', 'Tirso de Molina'].includes(n)
        )
      ).toBe(true);

      // Atocha should be at ~1.6km (around rank 27)
      const atochaResult = results.find((s) => s.name === 'Atocha');
      expect(atochaResult).toBeDefined();
      expect(atochaResult!.distanceMeters).toBeGreaterThan(1500);
      expect(atochaResult!.distanceMeters).toBeLessThan(1800);

      // Chamartín is in northern Madrid (~6.4km away, rank ~133)
      const chamartinResult = results.find((s) => s.name === 'Chamartín');
      expect(chamartinResult).toBeDefined();
      expect(chamartinResult!.distanceMeters).toBeGreaterThan(6000);
      expect(chamartinResult!.distanceMeters).toBeLessThan(6800);
    });

    it('verifies Chamartín closest station is Chamartín and distances strictly increase', async () => {
      const results = await findNearestMetroStations(
        LANDMARKS.Chamartin.lat,
        LANDMARKS.Chamartin.lon,
        150,
        15000
      );

      expect(results.length).toBeGreaterThan(120);

      const first = results[0];
      expect(first.name).toBe(LANDMARKS.Chamartin.expectedClosest);
      expect(first.distanceMeters).toBeLessThanOrEqual(5);

      // Monotonic ordering
      for (let i = 1; i < results.length; i++) {
        expect(results[i].distanceMeters).toBeGreaterThanOrEqual(results[i - 1].distanceMeters);
      }

      // Nearby stations to Chamartín: Plaza de Castilla, Bambú, Duque de Pastrana
      const top10Names = results.slice(0, 10).map((s) => s.name);
      expect(
        top10Names.some((n) =>
          ['Plaza de Castilla', 'Bambú', 'Duque de Pastrana', 'Pinar de Chamartín'].includes(n)
        )
      ).toBe(true);

      // Sol should be ~6.4km away (rank ~101)
      const solResult = results.find((s) => s.name === 'Sol');
      expect(solResult).toBeDefined();
      expect(solResult!.distanceMeters).toBeGreaterThan(6000);
      expect(solResult!.distanceMeters).toBeLessThan(6800);

      // Atocha should be ~7.3km away (rank ~117)
      const atochaResult = results.find((s) => s.name === 'Atocha');
      expect(atochaResult).toBeDefined();
      expect(atochaResult!.distanceMeters).toBeGreaterThan(7000);
      expect(atochaResult!.distanceMeters).toBeLessThan(7600);
    });

    it('verifies Atocha closest station is Atocha and distances strictly increase', async () => {
      const results = await findNearestMetroStations(
        LANDMARKS.Atocha.lat,
        LANDMARKS.Atocha.lon,
        150,
        15000
      );

      expect(results.length).toBeGreaterThan(140);

      const first = results[0];
      expect(first.name).toBe(LANDMARKS.Atocha.expectedClosest);
      expect(first.distanceMeters).toBeLessThanOrEqual(5);

      // Monotonic ordering
      for (let i = 1; i < results.length; i++) {
        expect(results[i].distanceMeters).toBeGreaterThanOrEqual(results[i - 1].distanceMeters);
      }

      // Nearby stations: Estación del Arte, Menéndez Pelayo, Palos de la Frontera
      const top10Names = results.slice(0, 10).map((s) => s.name);
      expect(
        top10Names.some((n) =>
          ['Estación del Arte', 'Menéndez Pelayo', 'Palos de la Frontera', 'Lavapiés'].includes(n)
        )
      ).toBe(true);

      // Sol is ~1.6km away (rank ~19)
      const solResult = results.find((s) => s.name === 'Sol');
      expect(solResult).toBeDefined();
      expect(solResult!.distanceMeters).toBeGreaterThan(1500);
      expect(solResult!.distanceMeters).toBeLessThan(1800);

      // Chamartín should be far away (~7.3km, rank ~148)
      const chamartinResult = results.find((s) => s.name === 'Chamartín');
      expect(chamartinResult).toBeDefined();
      expect(chamartinResult!.distanceMeters).toBeGreaterThan(7000);
      expect(chamartinResult!.distanceMeters).toBeLessThan(7600);
    });

    it('satisfies Haversine triangle inequality between landmarks and intermediate stations', () => {
      // For landmarks Sol, Chamartin, and intermediate station Nuevos Ministerios
      const sol = LANDMARKS.Sol;
      const chamartin = LANDMARKS.Chamartin;
      const nuevosMinisterios = { lat: 40.4468, lon: -3.6923 };

      const distDirect = calculateDistanceMeters(sol.lat, sol.lon, chamartin.lat, chamartin.lon);
      const distViaNM =
        calculateDistanceMeters(sol.lat, sol.lon, nuevosMinisterios.lat, nuevosMinisterios.lon) +
        calculateDistanceMeters(nuevosMinisterios.lat, nuevosMinisterios.lon, chamartin.lat, chamartin.lon);

      // Triangle inequality: direct distance <= path through intermediate point (with small rounding margin)
      expect(distDirect).toBeLessThanOrEqual(distViaNM + 1);
    });

    it('handles edge cases: distance = 0, zero radius, extreme radii, remote locations', async () => {
      // Co-located point
      expect(calculateDistanceMeters(40.41688, -3.70326, 40.41688, -3.70326)).toBe(0);

      // Zero radius at Sol: only Sol itself should match (distance 0m <= 0)
      const zeroRadius = await findNearestMetroStations(40.41688, -3.70326, 10, 0);
      expect(zeroRadius.length).toBe(1);
      expect(zeroRadius[0].name).toBe('Sol');
      expect(zeroRadius[0].distanceMeters).toBe(0);

      // Location far from Madrid (e.g. Barcelona: 41.3879, 2.16992) with default 5km radius -> 0 results
      const barcelona = await findNearestMetroStations(41.3879, 2.16992, 10, 5000);
      expect(barcelona).toHaveLength(0);

      // Location in Barcelona with 600km radius -> should return Madrid stations sorted
      const barcelonaWide = await findNearestMetroStations(41.3879, 2.16992, 5, 600000);
      expect(barcelonaWide.length).toBe(5);
      for (const s of barcelonaWide) {
        expect(s.distanceMeters).toBeGreaterThan(400000); // > 400km
      }
    });
  });

  // =========================================================================
  // 2. LINE FILTERING FOR EVERY SINGLE LINE (L1-L12, R, ML1-ML3)
  // =========================================================================
  describe('Line Filtering for Every Single Line (1-12, R, ML1-ML3)', () => {
    const ALL_16_LINES = [
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
      'R', 'ML1', 'ML2', 'ML3',
    ];

    it('returns stations for every single one of the 16 lines using canonical IDs', async () => {
      for (const lineId of ALL_16_LINES) {
        const stations = await getMetroStationsByLine(lineId);
        expect(
          stations.length,
          `Line ${lineId} should return at least 1 station, but returned ${stations.length}`
        ).toBeGreaterThan(0);

        // Every returned station must contain this line in its lines array
        for (const st of stations) {
          expect(
            st.lines.some((l) => l.toUpperCase() === lineId.toUpperCase()),
            `Station ${st.name} returned for line ${lineId} but has lines ${st.lines.join(',')}`
          ).toBe(true);
        }

        // Stations must be alphabetically sorted in Spanish locale
        for (let i = 1; i < stations.length; i++) {
          const comp = stations[i - 1].name.localeCompare(stations[i].name, 'es');
          expect(
            comp <= 0,
            `Stations for line ${lineId} must be alphabetically ordered: "${stations[i - 1].name}" preceded "${stations[i].name}"`
          ).toBe(true);
        }
      }
    });

    it('returns identical station lists regardless of alias format (L#, Línea #, lowercase)', async () => {
      for (const lineId of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']) {
        const canonical = await getMetroStationsByLine(lineId);
        const withL = await getMetroStationsByLine(`L${lineId}`);
        const withLowerL = await getMetroStationsByLine(`l${lineId}`);
        const withLinea = await getMetroStationsByLine(`Línea ${lineId}`);
        const withLineaNoAccent = await getMetroStationsByLine(`Linea ${lineId}`);

        expect(withL.map((s) => s.id)).toEqual(canonical.map((s) => s.id));
        expect(withLowerL.map((s) => s.id)).toEqual(canonical.map((s) => s.id));
        expect(withLinea.map((s) => s.id)).toEqual(canonical.map((s) => s.id));
        expect(withLineaNoAccent.map((s) => s.id)).toEqual(canonical.map((s) => s.id));
      }

      // Test Ramal aliases
      const rCanonical = await getMetroStationsByLine('R');
      const rLower = await getMetroStationsByLine('r');
      const ramal = await getMetroStationsByLine('Ramal');
      const ramalLower = await getMetroStationsByLine('ramal');

      expect(rLower.map((s) => s.id)).toEqual(rCanonical.map((s) => s.id));
      expect(ramal.map((s) => s.id)).toEqual(rCanonical.map((s) => s.id));
      expect(ramalLower.map((s) => s.id)).toEqual(rCanonical.map((s) => s.id));
      expect(rCanonical).toHaveLength(2);
      expect(rCanonical.map((s) => s.name)).toEqual(['Ópera', 'Príncipe Pío']);

      // Test Metro Ligero aliases
      for (const ml of ['ML1', 'ML2', 'ML3']) {
        const mlCanonical = await getMetroStationsByLine(ml);
        const mlLower = await getMetroStationsByLine(ml.toLowerCase());
        const mlSpace = await getMetroStationsByLine(`Metro Ligero ${ml.replace('ML', '')}`);

        expect(mlLower.map((s) => s.id)).toEqual(mlCanonical.map((s) => s.id));
        expect(mlSpace.map((s) => s.id)).toEqual(mlCanonical.map((s) => s.id));
        expect(mlCanonical.length).toBeGreaterThan(0);
      }

      // Test Special names: Circular (L6) and MetroSur (L12)
      const l6Canonical = await getMetroStationsByLine('6');
      const l6Circular = await getMetroStationsByLine('Circular');
      expect(l6Circular.map((s) => s.id)).toEqual(l6Canonical.map((s) => s.id));

      const l12Canonical = await getMetroStationsByLine('12');
      const l12MetroSur = await getMetroStationsByLine('MetroSur');
      expect(l12MetroSur.map((s) => s.id)).toEqual(l12Canonical.map((s) => s.id));
    });

    it('returns empty array for invalid lines or non-matching queries', async () => {
      expect(await getMetroStationsByLine('')).toEqual([]);
      expect(await getMetroStationsByLine('   ')).toEqual([]);
      expect(await getMetroStationsByLine('99')).toEqual([]);
      expect(await getMetroStationsByLine('L99')).toEqual([]);
      expect(await getMetroStationsByLine('ML9')).toEqual([]);
      expect(await getMetroStationsByLine('Renfe C5')).toEqual([]);
    });

    it('verifies station counts per line conform to expected physical catalog', async () => {
      const counts: Record<string, number> = {};
      for (const lineId of ALL_16_LINES) {
        const stations = await getMetroStationsByLine(lineId);
        counts[lineId] = stations.length;
      }

      // Line 1: 33 stations (Pinar de Chamartín to Valdecarros)
      expect(counts['1']).toBe(33);
      // Line 2: 21 stations
      expect(counts['2']).toBe(21);
      // Line 3: 20 stations
      expect(counts['3']).toBe(20);
      // Line 4: 23 stations
      expect(counts['4']).toBe(23);
      // Line 5: 33 stations
      expect(counts['5']).toBe(33);
      // Line 6 (Circular): 28 stations
      expect(counts['6']).toBe(28);
      // Line 7: 31 stations
      expect(counts['7']).toBe(31);
      // Line 8: 8 stations
      expect(counts['8']).toBe(8);
      // Line 9: 29 stations
      expect(counts['9']).toBe(29);
      // Line 10: 32 stations
      expect(counts['10']).toBe(32);
      // Line 11: 7 stations
      expect(counts['11']).toBe(7);
      // Line 12 (MetroSur): 28 stations
      expect(counts['12']).toBe(28);
      // Ramal: exactly 2 stations
      expect(counts['R']).toBe(2);
      // ML1: Pinar de Chamartín
      expect(counts['ML1']).toBe(1);
      // ML2: Colonia Jardín
      expect(counts['ML2']).toBe(1);
      // ML3: Colonia Jardín
      expect(counts['ML3']).toBe(1);
    });
  });

  // =========================================================================
  // 3. CONCURRENCY & MEMOIZATION STRESS TESTING
  // =========================================================================
  describe('Concurrency & Memoization Stress Testing (loadMetroStations)', () => {
    it('executes fetch exactly ONCE when 500 concurrent callers invoke loadMetroStations() simultaneously', async () => {
      let fetchCallCount = 0;

      globalThis.fetch = vi.fn().mockImplementation(async () => {
        fetchCallCount++;
        // Simulate real network delay
        await new Promise((r) => setTimeout(r, 20));
        return {
          ok: true,
          status: 200,
          json: async () => metroStationsJson,
        } as Response;
      });

      // Fire 500 concurrent requests simultaneously
      const CONCURRENCY = 500;
      const callers = Array.from({ length: CONCURRENCY }, () => loadMetroStations());

      const results = await Promise.all(callers);

      // Exactly ONE network fetch must have been dispatched
      expect(fetchCallCount).toBe(1);

      // All 500 callers must receive the exact identical station array (reference equality)
      expect(results).toHaveLength(CONCURRENCY);
      const firstResult = results[0];
      expect(firstResult).toHaveLength(242);
      for (let i = 1; i < CONCURRENCY; i++) {
        expect(results[i]).toBe(firstResult);
      }
    });

    it('subsequent calls after completion return cached array instantly with zero additional fetch calls', async () => {
      let fetchCallCount = 0;

      globalThis.fetch = vi.fn().mockImplementation(async () => {
        fetchCallCount++;
        return {
          ok: true,
          status: 200,
          json: async () => metroStationsJson,
        } as Response;
      });

      // Initial load
      const initial = await loadMetroStations();
      expect(fetchCallCount).toBe(1);

      // 100 subsequent sequential and concurrent calls
      const batch1 = await Promise.all(Array.from({ length: 50 }, () => loadMetroStations()));
      const batch2 = await Promise.all(Array.from({ length: 50 }, () => loadMetroStations()));

      // Fetch count remains 1!
      expect(fetchCallCount).toBe(1);

      for (const res of [...batch1, ...batch2]) {
        expect(res).toBe(initial);
      }
    });

    it('resets in-flight loading promise on network error, allowing safe retries without poisoning the service', async () => {
      let attempt = 0;

      globalThis.fetch = vi.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          // First attempt fails with network error
          throw new Error('ETIMEDOUT: Connection to server timed out');
        }
        // Second attempt succeeds
        return {
          ok: true,
          status: 200,
          json: async () => metroStationsJson,
        } as Response;
      });

      // First attempt fails
      await expect(loadMetroStations()).rejects.toThrow('ETIMEDOUT');

      // The service must NOT be poisoned with a rejected promise
      // Second attempt must trigger a new fetch and succeed
      const stations = await loadMetroStations();
      expect(stations).toHaveLength(242);
      expect(attempt).toBe(2);

      // Third attempt uses memoized cache
      const cached = await loadMetroStations();
      expect(cached).toBe(stations);
      expect(attempt).toBe(2);
    });

    it('handles concurrent callers when first batch fails: all reject, subsequent batch succeeds with single new fetch', async () => {
      let fetchDispatches = 0;

      globalThis.fetch = vi.fn().mockImplementation(async () => {
        fetchDispatches++;
        await new Promise((r) => setTimeout(r, 10));
        if (fetchDispatches === 1) {
          return {
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => metroStationsJson,
        } as Response;
      });

      // 50 concurrent callers during failure
      const failingBatch = Array.from({ length: 50 }, () => loadMetroStations());
      const settled = await Promise.allSettled(failingBatch);

      // All 50 should be rejected
      for (const res of settled) {
        expect(res.status).toBe('rejected');
      }
      expect(fetchDispatches).toBe(1);

      // Next batch of 50 concurrent callers after recovery
      const recoveredBatch = Array.from({ length: 50 }, () => loadMetroStations());
      const recoveredResults = await Promise.all(recoveredBatch);

      // All 50 succeed with single new fetch
      expect(fetchDispatches).toBe(2);
      expect(recoveredResults[0]).toHaveLength(242);
      for (const res of recoveredResults) {
        expect(res).toBe(recoveredResults[0]);
      }
    });

    it('clearing cache resets memoization and triggers a fresh fetch', async () => {
      let fetchCallCount = 0;

      globalThis.fetch = vi.fn().mockImplementation(async () => {
        fetchCallCount++;
        return {
          ok: true,
          status: 200,
          json: async () => [...metroStationsJson],
        } as Response;
      });

      await loadMetroStations();
      expect(fetchCallCount).toBe(1);

      clearMetroStationsCache();
      expect(getCachedMetroStations()).toEqual([]);

      const second = await loadMetroStations();
      expect(fetchCallCount).toBe(2);
      expect(second).toHaveLength(242);
    });
  });

  // =========================================================================
  // 4. DIACRITIC & MULTI-FIELD SEARCH STRESS TESTING
  // =========================================================================
  describe('Diacritic & Multi-Field Search Stress Testing', () => {
    it('accurately resolves complex accented Spanish names with and without diacritics', async () => {
      const queries = [
        { query: 'guzman el bueno', expected: 'Guzmán el Bueno' },
        { query: 'GUZMÁN EL BUENO', expected: 'Guzmán el Bueno' },
        { query: 'principe pio', expected: 'Príncipe Pío' },
        { query: 'PRÍNCIPE PÍO', expected: 'Príncipe Pío' },
        { query: 'nunez de balboa', expected: 'Núñez de Balboa' },
        { query: 'núñez de balboa', expected: 'Núñez de Balboa' },
        { query: 'santiago bernabeu', expected: 'Santiago Bernabéu' },
        { query: 'leganes central', expected: 'Leganés Central' },
        { query: 'marques de vadillo', expected: 'Marqués de Vadillo' },
      ];

      for (const { query, expected } of queries) {
        const results = await searchMetroStations(query);
        expect(
          results.length,
          `Search for "${query}" expected to find "${expected}"`
        ).toBeGreaterThan(0);
        expect(results[0].name).toBe(expected);
      }
    });

    it('ranks exact station code matches at the top of search results', async () => {
      // Station code "0112" is Sol
      const solResults = await searchMetroStations('0112');
      expect(solResults[0].id).toBe('0112');
      expect(solResults[0].name).toBe('Sol');

      // Unpadded code "112"
      const unpaddedResults = await searchMetroStations('112');
      expect(unpaddedResults[0].id).toBe('0112');
      expect(unpaddedResults[0].name).toBe('Sol');

      // Secondary code "0208" (Sol Line 2 platform)
      const secondaryResults = await searchMetroStations('0208');
      expect(secondaryResults[0].id).toBe('0112');
      expect(secondaryResults[0].name).toBe('Sol');
    });
  });
});

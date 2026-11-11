import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import metroStationsJson from '../../public/data/metro_stations.json';
import {
  loadMetroStations,
  searchMetroStations,
  findNearestMetroStations,
  getMetroStationByCode,
  getMetroStationById,
  getMetroStationsByLine,
  calculateDistanceMeters,
  normalizeString,
  getCachedMetroStations,
  setCachedMetroStations,
  clearMetroStationsCache,
} from './metroService';
import {
  METRO_LINES,
  METRO_LINES_LIST,
  getMetroLine,
  getMetroLineColor,
  formatMetroLineBadge,
} from '../data/metroLines';

describe('Metro Lines Configuration (metroLines.ts)', () => {
  it('catalogs all 16 official Metro & Metro Ligero lines', () => {
    expect(METRO_LINES_LIST).toHaveLength(16);

    const expectedKeys = [
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
      'R', 'ML1', 'ML2', 'ML3',
    ];
    for (const key of expectedKeys) {
      expect(METRO_LINES[key]).toBeDefined();
      expect(METRO_LINES[key].id).toBe(key);
    }
  });

  it('defines correct official brand hex colors and text contrast colors', () => {
    expect(METRO_LINES['1'].color).toBe('#2DBEF0');
    expect(METRO_LINES['1'].textColor).toBe('#FFFFFF');

    expect(METRO_LINES['2'].color).toBe('#ED1C24');
    expect(METRO_LINES['2'].textColor).toBe('#FFFFFF');

    expect(METRO_LINES['3'].color).toBe('#FFD000');
    expect(METRO_LINES['3'].textColor).toBe('#000000'); // Black text on yellow background

    expect(METRO_LINES['6'].color).toBe('#98989B');
    expect(METRO_LINES['6'].isCircular).toBe(true);

    expect(METRO_LINES['10'].color).toBe('#005AA9');
    expect(METRO_LINES['12'].isCircular).toBe(true);

    // Ramal
    expect(METRO_LINES['R'].color).toBe('#FFFFFF');
    expect(METRO_LINES['R'].textColor).toBe('#005AA9');
    expect(METRO_LINES['R'].borderColor).toBe('#005AA9');

    // Metro Ligero
    expect(METRO_LINES['ML1'].color).toBe('#3A7DDA');
    expect(METRO_LINES['ML1'].type).toBe('metro_ligero');
  });

  it('resolves lines with flexible identifiers via getMetroLine', () => {
    expect(getMetroLine('1')?.id).toBe('1');
    expect(getMetroLine('L1')?.id).toBe('1');
    expect(getMetroLine('l1')?.id).toBe('1');
    expect(getMetroLine('Linea 1')?.id).toBe('1');
    expect(getMetroLine('Línea 10')?.id).toBe('10');
    expect(getMetroLine('R')?.id).toBe('R');
    expect(getMetroLine('Ramal')?.id).toBe('R');
    expect(getMetroLine('ramal')?.id).toBe('R');
    expect(getMetroLine('ML1')?.id).toBe('ML1');
    expect(getMetroLine('ml1')?.id).toBe('ML1');
    expect(getMetroLine('Metro Ligero 2')?.id).toBe('ML2');
    expect(getMetroLine('Circular')?.id).toBe('6');
    expect(getMetroLine('MetroSur')?.id).toBe('12');
    expect(getMetroLine('unknown_line')).toBeUndefined();
  });

  it('resolves line color and fallback via getMetroLineColor', () => {
    expect(getMetroLineColor('1')).toBe('#2DBEF0');
    expect(getMetroLineColor('L2')).toBe('#ED1C24');
    expect(getMetroLineColor('nonexistent')).toBe('#005AA9');
  });

  it('formats badge specification including borders via formatMetroLineBadge', () => {
    const l1Badge = formatMetroLineBadge('1');
    expect(l1Badge).toEqual({
      label: '1',
      bg: '#2DBEF0',
      text: '#FFFFFF',
      border: undefined,
    });

    const rBadge = formatMetroLineBadge('R');
    expect(rBadge).toEqual({
      label: 'R',
      bg: '#FFFFFF',
      text: '#005AA9',
      border: '#005AA9',
    });

    const l3Badge = formatMetroLineBadge('L3');
    expect(l3Badge.text).toBe('#000000');
    expect(l3Badge.bg).toBe('#FFD000');
  });
});

describe('Metro Service (metroService.ts)', () => {
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

  describe('normalizeString and calculateDistanceMeters', () => {
    it('normalizes Spanish accents, uppercase, and whitespace', () => {
      expect(normalizeString('Ópera')).toBe('opera');
      expect(normalizeString('Chamartín')).toBe('chamartin');
      expect(normalizeString('  Guzmán el Bueno  ')).toBe('guzman el bueno');
      expect(normalizeString('Príncipe Pío')).toBe('principe pio');
      expect(normalizeString('Núñez de Balboa')).toBe('nunez de balboa');
    });

    it('calculates Haversine distance correctly in meters', () => {
      // Sol coords: 40.41688, -3.70326
      // Gran Vía coords: 40.4201, -3.7018 (~370 - 400m apart)
      const dist = calculateDistanceMeters(40.41688, -3.70326, 40.4201, -3.7018);
      expect(dist).toBeGreaterThan(340);
      expect(dist).toBeLessThan(430);

      // Same coordinates = 0 meters
      expect(calculateDistanceMeters(40.41688, -3.70326, 40.41688, -3.70326)).toBe(0);
    });
  });

  describe('loadMetroStations & Cache Management', () => {
    it('loads the full catalog of 242 Metro stations from json', async () => {
      const stations = await loadMetroStations();
      expect(stations).toHaveLength(242);

      // Verify structure of first station
      const first = stations[0];
      expect(first.id).toBeDefined();
      expect(first.name).toBeDefined();
      expect(first.lat).toBeGreaterThan(40);
      expect(first.lon).toBeLessThan(0);
      expect(first.lines.length).toBeGreaterThan(0);
    });

    it('memoizes stations in memory so subsequent calls return cached array', async () => {
      const stations1 = await loadMetroStations();
      const stations2 = await loadMetroStations();
      expect(stations1).toBe(stations2); // Exact reference equality
      expect(getCachedMetroStations()).toBe(stations1);
    });

    it('allows clearing and manually setting cache', async () => {
      await loadMetroStations();
      expect(getCachedMetroStations().length).toBe(242);

      clearMetroStationsCache();
      expect(getCachedMetroStations()).toEqual([]);

      const mockStation = {
        id: '9999',
        name: 'Estación Mock',
        address: 'Calle Falsa 123',
        lat: 40.4,
        lon: -3.7,
        lines: ['1'],
      };
      setCachedMetroStations([mockStation]);
      expect(getCachedMetroStations()).toEqual([mockStation]);
    });
  });

  describe('Spatial Search (findNearestMetroStations)', () => {
    it('finds stations near Puerta del Sol with Sol as the closest', async () => {
      const solLat = 40.41688;
      const solLon = -3.70326;

      const nearest = await findNearestMetroStations(solLat, solLon, 5, 2000);
      expect(nearest.length).toBeGreaterThanOrEqual(1);

      // The closest station must be Sol
      const closest = nearest[0];
      expect(closest.name).toBe('Sol');
      expect(closest.distanceMeters).toBeLessThanOrEqual(5);

      // Subsequent nearest should include central stations
      const names = nearest.map((s) => s.name);
      expect(names).toContain('Sol');
      // Results must be sorted ascending by distance
      for (let i = 1; i < nearest.length; i++) {
        expect(nearest[i].distanceMeters).toBeGreaterThanOrEqual(nearest[i - 1].distanceMeters);
      }
    });

    it('respects limit and maxRadiusMeters parameters', async () => {
      const solLat = 40.41688;
      const solLon = -3.70326;

      const limited = await findNearestMetroStations(solLat, solLon, 3, 5000);
      expect(limited).toHaveLength(3);

      const tightRadius = await findNearestMetroStations(solLat, solLon, 10, 50);
      // Only stations within 50m of Sol coords (Sol itself)
      expect(tightRadius.length).toBeGreaterThanOrEqual(1);
      for (const s of tightRadius) {
        expect(s.distanceMeters).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('Diacritic-Insensitive Search (searchMetroStations)', () => {
    it('finds "Ópera" when searching without accent ("opera")', async () => {
      const results = await searchMetroStations('opera');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('Ópera');
    });

    it('finds "Chamartín" when searching without accent ("chamartin")', async () => {
      const results = await searchMetroStations('chamartin');
      expect(results.length).toBeGreaterThan(0);
      const names = results.map((s) => s.name);
      expect(names).toContain('Chamartín');
    });

    it('finds stations serving a line when searching by line number or badge', async () => {
      // Searching "R" or "ramal" should return Ópera and Príncipe Pío
      const ramalResults = await searchMetroStations('R');
      const ramalNames = ramalResults.map((s) => s.name);
      expect(ramalNames).toContain('Ópera');
      expect(ramalNames).toContain('Príncipe Pío');

      // Searching "1" should return stations on Line 1
      const l1Results = await searchMetroStations('1');
      expect(l1Results.length).toBeGreaterThan(10);
      const solInL1 = l1Results.find((s) => s.name === 'Sol');
      expect(solInL1).toBeDefined();
      expect(solInL1?.lines).toContain('1');
    });

    it('finds station by exact station ID or unpadded ID', async () => {
      const solPadded = await searchMetroStations('0112');
      expect(solPadded.length).toBeGreaterThan(0);
      expect(solPadded[0].name).toBe('Sol');

      const solUnpadded = await searchMetroStations('112');
      expect(solUnpadded.length).toBeGreaterThan(0);
      expect(solUnpadded[0].name).toBe('Sol');
    });

    it('returns empty array for empty or whitespace query', async () => {
      expect(await searchMetroStations('')).toEqual([]);
      expect(await searchMetroStations('   ')).toEqual([]);
    });
  });

  describe('Station Code Resolution (getMetroStationByCode)', () => {
    it('retrieves station by master code (padded and unpadded)', async () => {
      const solByPadded = await getMetroStationByCode('0112');
      expect(solByPadded?.name).toBe('Sol');

      const solByUnpadded = await getMetroStationByCode('112');
      expect(solByUnpadded?.name).toBe('Sol');

      const opera = await getMetroStationByCode('0209');
      expect(opera?.name).toBe('Ópera');
    });

    it('retrieves multi-line interchange station by subsidiary platform codes in allCodes', async () => {
      // Sol subsidiary platform codes: "0208" (L2), "0306" (L3)
      const solViaL2Code = await getMetroStationByCode('0208');
      expect(solViaL2Code?.name).toBe('Sol');

      const solViaL3Code = await getMetroStationByCode('0306');
      expect(solViaL3Code?.name).toBe('Sol');

      const solViaUnpaddedL3Code = await getMetroStationByCode('306');
      expect(solViaUnpaddedL3Code?.name).toBe('Sol');

      // Ópera subsidiary code: "0001" (Ramal platform)
      const operaViaRamalCode = await getMetroStationByCode('0001');
      expect(operaViaRamalCode?.name).toBe('Ópera');

      const operaViaUnpaddedRamal = await getMetroStationByCode('1');
      expect(operaViaUnpaddedRamal?.name).toBe('Ópera');
    });

    it('returns null for unknown or empty code', async () => {
      expect(await getMetroStationByCode('')).toBeNull();
      expect(await getMetroStationByCode('99999')).toBeNull();
    });

    it('supports getMetroStationById alias', async () => {
      const res = await getMetroStationById('0112');
      expect(res?.name).toBe('Sol');
    });
  });

  describe('Line Filtering (getMetroStationsByLine)', () => {
    it('retrieves all stations on Line 1', async () => {
      const l1Stations = await getMetroStationsByLine('1');
      expect(l1Stations.length).toBeGreaterThanOrEqual(30);

      const names = l1Stations.map((s) => s.name);
      expect(names).toContain('Sol');
      expect(names).toContain('Chamartín');
      expect(names).toContain('Cuatro Caminos');
      expect(names).toContain('Pinar de Chamartín');

      // All returned stations must have '1' in lines
      for (const st of l1Stations) {
        expect(st.lines).toContain('1');
      }
    });

    it('retrieves exactly the 2 stations on Ramal (Ópera and Príncipe Pío)', async () => {
      const ramalStations = await getMetroStationsByLine('R');
      expect(ramalStations).toHaveLength(2);
      const names = ramalStations.map((s) => s.name);
      expect(names).toContain('Ópera');
      expect(names).toContain('Príncipe Pío');
    });

    it('supports aliases like "L10" or "Linea 10"', async () => {
      const l10 = await getMetroStationsByLine('L10');
      expect(l10.length).toBeGreaterThan(20);
      const names = l10.map((s) => s.name);
      expect(names).toContain('Chamartín');
      expect(names).toContain('Nuevos Ministerios');
    });

    it('returns empty array for invalid line identifier', async () => {
      const result = await getMetroStationsByLine('99');
      expect(result).toEqual([]);
    });
  });
});

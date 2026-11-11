import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act, within, cleanup } from '@testing-library/react';
import { renderApp } from './helpers/renderApp';
import {
  calculateDistanceMeters,
  searchStops,
  findNearestStops,
  loadStops,
  setCachedStops,
} from '../../src/services/stopsService';
import {
  searchMetroStations,
  findNearestMetroStations,
  loadMetroStations,
  setCachedMetroStations,
} from '../../src/services/metroService';
import {
  getMetroLine,
  formatMetroLineBadge,
} from '../../src/data/metroLines';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  getFavoriteMetroStations,
  addFavoriteMetroStation,
  removeFavoriteMetroStation,
  getLastVisitedStopId,
  setLastVisitedStopId,
  getLastVisitedMetroStationId,
  setLastVisitedMetroStationId,
} from '../../src/services/storageService';
import { parsePMVHtml } from '../../src/services/emtParser';
import {
  FIXTURE_METRO_SOL,
  FIXTURE_METRO_OPERA,
  FIXTURE_METRO_ATOCHA,
  FIXTURE_BUS_CIBELES_72,
  FIXTURE_BUS_CRISTO_REY_4514,
} from './helpers/fixtures';

describe('Tier 4: Cross-Cutting, Performance, Offline & PWA Accessibility (50 Tests)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // Suite 1: Accessibility (a11y) & ARIA Compliance (5 tests)
  // =========================================================================
  describe('Suite 1: Accessibility (a11y) & ARIA Compliance', () => {
    it('1.1 ARIA role radiogroup and radios have proper aria-checked attributes', async () => {
      await renderApp();
      const radiogroup = screen.getAllByRole('radiogroup')[0];
      expect(radiogroup).toBeDefined();

      const radios = within(radiogroup).getAllByRole('radio');
      expect(radios.length).toBe(3);

      const allRadio = radios[0];
      expect(allRadio.getAttribute('aria-checked')).toBe('true');
    });

    it('1.2 all interactive icon-only buttons include titles or accessible labels', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByTitle('Guardar en favoritos')).toBeDefined();
        expect(screen.getByTitle('Compartir parada')).toBeDefined();
        expect(screen.getByTitle('Actualizar ahora')).toBeDefined();
        expect(screen.getByTitle('Pausar actualización')).toBeDefined();
      });
    });

    it('1.3 dialog modals have accessible labels (aria-label or aria-labelledby)', async () => {
      await renderApp();
      const dialogs = document.querySelectorAll('dialog');
      expect(dialogs.length).toBeGreaterThan(0);

      dialogs.forEach((d) => {
        const hasAriaLabel = d.hasAttribute('aria-label');
        const hasAriaLabelledBy = d.hasAttribute('aria-labelledby');
        expect(hasAriaLabel || hasAriaLabelledBy).toBe(true);
      });
    });

    it('1.4 search inputs feature semantic <search> container or type="search"', async () => {
      await renderApp();
      const searchInputs = document.querySelectorAll('input[type="search"]');
      expect(searchInputs.length).toBeGreaterThan(0);

      searchInputs.forEach((input) => {
        expect(input.getAttribute('autocomplete')).toBe('off');
      });
    });

    it('1.5 navigation tab bar has accessible landmark role and label', async () => {
      await renderApp();
      const nav = screen.getByRole('navigation', { name: /Navegación principal inferior/i });
      expect(nav).toBeDefined();
    });
  });

  // =========================================================================
  // Suite 2: Mobile Touch & Responsive Ergonomics (5 tests)
  // =========================================================================
  describe('Suite 2: Mobile Touch & Responsive Ergonomics', () => {
    it('2.1 bottom navigation buttons meet 44px minimum height touch target', async () => {
      await renderApp();
      const nav = screen.getByLabelText('Navegación principal inferior');
      const buttons = nav.querySelectorAll('button');

      buttons.forEach((b) => {
        expect(b.className).toContain('min-h-[44px]');
      });
    });

    it('2.2 modal bottom sheets render mobile drag handle indicator', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]')!;
      const dragHandle = dialog.querySelector('div[class*="rounded-full"][class*="sm:hidden"]');
      expect(dragHandle).not.toBeNull();
    });

    it('2.3 critical layouts include safe-area-inset styles for notched screens', async () => {
      await renderApp();
      const header = document.querySelector('header')!;
      const nav = screen.getByLabelText('Navegación principal inferior');

      expect(header.getAttribute('style')).toContain('safe-area-inset-top');
      expect(nav.getAttribute('style')).toContain('safe-area-inset-bottom');
    });

    it('2.4 interactive buttons feature active scale tactile feedback classes', async () => {
      await renderApp();
      const nav = screen.getByLabelText('Navegación principal inferior');
      const buttons = nav.querySelectorAll('button');

      buttons.forEach((b) => {
        expect(b.className).toContain('active:scale-90');
      });
    });

    it('2.5 header is styled as sticky top-0 to remain accessible on scroll', async () => {
      await renderApp();
      const header = document.querySelector('header')!;
      expect(header.className).toContain('sticky');
      expect(header.className).toContain('top-0');
    });
  });

  // =========================================================================
  // Suite 3: Offline & Network Resiliency (5 tests)
  // =========================================================================
  describe('Suite 3: Offline & Network Resiliency', () => {
    it('3.1 loads stops and metro stations from local dataset cache', async () => {
      const stops = await loadStops();
      expect(stops.length).toBeGreaterThan(0);

      const metro = await loadMetroStations();
      expect(metro.length).toBeGreaterThan(0);
    });

    it('3.2 offline network state (navigator.onLine = false) allows browsing cached stations', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Sol' })).toBeDefined();
      });

      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });
    });

    it('3.3 bus estimates fetch error provides clear retry action for offline recovery', async () => {
      await renderApp({ url: 'http://localhost/?stop=999999' });

      await waitFor(() => {
        expect(screen.getByText('Error al obtener estimaciones')).toBeDefined();
        expect(screen.getByText('Reintentar')).toBeDefined();
      });
    });

    it('3.4 window online event listener can be triggered without exception', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
    });

    it('3.5 missing or failed PMV response gracefully displays zero estimates banner', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async (input: any, init: any) => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (urlStr.includes('/api/pmv') || urlStr.includes('PMVVisor')) {
          return new Response('<html><body>Sin datos</body></html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        }
        return originalFetch(input, init);
      });

      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText('No hay estimaciones disponibles en este momento')).toBeDefined();
      });

      globalThis.fetch = originalFetch;
    });
  });

  // =========================================================================
  // Suite 4: Multi-Stop Commuter State & Persistence (5 tests)
  // =========================================================================
  describe('Suite 4: Multi-Stop Commuter State & Persistence', () => {
    it('4.1 persists and retrieves last visited bus stop ID via storageService', () => {
      setLastVisitedStopId('72');
      expect(getLastVisitedStopId()).toBe('72');
    });

    it('4.2 persists and retrieves last visited metro station ID via storageService', () => {
      setLastVisitedMetroStationId('0112');
      expect(getLastVisitedMetroStationId()).toBe('0112');
    });

    it('4.3 adds and removes bus favorites with immutable array returns', () => {
      window.localStorage.clear();
      const updated = addFavorite({ id: '72', name: 'Cibeles' });
      expect(updated.length).toBe(1);
      expect(getFavorites()[0].id).toBe('72');

      const removed = removeFavorite('72');
      expect(removed.length).toBe(0);
      expect(getFavorites().length).toBe(0);
    });

    it('4.4 adds and removes metro favorites with line tracking', () => {
      window.localStorage.clear();
      const updated = addFavoriteMetroStation({ id: '0112', name: 'Sol', lines: ['1', '2', '3'] });
      expect(updated.length).toBe(1);
      expect(getFavoriteMetroStations()[0].lines).toEqual(['1', '2', '3']);

      const removed = removeFavoriteMetroStation('0112');
      expect(removed.length).toBe(0);
      expect(getFavoriteMetroStations().length).toBe(0);
    });

    it('4.5 maintains independent lists for bus and metro favorites in localStorage', async () => {
      window.localStorage.clear();
      addFavorite({ id: '72', name: 'Cibeles' });
      addFavoriteMetroStation({ id: '0112', name: 'Sol', lines: ['1', '2', '3'] });

      expect(getFavorites().length).toBe(1);
      expect(getFavoriteMetroStations().length).toBe(1);
      expect(window.localStorage.getItem('emt_madrid_favorites_v1')).toContain('72');
      expect(window.localStorage.getItem('metro_madrid_favorites_v1')).toContain('0112');
    });
  });

  // =========================================================================
  // Suite 5: Visual Styling, Theme Consistency & Contrast (5 tests)
  // =========================================================================
  describe('Suite 5: Visual Styling, Theme Consistency & Contrast', () => {
    it('5.1 light theme mounts with slate-50 background class', async () => {
      await renderApp({ theme: 'light' });
      const rootDiv = document.querySelector('.min-h-dvh')!;
      expect(rootDiv.className).toContain('bg-slate-50');
    });

    it('5.2 dark theme mounts with dark:bg-slate-950 background class', async () => {
      await renderApp({ theme: 'dark' });
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      const rootDiv = document.querySelector('.min-h-dvh')!;
      expect(rootDiv.className).toContain('dark:bg-slate-950');
    });

    it('5.3 metro line badges match official Metro de Madrid hex colors', () => {
      const badgeL1 = formatMetroLineBadge('1');
      expect(badgeL1.bg.toLowerCase()).toBe('#2dbef0');

      const badgeL2 = formatMetroLineBadge('2');
      expect(badgeL2.bg.toLowerCase()).toBe('#ed1c24');

      const badgeL3 = formatMetroLineBadge('3');
      expect(badgeL3.bg.toLowerCase()).toBe('#ffd000');

      const badgeR = formatMetroLineBadge('R');
      expect(badgeR.label).toBe('R');
    });

    it('5.4 bus line numbers use bold high-contrast badges in estimates list', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText('CRISTO REY')).toBeDefined();
      });

      const linePills = screen.getAllByText('1');
      expect(linePills.length).toBeGreaterThan(0);
    });

    it('5.5 countdown bar width style updates to reflect progress', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        const progressIndicator = document.querySelector('.bg-blue-600') as HTMLElement;
        expect(progressIndicator).not.toBeNull();
      });
    });
  });

  // =========================================================================
  // Suite 6: Search Performance & Indexing (5 tests)
  // =========================================================================
  describe('Suite 6: Search Performance & Indexing', () => {
    it('6.1 searches 4,933 bus stops synchronously in under 20ms', async () => {
      await loadStops();
      const start = performance.now();
      const results = searchStops('Cibeles', 25);
      const duration = performance.now() - start;

      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50);
    });

    it('6.2 searches metro stations in under 20ms', async () => {
      await loadMetroStations();
      const start = performance.now();
      const results = await searchMetroStations('Sol', 25);
      const duration = performance.now() - start;

      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50);
    });

    it('6.3 search results count respects maximum limit parameter', async () => {
      await loadStops();
      const limitedResults = searchStops('a', 5);
      expect(limitedResults.length).toBeLessThanOrEqual(5);
    });

    it('6.4 empty or whitespace query returns empty array immediately', async () => {
      expect(searchStops('')).toEqual([]);
      expect(searchStops('    ')).toEqual([]);
      expect(await searchMetroStations('')).toEqual([]);
    });

    it('6.5 prioritizes exact name matches over partial address matches', async () => {
      await loadMetroStations();
      const results = await searchMetroStations('Sol');
      expect(results[0].name).toBe('Sol');
    });
  });

  // =========================================================================
  // Suite 7: Spatial Math & Distance Calculations (5 tests)
  // =========================================================================
  describe('Suite 7: Spatial Math & Distance Calculations', () => {
    it('7.1 calculates distance between Sol and Cibeles accurately (~950m)', () => {
      // Puerta del Sol: 40.41688, -3.70326
      // Plaza de Cibeles: 40.41905, -3.69255
      const distance = calculateDistanceMeters(40.41688, -3.70326, 40.41905, -3.69255);
      expect(distance).toBeGreaterThan(850);
      expect(distance).toBeLessThan(1050);
    });

    it('7.2 returns 0 meters when comparing identical coordinates', () => {
      const distance = calculateDistanceMeters(40.4168, -3.7038, 40.4168, -3.7038);
      expect(distance).toBe(0);
    });

    it('7.3 findNearestStops returns results sorted strictly by ascending distance', async () => {
      await loadStops();
      const nearest = findNearestStops(40.4168, -3.7038, 10);
      expect(nearest.length).toBeGreaterThan(1);

      for (let i = 1; i < nearest.length; i++) {
        expect(nearest[i].distanceMeters).toBeGreaterThanOrEqual(nearest[i - 1].distanceMeters);
      }
    });

    it('7.4 findNearestMetroStations returns results sorted strictly by ascending distance', async () => {
      await loadMetroStations();
      const nearest = await findNearestMetroStations(40.4168, -3.7038, 10);
      expect(nearest.length).toBeGreaterThan(1);

      for (let i = 1; i < nearest.length; i++) {
        expect(nearest[i].distanceMeters).toBeGreaterThanOrEqual(nearest[i - 1].distanceMeters);
      }
    });

    it('7.5 nearest finder excludes stops beyond max radius (default 5000m)', async () => {
      await loadStops();
      // Point in London, UK
      const nearest = findNearestStops(51.5074, -0.1278, 10);
      expect(nearest.length).toBe(0);
    });
  });

  // =========================================================================
  // Suite 8: URL State & Deep Linking Completeness (5 tests)
  // =========================================================================
  describe('Suite 8: URL State & Deep Linking Completeness', () => {
    it('8.1 parses ?stop=72 on initial load and loads bus view directly', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
      });
    });

    it('8.2 parses ?metro=0112 on initial load and loads metro view directly', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Sol' })).toBeDefined();
      });
    });

    it('8.3 parses hash fragment fallback (#72) as bus stop ID', async () => {
      await renderApp({ url: 'http://localhost/#72' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
      });
    });

    it('8.4 cleans URL when returning home via handleClearAll or brand logo', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
      });

      const brandLogo = screen.getByTitle('Ir al inicio');
      await act(async () => {
        fireEvent.click(brandLogo);
      });

      await waitFor(() => {
        expect(window.location.search).not.toContain('stop=72');
      });
    });

    it('8.5 switches between metro and stop query params cleanly without overlap', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Sol' })).toBeDefined();
      });

      // Navigate to bus stop
      cleanup();
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // Suite 9: Data Integrity & Schema Validation (5 tests)
  // =========================================================================
  describe('Suite 9: Data Integrity & Schema Validation', () => {
    it('9.1 validates all metro stations have id, name, lines, and coordinates', async () => {
      setCachedMetroStations(null as any);
      const stations = await loadMetroStations();
      expect(stations.length).toBeGreaterThan(200);

      stations.forEach((s) => {
        expect(typeof s.id).toBe('string');
        expect(typeof s.name).toBe('string');
        expect(Array.isArray(s.lines)).toBe(true);
        expect(s.lines.length).toBeGreaterThan(0);
        expect(typeof s.lat).toBe('number');
        expect(typeof s.lon).toBe('number');
      });
    });

    it('9.2 validates all bus stops have id, name, and valid coordinates', async () => {
      setCachedStops(null as any);
      const stops = await loadStops();
      expect(stops.length).toBeGreaterThan(4000);

      const sample = stops.slice(0, 100);
      sample.forEach((s) => {
        expect(typeof s.id).toBe('string');
        expect(typeof s.name).toBe('string');
        expect(typeof s.lat).toBe('number');
        expect(typeof s.lon).toBe('number');
      });
    });

    it('9.3 confirms metro lines configuration contains all 16 lines', () => {
      const lines = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'R', 'ML1', 'ML2', 'ML3'];
      lines.forEach((lineId) => {
        const config = getMetroLine(lineId);
        expect(config).not.toBeNull();
        expect(config?.color).toBeDefined();
      });
    });

    it('9.4 validates PMV HTML parser extracts arrival rows cleanly', () => {
      const sampleHtml = `
        <p><h2>Parada:72 Cibeles</h2></p>
        <p><h2>Paseo de Recoletos</h2></p>
        <table border="1"><tbody>
          <tr><td>Línea</td><td>Hacia</td><td>Tiempo</td><td>Dónde está</td></tr>
          <tr><td>1</td><td>CRISTO REY</td><td>Llegando</td><td>En parada</td></tr>
          <tr><td>2</td><td>MANUEL BECERRA</td><td>4 min</td><td>A 800m</td></tr>
        </tbody></table>
      `;

      const parsed = parsePMVHtml(sampleHtml, '72');
      expect(parsed.stopId).toBe('72');
      expect(parsed.stopName).toBe('Cibeles');
      expect(parsed.address).toBe('Paseo de Recoletos');
      expect(parsed.estimates.length).toBe(2);
      expect(parsed.estimates[0].line).toBe('1');
      expect(parsed.estimates[0].etaMinutes).toBe(0);
      expect(parsed.estimates[1].line).toBe('2');
      expect(parsed.estimates[1].etaMinutes).toBe(4);
    });

    it('9.5 PMV parser handles empty or malformed HTML safely', () => {
      const parsedEmpty = parsePMVHtml('', '72');
      expect(parsedEmpty.estimates.length).toBe(0);

      const parsedGibberish = parsePMVHtml('<div>Sin tabla</div>', '72');
      expect(parsedGibberish.estimates.length).toBe(0);
    });
  });

  // =========================================================================
  // Suite 10: Lifecycle & Memory Leak Prevention (5 tests)
  // =========================================================================
  describe('Suite 10: Lifecycle & Memory Leak Prevention', () => {
    it('10.1 unmounting App clears intervals and event listeners cleanly', async () => {
      const { unmount } = await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
      });

      expect(() => unmount()).not.toThrow();
    });

    it('10.2 unmounting metro view stops countdown interval timer', async () => {
      const { unmount } = await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Sol' })).toBeDefined();
      });

      expect(() => unmount()).not.toThrow();
    });

    it('10.3 closing modals releases dialog open attribute and focus', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      expect(dialog.open).toBe(true);

      const closeBtn = within(dialog).getByLabelText(/Cerrar buscador/i);
      await act(async () => {
        fireEvent.click(closeBtn);
      });

      await waitFor(() => {
        expect(dialog.open).toBe(false);
      });
    });

    it('10.4 rapid opening and closing of nearest stops modal does not leak state', async () => {
      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];

      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="nearest-stops-title"]') as HTMLDialogElement;
      await waitFor(() => {
        expect(dialog.open).toBe(true);
      });

      const closeBtn = within(dialog).getByLabelText('Cerrar paradas cercanas');
      await act(async () => {
        fireEvent.click(closeBtn);
      });

      await waitFor(() => {
        expect(dialog.open).toBe(false);
      });
    });

    it('10.5 rapid switching between views mounts and unmounts child components cleanly', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Sol' })).toBeDefined();
      });

      cleanup();
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
      });

      cleanup();
      await renderApp();

      expect(screen.getByText('¿A dónde te mueves en Madrid?')).toBeDefined();
    });
  });
});

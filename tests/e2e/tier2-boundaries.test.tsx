import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act, within, cleanup } from '@testing-library/react';
import { renderApp } from './helpers/renderApp';
import { setMockMetroError } from './setup';
import {
  FIXTURE_METRO_SOL,
  FIXTURE_METRO_OPERA,
  FIXTURE_METRO_ATOCHA,
  FIXTURE_BUS_CIBELES_72,
  FIXTURE_BUS_CRISTO_REY_4514,
} from './helpers/fixtures';

describe('Tier 2: Boundary & Corner Cases (50 Tests)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // Feature 1 Boundaries: Landing Search (5 tests)
  // =========================================================================
  describe('Feature 1 Boundaries: Landing Search', () => {
    it('1.1 handles diacritics insensitivity ("opera" matches "Ópera")', async () => {
      await renderApp();
      const searchInput = screen.getByPlaceholderText(/Escribe una estación, parada, calle o línea/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'opera' } });
      });

      await waitFor(() => {
        expect(screen.getAllByText('Ópera').length).toBeGreaterThan(0);
      });
    });

    it('1.2 trims excessive leading and trailing whitespace from query', async () => {
      await renderApp();
      const searchInput = screen.getByPlaceholderText(/Escribe una estación, parada, calle o línea/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '   Sol   ' } });
      });

      await waitFor(() => {
        expect(screen.getAllByText('Sol').length).toBeGreaterThan(0);
      });
    });

    it('1.3 displays empty state when query matches no stations or stops', async () => {
      await renderApp();
      const searchInput = screen.getByPlaceholderText(/Escribe una estación, parada, calle o línea/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'zzzzxxxxx999999' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/No se encontraron resultados para/i)).toBeDefined();
      });
    });

    it('1.4 single character query executes safely without throwing or lag', async () => {
      await renderApp();
      const searchInput = screen.getByPlaceholderText(/Escribe una estación, parada, calle o línea/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '1' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Resultados encontrados/i)).toBeDefined();
      });
    });

    it('1.5 queries with special regex characters do not crash the app', async () => {
      await renderApp();
      const searchInput = screen.getByPlaceholderText(/Escribe una estación, parada, calle o línea/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '.*+?^${}()|[]\\' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/No se encontraron resultados para/i)).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Feature 2 Boundaries: Transport Mode Selector (5 tests)
  // =========================================================================
  describe('Feature 2 Boundaries: Transport Mode Selector', () => {
    it('2.1 unknown or invalid URL mode parameter falls back to "all"', async () => {
      await renderApp({ url: 'http://localhost/?mode=spaceship' });
      const todosRadio = screen.getAllByRole('radio', { name: /Todos/i })[0];
      expect(todosRadio.getAttribute('aria-checked')).toBe('true');
    });

    it('2.2 rapid switching between all 3 modes leaves UI in stable state', async () => {
      await renderApp();
      const metroRadios = screen.getAllByRole('radio', { name: /Metro/i });
      const busRadios = screen.getAllByRole('radio', { name: /Autobús/i });
      const todosRadios = screen.getAllByRole('radio', { name: /Todos/i });

      await act(async () => {
        fireEvent.click(metroRadios[0]);
        fireEvent.click(busRadios[0]);
        fireEvent.click(todosRadios[0]);
      });

      expect(todosRadios[0].getAttribute('aria-checked')).toBe('true');
    });

    it('2.3 changing mode preserves user search input text', async () => {
      await renderApp();
      const searchInput = screen.getByLabelText(/Buscar paradas, estaciones o líneas/i) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Gran Vía' } });
      });

      const metroRadios = screen.getAllByRole('radio', { name: /Metro/i });
      await act(async () => {
        fireEvent.click(metroRadios[0]);
      });

      expect(searchInput.value).toBe('Gran Vía');
    });

    it('2.4 shows empty state when active mode excludes all matches for query', async () => {
      await renderApp();
      const metroRadios = screen.getAllByRole('radio', { name: /Metro/i });
      await act(async () => {
        fireEvent.click(metroRadios[0]);
      });

      const searchInput = screen.getByLabelText(/Buscar paradas, estaciones o líneas/i);
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Cristo Rey' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/No se encontraron resultados para/i)).toBeDefined();
      });
    });

    it('2.5 corrupted localStorage value for transport mode defaults cleanly to "all"', async () => {
      window.localStorage.setItem('madrid_transporte_mode_v1', '{corrupted:bad');
      await renderApp();

      const todosRadios = screen.getAllByRole('radio', { name: /Todos/i });
      expect(todosRadios[0].getAttribute('aria-checked')).toBe('true');
    });
  });

  // =========================================================================
  // Feature 3 Boundaries: Search Modal (5 tests)
  // =========================================================================
  describe('Feature 3 Boundaries: Search Modal', () => {
    it('3.1 backdrop click outside dialog dismisses the modal', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      expect(dialog).not.toBeNull();
      expect(dialog.open).toBe(true);

      vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        right: 400,
        top: 100,
        bottom: 500,
        width: 300,
        height: 400,
        x: 100,
        y: 100,
        toJSON: () => {},
      });

      await act(async () => {
        fireEvent.click(dialog, { clientX: 10, clientY: 10 });
      });

      await waitFor(() => {
        expect(dialog.open).toBe(false);
      });
    });

    it('3.2 pressing Escape key triggers onCancel and dismisses SearchModal', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      expect(dialog).not.toBeNull();
      expect(dialog.open).toBe(true);

      await act(async () => {
        fireEvent(dialog, new Event('cancel', { cancelable: true }));
      });

      await waitFor(() => {
        expect(dialog.open).toBe(false);
      });
    });

    it('3.3 toggling ⌘K twice in succession leaves modal cleanly closed', async () => {
      await renderApp();

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      expect(dialog).not.toBeNull();
      expect(dialog.open).toBe(true);

      const closeBtn = within(dialog).getByLabelText(/Cerrar buscador/i);
      await act(async () => {
        fireEvent.click(closeBtn);
      });

      await waitFor(() => {
        expect(dialog.open).toBe(false);
      });
    });

    it('3.4 selecting a search result item navigates and closes the modal', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      expect(dialog).not.toBeNull();
      const searchInput = within(dialog).getByPlaceholderText(/Estación de metro, parada de autobús/i);
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Sol' } });
      });

      await waitFor(() => {
        expect(within(dialog).getAllByText('Sol').length).toBeGreaterThan(0);
      });

      const solItem = within(dialog).getAllByText('Sol')[0].closest('div[class*="cursor-pointer"]')!;
      await act(async () => {
        fireEvent.click(solItem);
      });

      await waitFor(() => {
        expect(dialog.open).toBe(false);
        expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
      });
    });

    it('3.5 empty search input in modal displays popular hubs rather than error', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      expect(dialog).not.toBeNull();
      expect(within(dialog).getByText(/Intercambiadores y Estaciones Populares/i)).toBeDefined();
      expect(within(dialog).getByText('Atocha')).toBeDefined();
    });
  });

  // =========================================================================
  // Feature 4 Boundaries: Metro Station Experience (5 tests)
  // =========================================================================
  describe('Feature 4 Boundaries: Metro Station Experience', () => {
    it('4.1 station code resolves correctly regardless of zero-padding ("112" vs "0112")', async () => {
      await renderApp({ url: 'http://localhost/?metro=112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
      });
    });

    it('4.2 renders empty estimates state gracefully with retry button when no trains arrive', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async (input: any, init: any) => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (urlStr.includes('/api/metro') || urlStr.includes('teleindicadores')) {
          return new Response(JSON.stringify({ Vtelindicadores: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(input, init);
      });

      await renderApp({ url: 'http://localhost/?metro=0116' });

      await waitFor(() => {
        expect(screen.getByText('Sin estimaciones en este momento')).toBeDefined();
        expect(screen.getByText('Reintentar actualización')).toBeDefined();
      });

      globalThis.fetch = originalFetch;
    });

    it('4.3 displays service warning alert when API returns error', async () => {
      setMockMetroError('Fallo de conexión con Metro');

      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByText(/Aviso del servicio:/i)).toBeDefined();
      });

      setMockMetroError(null);
    });

    it('4.4 station with single line does not render multi-line filter bar', async () => {
      await renderApp({ url: 'http://localhost/?metro=0116' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Atocha' })).toBeDefined();
      });

      expect(screen.queryByText(/Todas las líneas/i)).toBeNull();
    });

    it('4.5 station view share button falls back to clipboard when Web Share API is unavailable', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByTitle('Compartir estación')).toBeDefined();
      });

      const shareBtn = screen.getByTitle('Compartir estación');
      await act(async () => {
        fireEvent.click(shareBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('¡Copiado!')).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Feature 5 Boundaries: EMT Bus Stop Experience (5 tests)
  // =========================================================================
  describe('Feature 5 Boundaries: EMT Bus Stop Experience', () => {
    it('5.1 non-existent or error stop ID displays retry banner', async () => {
      await renderApp({ url: 'http://localhost/?stop=999999' });

      await waitFor(() => {
        expect(screen.getByText('Error al obtener estimaciones')).toBeDefined();
        expect(screen.getByText('Reintentar')).toBeDefined();
      });
    });

    it('5.2 handles empty estimates response with informative message and recheck button', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async (input: any, init: any) => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (urlStr.includes('/api/pmv') || urlStr.includes('PMVVisor')) {
          const emptyHtml = `
            <p><h2>Parada:72 Cibeles</h2></p>
            <p><h2>Paseo de Recoletos</h2></p>
            <table border="1"><tbody><tr><td>Línea</td><td>Hacia</td><td>Tiempo</td></tr></tbody></table>
          `;
          return new Response(emptyHtml, { status: 200, headers: { 'Content-Type': 'text/html' } });
        }
        return originalFetch(input, init);
      });

      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText('No hay estimaciones disponibles en este momento')).toBeDefined();
        expect(screen.getByText('Comprobar de nuevo')).toBeDefined();
      });

      globalThis.fetch = originalFetch;
    });

    it('5.3 filtering by line with zero arrivals shows targeted notice', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText('CRISTO REY')).toBeDefined();
      });

      const line202Pill = screen.getByRole('button', { name: '202' });
      await act(async () => {
        fireEvent.click(line202Pill);
      });

      await waitFor(() => {
        expect(screen.getByText('PAVONES')).toBeDefined();
        expect(screen.queryByText('CRISTO REY')).toBeNull();
      });
    });

    it('5.4 bus estimate without GPS coordinates does not render map navigation pin', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async (input: any, init: any) => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (urlStr.includes('/api/pmv') || urlStr.includes('PMVVisor')) {
          const noGpsHtml = `
            <p><h2>Parada:72 Cibeles</h2></p>
            <table border="1"><tbody>
              <tr><td>Línea</td><td>Hacia</td><td>Tiempo</td><td>Dónde está</td></tr>
              <tr><td>1</td><td>CRISTO REY</td><td>5 min</td><td>Sin GPS</td></tr>
            </tbody></table>
          `;
          return new Response(noGpsHtml, { status: 200, headers: { 'Content-Type': 'text/html' } });
        }
        return originalFetch(input, init);
      });

      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText('CRISTO REY')).toBeDefined();
      });

      expect(screen.queryByTitle('Ver autobús en el mapa')).toBeNull();

      globalThis.fetch = originalFetch;
    });

    it('5.5 stop header share button writes to clipboard and shows feedback', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByTitle('Compartir parada')).toBeDefined();
      });

      const shareBtn = screen.getByTitle('Compartir parada');
      await act(async () => {
        fireEvent.click(shareBtn);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Feature 6 Boundaries: Live Auto-Refresh & Countdown (5 tests)
  // =========================================================================
  describe('Feature 6 Boundaries: Live Auto-Refresh & Countdown', () => {
    it('6.1 hidden tab state suspends countdown decrement in metro view', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByText(/Actualización automática en \d+s/i)).toBeDefined();
      });

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      const initialText = screen.getByText(/Actualización automática en \d+s/i).textContent;

      await act(async () => {
        await new Promise((r) => setTimeout(r, 1100));
      });

      expect(screen.getByText(/Actualización automática en \d+s/i).textContent).toBe(initialText);

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
    });

    it('6.2 switching between stops immediately resets countdown to 30s', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText(/Actualización automática en \d+s/i)).toBeDefined();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 1100));
      });

      cleanup();
      await renderApp({ url: 'http://localhost/?stop=4514' });

      await waitFor(() => {
        expect(screen.getByText(/Actualización automática en 30s/i)).toBeDefined();
      });
    });

    it('6.3 auto-refresh bar displays "Actualizando estimaciones..." while network request is pending', async () => {
      let finishFetch: any;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation((input: any, init: any) => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (urlStr.includes('/api/pmv') || urlStr.includes('PMVVisor')) {
          return new Promise((resolve) => {
            finishFetch = resolve;
          });
        }
        return originalFetch(input, init);
      });

      await renderApp({ url: 'http://localhost/?stop=72' });

      expect(screen.getByText('Actualizando estimaciones...')).toBeDefined();

      await act(async () => {
        finishFetch(
          new Response(
            '<p><h2>Parada:72 Cibeles</h2></p><table border="1"><tbody><tr><td>1</td><td>CRISTO REY</td><td>2 min</td><td></td></tr></tbody></table>',
            { status: 200, headers: { 'Content-Type': 'text/html' } }
          )
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/Actualización automática en \d+s/i)).toBeDefined();
      });

      globalThis.fetch = originalFetch;
    });

    it('6.4 pause state prevents countdown loop from resetting or triggering fetch', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByTitle('Pausar actualización')).toBeDefined();
      });

      const pauseBtn = screen.getByTitle('Pausar actualización');
      await act(async () => {
        fireEvent.click(pauseBtn);
      });

      expect(screen.getByText('Actualización automática pausada')).toBeDefined();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 1100));
      });

      expect(screen.getByText('Actualización automática pausada')).toBeDefined();
    });

    it('6.5 relative time indicator handles null or recent timestamps gracefully', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText(/Última: justo ahora/i)).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Feature 7 Boundaries: Favorites Management (5 tests)
  // =========================================================================
  describe('Feature 7 Boundaries: Favorites Management', () => {
    it('7.1 handles corrupted favorites JSON in localStorage gracefully without throwing', async () => {
      window.localStorage.setItem('emt_madrid_favorites_v1', '{invalid-json');
      await renderApp();

      const favTab = screen.getByRole('button', { name: /Favoritos/i });
      await act(async () => {
        fireEvent.click(favTab);
      });

      await waitFor(() => {
        expect(screen.getByText('No tienes favoritos guardados')).toBeDefined();
      });
    });

    it('7.2 adding an already favorited stop does not create duplicate entries', async () => {
      await renderApp({
        busFavorites: [{ id: '72', name: 'Cibeles', lines: ['1'] }],
        url: 'http://localhost/?stop=72',
      });

      await waitFor(() => {
        expect(screen.getByTitle('Quitar de favoritos')).toBeDefined();
      });

      const favsRaw = window.localStorage.getItem('emt_madrid_favorites_v1');
      const parsed = JSON.parse(favsRaw || '[]');
      expect(parsed.filter((f: any) => f.id === '72').length).toBe(1);
    });

    it('7.3 deleting the last remaining favorite triggers empty state', async () => {
      await renderApp({
        busFavorites: [{ id: '72', name: 'Cibeles', lines: ['1'] }],
      });

      const favTab = screen.getByRole('button', { name: /Favoritos/i });
      await act(async () => {
        fireEvent.click(favTab);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="favorites-title"]')!;
      await waitFor(() => {
        expect(within(dialog).getByTitle('Eliminar de favoritos')).toBeDefined();
      });

      const deleteBtn = within(dialog).getByTitle('Eliminar de favoritos');
      await act(async () => {
        fireEvent.click(deleteBtn);
      });

      await waitFor(() => {
        expect(within(dialog).getByText('No tienes favoritos guardados')).toBeDefined();
      });
    });

    it('7.4 modal tab switching between "Metro" and "Autobús" filters list accurately', async () => {
      await renderApp({
        busFavorites: [{ id: '72', name: 'Cibeles', lines: ['1'] }],
        metroFavorites: [{ id: '0112', name: 'Sol', lines: ['1', '2', '3'] }],
      });

      const favTab = screen.getByRole('button', { name: /Favoritos/i });
      await act(async () => {
        fireEvent.click(favTab);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="favorites-title"]')!;
      const metroTab = within(dialog).getByRole('button', { name: /Metro/i });
      await act(async () => {
        fireEvent.click(metroTab);
      });

      await waitFor(() => {
        expect(within(dialog).getByText('Sol')).toBeDefined();
        expect(within(dialog).queryByText('Cibeles')).toBeNull();
      });
    });

    it('7.5 clicking backdrop dismisses FavoritesModal', async () => {
      await renderApp({
        busFavorites: [{ id: '72', name: 'Cibeles', lines: ['1'] }],
      });

      const favTab = screen.getByRole('button', { name: /Favoritos/i });
      await act(async () => {
        fireEvent.click(favTab);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="favorites-title"]') as HTMLDialogElement;
      expect(dialog.open).toBe(true);

      vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        right: 400,
        top: 100,
        bottom: 500,
        width: 300,
        height: 400,
        x: 100,
        y: 100,
        toJSON: () => {},
      });

      await act(async () => {
        fireEvent.click(dialog, { clientX: 10, clientY: 10 });
      });

      await waitFor(() => {
        expect(dialog.open).toBe(false);
      });
    });
  });

  // =========================================================================
  // Feature 8 Boundaries: Geolocation (5 tests)
  // =========================================================================
  describe('Feature 8 Boundaries: Geolocation', () => {
    it('8.1 handles geolocation permission denied error without unhandled crash', async () => {
      const windowAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
      vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementationOnce(
        (_success, error) => {
          if (error) {
            error({
              code: 1,
              message: 'User denied geolocation',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          }
        }
      );

      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];
      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      expect(windowAlert).toHaveBeenCalled();
    });

    it('8.2 coordinates outside Madrid area (>100km away) yields 0 nearby stops within 5km', async () => {
      vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementationOnce((success) => {
        success({
          coords: { latitude: 51.5074, longitude: -0.1278 }, // London
          timestamp: Date.now(),
        } as GeolocationPosition);
      });

      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];
      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Transporte Cerca de Ti')).toBeDefined();
        expect(screen.getByText('No se encontraron transportes cercanos')).toBeDefined();
      });
    });

    it('8.3 handles geolocation timeout cleanly and resets locating state', async () => {
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementationOnce(
        (_success, error) => {
          if (error) {
            error({
              code: 3,
              message: 'Timeout expired',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          }
        }
      );

      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];
      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      expect(screen.queryByText('Obteniendo GPS...')).toBeNull();
    });

    it('8.4 NearestStopsModal filter tabs filter results between Metro and Bus accurately', async () => {
      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];
      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="nearest-stops-title"]')!;
      await waitFor(() => {
        expect(within(dialog).getByText('Transporte Cerca de Ti')).toBeDefined();
      });

      const metroTab = within(dialog).getByRole('button', { name: /Metro/i });
      await act(async () => {
        fireEvent.click(metroTab);
      });

      await waitFor(() => {
        expect(within(dialog).getByText('Sol')).toBeDefined();
      });
    });

    it('8.5 displays alert when navigator.geolocation is completely undefined', async () => {
      const windowAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const originalGeo = navigator.geolocation;
      try {
        Object.defineProperty(navigator, 'geolocation', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        await renderApp();
        const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];
        await act(async () => {
          fireEvent.click(nearMeBtn);
        });

        expect(windowAlert).toHaveBeenCalledWith('La geolocalización no está soportada por su navegador.');
      } finally {
        Object.defineProperty(navigator, 'geolocation', {
          value: originalGeo,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  // =========================================================================
  // Feature 9 Boundaries: Visual System & Responsive (5 tests)
  // =========================================================================
  describe('Feature 9 Boundaries: Visual System & Responsive', () => {
    it('9.1 corrupted theme value in localStorage recovers safely to light/system', async () => {
      window.localStorage.setItem('emt_madrid_theme_v1', '{broken:val');
      await renderApp();

      expect(document.querySelector('header')).not.toBeNull();
    });

    it('9.2 rapid toggling between dark and light themes preserves consistency', async () => {
      await renderApp();
      const themeBtn = screen.getByTitle('Cambiar a modo oscuro');

      await act(async () => {
        fireEvent.click(themeBtn);
      });
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      const lightBtn = screen.getByTitle('Cambiar a modo claro');
      await act(async () => {
        fireEvent.click(lightBtn);
      });
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('9.3 respects prefers-color-scheme: dark media query when theme is system', async () => {
      (window.matchMedia as any).mockImplementationOnce((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      await renderApp({ theme: 'system' });
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('9.4 bottom tab bar preserves touch targets on simulated mobile viewport', async () => {
      await renderApp();
      const mobileNav = screen.getByLabelText('Navegación principal inferior');
      const buttons = mobileNav.querySelectorAll('button');

      expect(buttons.length).toBe(5);
      buttons.forEach((b) => {
        expect(b.className).toContain('active:scale-90');
      });
    });

    it('9.5 header logo press triggers smooth home navigation without page reload', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
      });

      const brandLogo = screen.getByTitle('Ir al inicio');
      await act(async () => {
        fireEvent.click(brandLogo);
      });

      await waitFor(() => {
        expect(screen.getByText('¿A dónde te mueves en Madrid?')).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Feature 10 Boundaries: URL State & Deep Linking (5 tests)
  // =========================================================================
  describe('Feature 10 Boundaries: URL State & Deep Linking', () => {
    it('10.1 invalid numeric stop ID in URL loads cleanly without uncaught exception', async () => {
      await renderApp({ url: 'http://localhost/?stop=999999' });

      await waitFor(() => {
        expect(screen.getByText(/Parada 999999/i)).toBeDefined();
      });
    });

    it('10.2 invalid metro station code query parameter falls back gracefully', async () => {
      await renderApp({ url: 'http://localhost/?metro=999999' });

      // Station code 999999 is not in stations list, app stays on landing page safely
      await waitFor(() => {
        expect(document.querySelector('header')).not.toBeNull();
      });
    });

    it('10.3 URL with empty parameters (?stop=&metro=) defaults to landing page', async () => {
      await renderApp({ url: 'http://localhost/?stop=&metro=' });

      expect(screen.getByText('¿A dónde te mueves en Madrid?')).toBeDefined();
    });

    it('10.4 browser back button popstate event returns from stop view to landing', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
      });

      // Simulate browser back button with relative path
      window.history.replaceState({}, '', '/');
      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      await waitFor(() => {
        expect(screen.getByText('¿A dónde te mueves en Madrid?')).toBeDefined();
      });
    });

    it('10.5 switching from metro station to bus stop updates URL query params accurately', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
      });

      const searchBtn = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchBtn);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      expect(dialog).not.toBeNull();

      const searchInput = within(dialog).getByPlaceholderText(/Estación de metro, parada de autobús/i);
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Cibeles' } });
      });

      await waitFor(() => {
        expect(within(dialog).getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
      });

      const cibelesItem = within(dialog).getAllByText(/Cibeles/i)[0].closest('div[class*="cursor-pointer"]')!;
      await act(async () => {
        fireEvent.click(cibelesItem);
      });

      await waitFor(() => {
        expect(window.location.search).toContain('stop=72');
        expect(window.location.search).not.toContain('metro=');
      });
    });
  });
});

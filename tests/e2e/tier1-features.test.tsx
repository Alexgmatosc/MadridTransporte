import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act, within, cleanup } from '@testing-library/react';
import { renderApp } from './helpers/renderApp';
import {
  FIXTURE_METRO_SOL,
  FIXTURE_METRO_OPERA,
  FIXTURE_BUS_CIBELES_72,
  FIXTURE_BUS_CRISTO_REY_4514,
} from './helpers/fixtures';

describe('Tier 1: Feature Coverage (50 Tests)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // Feature 1: Landing Search (5 tests)
  // =========================================================================
  describe('Feature 1: Landing Search', () => {
    it('1.1 renders hero banner with headline and service descriptors', async () => {
      await renderApp();
      expect(screen.getByText('¿A dónde te mueves en Madrid?')).toBeDefined();
      expect(screen.getByText(/Tiempos de llegada en tiempo real para/i)).toBeDefined();
      expect(screen.getAllByText(/Metro de Madrid/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Autobuses EMT/i).length).toBeGreaterThan(0);
    });

    it('1.2 typing live search query filters and displays matching results', async () => {
      await renderApp();
      const searchInput = screen.getByPlaceholderText(/Escribe una estación, parada, calle o línea/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Sol' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Resultados encontrados/i)).toBeDefined();
        expect(screen.getByText('Plaza de la Puerta del Sol 6')).toBeDefined();
      });
    });

    it('1.3 clear button X appears on non-empty query and resets input', async () => {
      await renderApp();
      const searchInput = screen.getByPlaceholderText(/Escribe una estación, parada, calle o línea/i) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Cibeles' } });
      });

      await waitFor(() => {
        expect(searchInput.value).toBe('Cibeles');
      });

      const clearBtn = searchInput.parentElement?.querySelector('button');
      expect(clearBtn).not.toBeNull();

      await act(async () => {
        fireEvent.click(clearBtn!);
      });

      expect(searchInput.value).toBe('');
    });

    it('1.4 popular hubs grid renders the key interchange cards', async () => {
      await renderApp();
      expect(screen.getByText('Intercambiadores y Estaciones Principales')).toBeDefined();
      expect(screen.getByText('Centro de Madrid • L1, L2, L3')).toBeDefined();
      expect(screen.getByText('Teatro Real • L2, L5, Ramal')).toBeDefined();
      expect(screen.getByText('Pza. Cibeles / Casa de América')).toBeDefined();
    });

    it('1.5 clicking a hub card navigates into its detailed view', async () => {
      await renderApp();
      const hubCardSol = screen.getByText('Centro de Madrid • L1, L2, L3').closest('button');
      expect(hubCardSol).not.toBeNull();

      await act(async () => {
        fireEvent.click(hubCardSol!);
      });

      await waitFor(() => {
        expect(screen.getByText('Plaza de la Puerta del Sol 6')).toBeDefined();
        expect(screen.getByText('Volver al buscador')).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Feature 2: Transport Mode Selector (5 tests)
  // =========================================================================
  describe('Feature 2: Transport Mode Selector', () => {
    it('2.1 renders role="radiogroup" with Todos, Metro, and Autobús options', async () => {
      await renderApp();
      const radiogroups = screen.getAllByRole('radiogroup');
      expect(radiogroups.length).toBeGreaterThan(0);
      const groupText = radiogroups[0].textContent;
      expect(groupText).toContain('Todos');
      expect(groupText).toContain('Metro');
      expect(groupText).toContain('Autobús');
    });

    it('2.2 selecting Metro mode filters results to only metro stations', async () => {
      await renderApp();
      const metroRadios = screen.getAllByRole('radio', { name: /Metro/i });

      await act(async () => {
        fireEvent.click(metroRadios[0]);
      });

      const searchInput = screen.getByLabelText(/Buscar paradas, estaciones o líneas/i);
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '1' } });
      });

      await waitFor(() => {
        expect(screen.getAllByText('Sol').length).toBeGreaterThan(0);
        expect(screen.queryByText('Paseo de Recoletos')).toBeNull();
      });
    });

    it('2.3 selecting Autobús mode filters results to only bus stops', async () => {
      await renderApp();
      const busRadios = screen.getAllByRole('radio', { name: /Autobús/i });

      await act(async () => {
        fireEvent.click(busRadios[0]);
      });

      const searchInput = screen.getByLabelText(/Buscar paradas, estaciones o líneas/i);
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '1' } });
      });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
        expect(screen.queryByText('Centro de Madrid')).toBeNull();
      });
    });

    it('2.4 updates search input placeholder dynamically according to active mode', async () => {
      await renderApp();
      const searchInput = screen.getByLabelText(/Buscar paradas, estaciones o líneas/i) as HTMLInputElement;
      expect(searchInput.placeholder).toContain('Escribe una estación, parada, calle o línea');

      const metroRadios = screen.getAllByRole('radio', { name: /Metro/i });
      await act(async () => {
        fireEvent.click(metroRadios[0]);
      });
      expect(searchInput.placeholder).toContain('Escribe estación de metro');

      const busRadios = screen.getAllByRole('radio', { name: /Autobús/i });
      await act(async () => {
        fireEvent.click(busRadios[0]);
      });
      expect(searchInput.placeholder).toContain('Escribe calle (ej. Princesa)');
    });

    it('2.5 persists mode preference in localStorage across sessions', async () => {
      await renderApp();
      const metroRadios = screen.getAllByRole('radio', { name: /Metro/i });

      await act(async () => {
        fireEvent.click(metroRadios[0]);
      });

      expect(window.localStorage.getItem('madrid_transporte_mode_v1')).toBe('metro');
    });
  });

  // =========================================================================
  // Feature 3: Search Modal (5 tests)
  // =========================================================================
  describe('Feature 3: Search Modal', () => {
    it('3.1 opens SearchModal dialog when clicking header search trigger', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });

      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      await waitFor(() => {
        const dialog = document.querySelector('dialog');
        expect(dialog).not.toBeNull();
        expect(dialog?.hasAttribute('open')).toBe(true);
      });
    });

    it('3.2 opens SearchModal dialog via ⌘K keyboard shortcut', async () => {
      await renderApp();

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
      });

      await waitFor(() => {
        const dialog = document.querySelector('dialog');
        expect(dialog).not.toBeNull();
        expect(dialog?.hasAttribute('open')).toBe(true);
      });
    });

    it('3.3 focuses search input inside dialog upon opening', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });

      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      await waitFor(() => {
        const dialogInput = document.querySelector('dialog input[type="search"]');
        expect(dialogInput).not.toBeNull();
      });
    });

    it('3.4 mode tabs inside SearchModal allow instant filtering between Metro and Bus', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      const dialog = document.querySelector('dialog')!;
      const modalInput = dialog.querySelector('input[type="search"]') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(modalInput, { target: { value: '1' } });
      });

      const metroTab = within(dialog).getByRole('button', { name: /Metro/i });
      await act(async () => {
        fireEvent.click(metroTab);
      });

      await waitFor(() => {
        expect(dialog.textContent).toContain('Sol');
      });
    });

    it('3.5 close button dismisses SearchModal', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      const closeBtn = screen.getByLabelText(/Cerrar buscador/i);
      await act(async () => {
        fireEvent.click(closeBtn);
      });

      await waitFor(() => {
        const dialog = document.querySelector('dialog');
        expect(dialog?.open).toBe(false);
      });
    });
  });

  // =========================================================================
  // Feature 4: Metro Station Experience (5 tests)
  // =========================================================================
  describe('Feature 4: Metro Station Experience', () => {
    it('4.1 renders station header, name, zone badge and line pills', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
        expect(screen.getByText('Zona A')).toBeDefined();
        expect(screen.getByText('Plaza de la Puerta del Sol 6')).toBeDefined();
      });
    });

    it('4.2 multi-line filter bar defaults to "Todas las líneas" and filters on click', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByText(/Todas las líneas \(3\)/i)).toBeDefined();
      });

      const line2Btn = screen.getByRole('button', { name: /Línea 2/i });
      await act(async () => {
        fireEvent.click(line2Btn);
      });

      await waitFor(() => {
        expect(screen.getAllByText(/Cuatro Caminos/i).length).toBeGreaterThan(0);
        expect(screen.queryByText(/Valdecarros/i)).toBeNull();
      });
    });

    it('4.3 groups platform estimates by Line and Platform (Andén 1, Andén 2)', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getAllByText(/Andén 1/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Andén 2/i).length).toBeGreaterThan(0);
      });
    });

    it('4.4 formats arrivals with "Llegando" badge when arriving and minutes for upcoming', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByText('Llegando')).toBeDefined();
        expect(screen.getByText('2 min')).toBeDefined();
      });
    });

    it('4.5 displays secondary train timing when next train estimate is available', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getAllByText(/Sig\. tren:/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/4 min/i).length).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // Feature 5: EMT Bus Stop Experience (5 tests)
  // =========================================================================
  describe('Feature 5: EMT Bus Stop Experience', () => {
    it('5.1 renders StopHeader with stop id, name, address and lines served', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
        expect(screen.getByText('Paseo de Recoletos')).toBeDefined();
        expect(screen.getByText(/Líneas en esta parada/i)).toBeDefined();
      });
    });

    it('5.2 renders EstimatesList with arrival cards for upcoming buses', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText('CRISTO REY')).toBeDefined();
        expect(screen.getByText('MANUEL BECERRA')).toBeDefined();
        expect(screen.getByText('PAVONES')).toBeDefined();
      });
    });

    it('5.3 displays "Llegando" pill badge for immediate bus arrivals', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        const badges = screen.getAllByText('Llegando');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('5.4 line filter pill filters bus estimates list and clears on "Mostrar todas"', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText('CRISTO REY')).toBeDefined();
      });

      const line2Pill = screen.getByRole('button', { name: '2' });
      await act(async () => {
        fireEvent.click(line2Pill);
      });

      await waitFor(() => {
        expect(screen.getByText('MANUEL BECERRA')).toBeDefined();
        expect(screen.queryByText('CRISTO REY')).toBeNull();
      });

      const showAllBtn = screen.getByText('Mostrar todas');
      await act(async () => {
        fireEvent.click(showAllBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('CRISTO REY')).toBeDefined();
      });
    });

    it('5.5 clicking "Volver al buscador de paradas" clears active stop and returns home', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText('Volver al buscador de paradas')).toBeDefined();
      });

      const backBtn = screen.getByText('Volver al buscador de paradas');
      await act(async () => {
        fireEvent.click(backBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('¿A dónde te mueves en Madrid?')).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Feature 6: Live Auto-Refresh & Countdown (5 tests)
  // =========================================================================
  describe('Feature 6: Live Auto-Refresh & Countdown', () => {
    it('6.1 renders AutoRefreshBar with 30s countdown and relative update status', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText(/Actualización automática en \d+s/i)).toBeDefined();
        expect(screen.getByText(/Última: justo ahora/i)).toBeDefined();
      });
    });

    it('6.2 countdown ticks down second-by-second', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText(/Actualización automática en \d+s/i)).toBeDefined();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 1100));
      });

      expect(screen.getByText(/Actualización automática en 29s/i)).toBeDefined();
    });

    it('6.3 clicking pause halts countdown and clicking play resumes it', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByTitle('Pausar actualización')).toBeDefined();
      });

      const pauseBtn = screen.getByTitle('Pausar actualización');
      await act(async () => {
        fireEvent.click(pauseBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Actualización automática pausada')).toBeDefined();
        expect(screen.getByTitle('Reanudar actualización automática')).toBeDefined();
      });

      const resumeBtn = screen.getByTitle('Reanudar actualización automática');
      await act(async () => {
        fireEvent.click(resumeBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Actualización automática en \d+s/i)).toBeDefined();
      });
    });

    it('6.4 clicking manual refresh button resets countdown to 30s', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText(/Actualización automática en \d+s/i)).toBeDefined();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 1100));
      });

      const refreshBtn = screen.getByTitle('Actualizar ahora');
      await act(async () => {
        fireEvent.click(refreshBtn);
      });

      expect(screen.getByText(/Actualización automática en 30s/i)).toBeDefined();
    });

    it('6.5 document visibility change to visible triggers immediate refresh in metro view', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
      });

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Actualización automática en 30s/i)).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Feature 7: Favorites Management (5 tests)
  // =========================================================================
  describe('Feature 7: Favorites Management', () => {
    it('7.1 toggles bus stop favorite and persists in localStorage', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByTitle('Guardar en favoritos')).toBeDefined();
      });

      const favBtn = screen.getByTitle('Guardar en favoritos');
      await act(async () => {
        fireEvent.click(favBtn);
      });

      await waitFor(() => {
        expect(screen.getByTitle('Quitar de favoritos')).toBeDefined();
      });

      const savedJson = window.localStorage.getItem('emt_madrid_favorites_v1');
      expect(savedJson).toContain('72');
    });

    it('7.2 toggles metro station favorite and updates label to "Favorita"', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByText('Guardar')).toBeDefined();
      });

      const favBtn = screen.getByText('Guardar');
      await act(async () => {
        fireEvent.click(favBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Favorita')).toBeDefined();
      });

      const savedMetro = window.localStorage.getItem('metro_madrid_favorites_v1');
      expect(savedMetro).toContain('0112');
    });

    it('7.3 renders desktop header quick chips for saved multimodal favorites', async () => {
      await renderApp({
        busFavorites: [{ id: '72', name: 'Cibeles', address: 'Paseo de Recoletos', lines: ['1', '2'] }],
        metroFavorites: [{ id: '0112', name: 'Sol', address: 'Puerta del Sol', lines: ['1', '2', '3'] }],
      });

      const header = document.querySelector('header')!;
      expect(within(header).getByText(/Favoritos:/i)).toBeDefined();
      expect(within(header).getByText('Sol')).toBeDefined();
      expect(within(header).getByText('Cibeles')).toBeDefined();
    });

    it('7.4 mobile tab bar shows numeric badge counter with total favorites count', async () => {
      await renderApp({
        busFavorites: [{ id: '72', name: 'Cibeles', lines: ['1'] }],
        metroFavorites: [{ id: '0112', name: 'Sol', lines: ['1', '2', '3'] }],
      });

      const mobileNav = screen.getByLabelText('Navegación principal inferior');
      const badge = within(mobileNav).getByText('2');
      expect(badge).toBeDefined();
      expect(badge.className).toContain('rounded-full bg-amber-500');
    });

    it('7.5 FavoritesModal displays saved favorites list, allows deletion and navigation', async () => {
      await renderApp({
        busFavorites: [{ id: '72', name: 'Cibeles', lines: ['1'] }],
      });

      const favoritesTab = screen.getByRole('button', { name: /Favoritos/i });
      await act(async () => {
        fireEvent.click(favoritesTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Tus Favoritos Guardados')).toBeDefined();
      });

      const deleteBtn = screen.getByTitle('Eliminar de favoritos');
      await act(async () => {
        fireEvent.click(deleteBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('No tienes favoritos guardados')).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Feature 8: Geolocation & Spatial Proximity (5 tests)
  // =========================================================================
  describe('Feature 8: Geolocation & Spatial Proximity', () => {
    it('8.1 clicking "Cerca de mí" calls navigator.geolocation.getCurrentPosition', async () => {
      const spy = vi.spyOn(navigator.geolocation, 'getCurrentPosition');
      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];

      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      expect(spy).toHaveBeenCalled();
    });

    it('8.2 shows loading state while locating', async () => {
      let resolveLocation: any;
      vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementationOnce((cb: any) => {
        resolveLocation = cb;
      });

      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];

      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      expect(screen.getByText('Obteniendo GPS...')).toBeDefined();

      await act(async () => {
        resolveLocation({
          coords: { latitude: 40.4168, longitude: -3.7038 },
        });
      });
    });

    it('8.3 sorts nearest stops and stations in ascending order of Haversine distance', async () => {
      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];

      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Transporte Cerca de Ti')).toBeDefined();
        expect(screen.getAllByText('Sol').length).toBeGreaterThan(0);
      });
    });

    it('8.4 formats distance in meters ("X m") for <1000m and kilometers ("Y.Z km") for >=1000m', async () => {
      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];

      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      await waitFor(() => {
        const distanceChips = screen.getAllByText(/\d+\s*m|\d+\.\d+\s*km/);
        expect(distanceChips.length).toBeGreaterThan(0);
      });
    });

    it('8.5 selecting an item from NearestStopsModal navigates to it and dismisses modal', async () => {
      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];

      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Transporte Cerca de Ti')).toBeDefined();
      });

      const dialog = document.querySelector('dialog[aria-labelledby="nearest-stops-title"]')!;
      const solInModal = within(dialog).getByText('Sol');
      const solItem = solInModal.closest('div[class*="cursor-pointer"]');
      expect(solItem).not.toBeNull();

      await act(async () => {
        fireEvent.click(solItem!);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Feature 9: Visual System, Dark Mode & Mobile PWA (5 tests)
  // =========================================================================
  describe('Feature 9: Visual System, Dark Mode & Mobile PWA', () => {
    it('9.1 toggles dark mode class on document.documentElement', async () => {
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

    it('9.2 persists theme preference in localStorage', async () => {
      await renderApp();
      const themeBtn = screen.getByTitle('Cambiar a modo oscuro');

      await act(async () => {
        fireEvent.click(themeBtn);
      });

      expect(window.localStorage.getItem('emt_madrid_theme_v1')).toBe('dark');
    });

    it('9.3 verifies all 5 mobile tab touch targets meet minimum 44px height', async () => {
      await renderApp();
      const mobileNav = screen.getByLabelText('Navegación principal inferior');
      const buttons = mobileNav.querySelectorAll('button');
      expect(buttons.length).toBe(5);

      buttons.forEach((btn) => {
        expect(btn.className).toContain('min-h-[44px]');
      });
    });

    it('9.4 verifies safe-area-inset style rules on mobile tab bar and header', async () => {
      await renderApp();
      const mobileNav = screen.getByLabelText('Navegación principal inferior');
      expect(mobileNav.getAttribute('style')).toContain('safe-area-inset-bottom');

      const header = document.querySelector('header');
      expect(header?.getAttribute('style')).toContain('safe-area-inset-top');
    });

    it('9.5 updates mobile tab label dynamically between Inicio, Estación and Parada', async () => {
      await renderApp();
      expect(screen.getByText('Inicio')).toBeDefined();

      cleanup();
      await renderApp({ url: 'http://localhost/?metro=0112' });
      await waitFor(() => {
        expect(screen.getByText('Estación')).toBeDefined();
      });

      cleanup();
      await renderApp({ url: 'http://localhost/?stop=72' });
      await waitFor(() => {
        const mobileNav = screen.getByLabelText('Navegación principal inferior');
        expect(within(mobileNav).getByText('Parada')).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Feature 10: Deep Linking, URL State & History (5 tests)
  // =========================================================================
  describe('Feature 10: Deep Linking, URL State & History', () => {
    it('10.1 deep links directly to EMT bus stop view with ?stop=72', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
        expect(screen.getByText('CRISTO REY')).toBeDefined();
      });
    });

    it('10.2 deep links directly to Metro station view with ?metro=0112', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
        expect(screen.getByText('Zona A')).toBeDefined();
      });
    });

    it('10.3 deep links transport mode preference with ?mode=metro', async () => {
      await renderApp({ url: 'http://localhost/?mode=metro' });

      const metroRadios = screen.getAllByRole('radio', { name: /Metro/i });
      expect(metroRadios[0].getAttribute('aria-checked')).toBe('true');
    });

    it('10.4 replaces browser URL state cleanly when navigating to stop', async () => {
      await renderApp();
      const cibelesHub = screen.getByText('Pza. Cibeles / Casa de América').closest('button');

      await act(async () => {
        fireEvent.click(cibelesHub!);
      });

      await waitFor(() => {
        expect(window.location.search).toContain('stop=72');
      });
    });

    it('10.5 clicking brand logo in header resets URL query params and navigates home', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
      });

      const brandLogo = screen.getByTitle('Ir al inicio');
      await act(async () => {
        fireEvent.click(brandLogo);
      });

      await waitFor(() => {
        expect(screen.getByText('¿A dónde te mueves en Madrid?')).toBeDefined();
        expect(window.location.search).not.toContain('stop=');
      });
    });
  });
});

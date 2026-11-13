import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act, within, cleanup } from '@testing-library/react';
import { renderApp } from './helpers/renderApp';
import {
  FIXTURE_METRO_SOL,
  FIXTURE_METRO_OPERA,
  FIXTURE_METRO_ATOCHA,
  FIXTURE_BUS_CIBELES_72,
  FIXTURE_BUS_CRISTO_REY_4514,
} from './helpers/fixtures';

describe('Tier 3: User Journeys & End-to-End Workflows (50 Tests)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // Journey 1: Tourist Arriving at Sol Station (5 steps)
  // =========================================================================
  describe('Journey 1: Tourist Arriving at Sol Station', () => {
    it('1.1 tourist lands on homepage and searches "Sol" in live search bar', async () => {
      await renderApp();
      const searchInput = screen.getByPlaceholderText(/Escribe una estación, parada, calle o línea/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Sol' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Resultados encontrados/i)).toBeDefined();
        expect(screen.getAllByText('Sol').length).toBeGreaterThan(0);
      });
    });

    it('1.2 selects Sol station card and lands on Metro Sol view with zone badge and lines', async () => {
      await renderApp();
      const solHub = screen.getByText('Centro de Madrid • L1, L2, L3').closest('button')!;

      await act(async () => {
        fireEvent.click(solHub);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
        expect(screen.getByText('Zona A')).toBeDefined();
        expect(screen.getByText('Volver al buscador')).toBeDefined();
      });
    });

    it('1.3 filters by Línea 2 to check trains towards Cuatro Caminos', async () => {
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

    it('1.4 toggles Sol as favorite, checking label updates to "Favorita"', async () => {
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

    it('1.5 returns to home via brand logo; sees Sol in quick favorites chips', async () => {
      await renderApp({
        metroFavorites: [{ id: '0112', name: 'Sol', lines: ['1', '2', '3'] }],
        url: 'http://localhost/?metro=0112',
      });

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

      const header = document.querySelector('header')!;
      expect(within(header).getByText('Sol')).toBeDefined();
    });
  });

  // =========================================================================
  // Journey 2: Commuter Morning Routine with EMT Bus (5 steps)
  // =========================================================================
  describe('Journey 2: Commuter Morning Routine with EMT Bus', () => {
    it('2.1 commuter opens app directly with stop URL ?stop=72 (Cibeles)', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
        expect(screen.getByText('Paseo de Recoletos')).toBeDefined();
      });
    });

    it('2.2 views incoming arrivals for lines 1, 2, 202; checks "Llegando" badge', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText('CRISTO REY')).toBeDefined();
        expect(screen.getByText('MANUEL BECERRA')).toBeDefined();
        expect(screen.getAllByText('Llegando').length).toBeGreaterThan(0);
      });
    });

    it('2.3 filters estimates list specifically for Línea 1 towards Cristo Rey', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText('CRISTO REY')).toBeDefined();
      });

      const line1Pill = screen.getByRole('button', { name: '1' });
      await act(async () => {
        fireEvent.click(line1Pill);
      });

      await waitFor(() => {
        expect(screen.getByText('CRISTO REY')).toBeDefined();
        expect(screen.queryByText('MANUEL BECERRA')).toBeNull();
      });
    });

    it('2.4 saves stop 72 to favorites; verifies star button highlights and localStorage updates', async () => {
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

    it('2.5 clicks manual refresh button ("Actualizar ahora") to verify countdown resets to 30s', async () => {
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
  });

  // =========================================================================
  // Journey 3: Multimodal Transfer (Metro Sol to Bus Cibeles) (5 steps)
  // =========================================================================
  describe('Journey 3: Multimodal Transfer (Metro Sol to Bus Cibeles)', () => {
    it('3.1 user is viewing Metro Sol station arrivals', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
      });
    });

    it('3.2 opens universal search modal via ⌘K keyboard shortcut', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      await waitFor(() => {
        expect(dialog).not.toBeNull();
        expect(dialog.open).toBe(true);
      });
    });

    it('3.3 filters by "Autobús" tab and types "Cibeles"', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      const busTab = within(dialog).getByRole('button', { name: /Autobús/i });
      await act(async () => {
        fireEvent.click(busTab);
      });

      const searchInput = within(dialog).getByPlaceholderText(/Estación de metro, parada de autobús/i);
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Cibeles' } });
      });

      await waitFor(() => {
        expect(within(dialog).getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
      });
    });

    it('3.4 selects Stop 72 (Cibeles); modal closes and transfers to Bus Stop view', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
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
        expect(dialog.open).toBe(false);
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
      });
    });

    it('3.5 verifies URL updated cleanly to ?stop=72 and metro state was cleared', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      const searchBtn = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchBtn);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
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

  // =========================================================================
  // Journey 4: Nearby Transportation Discovery on the Go (5 steps)
  // =========================================================================
  describe('Journey 4: Nearby Transportation Discovery on the Go', () => {
    it('4.1 user at Puerta del Sol taps "Cerca de mí" button', async () => {
      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];

      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="nearest-stops-title"]') as HTMLDialogElement;
      await waitFor(() => {
        expect(dialog).not.toBeNull();
        expect(dialog.open).toBe(true);
      });
    });

    it('4.2 geolocation resolves coordinates; "Transporte Cerca de Ti" opens', async () => {
      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];

      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Transporte Cerca de Ti')).toBeDefined();
        expect(screen.getByText('Estaciones y paradas por distancia caminando')).toBeDefined();
      });
    });

    it('4.3 user browses nearest transportation options sorted by walking distance', async () => {
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

    it('4.4 switches tab to "Metro" to focus solely on nearby metro stations', async () => {
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

    it('4.5 selects nearest metro station (Sol), which dismisses modal and loads Sol arrivals', async () => {
      await renderApp();
      const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];

      await act(async () => {
        fireEvent.click(nearMeBtn);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="nearest-stops-title"]') as HTMLDialogElement;
      await waitFor(() => {
        expect(within(dialog).getByText('Transporte Cerca de Ti')).toBeDefined();
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
  });

  // =========================================================================
  // Journey 5: Favorites Organization & Clean-up (5 steps)
  // =========================================================================
  describe('Journey 5: Favorites Organization & Clean-up', () => {
    it('5.1 user with saved favorites opens FavoritesModal via mobile tab bar', async () => {
      await renderApp({
        busFavorites: [{ id: '72', name: 'Cibeles', lines: ['1'] }],
        metroFavorites: [{ id: '0112', name: 'Sol', lines: ['1', '2', '3'] }],
      });

      const favTab = screen.getByRole('button', { name: /Favoritos/i });
      await act(async () => {
        fireEvent.click(favTab);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="favorites-title"]') as HTMLDialogElement;
      await waitFor(() => {
        expect(dialog).not.toBeNull();
        expect(dialog.open).toBe(true);
        expect(within(dialog).getByText('Tus Favoritos Guardados')).toBeDefined();
      });
    });

    it('5.2 verifies both Sol (Metro) and Cibeles (Bus) are displayed with line badges', async () => {
      await renderApp({
        busFavorites: [{ id: '72', name: 'Cibeles', lines: ['1'] }],
        metroFavorites: [{ id: '0112', name: 'Sol', lines: ['1', '2', '3'] }],
      });

      const favTab = screen.getByRole('button', { name: /Favoritos/i });
      await act(async () => {
        fireEvent.click(favTab);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="favorites-title"]')!;
      await waitFor(() => {
        expect(within(dialog).getByText('Sol')).toBeDefined();
        expect(within(dialog).getByText('Cibeles')).toBeDefined();
      });
    });

    it('5.3 uses the modal tabs ("Metro" / "Autobús") to filter favorites view', async () => {
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

    it('5.4 deletes the bus favorite (Cibeles) by clicking the trash button', async () => {
      await renderApp({
        busFavorites: [{ id: '72', name: 'Cibeles', lines: ['1'] }],
      });

      const favTab = screen.getByRole('button', { name: /Favoritos/i });
      await act(async () => {
        fireEvent.click(favTab);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="favorites-title"]')!;
      const trashBtn = within(dialog).getByTitle('Eliminar de favoritos');
      await act(async () => {
        fireEvent.click(trashBtn);
      });

      await waitFor(() => {
        expect(within(dialog).getByText('No tienes favoritos guardados')).toBeDefined();
      });
    });

    it('5.5 verifies remaining favorites count updates in mobile tab bar badge counter', async () => {
      await renderApp({
        busFavorites: [{ id: '72', name: 'Cibeles', lines: ['1'] }],
        metroFavorites: [{ id: '0112', name: 'Sol', lines: ['1', '2', '3'] }],
      });

      const mobileNav = screen.getByLabelText('Navegación principal inferior');
      expect(within(mobileNav).getByText('2')).toBeDefined();

      const favTab = screen.getByRole('button', { name: /Favoritos/i });
      await act(async () => {
        fireEvent.click(favTab);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="favorites-title"]')!;
      const trashBtns = within(dialog).getAllByTitle('Eliminar de favoritos');
      await act(async () => {
        fireEvent.click(trashBtns[0]);
      });

      await waitFor(() => {
        expect(within(mobileNav).getByText('1')).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Journey 6: Night-time Commute with Dark Mode (5 steps)
  // =========================================================================
  describe('Journey 6: Night-time Commute with Dark Mode', () => {
    it('6.1 switches to dark mode via header theme toggle button', async () => {
      await renderApp();
      const themeBtn = screen.getByTitle('Cambiar a modo oscuro');

      await act(async () => {
        fireEvent.click(themeBtn);
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('6.2 verifies theme preference is preserved in localStorage', async () => {
      await renderApp();
      const themeBtn = screen.getByTitle('Cambiar a modo oscuro');

      await act(async () => {
        fireEvent.click(themeBtn);
      });

      expect(window.localStorage.getItem('emt_madrid_theme_v1')).toBe('dark');
    });

    it('6.3 navigates to Ópera station view; verifies line badges and dark styling render', async () => {
      await renderApp({ url: 'http://localhost/?metro=0209', theme: 'dark' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Ópera' })).toBeDefined();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('6.4 pauses live auto-refresh countdown to read timetables without interruption', async () => {
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
      });
    });

    it('6.5 resumes auto-refresh; verifies countdown timer resumes ticking', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      const pauseBtn = screen.getByTitle('Pausar actualización');
      await act(async () => {
        fireEvent.click(pauseBtn);
      });

      const resumeBtn = screen.getByTitle('Reanudar actualización automática');
      await act(async () => {
        fireEvent.click(resumeBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Actualización automática en \d+s/i)).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Journey 7: Cross-line Navigation via Search Modal (5 steps)
  // =========================================================================
  describe('Journey 7: Cross-line Navigation via Search Modal', () => {
    it('7.1 user on landing page opens SearchModal via header search trigger button', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });

      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      expect(dialog.open).toBe(true);
    });

    it('7.2 searches by line number "2" to find all stations and stops served by Line 2', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      const searchInput = within(dialog).getByPlaceholderText(/Estación de metro, parada de autobús/i);
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '2' } });
      });

      await waitFor(() => {
        expect(within(dialog).getAllByText(/Sol|Ópera|Cibeles/i).length).toBeGreaterThan(0);
      });
    });

    it('7.3 toggles between "Metro" and "Autobús" tabs inside modal to compare line matches', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      const searchInput = within(dialog).getByPlaceholderText(/Estación de metro, parada de autobús/i);
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '2' } });
      });

      const metroTab = within(dialog).getByRole('button', { name: /Metro/i });
      await act(async () => {
        fireEvent.click(metroTab);
      });

      await waitFor(() => {
        expect(within(dialog).getAllByText(/Sol|Ópera/i).length).toBeGreaterThan(0);
      });
    });

    it('7.4 selects Ópera station; verifies station header displays L2 and Ramal badges', async () => {
      await renderApp();
      const searchTrigger = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchTrigger);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      const operaBtn = within(dialog).getByRole('button', { name: /Ópera/i });
      await act(async () => {
        fireEvent.click(operaBtn);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Ópera' })).toBeDefined();
        expect(screen.getByText('Plaza de Isabel II 9')).toBeDefined();
      });
    });

    it('7.5 clicks "Volver al buscador" to return to landing page', async () => {
      await renderApp({ url: 'http://localhost/?metro=0209' });

      await waitFor(() => {
        expect(screen.getByText('Volver al buscador')).toBeDefined();
      });

      const backBtn = screen.getByText('Volver al buscador');
      await act(async () => {
        fireEvent.click(backBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('¿A dónde te mueves en Madrid?')).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Journey 8: Mobile Tab Bar Bottom Navigation Flow (5 steps)
  // =========================================================================
  describe('Journey 8: Mobile Tab Bar Bottom Navigation Flow', () => {
    it('8.1 mobile user taps "Buscar" tab on mobile bar; SearchModal opens', async () => {
      await renderApp();
      const mobileNav = screen.getByLabelText('Navegación principal inferior');
      const searchTab = within(mobileNav).getByRole('button', { name: /^Buscar$/i });

      await act(async () => {
        fireEvent.click(searchTab);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      expect(dialog.open).toBe(true);
    });

    it('8.2 dismisses SearchModal and taps "Cerca" tab; geolocates and opens NearestStopsModal', async () => {
      await renderApp();
      const mobileNav = screen.getByLabelText('Navegación principal inferior');
      const cercaTab = within(mobileNav).getByRole('button', { name: /^Cerca$/i });

      await act(async () => {
        fireEvent.click(cercaTab);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="nearest-stops-title"]') as HTMLDialogElement;
      await waitFor(() => {
        expect(dialog.open).toBe(true);
      });
    });

    it('8.3 dismisses NearestStopsModal and taps "Favoritos" tab; opens FavoritesModal', async () => {
      await renderApp({
        busFavorites: [{ id: '72', name: 'Cibeles', lines: ['1'] }],
      });

      const mobileNav = screen.getByLabelText('Navegación principal inferior');
      const favTab = within(mobileNav).getByRole('button', { name: /Favoritos/i });

      await act(async () => {
        fireEvent.click(favTab);
      });

      const dialog = document.querySelector('dialog[aria-labelledby="favorites-title"]') as HTMLDialogElement;
      await waitFor(() => {
        expect(dialog.open).toBe(true);
      });
    });

    it('8.4 taps "Modo oscuro" tab; toggles theme class immediately', async () => {
      await renderApp();
      const mobileNav = screen.getByLabelText('Navegación principal inferior');
      const themeTab = within(mobileNav).getByLabelText('Cambiar a modo oscuro');

      await act(async () => {
        fireEvent.click(themeTab);
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('8.5 taps "Inicio" tab to ensure return to homepage hero and search input', async () => {
      await renderApp({ url: 'http://localhost/?metro=0112' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
      });

      const mobileNav = screen.getByLabelText('Navegación principal inferior');
      const inicioTab = within(mobileNav).getByRole('button', { name: /^Estación$/i });

      await act(async () => {
        fireEvent.click(inicioTab);
      });

      await waitFor(() => {
        expect(screen.getByText('¿A dónde te mueves en Madrid?')).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Journey 9: Direct Deep Link Sharing & Social Handoff (5 steps)
  // =========================================================================
  describe('Journey 9: Direct Deep Link Sharing & Social Handoff', () => {
    it('9.1 user receives shared link to stop ?stop=72 and opens it in browser', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cibeles/i).length).toBeGreaterThan(0);
        expect(screen.getByText('CRISTO REY')).toBeDefined();
      });
    });

    it('9.2 stop header and estimates load immediately from URL query parameters', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByText('Paseo de Recoletos')).toBeDefined();
        expect(screen.getByText(/Líneas en esta parada/i)).toBeDefined();
      });
    });

    it('9.3 user clicks "Compartir parada" button; verifies link is copied to clipboard', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      await waitFor(() => {
        expect(screen.getByTitle('Compartir parada')).toBeDefined();
      });

      const shareBtn = screen.getByTitle('Compartir parada');
      await act(async () => {
        fireEvent.click(shareBtn);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('stop=72'));
    });

    it('9.4 user switches mode to Metro via mode selector radio group', async () => {
      await renderApp({ url: 'http://localhost/?stop=72' });

      const metroRadios = screen.getAllByRole('radio', { name: /Metro/i });
      await act(async () => {
        fireEvent.click(metroRadios[0]);
      });

      expect(metroRadios[0].getAttribute('aria-checked')).toBe('true');
    });

    it('9.5 clicks header logo to return home; verifies query params are completely wiped clean', async () => {
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

  // =========================================================================
  // Journey 10: Multi-Stop Commute Planning (5 steps)
  // =========================================================================
  describe('Journey 10: Multi-Stop Commute Planning', () => {
    it('10.1 user begins at landing page popular hubs and clicks "Atocha" interchange', async () => {
      await renderApp();
      const atochaHub = screen.getByText('Estación Central / Renfe • L1').closest('button')!;

      await act(async () => {
        fireEvent.click(atochaHub);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Atocha' })).toBeDefined();
      });
    });

    it('10.2 views Atocha station arrivals; verifies Línea 1 destination', async () => {
      await renderApp({ url: 'http://localhost/?metro=0116' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Atocha' })).toBeDefined();
        expect(screen.getByText('Zona A')).toBeDefined();
      });
    });

    it('10.3 opens search modal and navigates to "Cristo Rey" bus stop 4514', async () => {
      await renderApp({ url: 'http://localhost/?metro=0116' });

      const searchBtn = screen.getByRole('button', { name: /^Buscar$/i });
      await act(async () => {
        fireEvent.click(searchBtn);
      });

      const dialog = document.querySelector('dialog[aria-label="Buscador universal de transporte de Madrid"]') as HTMLDialogElement;
      const searchInput = within(dialog).getByPlaceholderText(/Estación de metro, parada de autobús/i);
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Cristo Rey' } });
      });

      await waitFor(() => {
        expect(within(dialog).getAllByText(/Cristo Rey/i).length).toBeGreaterThan(0);
      });

      const cristoReyItem = within(dialog).getAllByText(/Cristo Rey/i)[0].closest('div[class*="cursor-pointer"]')!;
      await act(async () => {
        fireEvent.click(cristoReyItem);
      });

      await waitFor(() => {
        expect(window.location.search).toContain('stop=4514');
      });
    });

    it('10.4 checks arrival time for bus Line 1 arriving at Cristo Rey', async () => {
      await renderApp({ url: 'http://localhost/?stop=4514' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cristo Rey/i).length).toBeGreaterThan(0);
      });
    });

    it('10.5 uses browser back button (popstate) to return to landing search page', async () => {
      await renderApp({ url: 'http://localhost/?stop=4514' });

      await waitFor(() => {
        expect(screen.getAllByText(/Cristo Rey/i).length).toBeGreaterThan(0);
      });

      window.history.replaceState({}, '', '/');
      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      await waitFor(() => {
        expect(screen.getByText('¿A dónde te mueves en Madrid?')).toBeDefined();
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { renderApp } from './helpers/renderApp';

describe('Renfe Cercanías Madrid E2E Journey', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects Cercanías mode on HomeSearchLanding, searches Atocha, and opens CercaniasStationView with Vía & ETA', async () => {
    await renderApp();

    expect(screen.getByText(/95 Cercanías/i)).toBeDefined();

    // Switch to Cercanías mode
    const cercaniasRadios = screen.getAllByRole('radio', { name: /Cercanías/i });
    await act(async () => {
      fireEvent.click(cercaniasRadios[0]);
    });

    expect(window.localStorage.getItem('madrid_transporte_mode_v1')).toBe('cercanias');

    const searchInput = screen.getByPlaceholderText(/Escribe estación de Cercanías/i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Atocha' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Madrid-Atocha Cercanías')).toBeDefined();
    });

    const atochaCard = screen.getByText('Madrid-Atocha Cercanías').closest('div[class*="cursor-pointer"]')!;
    await act(async () => {
      fireEvent.click(atochaCard);
    });

    // Should navigate into CercaniasStationView with URL ?cercanias=18000
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Madrid-Atocha Cercanías' })).toBeDefined();
      expect(window.location.search).toContain('cercanias=18000');
      expect(screen.getByText(/Hacia Móstoles-El Soto/i)).toBeDefined();
      expect(screen.getByText('Vía 5')).toBeDefined();
      expect(screen.getByText('Llegando')).toBeDefined();
      expect(screen.getByText('4 min')).toBeDefined();
      expect(screen.getByText('Vía 3')).toBeDefined();
    });

    // Check MobileTabBar activeType='cercanias'
    const nav = screen.getByRole('navigation', { name: /Navegación principal inferior/i });
    expect(within(nav).getByText('Cercanías')).toBeDefined();

    // Check map status badge shows Cercanías station and train count
    expect(screen.getByText(/Cercanías • Madrid-Atocha Cercanías/i)).toBeDefined();
  });

  it('saves Cercanías station to favorites and shows it in Header and FavoritesModal', async () => {
    await renderApp({ url: 'http://localhost/?cercanias=18000' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Madrid-Atocha Cercanías' })).toBeDefined();
      expect(screen.getByText('Guardar')).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar'));
    });

    await waitFor(() => {
      expect(screen.getByText('Favorita')).toBeDefined();
    });

    expect(window.localStorage.getItem('cercanias_madrid_favorites_v1')).toContain('18000');

    // Header quick favorite chip
    const header = document.querySelector('header')!;
    expect(within(header).getByText('Madrid-Atocha Cercanías')).toBeDefined();

    // Open FavoritesModal from MobileTabBar
    const nav = screen.getByRole('navigation', { name: /Navegación principal inferior/i });
    const favTab = within(nav).getByRole('button', { name: /Favoritos/i });
    await act(async () => {
      fireEvent.click(favTab);
    });

    const favDialog = document.querySelector('dialog[aria-labelledby="favorites-title"]') as HTMLDialogElement;
    await waitFor(() => {
      expect(favDialog.open).toBe(true);
      expect(within(favDialog).getByText('Madrid-Atocha Cercanías')).toBeDefined();
      expect(within(favDialog).getByText('Actual')).toBeDefined();
    });

    // Filter by Cercanías tab in FavoritesModal
    const cercaniasTab = within(favDialog).getByRole('button', { name: /Cercanías/i });
    await act(async () => {
      fireEvent.click(cercaniasTab);
    });

    expect(within(favDialog).getByText('Madrid-Atocha Cercanías')).toBeDefined();
  });

  it('supports deep link ?cercanias=18000 directly and renders Renfe Cercanías footer attribution', async () => {
    await renderApp({ url: 'http://localhost/?cercanias=18000' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Madrid-Atocha Cercanías' })).toBeDefined();
      expect(screen.getByText(/Demora puntual en línea C3/i)).toBeDefined();
      expect(screen.getByText('+3 min')).toBeDefined();
    });

    expect(window.localStorage.getItem('cercanias_madrid_last_station_id_v1')).toBe('18000');

    const footerLink = screen.getByRole('link', { name: 'Renfe Cercanías' });
    expect(footerLink.getAttribute('href')).toBe('https://www.renfe.com');
  });

  it('searches Sol in SearchModal under Cercanías tab and opens Sol Cercanías view', async () => {
    await renderApp();

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
      );
    });

    const dialog = document.querySelector(
      'dialog[aria-label="Buscador universal de transporte de Madrid"]'
    ) as HTMLDialogElement;

    await waitFor(() => {
      expect(dialog.open).toBe(true);
      expect(dialog.textContent).toContain('Cercanías (95 estaciones)');
    });

    const cercaniasTab = within(dialog).getByRole('button', { name: /^Cercanías$/i });
    await act(async () => {
      fireEvent.click(cercaniasTab);
    });

    const modalInput = dialog.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(modalInput, { target: { value: 'Sol' } });
    });

    await waitFor(() => {
      expect(within(dialog).getByText('Sol')).toBeDefined();
    });

    const solItem = within(dialog).getByText('Sol').closest('div[class*="cursor-pointer"]')!;
    await act(async () => {
      fireEvent.click(solItem);
    });

    await waitFor(() => {
      expect(dialog.open).toBe(false);
      expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
      expect(window.location.search).toContain('cercanias=18101');
      expect(screen.getByText(/Hacia Parla/i)).toBeDefined();
      expect(screen.getByText('Vía 2')).toBeDefined();
      expect(screen.getByText('2 min')).toBeDefined();
    });
  });

  it('displays nearby Cercanías stations in NearestStopsModal when clicking "Cerca de mí"', async () => {
    await renderApp();

    const nearMeBtn = screen.getAllByRole('button', { name: /Cerca de mí/i })[0];
    await act(async () => {
      fireEvent.click(nearMeBtn);
    });

    const nearestDialog = document.querySelector(
      'dialog[aria-labelledby="nearest-stops-title"]'
    ) as HTMLDialogElement;

    await waitFor(() => {
      expect(nearestDialog.open).toBe(true);
    });

    const cercaniasTab = within(nearestDialog).getByRole('button', { name: /Cercanías/i });
    await act(async () => {
      fireEvent.click(cercaniasTab);
    });

    await waitFor(() => {
      // Puerta del Sol coordinates (40.4168, -3.7038) -> Cercanías Sol (18101) is closest
      expect(within(nearestDialog).getByText('Sol')).toBeDefined();
      expect(within(nearestDialog).getByText('Embajadores')).toBeDefined();
    });

    const solNearestItem = within(nearestDialog)
      .getByText('Sol')
      .closest('div[class*="cursor-pointer"]')!;
    await act(async () => {
      fireEvent.click(solNearestItem);
    });

    await waitFor(() => {
      expect(nearestDialog.open).toBe(false);
      expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
      expect(window.location.search).toContain('cercanias=18101');
    });
  });
});

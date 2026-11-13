import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { renderApp } from './helpers/renderApp';
import {
  FIXTURE_BUS_STOPS,
  FIXTURE_METRO_STATIONS,
} from './helpers/fixtures';
import { setCachedStops } from '../../src/services/stopsService';
import {
  setCachedMetroStations,
  clearMetroStationsCache,
} from '../../src/services/metroService';
import { clearCercaniasStationsCache } from '../../src/services/cercaniasService';
import type { Stop } from '../../src/types/emt';

const NEARBY_SOL_EMT_STOP: Stop = {
  id: '2001',
  name: 'Puerta del Sol - Sevilla',
  address: 'Carrera de San Jerónimo 2',
  lat: 40.41675,
  lon: -3.70245,
  lines: ['3', '50', '51'],
};

describe('Hito 5 E2E: Multimodal 1-Tap Interchange Switching', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearCercaniasStationsCache();
  });

  afterEach(() => {
    setCachedStops(FIXTURE_BUS_STOPS);
    clearMetroStationsCache();
    clearCercaniasStationsCache();
  });

  it('switches in 1 tap from Metro Sol (0112) -> Cercanías Sol (18101) -> EMT Bus -> Metro Sol', async () => {
    setCachedStops([...FIXTURE_BUS_STOPS, NEARBY_SOL_EMT_STOP]);
    setCachedMetroStations(FIXTURE_METRO_STATIONS);

    await renderApp({
      url: 'http://localhost/?metro=0112',
      useFullFixtures: true,
    });

    // 1. Metro Sol loaded with NearbyConnectionsStrip showing Cercanías Sol & EMT Parada 2001
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
    });

    const metroStrip = await waitFor(() =>
      screen.getByRole('region', {
        name: /Conexiones cercanas en intercambiador/i,
      })
    );

    expect(within(metroStrip).getByText(/Conexiones cercanas \(< 200 m\)/i)).toBeDefined();
    const cercaniasSolChip = within(metroStrip).getByRole('button', {
      name: /Cercanías\s+Sol/i,
    });
    expect(cercaniasSolChip).toBeDefined();
    expect(within(metroStrip).getByRole('button', { name: /Parada 2001/i })).toBeDefined();

    // 2. Tap Cercanías Sol chip -> loads CercaniasStationView with ?cercanias=18101
    await act(async () => {
      fireEvent.click(cercaniasSolChip);
    });

    await waitFor(() => {
      expect(window.location.search).toContain('cercanias=18101');
      expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
      expect(screen.getByText(/Hacia Parla/i)).toBeDefined();
      expect(screen.getByText('Vía 2')).toBeDefined();
    });

    // 3. Cercanías Sol strip shows Metro Sol & EMT Parada 2001; tap EMT Parada 2001 -> loads Bus Stop view
    const cercaniasStrip = await waitFor(() =>
      screen.getByRole('region', {
        name: /Conexiones cercanas en intercambiador/i,
      })
    );
    expect(within(cercaniasStrip).getByRole('button', { name: /Metro\s+Sol/i })).toBeDefined();
    const busChip = within(cercaniasStrip).getByRole('button', {
      name: /Parada 2001/i,
    });

    await act(async () => {
      fireEvent.click(busChip);
    });

    await waitFor(() => {
      expect(window.location.search).toContain('stop=2001');
      expect(screen.getByRole('heading', { name: 'Puerta del Sol - Sevilla' })).toBeDefined();
    });

    // 4. Bus StopHeader strip shows Metro Sol; tap Metro Sol -> returns to MetroStationView (?metro=0112)
    const busStrip = await waitFor(() =>
      screen.getByRole('region', {
        name: /Conexiones cercanas en intercambiador/i,
      })
    );
    const metroSolChip = within(busStrip).getByRole('button', {
      name: /Metro\s+Sol/i,
    });

    await act(async () => {
      fireEvent.click(metroSolChip);
    });

    await waitFor(() => {
      expect(window.location.search).toContain('metro=0112');
      expect(screen.getByRole('heading', { name: 'Sol' })).toBeDefined();
      expect(screen.getAllByText(/Pinar de Chamartín/i).length).toBeGreaterThan(0);
    });
  });

  it('navigates Atocha real-dataset interchange in 1 tap across Cercanías (18000) -> Metro (0116) -> EMT (1401)', async () => {
    clearMetroStationsCache();
    clearCercaniasStationsCache();

    // Load real full static datasets via fetch from setup.ts
    const stopsRes = await fetch('/data/stops.json');
    setCachedStops(await stopsRes.json());

    await renderApp({
      url: 'http://localhost/?cercanias=18000',
      useFullFixtures: true,
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Madrid-Atocha Cercanías' })
      ).toBeDefined();
    });

    const cercaniasStrip = await waitFor(() =>
      screen.getByRole('region', {
        name: /Conexiones cercanas en intercambiador/i,
      })
    );

    const metroAtochaChip = within(cercaniasStrip).getByRole('button', {
      name: /Metro\s+Atocha/i,
    });
    expect(within(cercaniasStrip).getByRole('button', { name: /Parada 1401/i })).toBeDefined();

    // 1-tap jump to Metro Atocha (0116)
    await act(async () => {
      fireEvent.click(metroAtochaChip);
    });

    await waitFor(() => {
      expect(window.location.search).toContain('metro=0116');
      expect(screen.getByRole('heading', { name: 'Atocha' })).toBeDefined();
    });

    // Metro Atocha shows both Cercanías Atocha and EMT Parada 1401
    const metroStrip = await waitFor(() =>
      screen.getByRole('region', {
        name: /Conexiones cercanas en intercambiador/i,
      })
    );
    const bus1401Chip = within(metroStrip).getByRole('button', {
      name: /Parada 1401/i,
    });

    await act(async () => {
      fireEvent.click(bus1401Chip);
    });

    await waitFor(() => {
      expect(window.location.search).toContain('stop=1401');
      expect(screen.getByRole('heading', { name: /Estación De Atocha/i })).toBeDefined();
    });
  });

  it('renders nothing in NearbyConnectionsStrip when an isolated stop has no connections within 200 m', async () => {
    await renderApp({ url: 'http://localhost/?stop=4514' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Cristo Rey' })).toBeDefined();
    });

    // Give effect time to settle, then confirm zero nearby connections region is rendered
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.queryByRole('region', {
        name: /Conexiones cercanas en intercambiador/i,
      })
    ).toBeNull();
  });
});

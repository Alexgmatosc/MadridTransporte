// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { TransportModeSelector } from '../TransportModeSelector';
import { CercaniasStationView } from '../CercaniasStationView';
import { CercaniasLogo, CercaniasMark, MadridTransitBrandMark } from '../TransitIcons';
import { formatCercaniasLineBadge } from '../../data/cercaniasLines';
import type { CercaniasStation, CercaniasStationResponse } from '../../types/cercanias';
import { fetchCercaniasEstimates } from '../../services/cercaniasApi';

vi.mock('../../services/cercaniasApi', () => ({
  fetchCercaniasEstimates: vi.fn(),
}));

const mockedFetchCercaniasEstimates = vi.mocked(fetchCercaniasEstimates);

const ATOCHA_STATION: CercaniasStation = {
  id: '18000',
  name: 'Madrid-Atocha Cercanías',
  address: 'Plaza del Emperador Carlos V, s/n',
  lat: 40.4065,
  lon: -3.6894,
  lines: ['C3', 'C4a', 'C5', 'C10'],
  zone: 'A',
  stopIds: ['18000'],
};

const BASE_RESPONSE: CercaniasStationResponse = {
  stationId: '18000',
  stationName: 'Madrid-Atocha Cercanías',
  timestamp: Date.now(),
  source: 'realtime',
  isStale: false,
  alerts: [
    {
      id: 'alert-c5',
      lines: ['C5'],
      header: 'Demoras puntuales en Línea C-5',
      description: 'Circulación con retrasos medios de 5 minutos entre Atocha y Móstoles-El Soto.',
      severity: 'warning',
    },
  ],
  arrivals: [
    {
      tripId: 'trip-c5-arriving',
      line: 'C5',
      destination: 'Móstoles-El Soto',
      etaMinutes: 0,
      eta: 'Llegando',
      scheduledTime: '10:15',
      estimatedTime: '10:15',
      status: 'EN_HORA',
      platform: '4',
      trainId: '44601',
      isRealtime: true,
    },
    {
      tripId: 'trip-c4a-delayed',
      line: 'C4a',
      destination: 'Alcobendas-S.S. Reyes',
      etaMinutes: 7,
      eta: '7 min',
      scheduledTime: '10:17',
      estimatedTime: '10:22',
      delaySeconds: 300,
      delayMinutes: 5,
      status: 'RETRASO',
      platform: '7',
      isRealtime: true,
    },
    {
      tripId: 'trip-c3-canceled',
      line: 'C3',
      destination: 'Aranjuez',
      etaMinutes: 12,
      eta: '12 min',
      scheduledTime: '10:27',
      status: 'SUPRIMIDO',
      isCanceled: true,
      platform: '2',
      isRealtime: true,
    },
  ],
  trains: [
    {
      vehicleId: 'v-1',
      tripId: 'trip-c5-arriving',
      line: 'C5',
      lat: 40.406,
      lon: -3.689,
      timestamp: Math.floor(Date.now() / 1000),
    },
  ],
};

describe('Hito 3: Cercanías UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchCercaniasEstimates.mockResolvedValue(BASE_RESPONSE);

    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('TransitIcons Cercanías emblems', () => {
    it('renders CercaniasLogo, CercaniasMark, and MadridTransitBrandMark with #E4002B', () => {
      const { container } = render(
        <div>
          <CercaniasLogo />
          <CercaniasMark />
          <MadridTransitBrandMark />
        </div>
      );
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBe(5); // CercaniasLogo + CercaniasMark + 3 inside MadridTransitBrandMark
      expect(container.innerHTML).toContain('#E4002B');
    });
  });

  describe('TransportModeSelector with 4 modes', () => {
    it('renders Todos, Metro, Autobús, and Cercanías radios and triggers change to cercanias', () => {
      const onChange = vi.fn();
      render(<TransportModeSelector mode="all" onChange={onChange} />);

      const radiogroup = screen.getByRole('radiogroup', {
        name: /Seleccionar modo de transporte/i,
      });
      const radios = within(radiogroup).getAllByRole('radio');
      expect(radios).toHaveLength(4);

      expect(radiogroup.textContent).toContain('Todos');
      expect(radiogroup.textContent).toContain('Metro');
      expect(radiogroup.textContent).toContain('Autobús');
      expect(radiogroup.textContent).toContain('Cercanías');

      expect(radios[0].getAttribute('aria-checked')).toBe('true');
      expect(radios[3].getAttribute('aria-checked')).toBe('false');

      fireEvent.click(radios[3]);
      expect(onChange).toHaveBeenCalledWith('cercanias');
    });

    it('marks Cercanías radio with aria-checked="true" and active #E4002B styling when selected', () => {
      render(<TransportModeSelector mode="cercanias" onChange={() => {}} />);

      const cercaniasRadio = screen.getByRole('radio', { name: /Cercanías/i });
      expect(cercaniasRadio.getAttribute('aria-checked')).toBe('true');
      expect(cercaniasRadio.className).toContain('bg-[#E4002B]');
    });
  });

  describe('CercaniasStationView', () => {
    it('renders station header, zone, official line badges, arrivals with Vía, delay (+5 min), SUPRIMIDO, and alerts', async () => {
      const onArrivalsLoaded = vi.fn();
      const onBackToSearch = vi.fn();
      const onToggleFavorite = vi.fn();

      const { container } = render(
        <CercaniasStationView
          station={ATOCHA_STATION}
          isFav={false}
          onToggleFavorite={onToggleFavorite}
          onBackToSearch={onBackToSearch}
          onArrivalsLoaded={onArrivalsLoaded}
        />
      );

      expect(screen.getByText('Madrid-Atocha Cercanías')).toBeDefined();
      expect(screen.getByText('Zona A')).toBeDefined();
      expect(screen.getByText('Plaza del Emperador Carlos V, s/n')).toBeDefined();
      expect(screen.getByText('Volver al buscador')).toBeDefined();

      await waitFor(() => {
        expect(screen.getByText('Hacia Móstoles-El Soto')).toBeDefined();
      });

      // Official line badge color check
      const c5Badge = formatCercaniasLineBadge('C5');
      expect(container.innerHTML.toUpperCase()).toContain(c5Badge.bg.toUpperCase());

      // Arrivals details: platform Vía, arriving, delay, canceled
      expect(screen.getByText('Vía 4')).toBeDefined();
      expect(screen.getByText('Llegando')).toBeDefined();
      expect(screen.getByText('Hacia Alcobendas-S.S. Reyes')).toBeDefined();
      expect(screen.getByText('Vía 7')).toBeDefined();
      expect(screen.getByText('+5 min')).toBeDefined();
      expect(screen.getByText('7 min')).toBeDefined();
      expect(screen.getByText('Hacia Aranjuez')).toBeDefined();
      expect(screen.getAllByText('SUPRIMIDO').length).toBeGreaterThanOrEqual(1);

      // Service alerts banner
      expect(screen.getByText('Demoras puntuales en Línea C-5')).toBeDefined();
      expect(
        screen.getByText(
          'Circulación con retrasos medios de 5 minutos entre Atocha y Móstoles-El Soto.'
        )
      ).toBeDefined();

      // Callback for live trains
      expect(onArrivalsLoaded).toHaveBeenCalledWith(BASE_RESPONSE.trains);

      // Favorite & back callbacks
      fireEvent.click(screen.getByText('Guardar'));
      expect(onToggleFavorite).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Volver al buscador'));
      expect(onBackToSearch).toHaveBeenCalledTimes(1);
    });

    it('filters arrivals by selected line and restores all lines when clicking "Todas las líneas"', async () => {
      render(
        <CercaniasStationView
          station={ATOCHA_STATION}
          isFav={true}
          onToggleFavorite={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hacia Móstoles-El Soto')).toBeDefined();
        expect(screen.getByText('Hacia Alcobendas-S.S. Reyes')).toBeDefined();
      });

      expect(screen.getByText('Favorita')).toBeDefined();

      // Filter by C5 using header badge button
      const filterC5Button = screen.getByTitle('Filtrar por C5');
      fireEvent.click(filterC5Button);

      expect(screen.getByText('Hacia Móstoles-El Soto')).toBeDefined();
      expect(screen.queryByText('Hacia Alcobendas-S.S. Reyes')).toBeNull();
      expect(screen.queryByText('Hacia Aranjuez')).toBeNull();

      // Reset filter via "Todas las líneas (4)"
      fireEvent.click(screen.getByText('Todas las líneas (4)'));
      expect(screen.getByText('Hacia Alcobendas-S.S. Reyes')).toBeDefined();
      expect(screen.getByText('Hacia Aranjuez')).toBeDefined();
    });

    it('renders stale feed warning when isStale is true and handles errors gracefully', async () => {
      mockedFetchCercaniasEstimates.mockResolvedValueOnce({
        ...BASE_RESPONSE,
        isStale: true,
        error: 'Feed GTFS-RT temporalmente degradado',
      });

      render(
        <CercaniasStationView
          station={ATOCHA_STATION}
          isFav={false}
          onToggleFavorite={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Aviso de feed antiguo/i)).toBeDefined();
        expect(screen.getByText('Feed GTFS-RT temporalmente degradado')).toBeDefined();
      });
    });

    it('shares station link with ?cercanias= param and without stop/metro params', async () => {
      window.history.replaceState({}, '', '/?stop=72&metro=0112');
      const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

      render(
        <CercaniasStationView
          station={ATOCHA_STATION}
          isFav={false}
          onToggleFavorite={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hacia Móstoles-El Soto')).toBeDefined();
      });

      fireEvent.click(screen.getByTitle('Compartir estación'));

      await waitFor(() => {
        expect(writeTextSpy).toHaveBeenCalledTimes(1);
      });

      const sharedPayload = writeTextSpy.mock.calls[0][0];
      expect(sharedPayload).toContain('cercanias=18000');
      expect(sharedPayload).not.toContain('stop=');
      expect(sharedPayload).not.toContain('metro=');
    });
  });
});

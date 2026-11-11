import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { TransportModeSelector } from '../TransportModeSelector';
import { MetroStationView } from '../MetroStationView';
import { Header } from '../Header';
import { MobileTabBar } from '../MobileTabBar';
import type { MetroStation } from '../../types/metro';
import type { FavoriteStop, Stop } from '../../types/emt';
import type { FavoriteMetroStation } from '../../types/metro';
import { searchStops, loadStops } from '../../services/stopsService';
import {
  searchMetroStations,
  setCachedMetroStations,
  findNearestMetroStations,
} from '../../services/metroService';
import { formatMetroLineBadge } from '../../data/metroLines';

// Sample fixture data for tests
const SOL_STATION: MetroStation = {
  id: '0112',
  name: 'Sol',
  address: 'Plaza de la Puerta del Sol, s/n',
  lat: 40.4169,
  lon: -3.7035,
  lines: ['1', '2', '3'],
  zone: 'A',
  allCodes: ['0112', '0208', '0306'],
};

const OPERA_STATION: MetroStation = {
  id: '0209',
  name: 'Ópera',
  address: 'Plaza de Isabel II, 1',
  lat: 40.4181,
  lon: -3.7094,
  lines: ['2', '5', 'R'],
  zone: 'A',
  allCodes: ['0209', '0507', '0001'],
};

const SAMPLE_BUS_STOPS: Stop[] = [
  {
    id: '72',
    name: 'Cibeles',
    address: 'Paseo de Recoletos',
    lat: 40.419,
    lon: -3.6922,
    lines: ['1', '2', '202'],
  },
  {
    id: '4514',
    name: 'Cristo Rey',
    address: 'Plaza de Cristo Rey',
    lat: 40.4395,
    lon: -3.7188,
    lines: ['1', '82'],
  },
];

const SAMPLE_BUS_FAVORITES: FavoriteStop[] = [
  {
    id: '72',
    name: 'Cibeles',
    address: 'Paseo de Recoletos',
    lines: ['1', '2', '202'],
    addedAt: 1700000000,
  },
];

const SAMPLE_METRO_FAVORITES: FavoriteMetroStation[] = [
  {
    id: '0112',
    name: 'Sol',
    address: 'Plaza de la Puerta del Sol',
    lines: ['1', '2', '3'],
    addedAt: 1700000000,
  },
];

describe('Milestone 3: Multimodal UI Integration', () => {
  beforeEach(async () => {
    setCachedMetroStations([SOL_STATION, OPERA_STATION]);

    // Mock fetch for stopsService
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('stops.json')) {
          return Promise.resolve({
            ok: true,
            json: async () => SAMPLE_BUS_STOPS,
          });
        }
        if (url.includes('metro_stations.json')) {
          return Promise.resolve({
            ok: true,
            json: async () => [SOL_STATION, OPERA_STATION],
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ Vtelindicadores: [] }),
        });
      })
    );

    await loadStops();
  });

  describe('TransportModeSelector component', () => {
    it('renders all three modes: Todos, Metro, and Autobús', () => {
      const html = renderToString(
        <TransportModeSelector mode="all" onChange={() => {}} />
      );

      expect(html).toContain('Todos');
      expect(html).toContain('Metro');
      expect(html).toContain('Autobús');
      expect(html).toContain('role="radiogroup"');
    });

    it('sets aria-checked correctly for selected mode', () => {
      const htmlMetro = renderToString(
        <TransportModeSelector mode="metro" onChange={() => {}} />
      );
      expect(htmlMetro).toContain('role="radio" aria-checked="true"');
      expect(htmlMetro).toContain('Metro de Madrid');

      const htmlBus = renderToString(
        <TransportModeSelector mode="bus" onChange={() => {}} />
      );
      expect(htmlBus).toContain('Autobús EMT');
    });

    it('renders compact mode when size="sm" is passed', () => {
      const htmlSm = renderToString(
        <TransportModeSelector mode="all" onChange={() => {}} size="sm" />
      );
      expect(htmlSm).toContain('px-2.5 py-1 text-xs');
    });
  });

  describe('MetroStationView component', () => {
    it('renders station header, name, address, zone, and lines', () => {
      const html = renderToString(
        <MetroStationView
          station={SOL_STATION}
          isFav={false}
          onToggleFavorite={() => {}}
          onBackToSearch={() => {}}
        />
      );

      expect(html).toContain('Sol');
      expect(html).toContain('Plaza de la Puerta del Sol, s/n');
      expect(html).toContain('Zona');
      expect(html).toContain('Metro de Madrid');
      expect(html).toContain('Volver al buscador');
      expect(html).toContain('Guardar');
    });

    it('displays official colored line badges for multi-line interchange', () => {
      const html = renderToString(
        <MetroStationView
          station={SOL_STATION}
          isFav={true}
          onToggleFavorite={() => {}}
        />
      );

      // Line badges 1, 2, 3
      const badge1 = formatMetroLineBadge('1');
      const badge2 = formatMetroLineBadge('2');
      const badge3 = formatMetroLineBadge('3');

      expect(html).toContain(badge1.bg); // #2DBEF0
      expect(html).toContain(badge2.bg); // #ED1C24
      expect(html).toContain(badge3.bg); // #FFD000

      // Favorita label when isFav is true
      expect(html).toContain('Favorita');
    });

    it('renders multi-line filter bar when station has multiple lines', () => {
      const html = renderToString(
        <MetroStationView
          station={SOL_STATION}
          isFav={false}
          onToggleFavorite={() => {}}
        />
      );

      expect(html).toContain('Todas las líneas');
      expect(html).toContain('Línea 1');
      expect(html).toContain('Línea 2');
      expect(html).toContain('Línea 3');
    });
  });

  describe('Header component multimodal extensions', () => {
    it('renders Madrid Metro & Bus branding and multimodal favorites', () => {
      const html = renderToString(
        <Header
          onOpenSearch={() => {}}
          onNearMe={() => {}}
          onGoHome={() => {}}
          isLocating={false}
          isDark={false}
          onToggleTheme={() => {}}
          favorites={SAMPLE_BUS_FAVORITES}
          metroFavorites={SAMPLE_METRO_FAVORITES}
          currentStopId={null}
          currentMetroStationId={null}
          onSelectStop={() => {}}
          onSelectMetroStation={() => {}}
          transportMode="all"
          onTransportModeChange={() => {}}
        />
      );

      expect(html).toContain('Madrid');
      expect(html).toContain('Metro');
      expect(html).toContain('Bus');
      expect(html).toContain('Favoritos:');
      expect(html).toContain('Sol');
      expect(html).toContain('Cibeles');
    });
  });

  describe('MobileTabBar component multimodal extensions', () => {
    it('displays active Estación state when activeType is metro', () => {
      const html = renderToString(
        <MobileTabBar
          onGoHome={() => {}}
          onOpenSearch={() => {}}
          onNearMe={() => {}}
          onOpenFavorites={() => {}}
          isLocating={false}
          favoritesCount={2}
          isDark={false}
          onToggleTheme={() => {}}
          hasActiveStop={true}
          activeType="metro"
        />
      );

      expect(html).toContain('Estación');
      expect(html).toContain('Buscar');
      expect(html).toContain('Favoritos');
    });

    it('displays Parada state when activeType is bus', () => {
      const html = renderToString(
        <MobileTabBar
          onGoHome={() => {}}
          onOpenSearch={() => {}}
          onNearMe={() => {}}
          onOpenFavorites={() => {}}
          isLocating={false}
          favoritesCount={1}
          isDark={false}
          onToggleTheme={() => {}}
          hasActiveStop={true}
          activeType="bus"
        />
      );

      expect(html).toContain('Parada');
    });
  });

  describe('Universal Search Integration', () => {
    it('queries and finds Metro stations by name, code, or line', async () => {
      const solResults = await searchMetroStations('sol');
      expect(solResults.length).toBeGreaterThanOrEqual(1);
      expect(solResults[0].name).toBe('Sol');

      const operaResults = await searchMetroStations('opera');
      expect(operaResults.length).toBeGreaterThanOrEqual(1);
      expect(operaResults[0].name).toBe('Ópera');

      const lineRResults = await searchMetroStations('R');
      expect(lineRResults.some((s) => s.name === 'Ópera')).toBe(true);
    });

    it('queries and finds Bus stops concurrently', () => {
      const busResults = searchStops('cibeles', 10);
      expect(busResults.length).toBeGreaterThanOrEqual(1);
      expect(busResults.some((b) => b.name.toLowerCase().includes('cibeles'))).toBe(true);
    });

    it('calculates spatial proximity for nearest metro stations', async () => {
      // Puerta del Sol coordinates
      const nearest = await findNearestMetroStations(40.4168, -3.7038, 5);
      expect(nearest.length).toBeGreaterThan(0);
      expect(nearest[0].name).toBe('Sol');
      expect(nearest[0].distanceMeters).toBeLessThan(100);
    });
  });
});

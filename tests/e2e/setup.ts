import { vi, afterEach, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Polyfill HTMLDialogElement for happy-dom
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
      this.setAttribute('open', '');
    };
  }

  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
}

// Mock window.scrollTo
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  if (typeof window.alert === 'undefined') {
    window.alert = vi.fn();
  }
}

let mockMetroError: string | null = null;
export function setMockMetroError(err: string | null) {
  mockMetroError = err;
}

let mockCercaniasError: string | null = null;
export function setMockCercaniasError(err: string | null) {
  mockCercaniasError = err;
}

// Mock navigator.clipboard
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(''),
    },
  });

  // Mock navigator.geolocation (Puerta del Sol coordinates: 40.4168, -3.7038)
  const createMockGeolocation = () => ({
    getCurrentPosition(success: (pos: GeolocationPosition) => void, _error?: (err: GeolocationPositionError) => void) {
      success({
        coords: {
          latitude: 40.4168,
          longitude: -3.7038,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    },
    watchPosition() { return 1; },
    clearWatch() {},
  });

  Object.defineProperty(navigator, 'geolocation', {
    writable: true,
    configurable: true,
    value: createMockGeolocation(),
  });

  beforeEach(() => {
    mockMetroError = null;
    mockCercaniasError = null;
    Object.defineProperty(navigator, 'geolocation', {
      writable: true,
      configurable: true,
      value: createMockGeolocation(),
    });
  });
}

// Leaflet stubs
vi.mock('leaflet', () => {
  const mockMap: any = {
    remove: vi.fn(),
    invalidateSize: vi.fn(),
    flyTo: vi.fn(),
    setView() { return this; },
    fitBounds() { return this; },
    panTo() { return this; },
    on() { return this; },
    off() { return this; },
  };
  const mockLayerGroup: any = {
    addTo() { return this; },
    clearLayers() { return this; },
    addLayer() { return this; },
  };
  const mockTileLayer: any = {
    addTo() { return this; },
    setUrl() { return this; },
  };
  const mockControl = {
    zoom: () => ({ addTo: () => {} }),
  };
  const mockMarker: any = {
    addTo() { return this; },
    bindPopup() { return this; },
    openPopup() { return this; },
    on() { return this; },
    off() { return this; },
  };
  return {
    default: {
      map: () => mockMap,
      control: mockControl,
      tileLayer: () => mockTileLayer,
      layerGroup: () => mockLayerGroup,
      latLngBounds: () => ({
        extend: () => {},
        isValid: () => true,
      }),
      divIcon: () => ({}),
      marker: () => mockMarker,
    },
  };
});

// Load static dataset fixtures once
const STOPS_DATA_PATH = path.resolve(__dirname, '../../public/data/stops.json');
const METRO_DATA_PATH = path.resolve(__dirname, '../../public/data/metro_stations.json');
const CERCANIAS_DATA_PATH = path.resolve(__dirname, '../../public/data/cercanias_stations.json');

const stopsData = JSON.parse(fs.readFileSync(STOPS_DATA_PATH, 'utf-8'));
const metroStationsData = JSON.parse(fs.readFileSync(METRO_DATA_PATH, 'utf-8'));
const cercaniasStationsData = JSON.parse(fs.readFileSync(CERCANIAS_DATA_PATH, 'utf-8'));

// Helper for PMV HTML generation
export function generatePMVHtml(stopId: string, stopName = 'Cibeles', address = 'Paseo de Recoletos') {
  return `
    <p><h2>Parada:${stopId} ${stopName}</h2></p>
    <p><h2>${address}</h2></p>
    <p><h2>Estimaciones:</h2></p>
    <table border="1">
      <tbody>
        <tr>
          <td><h2>Línea</h2></td>
          <td><h2>Hacia</h2></td>
          <td><h2>Tiempo</h2></td>
          <td><h2>Dónde está el bus</h2></td>
        </tr>
        <tr>
          <td><h2>1</h2></td>
          <td><h2>CRISTO REY</h2></td>
          <td><h2>Llegando</h2></td>
          <td><a href="https://maps.google.com/?q=40.4195,-3.6925">Ver</a></td>
        </tr>
        <tr>
          <td><h2>2</h2></td>
          <td><h2>MANUEL BECERRA</h2></td>
          <td><h2>4 min</h2></td>
          <td><a href="https://maps.google.com/?q=40.4180,-3.6910">Ver</a></td>
        </tr>
        <tr>
          <td><h2>202</h2></td>
          <td><h2>PAVONES</h2></td>
          <td><h2>12 min</h2></td>
          <td><a href="https://maps.google.com/?q=40.4150,-3.6890">Ver</a></td>
        </tr>
      </tbody>
    </table>
  `;
}

// Helper for Metro teleindicadores JSON generation
export function generateMetroTeleindicadores(code: string) {
  const cleanCode = code.replace(/^0+/, '');
  if (cleanCode === '112') {
    // Sol: Lines 1, 2, 3
    return {
      Vtelindicadores: [
        {
          linea: 1,
          nombreli: 'PINAR DE CHAMARTIN-VALDECARROS',
          idnumerica: 112,
          nombreest: 'Sol',
          anden: 1,
          sentido: 'Pinar de Chamartín',
          proximo: 0,
          siguiente: 4,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
        {
          linea: 1,
          nombreli: 'PINAR DE CHAMARTIN-VALDECARROS',
          idnumerica: 112,
          nombreest: 'Sol',
          anden: 2,
          sentido: 'Valdecarros',
          proximo: 2,
          siguiente: 6,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
        {
          linea: 2,
          nombreli: 'LAS ROSAS-CUATRO CAMINOS',
          idnumerica: 112,
          nombreest: 'Sol',
          anden: 1,
          sentido: 'Cuatro Caminos',
          proximo: 3,
          siguiente: 8,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
        {
          linea: 3,
          nombreli: 'VILLAVERDE ALTO-MONCLOA',
          idnumerica: 112,
          nombreest: 'Sol',
          anden: 1,
          sentido: 'Moncloa',
          proximo: 1,
          siguiente: 5,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
      ],
    };
  }

  if (cleanCode === '209') {
    // Ópera: Lines 2, 5, R
    return {
      Vtelindicadores: [
        {
          linea: 2,
          nombreli: 'LAS ROSAS-CUATRO CAMINOS',
          idnumerica: 209,
          nombreest: 'Ópera',
          anden: 1,
          sentido: 'Cuatro Caminos',
          proximo: 2,
          siguiente: 7,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
        {
          linea: 5,
          nombreli: 'ALAMEDA DE OSUNA-CASA DE CAMPO',
          idnumerica: 209,
          nombreest: 'Ópera',
          anden: 1,
          sentido: 'Casa de Campo',
          proximo: 0,
          siguiente: 5,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
        {
          linea: 0, // Ramal
          nombreli: 'RAMAL OPERA-PRINCIPE PIO',
          idnumerica: 209,
          nombreest: 'Ópera',
          anden: 1,
          sentido: 'Príncipe Pío',
          proximo: 1,
          siguiente: 6,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
      ],
    };
  }

  // Generic fallback for any other station code
  return {
    Vtelindicadores: [
      {
        linea: 1,
        nombreli: 'LÍNEA 1',
        idnumerica: Number(cleanCode) || 1,
        nombreest: `Estación ${code}`,
        anden: 1,
        sentido: 'Cabecera Norte',
        proximo: 2,
        siguiente: 6,
        FECHAHORAEMISIONPREVISION: new Date().toISOString(),
      },
      {
        linea: 1,
        nombreli: 'LÍNEA 1',
        idnumerica: Number(cleanCode) || 1,
        nombreest: `Estación ${code}`,
        anden: 2,
        sentido: 'Cabecera Sur',
        proximo: 5,
        siguiente: 11,
        FECHAHORAEMISIONPREVISION: new Date().toISOString(),
      },
    ],
  };
}

// Helper for Renfe Cercanías Madrid /api/cercanias mock response
export function generateCercaniasStationResponse(stationId: string) {
  const now = Date.now();
  const nowSec = Math.floor(now / 1000);

  if (stationId === '18000') {
    return {
      stationId: '18000',
      stationName: 'Madrid-Atocha Cercanías',
      arrivals: [
        {
          tripId: '1016V20703C5',
          routeId: '10T0017C5',
          line: 'C5',
          destination: 'Móstoles-El Soto',
          scheduledTime: '09:10',
          estimatedTime: '09:10',
          etaMinutes: 0,
          eta: 'Llegando',
          delaySeconds: 0,
          delayMinutes: 0,
          status: 'EN_HORA',
          platform: '5',
          trainId: '20703',
          isRealtime: true,
        },
        {
          tripId: '1016V20411C4a',
          routeId: '10T0013C4a',
          line: 'C4a',
          destination: 'Alcobendas-S.S. de los Reyes',
          scheduledTime: '09:14',
          estimatedTime: '09:14',
          etaMinutes: 4,
          eta: '4 min',
          delaySeconds: 0,
          delayMinutes: 0,
          status: 'EN_HORA',
          platform: '3',
          trainId: '20411',
          isRealtime: true,
        },
        {
          tripId: '1016V20319C3',
          routeId: '10T0009C3',
          line: 'C3',
          destination: 'Aranjuez',
          scheduledTime: '09:17',
          estimatedTime: '09:20',
          etaMinutes: 10,
          eta: '10 min',
          delaySeconds: 180,
          delayMinutes: 3,
          status: 'RETRASO',
          platform: '7',
          trainId: '20319',
          isRealtime: true,
        },
      ],
      alerts: [
        {
          id: 'alert-c3-atocha',
          lines: ['C3'],
          header: 'Demora puntual en línea C3',
          description: 'Circulación con demoras de 3 minutos en el tramo Atocha - Aranjuez.',
          severity: 'warning',
        },
      ],
      trains: [
        {
          vehicleId: 'train-20703',
          label: '20703',
          tripId: '1016V20703C5',
          routeId: '10T0017C5',
          line: 'C5',
          lat: 40.4055,
          lon: -3.6915,
          currentStatus: 'INCOMING_AT',
          stopId: '18000',
          stopName: 'Madrid-Atocha Cercanías',
          platform: '5',
          timestamp: nowSec,
        },
        {
          vehicleId: 'train-20411',
          label: '20411',
          tripId: '1016V20411C4a',
          routeId: '10T0013C4a',
          line: 'C4a',
          lat: 40.4095,
          lon: -3.6952,
          currentStatus: 'IN_TRANSIT_TO',
          stopId: '18000',
          stopName: 'Madrid-Atocha Cercanías',
          platform: '3',
          timestamp: nowSec,
        },
      ],
      timestamp: now,
      feedTimestamp: nowSec,
      isStale: false,
      source: 'realtime',
    };
  }

  if (stationId === '18101') {
    return {
      stationId: '18101',
      stationName: 'Sol',
      arrivals: [
        {
          tripId: '1016V20412C4',
          routeId: '10T0012C4',
          line: 'C4',
          destination: 'Parla',
          scheduledTime: '09:12',
          estimatedTime: '09:12',
          etaMinutes: 2,
          eta: '2 min',
          delaySeconds: 0,
          delayMinutes: 0,
          status: 'EN_HORA',
          platform: '2',
          trainId: '20412',
          isRealtime: true,
        },
        {
          tripId: '1016V20321C3',
          routeId: '10T0009C3',
          line: 'C3',
          destination: 'Madrid-Chamartín-Clara Campoamor',
          scheduledTime: '09:18',
          estimatedTime: '09:18',
          etaMinutes: 8,
          eta: '8 min',
          delaySeconds: 0,
          delayMinutes: 0,
          status: 'EN_HORA',
          platform: '1',
          trainId: '20321',
          isRealtime: true,
        },
      ],
      alerts: [],
      trains: [
        {
          vehicleId: 'train-20412',
          label: '20412',
          tripId: '1016V20412C4',
          routeId: '10T0012C4',
          line: 'C4',
          lat: 40.4152,
          lon: -3.7015,
          currentStatus: 'INCOMING_AT',
          stopId: '18101',
          stopName: 'Sol',
          platform: '2',
          timestamp: nowSec,
        },
      ],
      timestamp: now,
      feedTimestamp: nowSec,
      isStale: false,
      source: 'realtime',
    };
  }

  return {
    stationId,
    stationName: `Estación ${stationId}`,
    arrivals: [
      {
        tripId: `1016V001C4-${stationId}`,
        routeId: '10T0012C4',
        line: 'C4',
        destination: 'Madrid-Chamartín-Clara Campoamor',
        scheduledTime: '09:15',
        estimatedTime: '09:15',
        etaMinutes: 5,
        eta: '5 min',
        delaySeconds: 0,
        delayMinutes: 0,
        status: 'EN_HORA',
        platform: '1',
        trainId: '21001',
        isRealtime: true,
      },
    ],
    alerts: [],
    trains: [
      {
        vehicleId: 'train-21001',
        label: '21001',
        tripId: `1016V001C4-${stationId}`,
        routeId: '10T0012C4',
        line: 'C4',
        lat: 40.42,
        lon: -3.7,
        currentStatus: 'IN_TRANSIT_TO',
        stopId: stationId,
        stopName: `Estación ${stationId}`,
        platform: '1',
        timestamp: nowSec,
      },
    ],
    timestamp: now,
    feedTimestamp: nowSec,
    isStale: false,
    source: 'realtime',
  };
}

// Global default fetch handler
const defaultFetch = async (input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url.includes('/data/stops.json') || url.endsWith('stops.json')) {
    return new Response(JSON.stringify(stopsData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/data/metro_stations.json') || url.endsWith('metro_stations.json')) {
    return new Response(JSON.stringify(metroStationsData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/data/cercanias_stations.json') || url.endsWith('cercanias_stations.json')) {
    return new Response(JSON.stringify(cercaniasStationsData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/api/pmv') || url.includes('PMVVisor')) {
    const urlObj = new URL(url, 'http://localhost');
    const stopnum = urlObj.searchParams.get('stopnum') || urlObj.searchParams.get('stopId') || '72';
    if (stopnum === '999999' || stopnum === 'invalid') {
      return new Response('<p><h2>Error al obtener las estimaciones o no existe la parada</h2></p>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    const html = generatePMVHtml(stopnum);
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (url.includes('/api/metro') || url.includes('teleindicadores')) {
    if (mockMetroError) {
      return new Response(JSON.stringify({ status: 500, message: mockMetroError }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const segments = url.split('/');
    const code = segments[segments.length - 1].split('?')[0];
    if (code === '999999') {
      return new Response(JSON.stringify({ Vtelindicadores: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const data = generateMetroTeleindicadores(code);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/api/cercanias')) {
    if (mockCercaniasError) {
      return new Response(JSON.stringify({ error: mockCercaniasError }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const urlObj = new URL(url, 'http://localhost');
    const mode = urlObj.searchParams.get('mode');
    if (mode === 'trains') {
      const atocha = generateCercaniasStationResponse('18000');
      return new Response(
        JSON.stringify({
          trains: atocha.trains,
          alerts: atocha.alerts,
          timestamp: Date.now(),
          feedTimestamp: Math.floor(Date.now() / 1000),
          isStale: false,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const stationId = urlObj.searchParams.get('station') || '18000';
    if (stationId === '999999') {
      return new Response(
        JSON.stringify({
          stationId,
          stationName: 'Estación desconocida',
          arrivals: [],
          alerts: [],
          trains: [],
          timestamp: Date.now(),
          source: 'realtime',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const data = generateCercaniasStationResponse(stationId);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

globalThis.fetch = defaultFetch as typeof globalThis.fetch;

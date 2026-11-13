import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
import { App } from '../../../src/App';
import { setCachedStops, loadStops } from '../../../src/services/stopsService';
import { setCachedMetroStations, loadMetroStations } from '../../../src/services/metroService';
import { FIXTURE_BUS_STOPS, FIXTURE_METRO_STATIONS } from './fixtures';

export interface RenderAppOptions {
  url?: string;
  busFavorites?: Array<{ id: string; name: string; address?: string; lines?: string[]; addedAt?: number }>;
  metroFavorites?: Array<{ id: string; name: string; address?: string; lines?: string[]; addedAt?: number }>;
  cercaniasFavorites?: Array<{ id: string; name: string; address?: string; lines?: string[]; addedAt?: number }>;
  theme?: 'light' | 'dark' | 'system';
  transportMode?: 'all' | 'bus' | 'metro' | 'cercanias';
  useFullFixtures?: boolean;
}

export async function renderApp(options: RenderAppOptions = {}) {
  // 1. Reset localStorage
  window.localStorage.clear();

  if (options.busFavorites) {
    window.localStorage.setItem(
      'emt_madrid_favorites_v1',
      JSON.stringify(options.busFavorites)
    );
  }

  if (options.metroFavorites) {
    window.localStorage.setItem(
      'metro_madrid_favorites_v1',
      JSON.stringify(options.metroFavorites)
    );
  }

  if (options.cercaniasFavorites) {
    window.localStorage.setItem(
      'cercanias_madrid_favorites_v1',
      JSON.stringify(options.cercaniasFavorites)
    );
  }

  if (options.theme) {
    window.localStorage.setItem('emt_madrid_theme_v1', options.theme);
  }

  if (options.transportMode) {
    window.localStorage.setItem('madrid_transporte_mode_v1', options.transportMode);
  }

  // 2. Set window URL
  const targetUrl = options.url || 'http://localhost/';
  const parsed = new URL(targetUrl, 'http://localhost/');
  window.history.replaceState({}, '', parsed.pathname + parsed.search + parsed.hash);

  // 3. Prepopulate cache if not using full dataset
  if (!options.useFullFixtures) {
    setCachedStops(FIXTURE_BUS_STOPS);
    setCachedMetroStations(FIXTURE_METRO_STATIONS);
  }

  // 4. Render App
  let renderResult: ReturnType<typeof render>;
  await act(async () => {
    renderResult = render(<App />);
  });

  // 5. Wait for basic app hydration
  await waitFor(() => {
    expect(document.querySelector('header')).not.toBeNull();
  });

  return {
    ...renderResult!,
    screen,
  };
}

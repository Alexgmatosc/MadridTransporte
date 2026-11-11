import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  toggleFavorite,
  getLastVisitedStopId,
  setLastVisitedStopId,
} from '../storageService';

// Polyfill localStorage for node environment
const storageMock: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => storageMock[key] ?? null,
  setItem: (key: string, value: string) => {
    storageMock[key] = String(value);
  },
  removeItem: (key: string) => {
    delete storageMock[key];
  },
  clear: () => {
    for (const key in storageMock) {
      delete storageMock[key];
    }
  },
  key: (index: number) => Object.keys(storageMock)[index] ?? null,
  length: 0,
};

describe('storageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('manages favorites correctly', () => {
    expect(getFavorites()).toEqual([]);
    expect(isFavorite('72')).toBe(false);

    const stop = { id: '72', name: 'Cibeles', address: 'Pº Recoletos', lines: ['53', '14'] };
    addFavorite(stop);

    expect(isFavorite('72')).toBe(true);
    expect(getFavorites().length).toBe(1);
    expect(getFavorites()[0].id).toBe('72');

    // Toggle removes it
    const res = toggleFavorite(stop);
    expect(res.isFav).toBe(false);
    expect(isFavorite('72')).toBe(false);

    // Toggle adds it back
    const res2 = toggleFavorite(stop);
    expect(res2.isFav).toBe(true);
    expect(isFavorite('72')).toBe(true);

    removeFavorite('72');
    expect(isFavorite('72')).toBe(false);
  });

  it('persists last visited stop ID', () => {
    expect(getLastVisitedStopId()).toBeNull();
    setLastVisitedStopId('4514');
    expect(getLastVisitedStopId()).toBe('4514');
  });

  it('manages metro favorites correctly', async () => {
    const {
      getFavoriteMetroStations,
      addFavoriteMetroStation,
      removeFavoriteMetroStation,
      isFavoriteMetroStation,
      toggleFavoriteMetroStation,
    } = await import('../storageService');

    expect(getFavoriteMetroStations()).toEqual([]);
    expect(isFavoriteMetroStation('0112')).toBe(false);

    const station = {
      id: '0112',
      name: 'Sol',
      lines: ['1', '2', '3'],
      address: 'Plaza de la Puerta del Sol',
    };
    addFavoriteMetroStation(station);

    expect(isFavoriteMetroStation('0112')).toBe(true);
    expect(getFavoriteMetroStations().length).toBe(1);
    expect(getFavoriteMetroStations()[0].id).toBe('0112');
    expect(getFavoriteMetroStations()[0].name).toBe('Sol');

    // Duplicate add should be no-op
    addFavoriteMetroStation(station);
    expect(getFavoriteMetroStations().length).toBe(1);

    // Toggle removes it
    const toggleRes1 = toggleFavoriteMetroStation(station);
    expect(toggleRes1.isFav).toBe(false);
    expect(isFavoriteMetroStation('0112')).toBe(false);

    // Toggle adds it back
    const toggleRes2 = toggleFavoriteMetroStation(station);
    expect(toggleRes2.isFav).toBe(true);
    expect(isFavoriteMetroStation('0112')).toBe(true);

    // Remove
    removeFavoriteMetroStation('0112');
    expect(isFavoriteMetroStation('0112')).toBe(false);
  });

  it('persists last visited metro station ID', async () => {
    const { getLastVisitedMetroStationId, setLastVisitedMetroStationId } = await import(
      '../storageService'
    );
    expect(getLastVisitedMetroStationId()).toBeNull();
    setLastVisitedMetroStationId('0209');
    expect(getLastVisitedMetroStationId()).toBe('0209');
  });

  it('persists transport mode preference', async () => {
    const { getTransportModePreference, setTransportModePreference } = await import(
      '../storageService'
    );
    expect(getTransportModePreference()).toBe('all');

    setTransportModePreference('metro');
    expect(getTransportModePreference()).toBe('metro');

    setTransportModePreference('bus');
    expect(getTransportModePreference()).toBe('bus');

    setTransportModePreference('all');
    expect(getTransportModePreference()).toBe('all');
  });
});


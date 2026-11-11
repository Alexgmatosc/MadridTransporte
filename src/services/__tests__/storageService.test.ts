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
});

import { describe, it, expect } from 'vitest';
import { calculateDistanceMeters, normalizeString } from '../stopsService';

describe('stopsService', () => {
  describe('normalizeString', () => {
    it('removes accents and converts to lowercase', () => {
      expect(normalizeString('Alcalá')).toBe('alcala');
      expect(normalizeString('Plaza de España')).toBe('plaza de espana');
      expect(normalizeString('Cibeles - Casa De América')).toBe('cibeles - casa de america');
    });
  });

  describe('calculateDistanceMeters', () => {
    it('calculates distance between Puerta del Sol and Cibeles (~1000m)', () => {
      const sol = { lat: 40.4168, lon: -3.7038 };
      const cibeles = { lat: 40.4190, lon: -3.6922 };
      const dist = calculateDistanceMeters(sol.lat, sol.lon, cibeles.lat, cibeles.lon);
      expect(dist).toBeGreaterThan(900);
      expect(dist).toBeLessThan(1200);
    });

    it('returns 0 for identical points', () => {
      expect(calculateDistanceMeters(40.4168, -3.7038, 40.4168, -3.7038)).toBe(0);
    });
  });
});

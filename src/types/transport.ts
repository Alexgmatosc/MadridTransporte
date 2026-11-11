import type { Stop, FavoriteStop } from './emt';
import type { MetroStation, FavoriteMetroStation } from './metro';

/**
 * Transport modes supported across MadridTransporte.
 * - 'all': Multimodal view (both Bus and Metro)
 * - 'bus': EMT Madrid buses only
 * - 'metro': Metro de Madrid & Metro Ligero only
 */
export type TransportMode = 'all' | 'bus' | 'metro';

/**
 * Unified search result item wrapping either an EMT bus stop or a Metro station.
 */
export interface UnifiedBusStopResult {
  type: 'bus';
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  lines: string[];
  distanceMeters?: number;
  raw: Stop;
}

export interface UnifiedMetroStationResult {
  type: 'metro';
  id: string; // Master code (e.g. "0112")
  name: string;
  address: string;
  lat: number;
  lon: number;
  lines: string[]; // e.g. ["1", "2", "3"]
  allCodes?: string[];
  zone?: string;
  distanceMeters?: number;
  raw: MetroStation;
}

export type UnifiedSearchResult = UnifiedBusStopResult | UnifiedMetroStationResult;

/**
 * Common favorite item interface for multi-modal favorites lists.
 */
export type AnyFavorite =
  | ({ type: 'bus' } & FavoriteStop)
  | ({ type: 'metro' } & FavoriteMetroStation);

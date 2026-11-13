import type { Stop, FavoriteStop } from './emt';
import type { MetroStation, FavoriteMetroStation } from './metro';
import type { CercaniasStation, FavoriteCercaniasStation } from './cercanias';

/**
 * Transport modes supported across MadridTransporte.
 * - 'all': Multimodal view (Bus, Metro and Cercanías)
 * - 'bus': EMT Madrid buses only
 * - 'metro': Metro de Madrid & Metro Ligero only
 * - 'cercanias': Renfe Cercanías Madrid only
 */
export type TransportMode = 'all' | 'bus' | 'metro' | 'cercanias';

/**
 * Unified search result item wrapping an EMT bus stop, Metro station, or Cercanías station.
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

export interface UnifiedCercaniasStationResult {
  type: 'cercanias';
  id: string; // Canonical GTFS stop_id (e.g. "18000", "18101")
  name: string;
  address: string;
  lat: number;
  lon: number;
  lines: string[]; // e.g. ["C3", "C4", "C4a", "C4b"]
  stopIds?: string[];
  zone?: string;
  distanceMeters?: number;
  raw: CercaniasStation;
}

export type UnifiedSearchResult =
  | UnifiedBusStopResult
  | UnifiedMetroStationResult
  | UnifiedCercaniasStationResult;

/**
 * Common favorite item interface for multi-modal favorites lists.
 */
export type AnyFavorite =
  | ({ type: 'bus' } & FavoriteStop)
  | ({ type: 'metro' } & FavoriteMetroStation)
  | ({ type: 'cercanias' } & FavoriteCercaniasStation);

/**
 * Metro de Madrid TypeScript Definitions
 * Covers raw API records from teleindicadores REST service,
 * normalized platform estimates, station models, and line configurations.
 */

/**
 * Raw item structure returned by Metro de Madrid Teleindicadores REST service
 * GET /servicios/rest/teleindicadores/{idnumerica}
 */
export interface RawMetroTeleindicador {
  linea: number; // 0 = Ramal, 1-12 = L1-L12, 51 = ML1
  nombreli: string; // e.g. "PINAR DE CHAMARTIN-VALDECARROS" (often padded with spaces)
  estaciontel: number; // Teleindicator internal equipment number
  idnumerica: number; // Station numeric ID, e.g. 112 (Sol)
  nombreest: string; // Station name, e.g. "Sol"
  anden: number; // Platform track number: 1 | 2
  sentido: string; // Direction / terminus name, e.g. "Valdecarros"
  proximo: number | null; // Minutes to 1st train (0 = arriving, integer = minutes, null = not available)
  siguiente: number | null; // Minutes to 2nd train (integer or null)
  fechaHoraEmisionPrevision?: string; // ISO 8601 prediction timestamp (camelCase in station endpoint)
  FECHAHORAEMISIONPREVISION?: string; // ISO 8601 prediction timestamp (uppercase in full endpoint)
  fechaHoraRegistro?: string; // ISO 8601 registration timestamp (camelCase in station endpoint)
  FECHAHORAREGISTRO?: string; // ISO 8601 registration timestamp (uppercase in full endpoint)
}

/**
 * Raw response container from Teleindicadores service
 */
export interface RawMetroResponse {
  Vtelindicadores: RawMetroTeleindicador[];
  status?: number;
  message?: string;
}

/**
 * Standard Metro line code identifiers
 */
export type MetroLineCode =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | 'R'
  | 'ML1'
  | 'ML2'
  | 'ML3'
  | string;

/**
 * Normalized domain model for platform arrivals
 */
export interface MetroPlatformEstimate {
  line: string; // Formatted badge string: "1", "2", "R", "ML1"
  rawLine: number; // Numeric raw value: 0, 1..12, 51
  lineName: string; // Line display name / route description
  platform: number; // Platform track number (1 or 2)
  destination: string; // Cleaned headsign destination
  proximoMinutes: number | null; // Minutes for 1st train (0 = arriving, null = not available)
  siguienteMinutes: number | null; // Minutes for 2nd train (null if none)
  nextMinutes: number | null; // Earliest upcoming arrival in minutes (0 = arriving, or following if proximo is null)
  followingMinutes: number | null; // Subsequent arrival in minutes
  eta: string; // Formatted user-facing ETA: "Llegando", "3 min", "Sin estimación"
  etaMinutes: number | null; // Earliest minutes for numeric sorting
  secondaryEta?: string; // Secondary train indicator: e.g. "Sig: 5 min"
  timestamp: string; // ISO 8601 emission timestamp
  updatedAt: string; // Alias for timestamp
  isStale?: boolean; // Flagged true if timestamp is older than 20 minutes
}

/**
 * Live arrival times response for a station
 */
export interface MetroStationEstimatesResponse {
  stationCode: string; // Station numeric ID as string, e.g. "112"
  stationId: string; // Alias of stationCode for parity
  stationName: string; // e.g. "Sol"
  estimates: MetroPlatformEstimate[];
  timestamp: number; // Date.now() timestamp of retrieval
  error?: string;
}

/**
 * Metro station metadata entity for search, mapping and cataloging
 */
export interface MetroStation {
  id: string; // Master station code, e.g. "112"
  name: string; // Official station name, e.g. "Sol"
  address: string; // Street address or location descriptor
  lat: number; // Latitude
  lon: number; // Longitude
  lines: string[]; // List of line identifiers, e.g. ["1", "2", "3"]
  allCodes?: string[]; // Subsidiary platform/transfer codes if any
  zone?: string; // Fare zone: "A", "B1", "B2", "B3"
}

/**
 * Visual styling and metadata for a Metro line
 */
export interface MetroLineConfig {
  id: string; // e.g. "1", "R", "ML1"
  name: string; // e.g. "Línea 1", "Ramal"
  color: string; // Hex color code
  textColor: string; // Hex contrast text color ("#FFFFFF" or "#000000")
  badgeText: string; // Compact badge representation
  origin?: string; // Terminus A
  destination?: string; // Terminus B
}

/**
 * Saved favorite metro station in local storage
 */
export interface FavoriteMetroStation {
  id: string;
  name: string;
  lines: string[];
  address?: string;
  addedAt: number;
}

/**
 * Maps raw numeric line ID from Teleindicadores API to standard line code badge:
 * - 0 -> 'R' (Ramal)
 * - 51 -> 'ML1' (Metro Ligero 1)
 * - 1..12 -> '1'..'12'
 */
export function formatMetroLineCode(rawLine: number): string {
  if (rawLine === 0) return 'R';
  if (rawLine === 51) return 'ML1';
  return String(rawLine);
}

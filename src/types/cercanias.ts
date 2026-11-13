/**
 * Renfe Cercanías Madrid (Núcleo 10) TypeScript Definitions
 * Covers static station catalog, GTFS-RT arrivals, service alerts,
 * live vehicle positions, and saved user favorites.
 */

/**
 * Standard Cercanías Madrid line code identifiers
 */
export type CercaniasLineCode =
  | 'C1'
  | 'C2'
  | 'C3'
  | 'C3a'
  | 'C4'
  | 'C4a'
  | 'C4b'
  | 'C5'
  | 'C7'
  | 'C8'
  | 'C8a'
  | 'C8b'
  | 'C9'
  | 'C10'
  | string;

/**
 * Cercanías Madrid station metadata entity for search, mapping, and GTFS-RT matching
 */
export interface CercaniasStation {
  id: string; // Canonical GTFS stop_id, e.g. "18000" (Atocha), "18101" (Sol)
  name: string; // Official station name, e.g. "Sol", "Madrid-Atocha Cercanías"
  address?: string; // Optional street address or location descriptor
  lat: number; // WGS84 latitude
  lon: number; // WGS84 longitude
  lines: string[]; // Serving line badges, e.g. ["C3", "C4", "C4a", "C4b"]
  zone?: string; // Optional CRTM/Renfe fare zone
  stopIds?: string[]; // All matching GTFS stop_ids (e.g. ["70005", "70001"] for Vallecas)
}

/**
 * Visual styling and metadata for a Cercanías Madrid line
 */
export interface CercaniasLineConfig {
  id: string; // e.g. "C5", "C4a", "C10"
  name: string; // e.g. "Línea C-5"
  color: string; // Official hex background color
  textColor: string; // Accessible hex contrast text color ("#FFFFFF" or "#000000")
  badgeText: string; // Compact badge representation, e.g. "C5"
  origin?: string; // Primary terminus A
  destination?: string; // Primary terminus B
}

/**
 * Normalized arrival prediction for a Cercanías station
 */
export interface CercaniasArrival {
  tripId: string; // GTFS-RT tripId, e.g. "1016V20703C5"
  routeId?: string; // GTFS routeId, e.g. "10T0017C5"
  line: string; // Canonical line code, e.g. "C5"
  destination: string; // Resolved headsign / terminus name
  origin?: string; // Route origin if known
  scheduledTime?: string; // ISO 8601 or HH:MM scheduled arrival
  estimatedTime?: string; // ISO 8601 or HH:MM realtime estimated arrival
  etaMinutes: number | null; // Minutes until arrival (0 = arriving)
  eta: string; // Formatted user-facing ETA ("Llegando", "4 min", etc.)
  delaySeconds?: number; // Delay relative to schedule (negative = early)
  delayMinutes?: number; // Delay in whole minutes (0 = on time, >0 = delayed)
  status?: 'EN_HORA' | 'RETRASO' | 'SUPRIMIDO'; // Derived realtime status
  isCanceled?: boolean; // True when trip is CANCELED or stop is SKIPPED
  platform?: string; // Platform/track label if available
  trainId?: string; // Rolling stock / train number
  wheelchairAccessible?: boolean;
  isRealtime: boolean; // True when sourced from live GTFS-RT feed
}

/**
 * Service disruption / advisory alert from Renfe GTFS-RT
 */
export interface CercaniasAlert {
  id: string;
  lines: string[]; // Affected line codes, e.g. ["C5"]
  routeIds?: string[]; // Raw GTFS routeIds affected
  stopIds?: string[]; // Specific stopIds affected if scoped
  header?: string;
  description: string;
  severity?: 'info' | 'warning' | 'severe';
  activeFrom?: number; // Unix epoch seconds
  activeUntil?: number; // Unix epoch seconds
}

/**
 * Live train GPS position from Renfe GTFS-RT VehiclePositions
 */
export interface CercaniasTrainPosition {
  vehicleId: string;
  label?: string;
  tripId: string;
  routeId?: string;
  line: string;
  lat: number;
  lon: number;
  currentStatus?: 'INCOMING_AT' | 'STOPPED_AT' | 'IN_TRANSIT_TO' | string;
  stopId?: string;
  stopName?: string;
  platform?: string;
  timestamp: number; // Unix epoch seconds
}

/**
 * Combined live arrivals + alerts response for a Cercanías station
 */
export interface CercaniasStationResponse {
  stationId: string;
  stationName: string;
  arrivals: CercaniasArrival[];
  alerts: CercaniasAlert[];
  trains?: CercaniasTrainPosition[];
  timestamp: number; // Date.now() ms timestamp
  feedTimestamp?: number; // GTFS-RT header timestamp in Unix seconds
  isStale?: boolean;
  source: 'realtime' | 'schedule' | 'mixed';
  error?: string;
}

/**
 * Live trains & active alerts overview response (for map rendering)
 */
export interface CercaniasTrainsResponse {
  trains: CercaniasTrainPosition[];
  alerts: CercaniasAlert[];
  timestamp: number; // Date.now() ms timestamp
  feedTimestamp?: number; // GTFS-RT header timestamp in Unix seconds
  isStale?: boolean;
  error?: string;
}

/**
 * Saved favorite Cercanías station in local storage
 */
export interface FavoriteCercaniasStation {
  id: string;
  name: string;
  lines: string[];
  address?: string;
  addedAt: number;
}

/**
 * Compact static route/stop lookup metadata generated for Hito 2 serverless API & fallback
 */
export interface CercaniasMeta {
  routes: Record<
    string,
    {
      line: string;
      origin: string;
      destination: string;
    }
  >;
  stops: Record<string, string>;
}

/**
 * Raw Renfe GTFS-RT JSON Feed structures
 */
export interface GtfsRtHeader {
  gtfsRealtimeVersion?: string;
  incrementality?: string;
  timestamp?: string | number;
}

export interface GtfsRtTimeEvent {
  time?: string | number;
  delay?: number;
  uncertainty?: number;
}

export interface GtfsRtStopTimeUpdate {
  stopSequence?: number;
  stopId?: string;
  arrival?: GtfsRtTimeEvent;
  departure?: GtfsRtTimeEvent;
  scheduleRelationship?: 'SCHEDULED' | 'SKIPPED' | 'NO_DATA' | 'UNSCHEDULED' | string;
}

export interface GtfsRtTripDescriptor {
  tripId?: string;
  routeId?: string;
  directionId?: number;
  startTime?: string;
  startDate?: string;
  scheduleRelationship?: 'SCHEDULED' | 'ADDED' | 'UNSCHEDULED' | 'CANCELED' | string;
}

export interface GtfsRtVehicleDescriptor {
  id?: string;
  label?: string;
  licensePlate?: string;
}

export interface GtfsRtTripUpdate {
  trip?: GtfsRtTripDescriptor;
  vehicle?: GtfsRtVehicleDescriptor;
  stopTimeUpdate?: GtfsRtStopTimeUpdate[];
  timestamp?: string | number;
  delay?: number;
}

export interface GtfsRtVehiclePosition {
  trip?: GtfsRtTripDescriptor;
  vehicle?: GtfsRtVehicleDescriptor;
  position?: {
    latitude?: number;
    longitude?: number;
    bearing?: number;
    speed?: number;
  };
  currentStopSequence?: number;
  stopId?: string;
  currentStatus?: string;
  timestamp?: string | number;
}

export interface GtfsRtTranslatedText {
  translation?: Array<{
    text?: string;
    language?: string;
  }>;
}

export interface GtfsRtAlert {
  activePeriod?: Array<{
    start?: string | number;
    end?: string | number;
  }>;
  informedEntity?: Array<{
    agencyId?: string;
    routeId?: string;
    routeType?: number;
    stopId?: string;
    trip?: GtfsRtTripDescriptor;
  }>;
  cause?: string;
  effect?: string;
  url?: GtfsRtTranslatedText;
  headerText?: GtfsRtTranslatedText;
  descriptionText?: GtfsRtTranslatedText;
}

export interface GtfsRtEntity {
  id?: string;
  isDeleted?: boolean;
  tripUpdate?: GtfsRtTripUpdate;
  vehicle?: GtfsRtVehiclePosition;
  alert?: GtfsRtAlert;
}

export interface GtfsRtFeed {
  header?: GtfsRtHeader;
  entity?: GtfsRtEntity[];
}

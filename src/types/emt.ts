export interface Stop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  lines: string[];
}

export interface BusEstimate {
  line: string;
  destination: string;
  eta: string;
  etaMinutes: number | null;
  coordinates: {
    lat: number;
    lon: number;
  } | null;
  mapsUrl?: string;
}

export interface StopEstimatesResponse {
  stopId: string;
  stopName: string;
  address: string;
  estimates: BusEstimate[];
  timestamp: number;
  error?: string;
}

export interface FavoriteStop {
  id: string;
  name: string;
  address?: string;
  lines?: string[];
  addedAt: number;
}

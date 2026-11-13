/// <reference types="@types/google.maps" />
import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import type { BusEstimate, Stop } from '../types/emt';
import type { MetroStation } from '../types/metro';
import type { CercaniasStation, CercaniasTrainPosition } from '../types/cercanias';
import { formatMetroLineBadge } from '../data/metroLines';
import {
  formatCercaniasLineBadge,
  getCercaniasLineColor,
} from '../data/cercaniasLines';
import {
  MetroDiamondLogo,
  EmtBusLogo,
  CercaniasLogo,
  CercaniasMark,
} from './TransitIcons';

/**
 * Constant referencing the Google Maps API key configured in environment variables (Vercel / .env)
 */
export const GOOGLE_MAPS_API_KEY: string =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || '';

export interface GoogleBusMapProps {
  apiKey?: string;
  stop?: Stop | null;
  metroStation?: MetroStation | null;
  cercaniasStation?: CercaniasStation | null;
  cercaniasTrains?: CercaniasTrainPosition[];
  estimates?: BusEstimate[];
  userLocation: { lat: number; lon: number } | null;
  selectedBus?: BusEstimate | null;
  onClearSelectedBus?: () => void;
  onAuthError?: () => void;
  isDark: boolean;
  fullBleed?: boolean;
  className?: string;
}

function formatTrainStatusLabel(status?: string): string {
  if (status === 'STOPPED_AT') return 'En estación';
  if (status === 'INCOMING_AT') return 'Llegando';
  if (status === 'IN_TRANSIT_TO') return 'En ruta';
  return status || 'En circulación';
}

// Helper component to auto-pan and fit bounds for Bus Stop, Metro Station, or Cercanías Station
const MapBoundsController: React.FC<{
  stop?: Stop | null;
  metroStation?: MetroStation | null;
  cercaniasStation?: CercaniasStation | null;
  cercaniasTrains: CercaniasTrainPosition[];
  estimates: BusEstimate[];
  selectedBus: BusEstimate | null;
}> = ({
  stop,
  metroStation,
  cercaniasStation,
  cercaniasTrains,
  estimates,
  selectedBus,
}) => {
  const map = useMap();

  const targetLat = cercaniasStation?.lat ?? metroStation?.lat ?? stop?.lat ?? 40.4168;
  const targetLon = cercaniasStation?.lon ?? metroStation?.lon ?? stop?.lon ?? -3.7038;

  useEffect(() => {
    if (!map) return;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    // On mobile, the bottom half of the map container is covered by the BottomSheet in 'half' snap,
    // so we offset the camera slightly southward (or add bottom padding) so the pin sits in the top visible half!
    const latOffset = isMobile ? -0.0014 : 0;

    if (selectedBus && selectedBus.coordinates) {
      map.panTo({
        lat: selectedBus.coordinates.lat + latOffset * 0.5,
        lng: selectedBus.coordinates.lon,
      });
      map.setZoom(17);
      return;
    }

    if (typeof google === 'undefined' || !google.maps?.LatLngBounds) {
      map.panTo({ lat: targetLat + latOffset, lng: targetLon });
      map.setZoom(16);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: targetLat, lng: targetLon });

    let hasVehicles = false;
    estimates.forEach((bus) => {
      if (bus.coordinates) {
        bounds.extend({ lat: bus.coordinates.lat, lng: bus.coordinates.lon });
        hasVehicles = true;
      }
    });

    cercaniasTrains.forEach((train) => {
      if (Number.isFinite(train.lat) && Number.isFinite(train.lon)) {
        bounds.extend({ lat: train.lat, lng: train.lon });
        hasVehicles = true;
      }
    });

    if (hasVehicles) {
      map.fitBounds(bounds, {
        top: 45,
        right: 40,
        bottom: isMobile ? 220 : 45,
        left: 40,
      });
    } else {
      map.panTo({ lat: targetLat + latOffset, lng: targetLon });
      map.setZoom(16);
    }
  }, [
    map,
    stop,
    metroStation,
    cercaniasStation,
    cercaniasTrains,
    estimates,
    selectedBus,
    targetLat,
    targetLon,
  ]);

  return null;
};

export const GoogleBusMap: React.FC<GoogleBusMapProps> = ({
  apiKey = GOOGLE_MAPS_API_KEY,
  stop = null,
  metroStation = null,
  cercaniasStation = null,
  cercaniasTrains = [],
  estimates = [],
  userLocation,
  selectedBus = null,
  onClearSelectedBus = () => {},
  onAuthError,
  isDark,
  fullBleed = false,
  className = '',
}) => {
  const [activeInfoWindow, setActiveInfoWindow] = useState<
    'stop' | 'metro' | 'cercanias' | string | null
  >(null);

  // Detect Google Maps auth/billing/key failure and auto-fallback to OpenStreetMap
  useEffect(() => {
    if (typeof window === 'undefined' || !onAuthError) return;
    const prevAuthFailure = (window as unknown as Record<string, unknown>).gm_authFailure;
    (window as unknown as Record<string, unknown>).gm_authFailure = () => {
      onAuthError();
    };
    return () => {
      (window as unknown as Record<string, unknown>).gm_authFailure = prevAuthFailure;
    };
  }, [onAuthError]);

  const targetLat = cercaniasStation?.lat ?? metroStation?.lat ?? stop?.lat ?? 40.4168;
  const targetLon = cercaniasStation?.lon ?? metroStation?.lon ?? stop?.lon ?? -3.7038;

  // Buses with valid GPS coordinates
  const busesWithGps = estimates.filter((e) => e.coordinates !== null);

  const containerClassName = fullBleed
    ? className || 'relative w-full flex-1 min-h-[260px] h-full overflow-hidden bg-zinc-100 dark:bg-[#0B0C0E]'
    : className ||
      'relative w-full flex-1 min-h-[280px] h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-100 dark:bg-[#0B0C0E]';

  return (
    <div className={containerClassName} data-testid="google-bus-map">
      <APIProvider
        apiKey={apiKey}
        language="es"
        region="ES"
        onError={() => onAuthError?.()}
      >
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: targetLat, lng: targetLon }}
          defaultZoom={16}
          gestureHandling="greedy"
          disableDefaultUI={false}
          colorScheme={isDark ? 'DARK' : 'LIGHT'}
          style={{ width: '100%', height: '100%', minHeight: '260px' }}
        >
          <MapBoundsController
            stop={stop}
            metroStation={metroStation}
            cercaniasStation={cercaniasStation}
            cercaniasTrains={cercaniasTrains}
            estimates={estimates}
            selectedBus={selectedBus}
          />

          {/* 0. Cercanías Station Advanced Marker (#E4002B) */}
          {cercaniasStation && (
            <>
              <AdvancedMarker
                position={{ lat: cercaniasStation.lat, lng: cercaniasStation.lon }}
                title={`Cercanías ${cercaniasStation.name}`}
                onClick={() => setActiveInfoWindow('cercanias')}
              >
                <div className="relative flex flex-col items-center cursor-pointer group">
                  <div className="p-1.5 rounded-2xl bg-white dark:bg-[#14161A] border-2 border-[#E4002B] shadow-xl flex items-center justify-center ring-4 ring-[#E4002B]/25 group-hover:scale-110 transition-transform">
                    <CercaniasLogo className="w-7 h-7" />
                  </div>
                  <div className="w-2.5 h-2.5 bg-[#E4002B] rotate-45 -mt-1.5 border-r border-b border-white dark:border-[#14161A]"></div>
                </div>
              </AdvancedMarker>

              {activeInfoWindow === 'cercanias' && (
                <InfoWindow
                  position={{ lat: cercaniasStation.lat, lng: cercaniasStation.lon }}
                  onCloseClick={() => setActiveInfoWindow(null)}
                >
                  <div className="p-1 text-zinc-900">
                    <span className="text-[10px] font-black text-[#E4002B] uppercase tracking-wider block">
                      Renfe Cercanías{' '}
                      {cercaniasStation.zone ? `• Zona ${cercaniasStation.zone}` : ''}
                    </span>
                    <h4 className="font-bold text-sm text-zinc-900 mt-0.5">
                      {cercaniasStation.name}
                    </h4>
                    {cercaniasStation.address && (
                      <p className="text-xs text-zinc-600 mt-0.5">{cercaniasStation.address}</p>
                    )}
                    {cercaniasStation.lines && cercaniasStation.lines.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cercaniasStation.lines.map((lineId) => {
                          const badge = formatCercaniasLineBadge(lineId);
                          return (
                            <span
                              key={lineId}
                              style={{
                                backgroundColor: badge.bg,
                                color: badge.text,
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-black border border-black/10"
                            >
                              {badge.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </>
          )}

          {/* 1. Metro Station Advanced Marker (Red/Blue Diamond Emblem) */}
          {metroStation && (
            <>
              <AdvancedMarker
                position={{ lat: metroStation.lat, lng: metroStation.lon }}
                title={`Metro ${metroStation.name}`}
                onClick={() => setActiveInfoWindow('metro')}
              >
                <div className="relative flex flex-col items-center cursor-pointer group">
                  <div className="px-1.5 py-1 rounded-2xl bg-white dark:bg-[#14161A] border-2 border-[#E30613] shadow-xl flex items-center justify-center ring-4 ring-[#E30613]/25 group-hover:scale-110 transition-transform">
                    <MetroDiamondLogo className="w-8 h-6" />
                  </div>
                  <div className="w-2.5 h-2.5 bg-[#E30613] rotate-45 -mt-1.5 border-r border-b border-white dark:border-[#14161A]"></div>
                </div>
              </AdvancedMarker>

              {activeInfoWindow === 'metro' && (
                <InfoWindow
                  position={{ lat: metroStation.lat, lng: metroStation.lon }}
                  onCloseClick={() => setActiveInfoWindow(null)}
                >
                  <div className="p-1 text-zinc-900">
                    <span className="text-[10px] font-black text-[#E30613] uppercase tracking-wider block">
                      Metro de Madrid {metroStation.zone ? `• Zona ${metroStation.zone}` : ''}
                    </span>
                    <h4 className="font-bold text-sm text-zinc-900 mt-0.5">
                      {metroStation.name}
                    </h4>
                    {metroStation.address && (
                      <p className="text-xs text-zinc-600 mt-0.5">{metroStation.address}</p>
                    )}
                    {metroStation.lines && metroStation.lines.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {metroStation.lines.map((lineId) => {
                          const badge = formatMetroLineBadge(lineId);
                          return (
                            <span
                              key={lineId}
                              style={{
                                backgroundColor: badge.bg,
                                color: badge.text,
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-black"
                            >
                              {badge.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </>
          )}

          {/* 2. Bus Stop Advanced Marker (EMT Municipal Blue) */}
          {stop && (
            <>
              <AdvancedMarker
                position={{ lat: stop.lat, lng: stop.lon }}
                title={`Parada ${stop.id} - ${stop.name}`}
                onClick={() => setActiveInfoWindow('stop')}
              >
                <div className="relative flex flex-col items-center cursor-pointer group">
                  <div className="px-2 py-1 rounded-full bg-[#0072CE] border-2 border-white dark:border-[#14161A] shadow-lg flex items-center gap-1 text-white font-black text-xs ring-4 ring-[#0072CE]/25 group-hover:scale-110 transition-transform tabular-nums">
                    <EmtBusLogo className="w-4 h-4 shrink-0" />
                    <span>{stop.id}</span>
                  </div>
                  <div className="w-2.5 h-2.5 bg-[#0072CE] rotate-45 -mt-1.5"></div>
                </div>
              </AdvancedMarker>

              {/* Stop InfoWindow */}
              {activeInfoWindow === 'stop' && (
                <InfoWindow
                  position={{ lat: stop.lat, lng: stop.lon }}
                  onCloseClick={() => setActiveInfoWindow(null)}
                >
                  <div className="p-1 text-zinc-900">
                    <span className="text-[10px] font-bold text-[#0072CE] uppercase tracking-wider block">
                      Parada EMT {stop.id}
                    </span>
                    <h4 className="font-bold text-sm text-zinc-900 mt-0.5">{stop.name}</h4>
                    <p className="text-xs text-zinc-600 mt-0.5">{stop.address}</p>
                    {stop.lines && stop.lines.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {stop.lines.map((l) => (
                          <span
                            key={l}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </>
          )}

          {/* 3. Approaching Bus Advanced Markers */}
          {busesWithGps.map((bus, idx) => {
            if (!bus.coordinates) return null;
            const markerKey = `bus-${bus.line}-${idx}`;
            const isSelected =
              selectedBus &&
              selectedBus.line === bus.line &&
              selectedBus.coordinates?.lat === bus.coordinates.lat &&
              selectedBus.coordinates?.lon === bus.coordinates.lon;
            const isArriving = bus.etaMinutes === 0;

            return (
              <React.Fragment key={markerKey}>
                <AdvancedMarker
                  position={{ lat: bus.coordinates.lat, lng: bus.coordinates.lon }}
                  title={`Línea ${bus.line} hacia ${bus.destination} (${bus.eta})`}
                  onClick={() => setActiveInfoWindow(markerKey)}
                >
                  <div
                    className={`relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${
                      isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-30'
                    }`}
                  >
                    {isArriving && (
                      <span className="absolute -inset-1 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                    )}
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full shadow-lg text-xs font-bold text-white border border-white/80 tabular-nums ${
                        isSelected
                          ? 'bg-amber-600 ring-4 ring-amber-400/40'
                          : isArriving
                          ? 'bg-emerald-600 ring-3 ring-emerald-400/40'
                          : 'bg-[#0072CE] ring-2 ring-[#0072CE]/30'
                      }`}
                    >
                      <EmtBusLogo className="w-4 h-4 shrink-0" />
                      <span>{bus.line}</span>
                      <span className="opacity-90 font-medium">({bus.eta})</span>
                    </div>
                    <div className="w-2 h-2 bg-zinc-900 rotate-45 -mt-1"></div>
                  </div>
                </AdvancedMarker>

                {/* Bus InfoWindow */}
                {activeInfoWindow === markerKey && (
                  <InfoWindow
                    position={{ lat: bus.coordinates.lat, lng: bus.coordinates.lon }}
                    onCloseClick={() => {
                      setActiveInfoWindow(null);
                      if (isSelected) onClearSelectedBus();
                    }}
                  >
                    <div className="p-1 text-zinc-900">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-[#0072CE] text-white">
                          Línea {bus.line}
                        </span>
                        <span className="text-xs font-bold text-emerald-600 tabular-nums">
                          {bus.eta}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700">
                        Hacia: <strong>{bus.destination}</strong>
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">
                        GPS en tiempo real: {bus.coordinates.lat.toFixed(5)},{' '}
                        {bus.coordinates.lon.toFixed(5)}
                      </p>
                    </div>
                  </InfoWindow>
                )}
              </React.Fragment>
            );
          })}

          {/* 3b. Live Cercanías Train GPS Markers */}
          {cercaniasTrains.map((train, idx) => {
            if (!Number.isFinite(train.lat) || !Number.isFinite(train.lon)) return null;
            const markerKey = `train-${train.vehicleId || train.tripId}-${idx}`;
            const badge = formatCercaniasLineBadge(train.line);
            const lineColor = getCercaniasLineColor(train.line);
            const isIncoming =
              train.currentStatus === 'INCOMING_AT' || train.currentStatus === 'STOPPED_AT';

            return (
              <React.Fragment key={markerKey}>
                <AdvancedMarker
                  position={{ lat: train.lat, lng: train.lon }}
                  title={`Cercanías ${badge.label} • ${formatTrainStatusLabel(train.currentStatus)}`}
                  onClick={() => setActiveInfoWindow(markerKey)}
                >
                  <div className="relative flex flex-col items-center cursor-pointer hover:scale-110 transition-transform z-30">
                    {isIncoming && (
                      <span className="absolute -inset-1 rounded-full bg-[#E4002B] opacity-60 animate-ping"></span>
                    )}
                    <div
                      style={{
                        backgroundColor: lineColor,
                        color: badge.text,
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full shadow-lg text-xs font-black border-2 border-white/90 tabular-nums"
                    >
                      <CercaniasMark className="w-3.5 h-3.5 shrink-0" />
                      <span>{badge.label}</span>
                      {train.platform && (
                        <span className="text-[10px] font-bold opacity-90">
                          V{train.platform}
                        </span>
                      )}
                    </div>
                    <div className="w-2 h-2 bg-zinc-900 rotate-45 -mt-1"></div>
                  </div>
                </AdvancedMarker>

                {activeInfoWindow === markerKey && (
                  <InfoWindow
                    position={{ lat: train.lat, lng: train.lon }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div className="p-1 text-zinc-900">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.text,
                          }}
                          className="px-1.5 py-0.5 rounded text-xs font-black border border-black/10"
                        >
                          {badge.label}
                        </span>
                        <span className="text-xs font-bold text-[#E4002B]">
                          {formatTrainStatusLabel(train.currentStatus)}
                        </span>
                      </div>
                      {train.stopName && (
                        <p className="text-xs text-zinc-700">
                          Estación: <strong>{train.stopName}</strong>
                        </p>
                      )}
                      {train.platform && (
                        <p className="text-xs font-semibold text-zinc-700 mt-0.5">
                          Vía {train.platform}
                        </p>
                      )}
                      <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">
                        Tren {train.label || train.vehicleId}
                      </p>
                    </div>
                  </InfoWindow>
                )}
              </React.Fragment>
            );
          })}

          {/* 4. User Geolocation Marker (if available) */}
          {userLocation && (
            <AdvancedMarker
              position={{ lat: userLocation.lat, lng: userLocation.lon }}
              title="Tu ubicación"
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute w-5 h-5 rounded-full bg-[#0072CE] opacity-60 animate-ping"></span>
                <div className="w-4 h-4 rounded-full bg-[#0072CE] border-2 border-white shadow-md"></div>
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>

      {/* Map Header Overlay: Status pill */}
      <div
        className={`absolute ${
          fullBleed ? 'top-3 left-3' : 'top-2.5 left-2.5'
        } z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 dark:bg-[#14161A]/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 text-xs font-bold shadow-xs max-lg:max-w-[calc(100%-9.5rem)]`}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            cercaniasStation
              ? 'bg-[#E4002B]'
              : metroStation
              ? 'bg-[#E30613]'
              : 'bg-emerald-500 animate-pulse'
          }`}
        ></span>
        <span className="text-zinc-800 dark:text-zinc-200 truncate">
          {cercaniasStation
            ? cercaniasTrains.length > 0
              ? `Cercanías • ${cercaniasStation.name} (${cercaniasTrains.length} ${
                  cercaniasTrains.length === 1 ? 'tren' : 'trenes'
                })`
              : `Cercanías • ${cercaniasStation.name}`
            : metroStation
            ? `Metro • ${metroStation.name}`
            : cercaniasTrains.length > 0
            ? `${cercaniasTrains.length} ${
                cercaniasTrains.length === 1 ? 'tren' : 'trenes'
              } en vivo`
            : `${busesWithGps.length} ${
                busesWithGps.length === 1 ? 'bus' : 'buses'
              } en vivo`}
        </span>
      </div>
    </div>
  );
};

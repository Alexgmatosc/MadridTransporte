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
import { Bus } from 'lucide-react';

interface GoogleBusMapProps {
  apiKey: string;
  stop: Stop;
  estimates: BusEstimate[];
  userLocation: { lat: number; lon: number } | null;
  selectedBus: BusEstimate | null;
  onClearSelectedBus: () => void;
  isDark: boolean;
}

// Helper component to auto-pan and fit bounds
const MapBoundsController: React.FC<{
  stop: Stop;
  estimates: BusEstimate[];
  selectedBus: BusEstimate | null;
}> = ({ stop, estimates, selectedBus }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (selectedBus && selectedBus.coordinates) {
      map.panTo({ lat: selectedBus.coordinates.lat, lng: selectedBus.coordinates.lon });
      map.setZoom(17);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: stop.lat, lng: stop.lon });

    let hasBuses = false;
    estimates.forEach((bus) => {
      if (bus.coordinates) {
        bounds.extend({ lat: bus.coordinates.lat, lng: bus.coordinates.lon });
        hasBuses = true;
      }
    });

    if (hasBuses) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    } else {
      map.panTo({ lat: stop.lat, lng: stop.lon });
      map.setZoom(16);
    }
  }, [map, stop, estimates, selectedBus]);

  return null;
};

export const GoogleBusMap: React.FC<GoogleBusMapProps> = ({
  apiKey,
  stop,
  estimates,
  userLocation,
  selectedBus,
  onClearSelectedBus,
  isDark,
}) => {
  const [activeInfoWindow, setActiveInfoWindow] = useState<'stop' | string | null>(null);

  // Buses with valid GPS coordinates
  const busesWithGps = estimates.filter((e) => e.coordinates !== null);

  return (
    <div className="relative w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-900">
      <APIProvider
        apiKey={apiKey}
        language="es"
        region="ES"
      >
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: stop.lat, lng: stop.lon }}
          defaultZoom={16}
          gestureHandling="greedy"
          disableDefaultUI={false}
          colorScheme={isDark ? 'DARK' : 'LIGHT'}
          style={{ width: '100%', height: '100%' }}
        >
          <MapBoundsController
            stop={stop}
            estimates={estimates}
            selectedBus={selectedBus}
          />

          {/* 1. Stop Advanced Marker */}
          <AdvancedMarker
            position={{ lat: stop.lat, lng: stop.lon }}
            title={`Parada ${stop.id} - ${stop.name}`}
            onClick={() => setActiveInfoWindow('stop')}
          >
            <div className="relative flex items-center justify-center cursor-pointer group">
              <div className="w-9 h-9 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 shadow-lg flex items-center justify-center text-white font-black text-xs ring-4 ring-blue-500/30 group-hover:scale-110 transition-transform">
                <span>{stop.id}</span>
              </div>
              <div className="absolute -bottom-1 w-2.5 h-2.5 bg-blue-600 rotate-45"></div>
            </div>
          </AdvancedMarker>

          {/* Stop InfoWindow */}
          {activeInfoWindow === 'stop' && (
            <InfoWindow
              position={{ lat: stop.lat, lng: stop.lon }}
              onCloseClick={() => setActiveInfoWindow(null)}
            >
              <div className="p-1 text-slate-900">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  Parada EMT {stop.id}
                </span>
                <h4 className="font-bold text-sm text-slate-900 mt-0.5">{stop.name}</h4>
                <p className="text-xs text-slate-600 mt-0.5">{stop.address}</p>
                {stop.lines && stop.lines.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {stop.lines.map((l) => (
                      <span
                        key={l}
                        className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </InfoWindow>
          )}

          {/* 2. Approaching Bus Advanced Markers */}
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
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full shadow-lg text-xs font-bold text-white border border-white/70 ${
                        isSelected
                          ? 'bg-amber-600 ring-4 ring-amber-400/40'
                          : isArriving
                          ? 'bg-emerald-600 ring-3 ring-emerald-400/40'
                          : 'bg-blue-600 ring-2 ring-blue-400/30'
                      }`}
                    >
                      <Bus className="w-3.5 h-3.5" />
                      <span>{bus.line}</span>
                      <span className="opacity-90 font-medium">({bus.eta})</span>
                    </div>
                    <div className="w-2 h-2 bg-slate-800 rotate-45 -mt-1"></div>
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
                    <div className="p-1 text-slate-900">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">
                          Línea {bus.line}
                        </span>
                        <span className="text-xs font-bold text-emerald-600">{bus.eta}</span>
                      </div>
                      <p className="text-xs text-slate-700">
                        Hacia: <strong>{bus.destination}</strong>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        GPS en tiempo real: {bus.coordinates.lat.toFixed(5)},{' '}
                        {bus.coordinates.lon.toFixed(5)}
                      </p>
                    </div>
                  </InfoWindow>
                )}
              </React.Fragment>
            );
          })}

          {/* 3. User Geolocation Marker (if available) */}
          {userLocation && (
            <AdvancedMarker
              position={{ lat: userLocation.lat, lng: userLocation.lon }}
              title="Tu ubicación"
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute w-5 h-5 rounded-full bg-blue-500 opacity-60 animate-ping"></span>
                <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>

      {/* Map Header Overlay: Bus count pill */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-xs font-bold shadow-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="text-slate-800 dark:text-slate-200">
          Google Maps • {busesWithGps.length}{' '}
          {busesWithGps.length === 1 ? 'autobús' : 'autobuses'} en vivo
        </span>
      </div>
    </div>
  );
};

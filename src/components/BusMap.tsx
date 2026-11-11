import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import type { BusEstimate, Stop } from '../types/emt';
import { Crosshair, Layers, MapPin } from 'lucide-react';
import { GoogleBusMap } from './GoogleBusMap';

interface BusMapProps {
  stop: Stop;
  estimates: BusEstimate[];
  userLocation: { lat: number; lon: number } | null;
  selectedBus: BusEstimate | null;
  onClearSelectedBus: () => void;
  isDark: boolean;
}

export const BusMap: React.FC<BusMapProps> = ({
  stop,
  estimates,
  userLocation,
  selectedBus,
  onClearSelectedBus,
  isDark,
}) => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Default to Google Maps if API key exists, otherwise fallback to Leaflet
  const [mapProvider, setMapProvider] = useState<'google' | 'leaflet'>(() =>
    googleMapsApiKey ? 'google' : 'leaflet'
  );

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Leaflet Map (when provider is leaflet)
  useEffect(() => {
    if (mapProvider !== 'leaflet') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [stop.lat, stop.lon],
      zoom: 16,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; CartoDB & OpenStreetMap contributors',
    }).addTo(map);

    tileLayerRef.current = tiles;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapProvider]);

  // Update Leaflet Tile Layer when Dark Mode changes
  useEffect(() => {
    if (mapProvider !== 'leaflet' || !mapInstanceRef.current || !tileLayerRef.current) return;
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    tileLayerRef.current.setUrl(tileUrl);
  }, [isDark, mapProvider]);

  // Update Leaflet Markers
  useEffect(() => {
    if (mapProvider !== 'leaflet') return;
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const bounds = L.latLngBounds([stop.lat, stop.lon], [stop.lat, stop.lon]);

    // 1. Stop Marker
    const stopHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 shadow-lg flex items-center justify-center text-white font-bold text-xs ring-4 ring-blue-500/30">
          <span>${stop.id}</span>
        </div>
        <div class="absolute -bottom-1 w-2 h-2 bg-blue-600 rotate-45"></div>
      </div>
    `;

    const stopIcon = L.divIcon({
      html: stopHtml,
      className: 'stop-pin',
      iconSize: [32, 36],
      iconAnchor: [16, 36],
      popupAnchor: [0, -36],
    });

    L.marker([stop.lat, stop.lon], { icon: stopIcon })
      .bindPopup(
        `<div class="p-1 text-slate-900">
          <div class="text-xs font-bold text-blue-600 uppercase">Parada ${stop.id}</div>
          <div class="font-semibold text-sm">${stop.name}</div>
          <div class="text-xs text-slate-500 mt-0.5">${stop.address}</div>
        </div>`
      )
      .addTo(markersGroup);

    // 2. Approaching Bus Markers
    const busesWithGps = estimates.filter((e) => e.coordinates !== null);

    busesWithGps.forEach((bus) => {
      if (!bus.coordinates) return;
      bounds.extend([bus.coordinates.lat, bus.coordinates.lon]);

      const isSelected =
        selectedBus &&
        selectedBus.line === bus.line &&
        selectedBus.coordinates?.lat === bus.coordinates.lat &&
        selectedBus.coordinates?.lon === bus.coordinates.lon;

      const isArriving = bus.etaMinutes === 0;

      const busHtml = `
        <div class="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-30'
        }">
          ${
            isArriving
              ? '<span class="absolute -inset-1 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>'
              : ''
          }
          <div class="flex items-center gap-1 px-2 py-0.5 rounded-full shadow-md text-xs font-bold text-white border border-white/60 ${
            isSelected
              ? 'bg-amber-600 ring-2 ring-amber-400'
              : isArriving
              ? 'bg-emerald-600 ring-2 ring-emerald-400'
              : 'bg-blue-600'
          }">
            <svg class="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h8m-8 4h8m-5 4h2M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <span>${bus.line}</span>
            <span class="opacity-90 font-normal">(${bus.eta})</span>
          </div>
          <div class="w-1.5 h-1.5 bg-slate-800 rotate-45 -mt-0.5"></div>
        </div>
      `;

      const busIcon = L.divIcon({
        html: busHtml,
        className: 'bus-pin',
        iconSize: [40, 24],
        iconAnchor: [20, 24],
        popupAnchor: [0, -24],
      });

      L.marker([bus.coordinates.lat, bus.coordinates.lon], { icon: busIcon })
        .bindPopup(
          `<div class="p-1 text-slate-900">
            <div class="text-xs font-bold text-blue-600 uppercase">Línea ${bus.line} (${bus.eta})</div>
            <div class="font-semibold text-sm">Hacia: ${bus.destination}</div>
            <div class="text-xs text-slate-500 mt-0.5">GPS: ${bus.coordinates.lat.toFixed(
              4
            )}, ${bus.coordinates.lon.toFixed(4)}</div>
          </div>`
        )
        .addTo(markersGroup);
    });

    // 3. User Geolocation Marker
    if (userLocation) {
      bounds.extend([userLocation.lat, userLocation.lon]);
      const userHtml = `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-4 h-4 rounded-full bg-blue-500 opacity-75 animate-ping"></span>
          <div class="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
        </div>
      `;
      const userIcon = L.divIcon({
        html: userHtml,
        className: 'user-pin',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
        .bindPopup('<div class="text-xs font-semibold text-slate-800">Tu ubicación actual</div>')
        .addTo(markersGroup);
    }

    // Camera adjustment
    if (selectedBus && selectedBus.coordinates) {
      map.flyTo([selectedBus.coordinates.lat, selectedBus.coordinates.lon], 17, {
        animate: true,
        duration: 0.8,
      });
    } else if (busesWithGps.length > 0) {
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 16,
        animate: true,
      });
    } else {
      map.setView([stop.lat, stop.lon], 16);
    }
  }, [stop, estimates, userLocation, selectedBus, mapProvider]);

  const handleCenterOnStop = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([stop.lat, stop.lon], 16, { animate: true });
    onClearSelectedBus();
  };

  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds([stop.lat, stop.lon], [stop.lat, stop.lon]);
    estimates.forEach((e) => {
      if (e.coordinates) {
        bounds.extend([e.coordinates.lat, e.coordinates.lon]);
      }
    });
    if (userLocation) {
      bounds.extend([userLocation.lat, userLocation.lon]);
    }
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    onClearSelectedBus();
  };

  const busesCountWithGps = estimates.filter((e) => e.coordinates !== null).length;

  return (
    <div className="flex flex-col gap-2">
      {/* Map Provider Selector Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Mapa en Tiempo Real</span>
        </span>

        {/* Toggle between Google Maps and OpenStreetMap */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 text-[11px] font-bold">
          <button
            onClick={() => setMapProvider('google')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              mapProvider === 'google'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Google Maps
          </button>
          <button
            onClick={() => setMapProvider('leaflet')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              mapProvider === 'leaflet'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            OpenStreetMap
          </button>
        </div>
      </div>

      {/* Render selected map provider */}
      {mapProvider === 'google' && googleMapsApiKey ? (
        <GoogleBusMap
          apiKey={googleMapsApiKey}
          stop={stop}
          estimates={estimates}
          userLocation={userLocation}
          selectedBus={selectedBus}
          onClearSelectedBus={onClearSelectedBus}
          isDark={isDark}
        />
      ) : mapProvider === 'google' && !googleMapsApiKey ? (
        <div className="relative w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md p-6 flex flex-col items-center justify-center text-center bg-slate-100 dark:bg-slate-900">
          <MapPin className="w-8 h-8 text-blue-500 mb-2 opacity-60" />
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Google Maps no configurado</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            Configura la variable <code>VITE_GOOGLE_MAPS_API_KEY</code> o pulsa en <strong>OpenStreetMap</strong> para ver el mapa libre sin clave.
          </p>
          <button
            onClick={() => setMapProvider('leaflet')}
            className="mt-3 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white cursor-pointer"
          >
            Usar OpenStreetMap
          </button>
        </div>
      ) : (
        <div className="relative w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating map status badge */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              OpenStreetMap •{' '}
              {busesCountWithGps > 0
                ? `${busesCountWithGps} ${busesCountWithGps === 1 ? 'autobús' : 'autobuses'} en mapa`
                : 'Sin autobuses con GPS activo'}
            </span>
          </div>

          {/* Map Action Controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
            <button
              onClick={handleCenterOnStop}
              title="Centrar en la parada"
              className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200/50 dark:border-slate-700/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Crosshair className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
            {busesCountWithGps > 0 && (
              <button
                onClick={handleFitAll}
                title="Ver todos los autobuses"
                className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200/50 dark:border-slate-700/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            )}
          </div>

          {/* Selected Bus Floating Indicator */}
          {selectedBus && (
            <div className="absolute bottom-3 left-3 right-14 z-10 p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-amber-500/40 flex items-center justify-between text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="px-2 py-0.5 bg-amber-500 text-white font-bold rounded-lg shrink-0">
                  {selectedBus.line}
                </span>
                <span className="font-semibold truncate text-slate-800 dark:text-slate-200">
                  {selectedBus.destination}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  {selectedBus.eta}
                </span>
              </div>
              <button
                onClick={onClearSelectedBus}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2 text-xs font-semibold px-2 py-1 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

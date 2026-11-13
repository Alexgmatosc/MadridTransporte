import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import type { BusEstimate, Stop } from '../types/emt';
import type { MetroStation } from '../types/metro';
import { Crosshair, Layers, MapPin } from 'lucide-react';
import { GoogleBusMap, GOOGLE_MAPS_API_KEY } from './GoogleBusMap';
import { formatMetroLineBadge } from '../data/metroLines';
import { MetroDiamondMark, EmtBusLogo } from './TransitIcons';

export { GOOGLE_MAPS_API_KEY };

interface BusMapProps {
  stop?: Stop | null;
  metroStation?: MetroStation | null;
  estimates?: BusEstimate[];
  userLocation: { lat: number; lon: number } | null;
  selectedBus?: BusEstimate | null;
  onClearSelectedBus?: () => void;
  isDark: boolean;
  fullBleed?: boolean;
  className?: string;
}

export const BusMap: React.FC<BusMapProps> = ({
  stop,
  metroStation,
  estimates = [],
  userLocation,
  selectedBus = null,
  onClearSelectedBus = () => {},
  isDark,
  fullBleed = false,
  className = '',
}) => {
  const googleMapsApiKey = GOOGLE_MAPS_API_KEY;

  // Default to Google Maps whenever VITE_GOOGLE_MAPS_API_KEY (GOOGLE_MAPS_API_KEY) is present
  const [mapProvider, setMapProvider] = useState<'google' | 'leaflet'>(() =>
    googleMapsApiKey ? 'google' : 'leaflet'
  );

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const targetLat = metroStation?.lat ?? stop?.lat ?? 40.4168;
  const targetLon = metroStation?.lon ?? stop?.lon ?? -3.7038;

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
      center: [targetLat, targetLon],
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

    // Invalidate size on initial mount safely
    const timer = setTimeout(() => {
      map.invalidateSize?.();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapProvider]);

  // Handle container resizing and full-bleed transitions
  useEffect(() => {
    if (mapProvider !== 'leaflet' || !mapContainerRef.current || !mapInstanceRef.current) return;
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize?.();
    });

    observer.observe(mapContainerRef.current);

    return () => observer.disconnect();
  }, [mapProvider, fullBleed]);

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

    const bounds = L.latLngBounds([targetLat, targetLon], [targetLat, targetLon]);

    // 1. Metro Station Marker (if active)
    if (metroStation) {
      const lineBadgesHtml = metroStation.lines
        .map((lineId) => {
          const badge = formatMetroLineBadge(lineId);
          return `<span style="background-color: ${badge.bg}; color: ${
            badge.text
          };" class="inline-block px-1.5 py-0.2 rounded text-xs font-black mr-1 shadow-2xs">${badge.label}</span>`;
        })
        .join('');

      const metroHtml = `
        <div class="relative flex flex-col items-center cursor-pointer group">
          <div class="px-1.5 py-1 rounded-xl bg-white dark:bg-[#14161A] border-2 border-[#E30613] shadow-xl flex items-center justify-center ring-4 ring-[#E30613]/25 group-hover:scale-110 transition-transform">
            <svg viewBox="0 0 40 30" class="w-7 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2L38 15L20 28L2 15L20 2Z" fill="#FFFFFF" stroke="#E30613" stroke-width="4" stroke-linejoin="miter"/>
              <rect x="2.5" y="11.2" width="35" height="7.6" rx="1" fill="#1D3C87"/>
              <path d="M14.5 17.5V12.5H16.2L18 15.6L19.8 12.5H21.5V17.5H20V14.5L18.5 17H17.5L16 14.5V17.5H14.5Z" fill="#FFFFFF"/>
              <rect x="22.8" y="12.5" width="3" height="5" rx="0.4" fill="#FFFFFF" fill-opacity="0.9"/>
            </svg>
          </div>
          <div class="w-2.5 h-2.5 bg-[#E30613] rotate-45 -mt-1.5 border-r border-b border-white dark:border-[#14161A]"></div>
        </div>
      `;

      const metroIcon = L.divIcon({
        html: metroHtml,
        className: 'metro-pin',
        iconSize: [44, 40],
        iconAnchor: [22, 40],
        popupAnchor: [0, -40],
      });

      L.marker([metroStation.lat, metroStation.lon], { icon: metroIcon })
        .bindPopup(
          `<div class="p-1 text-zinc-900">
            <div class="text-xs font-black text-[#E30613] uppercase tracking-wider">Metro de Madrid</div>
            <div class="font-bold text-sm text-zinc-900">${metroStation.name}</div>
            <div class="text-xs text-zinc-500 mt-0.5">${metroStation.address || ''}</div>
            <div class="mt-2 flex flex-wrap gap-1">${lineBadgesHtml}</div>
          </div>`
        )
        .addTo(markersGroup);
    }

    // 2. Bus Stop Marker (if active)
    if (stop) {
      const stopHtml = `
        <div class="relative flex flex-col items-center">
          <div class="px-2 py-1 rounded-full bg-[#0072CE] border-2 border-white dark:border-[#14161A] shadow-lg flex items-center gap-1 text-white font-bold text-xs ring-4 ring-[#0072CE]/25 tabular-nums">
            <span>${stop.id}</span>
          </div>
          <div class="w-2 h-2 bg-[#0072CE] rotate-45 -mt-1"></div>
        </div>
      `;

      const stopIcon = L.divIcon({
        html: stopHtml,
        className: 'stop-pin',
        iconSize: [44, 34],
        iconAnchor: [22, 34],
        popupAnchor: [0, -34],
      });

      L.marker([stop.lat, stop.lon], { icon: stopIcon })
        .bindPopup(
          `<div class="p-1 text-zinc-900">
            <div class="text-xs font-bold text-[#0072CE] uppercase">Parada EMT ${stop.id}</div>
            <div class="font-semibold text-sm">${stop.name}</div>
            <div class="text-xs text-zinc-500 mt-0.5">${stop.address}</div>
          </div>`
        )
        .addTo(markersGroup);
    }

    // 3. Approaching Bus Markers (if any)
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
          <div class="flex items-center gap-1 px-2 py-0.5 rounded-full shadow-md text-xs font-bold text-white border border-white/75 tabular-nums ${
            isSelected
              ? 'bg-amber-600 ring-2 ring-amber-400'
              : isArriving
              ? 'bg-emerald-600 ring-2 ring-emerald-400'
              : 'bg-[#0072CE]'
          }">
            <svg viewBox="0 0 24 24" class="w-3.5 h-3.5 shrink-0" fill="none">
              <rect x="4" y="3" width="16" height="16" rx="3.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.8"/>
              <rect x="6.5" y="6.5" width="11" height="5.5" rx="1" fill="currentColor"/>
              <circle cx="8" cy="15.5" r="1.2" fill="#FEF08A"/>
              <circle cx="16" cy="15.5" r="1.2" fill="#FEF08A"/>
            </svg>
            <span>${bus.line}</span>
            <span class="opacity-90 font-normal">(${bus.eta})</span>
          </div>
          <div class="w-1.5 h-1.5 bg-zinc-900 rotate-45 -mt-0.5"></div>
        </div>
      `;

      const busIcon = L.divIcon({
        html: busHtml,
        className: 'bus-pin',
        iconSize: [44, 24],
        iconAnchor: [22, 24],
        popupAnchor: [0, -24],
      });

      L.marker([bus.coordinates.lat, bus.coordinates.lon], { icon: busIcon })
        .bindPopup(
          `<div class="p-1 text-zinc-900">
            <div class="text-xs font-bold text-[#0072CE] uppercase">Línea ${bus.line} (${bus.eta})</div>
            <div class="font-semibold text-sm">Hacia: ${bus.destination}</div>
            <div class="text-xs text-zinc-500 mt-0.5">GPS: ${bus.coordinates.lat.toFixed(
              4
            )}, ${bus.coordinates.lon.toFixed(4)}</div>
          </div>`
        )
        .addTo(markersGroup);
    });

    // 4. User Geolocation Marker
    if (userLocation) {
      bounds.extend([userLocation.lat, userLocation.lon]);
      const userHtml = `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-4 h-4 rounded-full bg-[#0072CE] opacity-75 animate-ping"></span>
          <div class="w-3.5 h-3.5 rounded-full bg-[#0072CE] border-2 border-white shadow-md"></div>
        </div>
      `;
      const userIcon = L.divIcon({
        html: userHtml,
        className: 'user-pin',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
        .bindPopup('<div class="text-xs font-semibold text-zinc-800">Tu ubicación actual</div>')
        .addTo(markersGroup);
    }

    // Camera adjustment (with mobile offset so the pin sits in the visible upper half above the BottomSheet)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const latOffset = isMobile ? -0.0014 : 0;

    if (selectedBus && selectedBus.coordinates) {
      map.flyTo?.(
        [selectedBus.coordinates.lat + latOffset * 0.5, selectedBus.coordinates.lon],
        17,
        {
          animate: true,
          duration: 0.8,
        }
      );
    } else if (busesWithGps.length > 0) {
      map.fitBounds(bounds, {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [40, isMobile ? 220 : 45],
        maxZoom: 16,
        animate: true,
      });
    } else {
      map.setView([targetLat + latOffset, targetLon], 16);
    }
  }, [stop, metroStation, estimates, userLocation, selectedBus, mapProvider, targetLat, targetLon]);

  const handleCenterOnTarget = () => {
    if (!mapInstanceRef.current) return;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const latOffset = isMobile ? -0.0014 : 0;
    mapInstanceRef.current.flyTo?.([targetLat + latOffset, targetLon], 16, { animate: true });
    onClearSelectedBus();
  };

  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const bounds = L.latLngBounds([targetLat, targetLon], [targetLat, targetLon]);
    estimates.forEach((e) => {
      if (e.coordinates) {
        bounds.extend([e.coordinates.lat, e.coordinates.lon]);
      }
    });
    if (userLocation) {
      bounds.extend([userLocation.lat, userLocation.lon]);
    }
    mapInstanceRef.current.fitBounds(bounds, {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, isMobile ? 220 : 40],
      maxZoom: 17,
    });
    onClearSelectedBus();
  };

  const busesCountWithGps = estimates.filter((e) => e.coordinates !== null).length;

  return (
    <div
      className={
        fullBleed
          ? 'relative w-full h-full flex flex-col'
          : 'relative flex flex-col gap-2 w-full h-full'
      }
    >
      {/* Map Provider Selector (desktop top bar + mobile/fullBleed floating overlay) */}
      {(!fullBleed || stop || metroStation) && (
        <div
          className={
            fullBleed
              ? 'flex items-center justify-end'
              : 'flex items-center justify-between lg:px-1 shrink-0 z-20'
          }
        >
          {!fullBleed && (
            <span className="hidden lg:flex text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider items-center gap-1.5 truncate">
              {metroStation ? (
                <MetroDiamondMark className="w-4 h-3 shrink-0" />
              ) : (
                <EmtBusLogo className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">
                {metroStation ? `Estación ${metroStation.name}` : stop ? `Parada #${stop.id}` : 'Mapa en Tiempo Real'}
              </span>
            </span>
          )}

          {(stop || metroStation) && (
            <div
              className={`${
                fullBleed
                  ? 'absolute top-3 right-3 z-20 bg-white/95 dark:bg-[#14161A]/95 backdrop-blur-md shadow-md border-zinc-200/80 dark:border-zinc-700/80 text-[11px]'
                  : 'max-lg:absolute max-lg:top-2.5 max-lg:right-2.5 max-lg:z-20 max-lg:bg-white/95 max-lg:dark:bg-[#14161A]/95 max-lg:backdrop-blur-md max-lg:shadow-md max-lg:text-[11px] lg:bg-zinc-200/80 lg:dark:bg-zinc-800 text-xs border-zinc-300/60 dark:border-zinc-700'
              } flex items-center p-0.5 rounded-xl border font-bold shrink-0`}
            >
              <button
                type="button"
                onClick={() => setMapProvider('google')}
                className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  mapProvider === 'google'
                    ? 'max-lg:bg-[#0072CE] max-lg:text-white lg:bg-white lg:dark:bg-[#14161A] lg:text-[#0072CE] lg:dark:text-[#3898FF] shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <span className="sm:hidden">Google</span>
                <span className="hidden sm:inline">Google Maps</span>
              </button>
              <button
                type="button"
                onClick={() => setMapProvider('leaflet')}
                className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  mapProvider === 'leaflet'
                    ? 'max-lg:bg-[#0072CE] max-lg:text-white lg:bg-white lg:dark:bg-[#14161A] lg:text-[#0072CE] lg:dark:text-[#3898FF] shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <span className="sm:hidden">OSM</span>
                <span className="hidden sm:inline">OpenStreetMap</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Render selected map provider */}
      {mapProvider === 'google' && googleMapsApiKey && (stop || metroStation) ? (
        <GoogleBusMap
          apiKey={googleMapsApiKey}
          stop={stop}
          metroStation={metroStation}
          estimates={estimates}
          userLocation={userLocation}
          selectedBus={selectedBus}
          onClearSelectedBus={onClearSelectedBus}
          onAuthError={() => setMapProvider('leaflet')}
          isDark={isDark}
          fullBleed={fullBleed}
          className={
            className ||
            (fullBleed
              ? 'relative w-full flex-1 min-h-[260px] overflow-hidden'
              : 'relative w-full flex-1 h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-md')
          }
        />
      ) : mapProvider === 'google' && !googleMapsApiKey ? (
        <div
          className={
            fullBleed
              ? 'relative w-full flex-1 min-h-[260px] flex flex-col items-center justify-center text-center p-6 bg-zinc-100 dark:bg-[#14161A]'
              : 'relative w-full flex-1 h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-md p-6 flex flex-col items-center justify-center text-center bg-zinc-100 dark:bg-[#14161A]'
          }
        >
          <MapPin className="w-8 h-8 text-[#0072CE] mb-2 opacity-70" />
          <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
            Google Maps no configurado
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
            Configura la variable <code>VITE_GOOGLE_MAPS_API_KEY</code> o pulsa en{' '}
            <strong>OpenStreetMap</strong> para ver el mapa libre sin clave.
          </p>
          <button
            type="button"
            onClick={() => setMapProvider('leaflet')}
            className="mt-3 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0072CE] text-white cursor-pointer"
          >
            Usar OpenStreetMap
          </button>
        </div>
      ) : (
        <div
          className={
            fullBleed
              ? `${className || 'relative w-full flex-1 min-h-[260px] overflow-hidden'}`
              : `${
                  className ||
                  'relative w-full flex-1 min-h-[280px] h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-md'
                }`
          }
        >
          <div ref={mapContainerRef} className="w-full h-full min-h-[260px] z-0" />

          {/* Floating map status badge */}
          <div
            className={`absolute ${
              fullBleed ? 'top-3 left-3' : 'top-2.5 left-2.5'
            } z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-[#14161A]/95 backdrop-blur-md shadow-md text-xs font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-800 max-lg:max-w-[calc(100%-9.5rem)]`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                metroStation ? 'bg-[#E30613]' : 'bg-emerald-500 animate-pulse'
              }`}
            ></span>
            <span className="truncate">
              {metroStation
                ? `Metro • ${metroStation.name}`
                : busesCountWithGps > 0
                ? `${busesCountWithGps} ${
                    busesCountWithGps === 1 ? 'bus' : 'buses'
                  } en mapa`
                : 'Mapa activo'}
            </span>
          </div>

          {/* Map Action Controls */}
          <div
            className={`absolute ${
              fullBleed ? 'top-14 left-3' : 'top-13 left-2.5'
            } z-10 flex flex-col gap-2`}
          >
            <button
              type="button"
              onClick={handleCenterOnTarget}
              title={metroStation ? 'Centrar en la estación' : 'Centrar en la parada'}
              className="p-2.5 rounded-xl bg-white/95 dark:bg-[#14161A]/95 hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-md border border-zinc-200/70 dark:border-zinc-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Crosshair className="w-4 h-4 text-[#0072CE] dark:text-[#3898FF]" />
            </button>
            {busesCountWithGps > 0 && (
              <button
                type="button"
                onClick={handleFitAll}
                title="Ver todos los autobuses"
                className="p-2.5 rounded-xl bg-white/95 dark:bg-[#14161A]/95 hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-md border border-zinc-200/70 dark:border-zinc-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
              </button>
            )}
          </div>

          {/* Selected Bus Floating Indicator */}
          {selectedBus && (
            <div className="absolute top-13 right-2.5 left-14 sm:left-auto sm:w-72 z-10 p-2.5 rounded-xl bg-white/95 dark:bg-[#14161A]/95 backdrop-blur-md shadow-lg border border-amber-500/50 flex items-center justify-between text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="px-2 py-0.5 bg-amber-500 text-white font-bold rounded-lg shrink-0 tabular-nums">
                  {selectedBus.line}
                </span>
                <span className="font-semibold truncate text-zinc-800 dark:text-zinc-200">
                  {selectedBus.destination}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 tabular-nums">
                  {selectedBus.eta}
                </span>
              </div>
              <button
                type="button"
                onClick={onClearSelectedBus}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ml-2 text-xs font-semibold px-2 py-1 cursor-pointer"
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

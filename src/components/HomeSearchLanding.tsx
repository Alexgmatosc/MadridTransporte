import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Star,
  Navigation,
  ChevronRight,
  X,
} from 'lucide-react';
import type { FavoriteStop } from '../types/emt';
import type { FavoriteMetroStation, MetroStation } from '../types/metro';
import type { CercaniasStation, FavoriteCercaniasStation } from '../types/cercanias';
import type { TransportMode } from '../types/transport';
import { searchStops, calculateDistanceMeters } from '../services/stopsService';
import { searchMetroStations } from '../services/metroService';
import { searchCercaniasStations } from '../services/cercaniasService';
import { formatMetroLineBadge } from '../data/metroLines';
import { formatCercaniasLineBadge } from '../data/cercaniasLines';
import { TransportModeSelector } from './TransportModeSelector';
import { MetroDiamondLogo, EmtBusLogo, CercaniasLogo } from './TransitIcons';
import { triggerHaptic } from '../utils/haptics';

interface HomeSearchLandingProps {
  onSelectStop: (stopId: string) => void;
  onSelectMetroStation: (stationId: string) => void;
  onSelectCercaniasStation?: (stationId: string) => void;
  onNearMe: () => void;
  isLocating: boolean;
  favorites: FavoriteStop[];
  metroFavorites?: FavoriteMetroStation[];
  cercaniasFavorites?: FavoriteCercaniasStation[];
  userLocation: { lat: number; lon: number } | null;
  transportMode: TransportMode;
  onTransportModeChange: (mode: TransportMode) => void;
}

const POPULAR_HUBS: Array<{
  type: 'metro' | 'cercanias' | 'bus';
  id: string;
  name: string;
  desc: string;
  lines: string[];
}> = [
  {
    type: 'metro',
    id: '0112',
    name: 'Sol',
    desc: 'Centro de Madrid • L1, L2, L3',
    lines: ['1', '2', '3'],
  },
  {
    type: 'metro',
    id: '0209',
    name: 'Ópera',
    desc: 'Teatro Real • L2, L5, Ramal',
    lines: ['2', '5', 'R'],
  },
  {
    type: 'metro',
    id: '0116',
    name: 'Atocha',
    desc: 'Estación Central / Renfe • L1',
    lines: ['1'],
  },
  {
    type: 'metro',
    id: '0311',
    name: 'Moncloa',
    desc: 'Intercambiador • L3, L6',
    lines: ['3', '6'],
  },
  {
    type: 'metro',
    id: '0618',
    name: 'Nuevos Ministerios',
    desc: 'Paseo de la Castellana • L6, L8, L10',
    lines: ['6', '8', '10'],
  },
  {
    type: 'cercanias',
    id: '18000',
    name: 'Atocha Cercanías',
    desc: 'Renfe Cercanías • C1-C5, C7, C10',
    lines: ['C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C10'],
  },
  {
    type: 'cercanias',
    id: '17000',
    name: 'Chamartín',
    desc: 'Renfe Cercanías • C1-C4, C7, C8, C10',
    lines: ['C1', 'C2', 'C3', 'C4', 'C7', 'C8', 'C10'],
  },
  {
    type: 'bus',
    id: '72',
    name: 'Cibeles',
    desc: 'Pza. Cibeles / Casa de América',
    lines: ['1', '2', '202'],
  },
];

export const HomeSearchLanding: React.FC<HomeSearchLandingProps> = ({
  onSelectStop,
  onSelectMetroStation,
  onSelectCercaniasStation,
  onNearMe,
  isLocating,
  favorites,
  metroFavorites = [],
  cercaniasFavorites = [],
  userLocation,
  transportMode,
  onTransportModeChange,
}) => {
  const [query, setQuery] = useState('');
  const [metroResults, setMetroResults] = useState<MetroStation[]>([]);
  const [cercaniasResults, setCercaniasResults] = useState<CercaniasStation[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Query metro & cercanías stations asynchronously
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    let isMounted = true;
    searchMetroStations(trimmed, 25).then((stations) => {
      if (isMounted) {
        setMetroResults(stations);
      }
    });
    searchCercaniasStations(trimmed, 25).then((stations) => {
      if (isMounted) {
        setCercaniasResults(stations);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [query]);

  const activeMetroResults = query.trim() ? metroResults : [];
  const activeCercaniasResults = query.trim() ? cercaniasResults : [];
  const busResults = query.trim() ? searchStops(query, 25) : [];

  const showMetro = transportMode === 'all' || transportMode === 'metro';
  const showCercanias = transportMode === 'all' || transportMode === 'cercanias';
  const showBus = transportMode === 'all' || transportMode === 'bus';

  const totalResultsCount =
    (showMetro ? activeMetroResults.length : 0) +
    (showCercanias ? activeCercaniasResults.length : 0) +
    (showBus ? busResults.length : 0);

  const totalFavoritesCount =
    favorites.length + metroFavorites.length + cercaniasFavorites.length;

  return (
    <div className="flex flex-col gap-5 py-1 sm:py-4 max-w-5xl mx-auto w-full animate-in fade-in duration-200">
      {/* Compact Search-First Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight leading-tight">
            ¿A dónde te mueves en Madrid?
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Tiempos de llegada en tiempo real para{' '}
            <span className="font-semibold text-[#E30613] dark:text-[#FF5A5A]">Metro de Madrid</span>,{' '}
            <span className="font-semibold text-[#E4002B] dark:text-[#FF5C75]">Cercanías</span>{' '}
            y{' '}
            <span className="font-semibold text-[#0072CE] dark:text-[#389BFF]">Autobuses EMT</span>.
          </p>
        </div>

        <TransportModeSelector
          mode={transportMode}
          onChange={onTransportModeChange}
          size="md"
          className="self-start sm:self-auto"
        />
      </div>

      {/* Primary Search Panel */}
      <section
        aria-label="Buscador de paradas y estaciones"
        className="bg-white dark:bg-[#14161A] rounded-2xl p-3 sm:p-4 border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs"
      >
        <div className="relative flex items-center gap-2.5 px-3.5 py-2.5 bg-zinc-100/80 dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 focus-within:bg-white dark:focus-within:bg-[#0B0C0E] focus-within:border-[#0072CE] focus-within:ring-2 focus-within:ring-[#0072CE]/20 transition-all">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              transportMode === 'metro'
                ? 'Escribe estación de metro (ej. Sol, Ópera) o línea (ej. L1)...'
                : transportMode === 'cercanias'
                ? 'Escribe estación de Cercanías (ej. Atocha, Sol) o línea (ej. C5)...'
                : transportMode === 'bus'
                ? 'Escribe calle (ej. Princesa), parada o línea de bus...'
                : 'Escribe una estación, parada, calle o línea...'
            }
            aria-label="Buscar paradas, estaciones o líneas de transporte"
            className="flex-1 bg-transparent text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-base sm:text-lg outline-none font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick GPS Action Row */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onNearMe();
            }}
            disabled={isLocating}
            className="flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl bg-[#0072CE]/10 hover:bg-[#0072CE]/15 dark:bg-[#0072CE]/20 dark:hover:bg-[#0072CE]/30 text-[#005AA3] dark:text-[#60B2FF] border border-[#0072CE]/20 dark:border-[#0072CE]/35 text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer ios-press"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Obteniendo GPS...' : 'Cerca de mí (Estaciones & Paradas)'}</span>
          </button>

          <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium tabular-nums">
            242 Metro • 95 Cercanías • 4.933 paradas
          </span>
        </div>

        {/* Live Search Results */}
        {query.trim() && (
          <div className="mt-3.5 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
            <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
              <span>Resultados encontrados ({totalResultsCount})</span>
              {totalResultsCount > 0 && (
                <span className="text-[11px] font-normal lowercase">toca para ver llegadas</span>
              )}
            </div>

            {totalResultsCount === 0 ? (
              <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                <Search className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                  No se encontraron resultados para &quot;{query}&quot;
                </p>
                <p className="text-xs mt-1 text-zinc-400">
                  Prueba buscando por estación (ej. <em>Sol</em>), calle (ej. <em>Alcalá</em>) o línea (ej. <em>1</em>, <em>L1</em>).
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70 max-h-[54vh] overflow-y-auto">
                {/* Metro Stations */}
                {showMetro &&
                  activeMetroResults.map((station) => {
                    let distanceText = '';
                    if (userLocation && station.lat && station.lon) {
                      const meters = calculateDistanceMeters(
                        userLocation.lat,
                        userLocation.lon,
                        station.lat,
                        station.lon
                      );
                      distanceText =
                        meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
                    }

                    return (
                      <div
                        key={`metro-${station.id}`}
                        onClick={() => {
                          triggerHaptic('selection');
                          onSelectMetroStation(station.id);
                        }}
                        className="py-3 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/70 flex items-center justify-center shrink-0">
                            <MetroDiamondLogo className="w-8 h-6" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-semibold text-zinc-950 dark:text-white text-sm group-hover:text-[#E30613] dark:group-hover:text-[#FF5A5A] transition-colors truncate">
                                {station.name}
                              </h4>
                              {station.zone && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                  Zona {station.zone}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {station.address || 'Metro de Madrid'}
                            </p>

                            {station.lines && station.lines.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {station.lines.map((lineId) => {
                                  const badge = formatMetroLineBadge(lineId);
                                  return (
                                    <span
                                      key={lineId}
                                      style={{
                                        backgroundColor: badge.bg,
                                        color: badge.text,
                                        borderColor: badge.border || 'transparent',
                                      }}
                                      className="px-1.5 py-0.2 rounded text-[10px] font-bold border"
                                    >
                                      {badge.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {distanceText && (
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md tabular-nums">
                              {distanceText}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                        </div>
                      </div>
                    );
                  })}

                {/* Cercanías Stations */}
                {showCercanias &&
                  activeCercaniasResults.map((station) => {
                    let distanceText = '';
                    if (userLocation && station.lat && station.lon) {
                      const meters = calculateDistanceMeters(
                        userLocation.lat,
                        userLocation.lon,
                        station.lat,
                        station.lon
                      );
                      distanceText =
                        meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
                    }

                    return (
                      <div
                        key={`cercanias-${station.id}`}
                        onClick={() => {
                          triggerHaptic('selection');
                          onSelectCercaniasStation?.(station.id);
                        }}
                        className="py-3 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-[#E4002B]/10 dark:bg-[#E4002B]/15 border border-[#E4002B]/20 dark:border-[#E4002B]/30 flex items-center justify-center shrink-0">
                            <CercaniasLogo className="w-7 h-7" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-semibold text-zinc-950 dark:text-white text-sm group-hover:text-[#E4002B] dark:group-hover:text-[#FF5C75] transition-colors truncate">
                                {station.name}
                              </h4>
                              {station.zone && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                  Zona {station.zone}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {station.address || 'Renfe Cercanías Madrid'}
                            </p>

                            {station.lines && station.lines.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {station.lines.map((lineId) => {
                                  const badge = formatCercaniasLineBadge(lineId);
                                  return (
                                    <span
                                      key={lineId}
                                      style={{
                                        backgroundColor: badge.bg,
                                        color: badge.text,
                                      }}
                                      className="px-1.5 py-0.2 rounded text-[10px] font-black border border-black/10 dark:border-white/10"
                                    >
                                      {badge.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {distanceText && (
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md tabular-nums">
                              {distanceText}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                        </div>
                      </div>
                    );
                  })}

                {/* EMT Bus Stops */}
                {showBus &&
                  busResults.map((stop) => {
                    let distanceText = '';
                    if (userLocation && stop.lat && stop.lon) {
                      const meters = calculateDistanceMeters(
                        userLocation.lat,
                        userLocation.lon,
                        stop.lat,
                        stop.lon
                      );
                      distanceText =
                        meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
                    }

                    return (
                      <div
                        key={`bus-${stop.id}`}
                        onClick={() => {
                          triggerHaptic('selection');
                          onSelectStop(stop.id);
                        }}
                        className="py-3 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-[#0072CE]/10 dark:bg-[#0072CE]/20 text-[#0072CE] dark:text-[#60B2FF] border border-[#0072CE]/20 dark:border-[#0072CE]/35 flex flex-col items-center justify-center shrink-0">
                            <EmtBusLogo className="w-4.5 h-4.5" />
                            <span className="font-bold text-[10px] leading-none mt-0.5 tabular-nums">
                              {stop.id}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-semibold text-zinc-950 dark:text-white text-sm group-hover:text-[#0072CE] dark:group-hover:text-[#389BFF] transition-colors truncate">
                              {stop.name}
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {stop.address || 'Madrid'}
                            </p>

                            {stop.lines && stop.lines.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {stop.lines.slice(0, 8).map((line) => (
                                  <span
                                    key={line}
                                    className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 tabular-nums"
                                  >
                                    {line}
                                  </span>
                                ))}
                                {stop.lines.length > 8 && (
                                  <span className="text-[10px] text-zinc-400 self-center">
                                    +{stop.lines.length - 8}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {distanceText && (
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md tabular-nums">
                              {distanceText}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Desktop 2-column / Mobile stacked directory */}
      {!query && (
        <div
          className={`grid grid-cols-1 ${
            totalFavoritesCount > 0 ? 'lg:grid-cols-2' : ''
          } gap-4 items-start`}
        >
          {/* Favorites Grouped List */}
          {totalFavoritesCount > 0 && (
            <section className="bg-white dark:bg-[#14161A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <h3 className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  Tus Estaciones y Paradas Favoritas
                </h3>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                {/* Metro Favorites */}
                {metroFavorites.map((fav) => (
                  <button
                    type="button"
                    key={`fav-metro-${fav.id}`}
                    onClick={() => {
                      triggerHaptic('selection');
                      onSelectMetroStation(fav.id);
                    }}
                    className="w-full px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-left transition-colors flex items-center justify-between gap-3 group cursor-pointer ios-press"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <MetroDiamondLogo className="w-7 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-zinc-950 dark:text-white group-hover:text-[#E30613] dark:group-hover:text-[#FF5A5A] transition-colors truncate">
                          {fav.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          Metro • Líneas {fav.lines.join(', ')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                  </button>
                ))}

                {/* Cercanías Favorites */}
                {cercaniasFavorites.map((fav) => (
                  <button
                    type="button"
                    key={`fav-cercanias-${fav.id}`}
                    onClick={() => {
                      triggerHaptic('selection');
                      onSelectCercaniasStation?.(fav.id);
                    }}
                    className="w-full px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-left transition-colors flex items-center justify-between gap-3 group cursor-pointer ios-press"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#E4002B]/10 dark:bg-[#E4002B]/15 flex items-center justify-center shrink-0">
                        <CercaniasLogo className="w-6.5 h-6.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-zinc-950 dark:text-white group-hover:text-[#E4002B] dark:group-hover:text-[#FF5C75] transition-colors truncate">
                          {fav.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          Cercanías • Líneas {fav.lines.join(', ')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                  </button>
                ))}

                {/* Bus Favorites */}
                {favorites.map((fav) => (
                  <button
                    type="button"
                    key={`fav-bus-${fav.id}`}
                    onClick={() => {
                      triggerHaptic('selection');
                      onSelectStop(fav.id);
                    }}
                    className="w-full px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-left transition-colors flex items-center justify-between gap-3 group cursor-pointer ios-press"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0072CE]/10 dark:bg-[#0072CE]/20 text-[#0072CE] dark:text-[#60B2FF] flex flex-col items-center justify-center shrink-0">
                        <EmtBusLogo className="w-4 h-4" />
                        <span className="font-bold text-[10px] leading-none mt-0.5 tabular-nums">
                          {fav.id}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-zinc-950 dark:text-white group-hover:text-[#0072CE] dark:group-hover:text-[#389BFF] transition-colors truncate">
                          {fav.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {fav.address || 'Autobús EMT'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Popular Hubs Grouped List */}
          <section className="bg-white dark:bg-[#14161A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Intercambiadores y Estaciones Principales
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-px bg-zinc-100 dark:bg-zinc-800/70">
              {POPULAR_HUBS.map((hub) => (
                <button
                  type="button"
                  key={`${hub.type}-${hub.id}`}
                  onClick={() => {
                    triggerHaptic('selection');
                    if (hub.type === 'metro') {
                      onSelectMetroStation(hub.id);
                    } else if (hub.type === 'cercanias') {
                      onSelectCercaniasStation?.(hub.id);
                    } else {
                      onSelectStop(hub.id);
                    }
                  }}
                  className="px-4 py-3 bg-white dark:bg-[#14161A] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors flex items-center justify-between gap-2.5 group cursor-pointer ios-press"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {hub.type === 'metro' ? (
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <MetroDiamondLogo className="w-7 h-5" />
                      </div>
                    ) : hub.type === 'cercanias' ? (
                      <div className="w-9 h-9 rounded-lg bg-[#E4002B]/10 dark:bg-[#E4002B]/15 flex items-center justify-center shrink-0">
                        <CercaniasLogo className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-[#0072CE]/10 dark:bg-[#0072CE]/20 text-[#0072CE] dark:text-[#60B2FF] flex flex-col items-center justify-center shrink-0">
                        <EmtBusLogo className="w-4 h-4" />
                        <span className="font-bold text-[9px] leading-none mt-0.5 tabular-nums">
                          {hub.id}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-zinc-950 dark:text-white group-hover:text-[#0072CE] dark:group-hover:text-[#389BFF] transition-colors truncate">
                        {hub.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{hub.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

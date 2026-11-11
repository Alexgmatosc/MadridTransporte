import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bus,
  Train,
  Star,
  Navigation,
  ArrowRight,
  X,
  Layers,
} from 'lucide-react';
import type { FavoriteStop } from '../types/emt';
import type { FavoriteMetroStation, MetroStation } from '../types/metro';
import type { TransportMode } from '../types/transport';
import { searchStops, calculateDistanceMeters } from '../services/stopsService';
import { searchMetroStations } from '../services/metroService';
import { formatMetroLineBadge } from '../data/metroLines';
import { TransportModeSelector } from './TransportModeSelector';

interface HomeSearchLandingProps {
  onSelectStop: (stopId: string) => void;
  onSelectMetroStation: (stationId: string) => void;
  onNearMe: () => void;
  isLocating: boolean;
  favorites: FavoriteStop[];
  metroFavorites?: FavoriteMetroStation[];
  userLocation: { lat: number; lon: number } | null;
  transportMode: TransportMode;
  onTransportModeChange: (mode: TransportMode) => void;
}

const POPULAR_HUBS: Array<{
  type: 'metro' | 'bus';
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
    desc: 'Intercambiador Poniente • L3, L6',
    lines: ['3', '6'],
  },
  {
    type: 'metro',
    id: '0618',
    name: 'Nuevos Ministerios',
    desc: 'Castellana • L6, L8, L10',
    lines: ['6', '8', '10'],
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
  onNearMe,
  isLocating,
  favorites,
  metroFavorites = [],
  userLocation,
  transportMode,
  onTransportModeChange,
}) => {
  const [query, setQuery] = useState('');
  const [metroResults, setMetroResults] = useState<MetroStation[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Query metro stations asynchronously
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    let isMounted = true;
    searchMetroStations(trimmed, 25).then((stations) => {
      if (isMounted) {
        setMetroResults(stations);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [query]);

  const activeMetroResults = query.trim() ? metroResults : [];

  // Bus stops search
  const busResults = query.trim() ? searchStops(query, 25) : [];

  // Filter based on selected mode
  const showMetro = transportMode === 'all' || transportMode === 'metro';
  const showBus = transportMode === 'all' || transportMode === 'bus';

  const totalResultsCount =
    (showMetro ? activeMetroResults.length : 0) + (showBus ? busResults.length : 0);

  const totalFavoritesCount = favorites.length + metroFavorites.length;

  return (
    <div className="flex flex-col gap-6 py-2 sm:py-6 max-w-3xl mx-auto w-full animate-in fade-in duration-200">
      {/* Hero Welcome Card */}
      <div className="text-center flex flex-col items-center px-4 pt-2 pb-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
          <Train className="w-3.5 h-3.5 text-rose-500" />
          <span>MadridTransporte • Metro & Bus EMT</span>
          <Bus className="w-3.5 h-3.5 text-blue-500" />
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          ¿A dónde te mueves en Madrid?
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl">
          Tiempos de llegada en tiempo real para{' '}
          <strong className="text-rose-600 dark:text-rose-400">Metro de Madrid</strong> y{' '}
          <strong className="text-blue-600 dark:text-blue-400">Autobuses EMT</strong>. Busca por
          estación, parada, línea o calle.
        </p>

        {/* Transport Mode Switcher */}
        <div className="mt-4">
          <TransportModeSelector
            mode={transportMode}
            onChange={onTransportModeChange}
            size="md"
          />
        </div>
      </div>

      {/* Main Big Search Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xl shadow-blue-500/5">
        <div className="relative flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
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
                : transportMode === 'bus'
                ? 'Escribe calle (ej. Princesa), parada o línea de bus...'
                : 'Escribe una estación, parada, calle o línea...'
            }
            aria-label="Buscar paradas, estaciones o líneas de transporte"
            className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-base sm:text-lg outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick GPS Action Button right under search */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <button
            onClick={onNearMe}
            disabled={isLocating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Obteniendo GPS...' : 'Cerca de mí (Metro & Paradas)'}</span>
          </button>

          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
            242 estaciones de metro • 4.933 paradas de bus
          </span>
        </div>

        {/* Live Search Results */}
        {query.trim() && (
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
              <span>Resultados encontrados ({totalResultsCount})</span>
              {totalResultsCount > 0 && (
                <span className="text-[11px] font-normal lowercase">pulsa para ver llegadas</span>
              )}
            </div>

            {totalResultsCount === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="font-semibold text-sm">No se encontraron resultados para "{query}"</p>
                <p className="text-xs mt-1 text-slate-400">
                  Prueba buscando por nombre de estación (ej. <em>Sol</em>), calle (ej. <em>Alcalá</em>) o línea (ej. <em>1</em>, <em>L1</em>).
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto pr-1">
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
                      distanceText = meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
                    }

                    return (
                      <div
                        key={`metro-${station.id}`}
                        onClick={() => onSelectMetroStation(station.id)}
                        className="p-3 rounded-2xl hover:bg-rose-50/70 dark:hover:bg-slate-800/80 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-all cursor-pointer flex items-center justify-between gap-3 group ios-press"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex flex-col items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                            <span className="text-[9px] uppercase font-black opacity-80">Metro</span>
                            <Train className="w-5 h-5 mt-0.5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate">
                                {station.name}
                              </h4>
                              {station.zone && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  Zona {station.zone}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {station.address || 'Metro de Madrid'}
                            </p>

                            {/* Metro Lines pills */}
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
                                      className="px-1.5 py-0.2 rounded text-[10px] font-black border shadow-2xs"
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
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                              {distanceText}
                            </span>
                          )}
                          <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
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
                      distanceText = meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
                    }

                    return (
                      <div
                        key={`bus-${stop.id}`}
                        onClick={() => onSelectStop(stop.id)}
                        className="p-3 rounded-2xl hover:bg-blue-50/70 dark:hover:bg-slate-800/80 border border-transparent hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-pointer flex items-center justify-between gap-3 group ios-press"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-blue-100/70 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <span className="text-[9px] uppercase font-bold opacity-70">Parada</span>
                            <span className="font-black text-sm leading-none">{stop.id}</span>
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {stop.name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {stop.address || 'Madrid'}
                            </p>

                            {/* Lines pills */}
                            {stop.lines && stop.lines.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {stop.lines.slice(0, 8).map((line) => (
                                  <span
                                    key={line}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                  >
                                    {line}
                                  </span>
                                ))}
                                {stop.lines.length > 8 && (
                                  <span className="text-[10px] text-slate-400 self-center">
                                    +{stop.lines.length - 8} más
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {distanceText && (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                              {distanceText}
                            </span>
                          )}
                          <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Favorites Section (if any saved, both Bus and Metro) */}
      {!query && totalFavoritesCount > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Tus Estaciones y Paradas Favoritas
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Metro Favorites */}
            {metroFavorites.map((fav) => (
              <button
                key={`fav-metro-${fav.id}`}
                onClick={() => onSelectMetroStation(fav.id)}
                className="p-3 rounded-2xl bg-rose-50/40 hover:bg-rose-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-rose-200/60 dark:border-slate-700 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer ios-press"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    <Train className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate">
                      {fav.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      Metro • Líneas {fav.lines.join(', ')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}

            {/* Bus Favorites */}
            {favorites.map((fav) => (
              <button
                key={`fav-bus-${fav.id}`}
                onClick={() => onSelectStop(fav.id)}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer ios-press"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {fav.id}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {fav.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{fav.address || 'Autobús EMT'}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested / Popular Hubs */}
      {!query && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-3">
            Intercambiadores y Estaciones Principales
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {POPULAR_HUBS.map((hub) => (
              <button
                key={`${hub.type}-${hub.id}`}
                onClick={() => {
                  if (hub.type === 'metro') {
                    onSelectMetroStation(hub.id);
                  } else {
                    onSelectStop(hub.id);
                  }
                }}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/80 text-left transition-all flex items-center justify-between gap-2.5 group cursor-pointer ios-press"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                      hub.type === 'metro'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {hub.type === 'metro' ? <Train className="w-4 h-4" /> : hub.id}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {hub.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{hub.desc}</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Multimodal Tips Cards */}
      {!query && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
            <Train className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Metro de Madrid</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Estimaciones por andén en tiempo real para L1-L12, Ramal y Metro Ligero.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
            <Bus className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Autobuses EMT</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Posición GPS de los autobuses aproximándose y minutos de llegada.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Búsqueda Unificada</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Escribe cualquier estación, calle o parada para encontrarla al instante.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

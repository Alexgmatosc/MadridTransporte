import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Layers } from 'lucide-react';
import { searchStops, calculateDistanceMeters } from '../services/stopsService';
import { searchMetroStations } from '../services/metroService';
import { formatMetroLineBadge } from '../data/metroLines';
import type { MetroStation } from '../types/metro';
import type { Stop } from '../types/emt';
import type { TransportMode } from '../types/transport';
import { MetroDiamondLogo, MetroDiamondMark, EmtBusLogo } from './TransitIcons';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStop: (stopId: string) => void;
  onSelectMetroStation?: (stationId: string) => void;
  userLocation: { lat: number; lon: number } | null;
  activeMode?: TransportMode;
}

const POPULAR_HUBS = [
  { type: 'metro' as const, id: '0112', name: 'Sol', lines: ['1', '2', '3'] },
  { type: 'metro' as const, id: '0209', name: 'Ópera', lines: ['2', '5', 'R'] },
  { type: 'metro' as const, id: '0116', name: 'Atocha', lines: ['1'] },
  { type: 'metro' as const, id: '0311', name: 'Moncloa', lines: ['3', '6'] },
  { type: 'metro' as const, id: '0618', name: 'Nuevos Ministerios', lines: ['6', '8', '10'] },
  { type: 'bus' as const, id: '72', name: 'Cibeles', lines: ['1', '2', '202'] },
  { type: 'bus' as const, id: '4514', name: 'Cristo Rey', lines: ['1', '82'] },
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectStop,
  onSelectMetroStation,
  userLocation,
  activeMode = 'all',
}) => {
  const [query, setQuery] = useState('');
  const [userFilterTab, setUserFilterTab] = useState<'all' | 'metro' | 'bus' | null>(null);
  const filterTab = userFilterTab ?? activeMode;
  const [metroResults, setMetroResults] = useState<MetroStation[]>([]);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

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
  const busResults: Stop[] = query.trim() ? searchStops(query, 25) : [];

  const showMetro = filterTab === 'all' || filterTab === 'metro';
  const showBus = filterTab === 'all' || filterTab === 'bus';

  const totalResultsCount =
    (showMetro ? activeMetroResults.length : 0) + (showBus ? busResults.length : 0);

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const r = dialog.getBoundingClientRect();
    const isOutside =
      e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (isOutside) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label="Buscador universal de transporte de Madrid"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={handleDialogClick}
      className="ios-sheet fixed inset-x-0 bottom-0 sm:inset-0 sm:m-auto z-50 p-0 w-full sm:w-[calc(100%-2rem)] max-w-xl bg-white dark:bg-[#14161A] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex-col max-h-[82vh] animate-in slide-in-from-bottom duration-200 backdrop:bg-black/60 backdrop:backdrop-blur-sm open:flex"
    >
      {/* iOS Drag Handle indicator on mobile */}
      <div className="w-10 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

      {/* Top Search Input inside semantic <search> */}
      <search className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <Search className="w-5 h-5 text-[#0072CE] dark:text-[#389BFF] shrink-0" />
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Estación de metro, parada de autobús, línea o calle..."
          aria-label="Buscar estación de metro o parada de autobús"
          className="flex-1 bg-transparent text-zinc-950 dark:text-white placeholder-zinc-400 text-base outline-none font-medium"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded font-mono">
            ESC
          </kbd>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ml-1 cursor-pointer"
          aria-label="Cerrar buscador"
        >
          <X className="w-5 h-5" />
        </button>
      </search>

      {/* Mode Filter Tabs within search modal */}
      <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setUserFilterTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filterTab === 'all'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs'
              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todos</span>
          {query.trim() && (
            <span className="opacity-80 text-[10px] tabular-nums">
              ({activeMetroResults.length + busResults.length})
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setUserFilterTab('metro')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filterTab === 'metro'
              ? 'bg-[#E30613] text-white shadow-2xs'
              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <MetroDiamondMark className="w-4 h-3" />
          <span>Metro</span>
          {query.trim() && (
            <span className="opacity-80 text-[10px] tabular-nums">({activeMetroResults.length})</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setUserFilterTab('bus')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filterTab === 'bus'
              ? 'bg-[#0072CE] text-white shadow-2xs'
              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <EmtBusLogo className="w-3.5 h-3.5" />
          <span>Autobús</span>
          {query.trim() && (
            <span className="opacity-80 text-[10px] tabular-nums">({busResults.length})</span>
          )}
        </button>
      </div>

      {/* Popular Hubs / Quick chips when no query */}
      {!query && (
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/30">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Intercambiadores y Estaciones Populares
          </p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_HUBS.map((hub) => (
              <button
                type="button"
                key={`${hub.type}-${hub.id}`}
                onClick={() => {
                  if (hub.type === 'metro') {
                    onSelectMetroStation?.(hub.id);
                  } else {
                    onSelectStop(hub.id);
                  }
                  onClose();
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 transition-all flex items-center gap-1.5 cursor-pointer ios-press"
              >
                {hub.type === 'metro' ? (
                  <MetroDiamondMark className="w-4 h-3" />
                ) : (
                  <EmtBusLogo className="w-3.5 h-3.5" />
                )}
                <span>{hub.name}</span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {hub.type === 'metro' ? hub.lines.map((l) => `L${l}`).join(' ') : `#${hub.id}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/70 p-2">
        {query.trim() && totalResultsCount === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No se encontraron resultados
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Prueba con el nombre de una estación (ej. <em>Sol</em>, <em>Ópera</em>), calle o número de línea.
            </p>
          </div>
        ) : (
          <>
            {/* Metro Stations Results */}
            {showMetro &&
              activeMetroResults.map((station) => {
                const distance =
                  userLocation && station.lat && station.lon
                    ? calculateDistanceMeters(
                        userLocation.lat,
                        userLocation.lon,
                        station.lat,
                        station.lon
                      )
                    : null;

                return (
                  <div
                    key={`metro-${station.id}`}
                    onClick={() => {
                      onSelectMetroStation?.(station.id);
                      onClose();
                    }}
                    className="p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center shrink-0">
                        <MetroDiamondLogo className="w-8 h-6" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-semibold text-sm text-zinc-950 dark:text-white truncate">
                            {station.name}
                          </h4>
                          {station.zone && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              Z.{station.zone}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {station.address || 'Metro de Madrid'}
                        </p>

                        {station.lines && station.lines.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
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
                                  className="px-1.5 py-0.2 text-[10px] font-black rounded-md border"
                                >
                                  {badge.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {distance !== null && (
                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 tabular-nums">
                          {distance < 1000 ? `${distance} m` : `${(distance / 1000).toFixed(1)} km`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* EMT Bus Stops Results */}
            {showBus &&
              busResults.map((stop) => {
                const distance =
                  userLocation && stop.lat && stop.lon
                    ? calculateDistanceMeters(
                        userLocation.lat,
                        userLocation.lon,
                        stop.lat,
                        stop.lon
                      )
                    : null;

                return (
                  <div
                    key={`bus-${stop.id}`}
                    onClick={() => {
                      onSelectStop(stop.id);
                      onClose();
                    }}
                    className="p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#0072CE]/10 dark:bg-[#0072CE]/20 text-[#0072CE] dark:text-[#60B2FF] border border-[#0072CE]/20 dark:border-[#0072CE]/35 flex flex-col items-center justify-center shrink-0">
                        <EmtBusLogo className="w-4.5 h-4.5" />
                        <span className="text-[10px] font-bold leading-none mt-0.5 tabular-nums">
                          {stop.id}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-zinc-950 dark:text-white truncate">
                          {stop.name}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {stop.address}
                        </p>
                        {stop.lines && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {stop.lines.slice(0, 6).map((l) => (
                              <span
                                key={l}
                                className="px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold rounded text-zinc-700 dark:text-zinc-300"
                              >
                                {l}
                              </span>
                            ))}
                            {stop.lines.length > 6 && (
                              <span className="text-[10px] text-zinc-400 font-medium">
                                +{stop.lines.length - 6} más
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {distance !== null && (
                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 tabular-nums">
                          {distance < 1000 ? `${distance} m` : `${(distance / 1000).toFixed(1)} km`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
          </>
        )}
      </div>

      {/* Footer Info with iOS safe area padding */}
      <div
        className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <span>Metro de Madrid (242 estaciones) • EMT (4.933 paradas)</span>
        <button
          type="button"
          onClick={onClose}
          className="font-bold text-[#0072CE] dark:text-[#389BFF] px-3 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </dialog>
  );
};

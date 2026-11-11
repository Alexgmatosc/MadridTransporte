import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Bus, Train, Layers } from 'lucide-react';
import { searchStops, calculateDistanceMeters } from '../services/stopsService';
import { searchMetroStations } from '../services/metroService';
import { formatMetroLineBadge } from '../data/metroLines';
import type { MetroStation } from '../types/metro';
import type { Stop } from '../types/emt';
import type { TransportMode } from '../types/transport';

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
  { type: 'metro' as const, id: '0106', name: 'Atocha', lines: ['1'] },
  { type: 'metro' as const, id: '0310', name: 'Moncloa', lines: ['3', '6'] },
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

  // Query metro stations asynchronously when query changes
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
  const busResults: Stop[] = query.trim() ? searchStops(query, 25) : [];

  // Filter based on tab
  const showMetro = filterTab === 'all' || filterTab === 'metro';
  const showBus = filterTab === 'all' || filterTab === 'bus';

  const totalResultsCount =
    (showMetro ? activeMetroResults.length : 0) + (showBus ? busResults.length : 0);

  // Click outside to dismiss (dialog backdrop click detection per modern-web-guidance)
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
      className="ios-sheet fixed inset-x-0 bottom-0 sm:inset-0 sm:m-auto z-50 p-0 w-full sm:w-[calc(100%-2rem)] max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex-col max-h-[82vh] animate-in slide-in-from-bottom duration-200 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm open:flex"
    >
      {/* iOS Drag Handle indicator on mobile */}
      <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

      {/* Top Search Input inside semantic <search> */}
      <search className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
        <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
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
          className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-base outline-none font-medium"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded font-mono">
            ESC
          </kbd>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 cursor-pointer"
          aria-label="Cerrar buscador"
        >
          <X className="w-5 h-5" />
        </button>
      </search>

      {/* Mode Filter Tabs within search modal */}
      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-950/30 flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setUserFilterTab('all')}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todos</span>
          {query.trim() && (
            <span className="opacity-80 text-[10px]">
              ({activeMetroResults.length + busResults.length})
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setUserFilterTab('metro')}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'metro'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          <Train className="w-3.5 h-3.5" />
          <span>Metro</span>
          {query.trim() && (
            <span className="opacity-80 text-[10px]">({activeMetroResults.length})</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setUserFilterTab('bus')}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'bus'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          <Bus className="w-3.5 h-3.5" />
          <span>Autobús</span>
          {query.trim() && (
            <span className="opacity-80 text-[10px]">({busResults.length})</span>
          )}
        </button>
      </div>

      {/* Popular Hubs / Quick chips when no query */}
      {!query && (
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
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
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ios-press"
              >
                {hub.type === 'metro' ? (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
                    M
                  </span>
                ) : (
                  <Bus className="w-3.5 h-3.5 text-blue-500" />
                )}
                <span>{hub.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {hub.type === 'metro' ? hub.lines.map((l) => `L${l}`).join(' ') : `#${hub.id}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
        {query.trim() && totalResultsCount === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-semibold">No se encontraron resultados</p>
            <p className="text-xs text-slate-400 mt-1">
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
                    className="p-3.5 rounded-2xl hover:bg-rose-50/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Metro Icon Pill */}
                      <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 flex flex-col items-center justify-center font-bold text-xs shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">
                          Metro
                        </span>
                        <Train className="w-5 h-5 mt-0.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {station.name}
                          </h4>
                          {station.zone && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                              Z.{station.zone}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {station.address || 'Metro de Madrid'}
                        </p>

                        {/* Metro Line Badges */}
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
                                  className="px-1.5 py-0.2 text-[10px] font-black rounded-md border shadow-2xs"
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
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
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
                    className="p-3.5 rounded-2xl hover:bg-blue-50/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 flex flex-col items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <span className="text-[9px] uppercase tracking-wider opacity-75">Parada</span>
                        <span className="text-sm font-black">{stop.id}</span>
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {stop.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {stop.address}
                        </p>
                        {stop.lines && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {stop.lines.slice(0, 6).map((l) => (
                              <span
                                key={l}
                                className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
                              >
                                {l}
                              </span>
                            ))}
                            {stop.lines.length > 6 && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                +{stop.lines.length - 6} más
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {distance !== null && (
                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
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
        className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <span>Metro de Madrid (242 estaciones) • EMT (4.933 paradas)</span>
        <button
          type="button"
          onClick={onClose}
          className="font-bold text-blue-600 dark:text-blue-400 px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </dialog>
  );
};

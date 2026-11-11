import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Bus } from 'lucide-react';
import { searchStops, calculateDistanceMeters } from '../services/stopsService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStop: (stopId: string) => void;
  userLocation: { lat: number; lon: number } | null;
}

const POPULAR_STOPS = [
  { id: '72', name: 'Cibeles' },
  { id: '1', name: 'Valdemarín' },
  { id: '4514', name: 'Cristo Rey' },
  { id: '5443', name: 'Atocha' },
  { id: '2807', name: 'Moncloa' },
  { id: '85', name: 'Plaza de Castilla' },
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectStop,
  userLocation,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Derive results directly during render
  const results = query.trim() ? searchStops(query, 30) : [];

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscador de paradas y líneas"
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nº parada (ej. 72), calle o línea..."
            aria-label="Buscar por parada, calle o línea"
            className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-base outline-none font-medium"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded font-mono">
              ESC
            </kbd>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Popular Hubs / Quick chips */}
        {!query && (
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
              Paradas populares:
            </span>
            <div className="flex flex-wrap gap-2">
              {POPULAR_STOPS.map((hub) => (
                <button
                  key={hub.id}
                  onClick={() => {
                    onSelectStop(hub.id);
                    setQuery('');
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer shadow-2xs"
                >
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{hub.id}</span>
                  <span>{hub.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
          {query && results.length === 0 && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <Bus className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No se encontraron paradas</p>
              <p className="text-xs mt-1">Prueba buscando por número de parada (ej: 72) o nombre de calle.</p>
            </div>
          )}

          {results.map((stop) => {
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
                key={stop.id}
                onClick={() => {
                  onSelectStop(stop.id);
                  setQuery('');
                  onClose();
                }}
                className="p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {stop.id}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {stop.name}
                      </h4>
                      {distanceText && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded shrink-0">
                          a {distanceText}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {stop.address}
                    </p>

                    {/* Lines Served Chips */}
                    {stop.lines && stop.lines.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {stop.lines.slice(0, 8).map((line) => (
                          <span
                            key={line}
                            className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded text-slate-600 dark:text-slate-300"
                          >
                            {line}
                          </span>
                        ))}
                        {stop.lines.length > 8 && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            +{stop.lines.length - 8} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

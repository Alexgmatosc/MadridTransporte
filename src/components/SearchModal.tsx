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

  // Derive results directly during render
  const results = query.trim() ? searchStops(query, 30) : [];

  return (
    <dialog
      ref={dialogRef}
      aria-label="Buscador de paradas y líneas"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={handleDialogClick}
      className="fixed inset-0 m-auto z-50 p-0 w-[calc(100%-2rem)] max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm open:flex"
    >
      {/* iOS Drag Handle indicator on mobile */}
      <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 sm:hidden" />

      {/* Top Search Input inside semantic <search> */}
      <search className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
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
          placeholder="Nº parada (ej. 72), calle o línea..."
          aria-label="Buscar por parada, calle o línea"
          className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-base outline-none font-medium"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
          aria-label="Cerrar buscador"
        >
          <X className="w-5 h-5" />
        </button>
      </search>

      {/* Popular Hubs / Quick chips */}
      {!query && (
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Intercambiadores Populares
          </p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_STOPS.map((hub) => (
              <button
                type="button"
                key={hub.id}
                onClick={() => {
                  onSelectStop(hub.id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>{hub.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">#{hub.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
        {query.trim() && results.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Bus className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No se encontraron paradas</p>
            <p className="text-xs text-slate-400 mt-1">
              Prueba con el número de parada, nombre de calle o número de línea.
            </p>
          </div>
        ) : (
          results.map((stop) => {
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
                key={stop.id}
                onClick={() => {
                  onSelectStop(stop.id);
                  onClose();
                }}
                className="p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
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
                            className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded text-slate-600 dark:text-slate-300"
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
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <span>4.933 paradas de la EMT Madrid indexadas</span>
        <span>Pulsa ESC para salir</span>
      </div>
    </dialog>
  );
};

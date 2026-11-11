import React from 'react';
import { MapPin, X, Navigation } from 'lucide-react';
import type { NearestStop } from '../services/stopsService';

interface NearestStopsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stops: NearestStop[];
  onSelectStop: (stopId: string) => void;
}

export const NearestStopsModal: React.FC<NearestStopsModalProps> = ({
  isOpen,
  onClose,
  stops,
  onSelectStop,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nearest-stops-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200 overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 id="nearest-stops-title" className="font-bold text-base text-slate-900 dark:text-white">
                Paradas Cerca de Ti
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ordenadas por distancia caminando
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
          {stops.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No se encontraron paradas cercanas</p>
            </div>
          ) : (
            stops.map((stop) => {
              const distanceText =
                stop.distanceMeters < 1000
                  ? `${stop.distanceMeters} m`
                  : `${(stop.distanceMeters / 1000).toFixed(1)} km`;

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
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold inline-block">
                      {distanceText}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

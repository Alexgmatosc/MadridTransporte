import React, { useEffect, useRef } from 'react';
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Click outside to dismiss (backdrop click per modern-web-guidance)
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
      aria-labelledby="nearest-stops-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={handleDialogClick}
      className="fixed inset-x-0 bottom-0 sm:inset-0 sm:m-auto z-50 p-0 w-full sm:w-[calc(100%-2rem)] max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm open:flex"
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
          type="button"
          onClick={onClose}
          aria-label="Cerrar paradas cercanas"
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
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                    {distanceText}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </dialog>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, X, Navigation, Train, Bus, Layers } from 'lucide-react';
import type { NearestStop } from '../services/stopsService';
import type { NearestMetroStation } from '../services/metroService';
import { formatMetroLineBadge } from '../data/metroLines';

interface NearestStopsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stops: NearestStop[];
  metroStations?: NearestMetroStation[];
  onSelectStop: (stopId: string) => void;
  onSelectMetroStation?: (stationId: string) => void;
}

export const NearestStopsModal: React.FC<NearestStopsModalProps> = ({
  isOpen,
  onClose,
  stops,
  metroStations = [],
  onSelectStop,
  onSelectMetroStation,
}) => {
  const [tab, setTab] = useState<'all' | 'metro' | 'bus'>('all');
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

  const showMetro = tab === 'all' || tab === 'metro';
  const showBus = tab === 'all' || tab === 'bus';

  // Merge items if 'all' tab is selected, ordered by distance
  type UnifiedNearestItem =
    | ({ itemType: 'metro' } & NearestMetroStation)
    | ({ itemType: 'bus' } & NearestStop);

  const mergedItems: UnifiedNearestItem[] = [
    ...(showMetro ? metroStations.map((m) => ({ ...m, itemType: 'metro' as const })) : []),
    ...(showBus ? stops.map((s) => ({ ...s, itemType: 'bus' as const })) : []),
  ].sort((a, b) => a.distanceMeters - b.distanceMeters);

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
      className="ios-sheet fixed inset-x-0 bottom-0 sm:inset-0 sm:m-auto z-50 p-0 w-full sm:w-[calc(100%-2rem)] max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex-col max-h-[82vh] animate-in slide-in-from-bottom duration-200 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm open:flex"
    >
      {/* iOS Drag Handle indicator on mobile */}
      <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 id="nearest-stops-title" className="font-bold text-base text-slate-900 dark:text-white">
              Transporte Cerca de Ti
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estaciones y paradas por distancia caminando
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar paradas cercanas"
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-950/30 flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
            tab === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todos</span>
          <span className="opacity-80 text-[10px]">({metroStations.length + stops.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('metro')}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
            tab === 'metro'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          <Train className="w-3.5 h-3.5" />
          <span>Metro</span>
          <span className="opacity-80 text-[10px]">({metroStations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('bus')}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
            tab === 'bus'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          <Bus className="w-3.5 h-3.5" />
          <span>Autobús</span>
          <span className="opacity-80 text-[10px]">({stops.length})</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
        {mergedItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-semibold">No se encontraron transportes cercanos</p>
          </div>
        ) : (
          mergedItems.map((item) => {
            const distanceText =
              item.distanceMeters < 1000
                ? `${item.distanceMeters} m`
                : `${(item.distanceMeters / 1000).toFixed(1)} km`;

            if (item.itemType === 'metro') {
              return (
                <div
                  key={`metro-${item.id}`}
                  onClick={() => {
                    onSelectMetroStation?.(item.id);
                    onClose();
                  }}
                  className="p-3.5 rounded-2xl hover:bg-rose-50/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 flex flex-col items-center justify-center font-bold text-xs shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">
                        Metro
                      </span>
                      <Train className="w-5 h-5 mt-0.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {item.name}
                        </h4>
                        {item.zone && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                            Zona {item.zone}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.address || 'Metro de Madrid'}
                      </p>

                      {item.lines && item.lines.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {item.lines.map((lineId) => {
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

                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                      {distanceText}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`bus-${item.id}`}
                onClick={() => {
                  onSelectStop(item.id);
                  onClose();
                }}
                className="p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 flex flex-col items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <span className="text-[9px] uppercase tracking-wider opacity-75">Parada</span>
                    <span className="text-sm font-black">{item.id}</span>
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.address}
                    </p>
                    {item.lines && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {item.lines.slice(0, 6).map((l) => (
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

      {/* Footer */}
      <div
        className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <span>{mergedItems.length} transportes cerca</span>
        <button
          type="button"
          onClick={onClose}
          className="font-bold text-blue-600 dark:text-blue-400 px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
        >
          Listo
        </button>
      </div>
    </dialog>
  );
};

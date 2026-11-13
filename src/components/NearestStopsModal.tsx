import React, { useEffect, useRef, useState } from 'react';
import { MapPin, X, Navigation, Layers } from 'lucide-react';
import type { NearestStop } from '../services/stopsService';
import type { NearestMetroStation } from '../services/metroService';
import type { NearestCercaniasStation } from '../services/cercaniasService';
import { formatMetroLineBadge } from '../data/metroLines';
import { formatCercaniasLineBadge } from '../data/cercaniasLines';
import {
  MetroDiamondLogo,
  MetroDiamondMark,
  EmtBusLogo,
  CercaniasLogo,
  CercaniasMark,
} from './TransitIcons';

interface NearestStopsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stops: NearestStop[];
  metroStations?: NearestMetroStation[];
  cercaniasStations?: NearestCercaniasStation[];
  onSelectStop: (stopId: string) => void;
  onSelectMetroStation?: (stationId: string) => void;
  onSelectCercaniasStation?: (stationId: string) => void;
}

export const NearestStopsModal: React.FC<NearestStopsModalProps> = ({
  isOpen,
  onClose,
  stops,
  metroStations = [],
  cercaniasStations = [],
  onSelectStop,
  onSelectMetroStation,
  onSelectCercaniasStation,
}) => {
  const [tab, setTab] = useState<'all' | 'metro' | 'cercanias' | 'bus'>('all');
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
  const showCercanias = tab === 'all' || tab === 'cercanias';
  const showBus = tab === 'all' || tab === 'bus';

  type UnifiedNearestItem =
    | ({ itemType: 'metro' } & NearestMetroStation)
    | ({ itemType: 'cercanias' } & NearestCercaniasStation)
    | ({ itemType: 'bus' } & NearestStop);

  const mergedItems: UnifiedNearestItem[] = [
    ...(showMetro ? metroStations.map((m) => ({ ...m, itemType: 'metro' as const })) : []),
    ...(showCercanias
      ? cercaniasStations.map((c) => ({ ...c, itemType: 'cercanias' as const }))
      : []),
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
      className="ios-sheet fixed inset-x-0 bottom-0 sm:inset-0 sm:m-auto z-50 p-0 w-full sm:w-[calc(100%-2rem)] max-w-lg bg-white dark:bg-[#14161A] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex-col max-h-[82vh] animate-in slide-in-from-bottom duration-200 backdrop:bg-black/60 backdrop:backdrop-blur-sm open:flex"
    >
      {/* iOS Drag Handle indicator on mobile */}
      <div className="w-10 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0072CE]/10 dark:bg-[#0072CE]/20 text-[#0072CE] dark:text-[#60B2FF] flex items-center justify-center">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 id="nearest-stops-title" className="font-bold text-base text-zinc-950 dark:text-white">
              Transporte Cerca de Ti
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Estaciones y paradas por distancia caminando
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar paradas cercanas"
          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            tab === 'all'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs'
              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todos</span>
          <span className="opacity-80 text-[10px] tabular-nums">
            ({metroStations.length + cercaniasStations.length + stops.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('metro')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            tab === 'metro'
              ? 'bg-[#E30613] text-white shadow-2xs'
              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <MetroDiamondMark className="w-4 h-3" />
          <span>Metro</span>
          <span className="opacity-80 text-[10px] tabular-nums">({metroStations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('cercanias')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            tab === 'cercanias'
              ? 'bg-[#E4002B] text-white shadow-2xs'
              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <CercaniasMark className="w-3.5 h-3.5" />
          <span>Cercanías</span>
          <span className="opacity-80 text-[10px] tabular-nums">({cercaniasStations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('bus')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            tab === 'bus'
              ? 'bg-[#0072CE] text-white shadow-2xs'
              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <EmtBusLogo className="w-3.5 h-3.5" />
          <span>Autobús</span>
          <span className="opacity-80 text-[10px] tabular-nums">({stops.length})</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/70 p-2">
        {mergedItems.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
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
                  className="p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center shrink-0">
                      <MetroDiamondLogo className="w-8 h-6" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-semibold text-sm text-zinc-950 dark:text-white truncate">
                          {item.name}
                        </h4>
                        {item.zone && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            Zona {item.zone}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
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

                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 tabular-nums">
                      {distanceText}
                    </span>
                  </div>
                </div>
              );
            }

            if (item.itemType === 'cercanias') {
              return (
                <div
                  key={`cercanias-${item.id}`}
                  onClick={() => {
                    onSelectCercaniasStation?.(item.id);
                    onClose();
                  }}
                  className="p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#E4002B]/10 dark:bg-[#E4002B]/15 border border-[#E4002B]/20 dark:border-[#E4002B]/30 flex items-center justify-center shrink-0">
                      <CercaniasLogo className="w-7 h-7" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-semibold text-sm text-zinc-950 dark:text-white truncate">
                          {item.name}
                        </h4>
                        {item.zone && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            Zona {item.zone}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {item.address || 'Renfe Cercanías Madrid'}
                      </p>

                      {item.lines && item.lines.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {item.lines.map((lineId) => {
                            const badge = formatCercaniasLineBadge(lineId);
                            return (
                              <span
                                key={lineId}
                                style={{
                                  backgroundColor: badge.bg,
                                  color: badge.text,
                                }}
                                className="px-1.5 py-0.2 text-[10px] font-black rounded-md border border-black/10 dark:border-white/10"
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
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 tabular-nums">
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
                className="p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#0072CE]/10 dark:bg-[#0072CE]/20 text-[#0072CE] dark:text-[#60B2FF] border border-[#0072CE]/20 dark:border-[#0072CE]/35 flex flex-col items-center justify-center shrink-0">
                    <EmtBusLogo className="w-4.5 h-4.5" />
                    <span className="text-[10px] font-bold leading-none mt-0.5 tabular-nums">
                      {item.id}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-zinc-950 dark:text-white truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {item.address}
                    </p>
                    {item.lines && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {item.lines.slice(0, 6).map((l) => (
                          <span
                            key={l}
                            className="px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold rounded text-zinc-700 dark:text-zinc-300"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 tabular-nums">
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
        className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <span>{mergedItems.length} transportes cerca</span>
        <button
          type="button"
          onClick={onClose}
          className="font-bold text-[#0072CE] dark:text-[#389BFF] px-3 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          Listo
        </button>
      </div>
    </dialog>
  );
};

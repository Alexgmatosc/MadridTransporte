import React, { useEffect, useRef, useState } from 'react';
import { Star, X, Trash2, Layers } from 'lucide-react';
import type { FavoriteStop } from '../types/emt';
import type { FavoriteMetroStation } from '../types/metro';
import type { FavoriteCercaniasStation } from '../types/cercanias';
import { formatMetroLineBadge } from '../data/metroLines';
import { formatCercaniasLineBadge } from '../data/cercaniasLines';
import {
  MetroDiamondLogo,
  MetroDiamondMark,
  EmtBusLogo,
  CercaniasLogo,
  CercaniasMark,
} from './TransitIcons';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: FavoriteStop[];
  metroFavorites?: FavoriteMetroStation[];
  cercaniasFavorites?: FavoriteCercaniasStation[];
  onSelectStop: (stopId: string) => void;
  onSelectMetroStation?: (stationId: string) => void;
  onSelectCercaniasStation?: (stationId: string) => void;
  onRemoveFavorite?: (stopId: string) => void;
  onRemoveMetroFavorite?: (stationId: string) => void;
  onRemoveCercaniasFavorite?: (stationId: string) => void;
  currentStopId: string | null;
  currentMetroStationId?: string | null;
  currentCercaniasStationId?: string | null;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  favorites,
  metroFavorites = [],
  cercaniasFavorites = [],
  onSelectStop,
  onSelectMetroStation,
  onSelectCercaniasStation,
  onRemoveFavorite,
  onRemoveMetroFavorite,
  onRemoveCercaniasFavorite,
  currentStopId,
  currentMetroStationId,
  currentCercaniasStationId,
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

  const totalCount =
    favorites.length + metroFavorites.length + cercaniasFavorites.length;
  const showMetro = tab === 'all' || tab === 'metro';
  const showCercanias = tab === 'all' || tab === 'cercanias';
  const showBus = tab === 'all' || tab === 'bus';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="favorites-title"
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
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <h3 id="favorites-title" className="font-bold text-base text-zinc-950 dark:text-white">
              Tus Favoritos Guardados
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {totalCount} {totalCount === 1 ? 'elemento guardado' : 'elementos guardados'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar favoritos"
          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ios-press cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      {totalCount > 0 && (
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
            <span className="opacity-80 text-[10px] tabular-nums">({totalCount})</span>
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
            <span className="opacity-80 text-[10px] tabular-nums">({metroFavorites.length})</span>
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
            <span className="opacity-80 text-[10px] tabular-nums">
              ({cercaniasFavorites.length})
            </span>
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
            <span className="opacity-80 text-[10px] tabular-nums">({favorites.length})</span>
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/70 p-2">
        {totalCount === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <Star className="w-10 h-10 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              No tienes favoritos guardados
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Toca la estrella en cualquier estación de Metro, Cercanías o parada de autobús para acceder rápidamente.
            </p>
          </div>
        ) : (
          <>
            {/* Metro Favorites */}
            {showMetro &&
              metroFavorites.map((fav) => {
                const isCurrent = fav.id === currentMetroStationId;
                return (
                  <div
                    key={`fav-metro-${fav.id}`}
                    onClick={() => {
                      onSelectMetroStation?.(fav.id);
                      onClose();
                    }}
                    className={`p-3 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press ${
                      isCurrent
                        ? 'bg-[#E30613]/8 dark:bg-[#E30613]/15 border border-[#E30613]/25'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center shrink-0">
                        <MetroDiamondLogo className="w-8 h-6" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-zinc-950 dark:text-white truncate">
                            {fav.name}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E30613] text-white">
                              Actual
                            </span>
                          )}
                        </div>
                        {fav.address && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                            {fav.address}
                          </p>
                        )}
                        {fav.lines && fav.lines.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {fav.lines.map((lineId) => {
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

                    {onRemoveMetroFavorite && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveMetroFavorite(fav.id);
                        }}
                        title="Eliminar de favoritos"
                        className="p-2 text-zinc-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}

            {/* Cercanías Favorites */}
            {showCercanias &&
              cercaniasFavorites.map((fav) => {
                const isCurrent = fav.id === currentCercaniasStationId;
                return (
                  <div
                    key={`fav-cercanias-${fav.id}`}
                    onClick={() => {
                      onSelectCercaniasStation?.(fav.id);
                      onClose();
                    }}
                    className={`p-3 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press ${
                      isCurrent
                        ? 'bg-[#E4002B]/8 dark:bg-[#E4002B]/15 border border-[#E4002B]/25'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#E4002B]/10 dark:bg-[#E4002B]/15 border border-[#E4002B]/20 dark:border-[#E4002B]/30 flex items-center justify-center shrink-0">
                        <CercaniasLogo className="w-7 h-7" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-zinc-950 dark:text-white truncate">
                            {fav.name}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E4002B] text-white">
                              Actual
                            </span>
                          )}
                        </div>
                        {fav.address && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                            {fav.address}
                          </p>
                        )}
                        {fav.lines && fav.lines.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {fav.lines.map((lineId) => {
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

                    {onRemoveCercaniasFavorite && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveCercaniasFavorite(fav.id);
                        }}
                        title="Eliminar de favoritos"
                        className="p-2 text-zinc-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}

            {/* Bus Favorites */}
            {showBus &&
              favorites.map((fav) => {
                const isCurrent = fav.id === currentStopId;
                return (
                  <div
                    key={`fav-bus-${fav.id}`}
                    onClick={() => {
                      onSelectStop(fav.id);
                      onClose();
                    }}
                    className={`p-3 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3 group ios-press ${
                      isCurrent
                        ? 'bg-[#0072CE]/8 dark:bg-[#0072CE]/15 border border-[#0072CE]/25'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#0072CE]/10 dark:bg-[#0072CE]/20 text-[#0072CE] dark:text-[#60B2FF] border border-[#0072CE]/20 dark:border-[#0072CE]/35 flex flex-col items-center justify-center shrink-0">
                        <EmtBusLogo className="w-4.5 h-4.5" />
                        <span className="text-[10px] font-bold leading-none mt-0.5 tabular-nums">
                          {fav.id}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-zinc-950 dark:text-white truncate">
                            {fav.name}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#0072CE] text-white">
                              Actual
                            </span>
                          )}
                        </div>
                        {fav.address && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                            {fav.address}
                          </p>
                        )}
                        {fav.lines && fav.lines.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {fav.lines.slice(0, 6).map((line) => (
                              <span
                                key={line}
                                className="px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold rounded text-zinc-700 dark:text-zinc-300"
                              >
                                {line}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {onRemoveFavorite && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFavorite(fav.id);
                        }}
                        title="Eliminar de favoritos"
                        className="p-2 text-zinc-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
          </>
        )}
      </div>

      <div
        className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <span>Tus favoritos se sincronizan automáticamente</span>
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

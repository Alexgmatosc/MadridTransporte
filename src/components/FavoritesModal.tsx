import React, { useEffect, useRef } from 'react';
import { Star, X, Trash2 } from 'lucide-react';
import type { FavoriteStop } from '../types/emt';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: FavoriteStop[];
  onSelectStop: (stopId: string) => void;
  onRemoveFavorite?: (stopId: string) => void;
  currentStopId: string | null;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onSelectStop,
  onRemoveFavorite,
  currentStopId,
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
      aria-labelledby="favorites-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={handleDialogClick}
      className="fixed inset-x-0 bottom-0 sm:inset-0 sm:m-auto z-50 p-0 w-full sm:w-[calc(100%-2rem)] max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm open:flex"
    >
      {/* iOS Drag Handle indicator on mobile */}
      <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 sm:hidden" />

      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <h3 id="favorites-title" className="font-bold text-base text-slate-900 dark:text-white">
              Tus Paradas Favoritas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {favorites.length} {favorites.length === 1 ? 'parada guardada' : 'paradas guardadas'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar favoritos"
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ios-press"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
        {favorites.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Star className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No tienes paradas favoritas
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Guarda paradas frecuentes tocando la estrella en cualquier ficha de parada para acceder rápidamente.
            </p>
          </div>
        ) : (
          favorites.map((fav) => {
            const isCurrent = fav.id === currentStopId;
            return (
              <div
                key={fav.id}
                onClick={() => {
                  onSelectStop(fav.id);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 group ios-press ${
                  isCurrent
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 flex flex-col items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <span className="text-[9px] uppercase tracking-wider opacity-75">Parada</span>
                    <span className="text-sm font-black">{fav.id}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {fav.name}
                      </h4>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                          Actual
                        </span>
                      )}
                    </div>
                    {fav.address && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {fav.address}
                      </p>
                    )}
                    {fav.lines && fav.lines.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {fav.lines.slice(0, 6).map((line) => (
                          <span
                            key={line}
                            className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded text-slate-600 dark:text-slate-300"
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
                    className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <span>Tus favoritos se sincronizan automáticamente</span>
        <button
          type="button"
          onClick={onClose}
          className="font-semibold text-blue-600 dark:text-blue-400"
        >
          Listo
        </button>
      </div>
    </dialog>
  );
};

import React from 'react';
import { Search, MapPin, Moon, Sun, Bus, Star } from 'lucide-react';
import type { FavoriteStop } from '../types/emt';

interface HeaderProps {
  onOpenSearch: () => void;
  onNearMe: () => void;
  onGoHome: () => void;
  isLocating: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  favorites: FavoriteStop[];
  currentStopId: string | null;
  onSelectStop: (stopId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onNearMe,
  onGoHome,
  isLocating,
  isDark,
  onToggleTheme,
  favorites,
  currentStopId,
  onSelectStop,
}) => {
  return (
    <header
      className="sticky top-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 pb-2.5 sm:pb-3">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <button
            type="button"
            onClick={onGoHome}
            title="Ir al inicio"
            className="flex items-center gap-2.5 shrink-0 text-left hover:opacity-85 transition-opacity cursor-pointer group ios-press"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                  Madrid<span className="text-blue-600 dark:text-blue-400">Transporte</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  PWA
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                Movilidad en tiempo real
              </span>
            </div>
          </button>

          {/* Desktop Search Trigger Button (Hidden on mobile because mobile uses the big landing search & bottom TabBar) */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden md:flex flex-1 max-w-md mx-3 items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700 transition-all text-sm group text-left cursor-pointer shadow-xs ios-press"
          >
            <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            <span className="truncate flex-1 text-sm">
              Buscar por parada, calle o línea...
            </span>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* Desktop Controls (Hidden on mobile to keep a clean, uncluttered native header) */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            {/* GPS Cerca de mí button */}
            <button
              type="button"
              onClick={onNearMe}
              disabled={isLocating}
              title="Buscar paradas cerca de mí"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer ios-press"
            >
              <MapPin
                className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${
                  isLocating ? 'animate-bounce text-emerald-500' : ''
                }`}
              />
              <span>{isLocating ? 'Buscando...' : 'Cerca de mí'}</span>
            </button>

            {/* Dark/Light mode toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer ios-press"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>

          {/* Mobile Right Action: Subtle Quick-Search icon button if the user is deep inside a stop view */}
          {currentStopId && (
            <div className="flex md:hidden items-center gap-1">
              <button
                type="button"
                onClick={onOpenSearch}
                aria-label="Buscar parada"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all active:scale-90"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Favorites Quick Access Row (on desktop/tablet only, mobile has the bottom TabBar tab) */}
        {favorites.length > 0 && (
          <div className="hidden sm:flex mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 items-center gap-2 overflow-x-auto no-scrollbar py-0.5 overscroll-contain">
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0 pr-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Favoritos:
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {favorites.map((fav) => {
                const isActive = fav.id === currentStopId;
                return (
                  <button
                    type="button"
                    key={fav.id}
                    onClick={() => onSelectStop(fav.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ios-press ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                    }`}
                  >
                    <span
                      className={`font-bold ${
                        isActive ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {fav.id}
                    </span>
                    <span className="truncate max-w-[130px]">{fav.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

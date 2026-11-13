import React from 'react';
import { Search, MapPin, Moon, Sun, Star } from 'lucide-react';
import type { FavoriteStop } from '../types/emt';
import type { FavoriteMetroStation } from '../types/metro';
import type { TransportMode } from '../types/transport';
import { TransportModeSelector } from './TransportModeSelector';
import { MadridTransitBrandMark, MetroDiamondMark } from './TransitIcons';

interface HeaderProps {
  onOpenSearch: () => void;
  onNearMe: () => void;
  onGoHome: () => void;
  isLocating: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  favorites: FavoriteStop[];
  metroFavorites?: FavoriteMetroStation[];
  currentStopId: string | null;
  currentMetroStationId?: string | null;
  onSelectStop: (stopId: string) => void;
  onSelectMetroStation?: (stationId: string) => void;
  transportMode?: TransportMode;
  onTransportModeChange?: (mode: TransportMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onNearMe,
  onGoHome,
  isLocating,
  isDark,
  onToggleTheme,
  favorites,
  metroFavorites = [],
  currentStopId,
  currentMetroStationId,
  onSelectStop,
  onSelectMetroStation,
  transportMode = 'all',
  onTransportModeChange,
}) => {
  const hasActiveItem = Boolean(currentStopId || currentMetroStationId);
  const totalFavorites = favorites.length + metroFavorites.length;

  return (
    <header
      className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#14161A]/95 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 transition-colors"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.7rem)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 pb-2.5 sm:pb-3">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <button
            type="button"
            onClick={onGoHome}
            title="Ir al inicio"
            aria-label="Ir al inicio"
            className="flex items-center gap-2.5 shrink-0 text-left hover:opacity-85 transition-opacity cursor-pointer group ios-press"
          >
            <MadridTransitBrandMark className="flex items-center gap-1 shrink-0 group-hover:scale-[1.03] transition-transform" />
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-950 dark:text-white">
                  Madrid<span className="text-[#E30613] dark:text-[#FF4D4D]">Metro</span>
                  <span className="text-zinc-400 font-medium mx-0.5">&amp;</span>
                  <span className="text-[#0072CE] dark:text-[#389BFF]">Bus</span>
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium hidden sm:inline">
                Tiempos en directo • Metro y EMT Madrid
              </span>
            </div>
          </button>

          {/* Mode Selector in Header for desktop */}
          {onTransportModeChange && (
            <div className="hidden lg:flex items-center">
              <TransportModeSelector
                mode={transportMode}
                onChange={onTransportModeChange}
                size="sm"
              />
            </div>
          )}

          {/* Desktop Search Trigger Button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden md:flex flex-1 max-w-md mx-2 items-center gap-2.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/70 transition-all text-sm group text-left cursor-pointer ios-press"
          >
            <Search className="w-4 h-4 text-zinc-400 group-hover:text-[#0072CE] dark:group-hover:text-[#389BFF] transition-colors" />
            <span className="truncate flex-1 text-sm">
              Buscar estación, parada, calle o línea...
            </span>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-400">
              ⌘K
            </kbd>
          </button>

          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* GPS Cerca de mí button */}
            <button
              type="button"
              onClick={onNearMe}
              disabled={isLocating}
              title="Buscar transportes cerca de mí"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0072CE]/10 hover:bg-[#0072CE]/15 dark:bg-[#0072CE]/20 dark:hover:bg-[#0072CE]/30 text-[#005AA3] dark:text-[#60B2FF] border border-[#0072CE]/20 dark:border-[#0072CE]/40 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer ios-press"
            >
              <MapPin
                className={`w-4 h-4 text-[#0072CE] dark:text-[#389BFF] ${
                  isLocating ? 'animate-spin text-emerald-500' : ''
                }`}
              />
              <span>{isLocating ? 'Buscando...' : 'Cerca de mí'}</span>
            </button>

            {/* Dark/Light mode toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="ios-touch-target min-w-[44px] min-h-[44px] p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 transition-all cursor-pointer ios-press"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700" />
              )}
            </button>
          </div>

          {/* Mobile Right Action: Quick-Search icon button */}
          {hasActiveItem && (
            <div className="flex md:hidden items-center gap-1">
              <button
                type="button"
                onClick={onOpenSearch}
                aria-label="Buscar parada o estación"
                className="ios-touch-target min-w-[40px] min-h-[40px] p-2 rounded-xl text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 transition-all active:scale-90 cursor-pointer ios-press"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Favorites Quick Access Row (desktop/tablet) */}
        {totalFavorites > 0 && (
          <div className="hidden sm:flex mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 items-center gap-2 overflow-x-auto no-scrollbar py-0.5 overscroll-contain">
            <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0 pr-1">
              <Star className="w-3 h-3 text-amber-500 fill-amber-400" /> Favoritos:
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {/* Metro Favorites */}
              {metroFavorites.map((fav) => {
                const isActive = fav.id === currentMetroStationId;
                return (
                  <button
                    type="button"
                    key={`hdr-metro-${fav.id}`}
                    onClick={() => onSelectMetroStation?.(fav.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ios-press ${
                      isActive
                        ? 'bg-[#E30613] text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-700'
                    }`}
                  >
                    <MetroDiamondMark className="w-4 h-3 shrink-0" />
                    <span className="truncate max-w-[130px]">{fav.name}</span>
                  </button>
                );
              })}

              {/* Bus Favorites */}
              {favorites.map((fav) => {
                const isActive = fav.id === currentStopId;
                return (
                  <button
                    type="button"
                    key={`hdr-bus-${fav.id}`}
                    onClick={() => onSelectStop(fav.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ios-press ${
                      isActive
                        ? 'bg-[#0072CE] text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-700'
                    }`}
                  >
                    <span
                      className={`font-bold tabular-nums ${
                        isActive ? 'text-blue-100' : 'text-[#0072CE] dark:text-[#389BFF]'
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

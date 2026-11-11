import React from 'react';
import { Bus, Train, Search, Navigation, Star, Moon, Sun } from 'lucide-react';

interface MobileTabBarProps {
  currentTab?: 'home' | 'search' | 'near' | 'favorites';
  onGoHome: () => void;
  onOpenSearch: () => void;
  onNearMe: () => void;
  onOpenFavorites: () => void;
  isLocating: boolean;
  favoritesCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
  hasActiveStop?: boolean;
  activeType?: 'bus' | 'metro' | null;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  onGoHome,
  onOpenSearch,
  onNearMe,
  onOpenFavorites,
  isLocating,
  favoritesCount,
  isDark,
  onToggleTheme,
  hasActiveStop = false,
  activeType = null,
}) => {
  const isMetroActive = activeType === 'metro';
  const isBusActive = activeType === 'bus' || (hasActiveStop && !isMetroActive);

  return (
    <nav
      aria-label="Navegación principal inferior"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800/80 transition-colors"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)',
        height: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex items-center justify-around h-14 px-2 max-w-md mx-auto">
        {/* Inicio Tab */}
        <button
          type="button"
          onClick={onGoHome}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all cursor-pointer min-h-[44px]"
        >
          <div className="relative">
            {isMetroActive ? (
              <Train className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            ) : (
              <Bus className={`w-5 h-5 ${isBusActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
            )}
          </div>
          <span
            className={`text-[10px] mt-0.5 font-medium ${
              isMetroActive
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : isBusActive
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : ''
            }`}
          >
            {isMetroActive ? 'Estación' : isBusActive ? 'Parada' : 'Inicio'}
          </span>
        </button>

        {/* Buscar Tab */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all cursor-pointer min-h-[44px]"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Buscar</span>
        </button>

        {/* Cerca de mí (GPS) Tab */}
        <button
          type="button"
          onClick={onNearMe}
          disabled={isLocating}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all cursor-pointer min-h-[44px] disabled:opacity-50"
        >
          <div className="relative">
            <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin text-emerald-500' : ''}`} />
          </div>
          <span className="text-[10px] mt-0.5 font-medium">
            {isLocating ? 'Buscando' : 'Cerca'}
          </span>
        </button>

        {/* Favoritos Tab */}
        <button
          type="button"
          onClick={onOpenFavorites}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all cursor-pointer min-h-[44px]"
        >
          <div className="relative">
            <Star className="w-5 h-5" />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-3.5 h-3.5 rounded-full bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center leading-none">
                {favoritesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-medium">Favoritos</span>
        </button>

        {/* Modo Oscuro / Claro Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all cursor-pointer min-h-[44px]"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          )}
          <span className="text-[10px] mt-0.5 font-medium">
            {isDark ? 'Claro' : 'Oscuro'}
          </span>
        </button>
      </div>
    </nav>
  );
};

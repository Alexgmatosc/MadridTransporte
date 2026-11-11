import React from 'react';
import { Bus, Train, Search, Navigation, Star, Moon, Sun } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

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

  const handlePress = (action: () => void) => {
    triggerHaptic('selection');
    action();
  };

  return (
    <nav
      aria-label="Navegación principal inferior"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden pb-safe bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800/80 transition-colors"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)',
        height: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))',
        backdropFilter: 'blur(24px) saturate(190%)',
        WebkitBackdropFilter: 'blur(24px) saturate(190%)',
      }}
    >
      <div className="flex items-center justify-around h-14 px-2 max-w-md mx-auto">
        {/* Inicio / Parada / Estación Tab */}
        <button
          type="button"
          onClick={() => handlePress(onGoHome)}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all cursor-pointer ios-touch-target min-w-[44px] min-h-[44px] ios-press"
        >
          <div className="relative">
            {isMetroActive ? (
              <Train className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            ) : (
              <Bus className={`w-5 h-5 ${isBusActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
            )}
          </div>
          <span
            className={`text-[11px] mt-0.5 font-medium leading-tight ${
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
          onClick={() => handlePress(onOpenSearch)}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all cursor-pointer ios-touch-target min-w-[44px] min-h-[44px] ios-press"
        >
          <Search className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 font-medium leading-tight">Buscar</span>
        </button>

        {/* Cerca de mí (GPS) Tab */}
        <button
          type="button"
          onClick={() => handlePress(onNearMe)}
          disabled={isLocating}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all cursor-pointer ios-touch-target min-w-[44px] min-h-[44px] ios-press disabled:opacity-50"
        >
          <div className="relative">
            <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin text-emerald-500' : ''}`} />
          </div>
          <span className="text-[11px] mt-0.5 font-medium leading-tight">
            {isLocating ? 'Buscando' : 'Cerca'}
          </span>
        </button>

        {/* Favoritos Tab */}
        <button
          type="button"
          onClick={() => handlePress(onOpenFavorites)}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all cursor-pointer ios-touch-target min-w-[44px] min-h-[44px] ios-press"
        >
          <div className="relative">
            <Star className="w-5 h-5" />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center leading-none tabular-nums">
                {favoritesCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 font-medium leading-tight">Favoritos</span>
        </button>

        {/* Modo Oscuro / Claro Toggle */}
        <button
          type="button"
          onClick={() => handlePress(onToggleTheme)}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all cursor-pointer ios-touch-target min-w-[44px] min-h-[44px] ios-press"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          )}
          <span className="text-[11px] mt-0.5 font-medium leading-tight">
            {isDark ? 'Claro' : 'Oscuro'}
          </span>
        </button>
      </div>
    </nav>
  );
};

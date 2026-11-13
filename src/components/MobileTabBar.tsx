import React from 'react';
import { Search, Navigation, Star, Moon, Sun, Home } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { MetroDiamondMark, EmtBusLogo } from './TransitIcons';

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
      className="fixed bottom-0 inset-x-0 z-40 md:hidden pb-safe bg-white/92 dark:bg-[#14161A]/94 backdrop-blur-2xl border-t border-zinc-200/80 dark:border-zinc-800/80 transition-colors"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)',
        height: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
    >
      <div className="flex items-center justify-around h-14 px-2 max-w-md mx-auto">
        {/* Inicio / Parada / Estación Tab */}
        <button
          type="button"
          onClick={() => handlePress(onGoHome)}
          className="flex-1 flex flex-col items-center justify-center py-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white active:scale-90 transition-all cursor-pointer ios-touch-target min-w-[44px] min-h-[44px] ios-press"
        >
          <div className="relative h-5 flex items-center justify-center">
            {isMetroActive ? (
              <MetroDiamondMark className="w-6 h-4.5" />
            ) : isBusActive ? (
              <EmtBusLogo className="w-5 h-5" />
            ) : (
              <Home className="w-5 h-5 text-zinc-900 dark:text-white" />
            )}
          </div>
          <span
            className={`text-[11px] mt-0.5 font-medium leading-tight ${
              isMetroActive
                ? 'text-[#E30613] dark:text-[#FF5A5A] font-bold'
                : isBusActive
                ? 'text-[#0072CE] dark:text-[#389BFF] font-bold'
                : 'text-zinc-900 dark:text-white font-semibold'
            }`}
          >
            {isMetroActive ? 'Estación' : isBusActive ? 'Parada' : 'Inicio'}
          </span>
        </button>

        {/* Buscar Tab */}
        <button
          type="button"
          onClick={() => handlePress(onOpenSearch)}
          className="flex-1 flex flex-col items-center justify-center py-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white active:scale-90 transition-all cursor-pointer ios-touch-target min-w-[44px] min-h-[44px] ios-press"
        >
          <Search className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 font-medium leading-tight">Buscar</span>
        </button>

        {/* Cerca de mí (GPS) Tab */}
        <button
          type="button"
          onClick={() => handlePress(onNearMe)}
          disabled={isLocating}
          className="flex-1 flex flex-col items-center justify-center py-1 text-zinc-500 dark:text-zinc-400 hover:text-[#0072CE] dark:hover:text-[#389BFF] active:scale-90 transition-all cursor-pointer ios-touch-target min-w-[44px] min-h-[44px] ios-press disabled:opacity-50"
        >
          <div className="relative">
            <Navigation
              className={`w-5 h-5 ${isLocating ? 'animate-spin text-emerald-500' : ''}`}
            />
          </div>
          <span className="text-[11px] mt-0.5 font-medium leading-tight">
            {isLocating ? 'Buscando' : 'Cerca'}
          </span>
        </button>

        {/* Favoritos Tab */}
        <button
          type="button"
          onClick={() => handlePress(onOpenFavorites)}
          className="flex-1 flex flex-col items-center justify-center py-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white active:scale-90 transition-all cursor-pointer ios-touch-target min-w-[44px] min-h-[44px] ios-press"
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
          className="flex-1 flex flex-col items-center justify-center py-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white active:scale-90 transition-all cursor-pointer ios-touch-target min-w-[44px] min-h-[44px] ios-press"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-zinc-600" />
          )}
          <span className="text-[11px] mt-0.5 font-medium leading-tight">
            {isDark ? 'Claro' : 'Oscuro'}
          </span>
        </button>
      </div>
    </nav>
  );
};

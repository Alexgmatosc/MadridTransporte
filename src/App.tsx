import React, { useState, useEffect, useCallback } from 'react';
import type { Stop, BusEstimate, StopEstimatesResponse, FavoriteStop } from './types/emt';
import { loadStops, getStopById, findNearestStops, type NearestStop } from './services/stopsService';
import { fetchStopEstimates } from './services/emtParser';
import {
  getFavorites,
  toggleFavorite,
  setLastVisitedStopId,
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from './services/storageService';
import { Header } from './components/Header';
import { StopHeader } from './components/StopHeader';
import { AutoRefreshBar } from './components/AutoRefreshBar';
import { BusMap } from './components/BusMap';
import { EstimatesList } from './components/EstimatesList';
import { SearchModal } from './components/SearchModal';
import { NearestStopsModal } from './components/NearestStopsModal';
import { FavoritesModal } from './components/FavoritesModal';
import { MobileTabBar } from './components/MobileTabBar';
import { HomeSearchLanding } from './components/HomeSearchLanding';

const REFRESH_INTERVAL_SECONDS = 30;

export const App: React.FC = () => {
  // Theme state
  const [, setTheme] = useState<ThemePreference>(() => getThemePreference());
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const pref = getThemePreference();
    if (pref === 'dark') return true;
    if (pref === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Data Loading & Current Stop (Start as null so user searches first!)
  const [stopsLoaded, setStopsLoaded] = useState(false);
  const [currentStopId, setCurrentStopId] = useState<string | null>(() => {
    // Only pre-fill if an explicit URL param or hash is passed
    const urlParams = new URLSearchParams(window.location.search);
    const stopParam = urlParams.get('stop') || window.location.hash.replace('#', '');
    return stopParam ? stopParam : null;
  });

  const [currentStop, setCurrentStop] = useState<Stop | null>(null);
  const [estimates, setEstimates] = useState<BusEstimate[]>([]);
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false);
  const [errorEstimates, setErrorEstimates] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Auto-refresh countdown state
  const [countdown, setCountdown] = useState<number>(REFRESH_INTERVAL_SECONDS);
  const [isAutoRefreshPaused, setIsAutoRefreshPaused] = useState(false);

  // UI state
  const [selectedLineFilter, setSelectedLineFilter] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<BusEstimate | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNearestOpen, setIsNearestOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [nearestStops, setNearestStops] = useState<NearestStop[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [favorites, setFavorites] = useState<FavoriteStop[]>(() => getFavorites());

  // Apply dark class to documentElement
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    const nextPref: ThemePreference = nextDark ? 'dark' : 'light';
    setTheme(nextPref);
    setThemePreference(nextPref);
  };

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Initial stops dataset load
  useEffect(() => {
    loadStops()
      .then((stops) => {
        setStopsLoaded(true);
        if (currentStopId) {
          const found = stops.find((s) => s.id === currentStopId);
          if (found) {
            setCurrentStop(found);
          }
        }
      })
      .catch((err) => {
        console.error('Error loading stops:', err);
      });
  }, []);

  // Sync currentStop whenever currentStopId or stopsLoaded changes
  useEffect(() => {
    if (!stopsLoaded) return;
    if (!currentStopId) {
      setCurrentStop(null);
      setEstimates([]);
      setErrorEstimates(null);
      const url = new URL(window.location.href);
      url.searchParams.delete('stop');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      return;
    }

    const found = getStopById(currentStopId);
    if (found) {
      setCurrentStop(found);
      setLastVisitedStopId(found.id);
      // Update URL search param without reloading
      const url = new URL(window.location.href);
      url.searchParams.set('stop', found.id);
      window.history.replaceState({}, '', url.toString());
    } else {
      // Create minimal stop info if not in dataset
      setCurrentStop({
        id: currentStopId,
        name: `Parada ${currentStopId}`,
        address: 'Madrid',
        lat: 40.4168,
        lon: -3.7038,
        lines: [],
      });
    }
  }, [currentStopId, stopsLoaded]);

  // Fetch estimates callback
  const loadEstimates = useCallback(
    async (stopId: string) => {
      setIsLoadingEstimates(true);
      setErrorEstimates(null);
      try {
        const res: StopEstimatesResponse = await fetchStopEstimates(stopId);
        setEstimates(res.estimates);
        setLastUpdated(res.timestamp);
        if (res.error) {
          setErrorEstimates(res.error);
        }
        // If stop name or address returned from PMV is fresher, enrich stop
        if (res.stopName && (!currentStop || !currentStop.lines.length)) {
          setCurrentStop((prev) =>
            prev
              ? {
                  ...prev,
                  name: res.stopName || prev.name,
                  address: res.address || prev.address,
                }
              : null
          );
        }
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Error desconocido al conectar con EMT Madrid.';
        setErrorEstimates(errorMsg);
      } finally {
        setIsLoadingEstimates(false);
      }
    },
    [currentStop]
  );

  // Fetch estimates when currentStopId changes
  useEffect(() => {
    if (!currentStopId) return;
    setSelectedLineFilter(null);
    setSelectedBus(null);
    setCountdown(REFRESH_INTERVAL_SECONDS);
    loadEstimates(currentStopId);
  }, [currentStopId, loadEstimates]);

  // Auto-refresh timer loop
  useEffect(() => {
    if (!currentStopId) return;
    const timer = setInterval(() => {
      if (isAutoRefreshPaused || isLoadingEstimates) {
        return;
      }

      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger refresh
          loadEstimates(currentStopId);
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoRefreshPaused, isLoadingEstimates, currentStopId, loadEstimates]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    if (!currentStopId) return;
    setCountdown(REFRESH_INTERVAL_SECONDS);
    loadEstimates(currentStopId);
  };

  // Toggle favorite
  const handleToggleFavorite = () => {
    if (!currentStop) return;
    const { favorites: updated } = toggleFavorite(currentStop);
    setFavorites(updated);
  };

  const handleRemoveFavorite = (stopId: string) => {
    const found = favorites.find((f) => f.id === stopId);
    if (found) {
      const { favorites: updated } = toggleFavorite({
        id: stopId,
        name: found.name,
        address: found.address || '',
        lines: found.lines || [],
      });
      setFavorites(updated);
    }
  };

  const isCurrentFav = favorites.some((f) => f.id === currentStopId);

  // Select stop from search, modal, or pill
  const handleSelectStop = (stopId: string) => {
    setCurrentStopId(stopId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear current stop and return to the search landing
  const handleGoHome = () => {
    setCurrentStopId(null);
    setCurrentStop(null);
    setEstimates([]);
    setErrorEstimates(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('stop');
    window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Locate User (GPS)
  const handleNearMe = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada por su navegador.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lon: longitude });

        const nearest = findNearestStops(latitude, longitude, 25);
        setNearestStops(nearest);
        setIsNearestOpen(true);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert(
          'No se pudo obtener tu ubicación. Por favor, asegúrate de haber concedido permisos de ubicación.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors overscroll-none">
      {/* Top Header */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onNearMe={handleNearMe}
        onGoHome={handleGoHome}
        isLocating={isLocating}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        favorites={favorites}
        currentStopId={currentStopId}
        onSelectStop={handleSelectStop}
      />

      {/* Main Content Area: pb-24 on mobile gives breathing room for bottom tab bar */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4 sm:py-6 pb-24 md:pb-8 flex flex-col gap-4">
        {!currentStopId ? (
          /* Search & Discovery Landing when no stop is selected */
          <HomeSearchLanding
            onSelectStop={handleSelectStop}
            onNearMe={handleNearMe}
            isLocating={isLocating}
            favorites={favorites}
            userLocation={userLocation}
          />
        ) : (
          /* Real-time Stop Details, Live Map & Estimations */
          <>
            {/* Stop Header */}
            {currentStop ? (
              <StopHeader
                stop={currentStop}
                isFav={isCurrentFav}
                onToggleFavorite={handleToggleFavorite}
                selectedLineFilter={selectedLineFilter}
                onSelectLineFilter={setSelectedLineFilter}
                onBackToSearch={handleGoHome}
              />
            ) : (
              <div className="h-28 bg-white dark:bg-slate-900 rounded-2xl animate-pulse" />
            )}

            {/* Auto Refresh Bar */}
            <AutoRefreshBar
              countdown={countdown}
              maxCountdown={REFRESH_INTERVAL_SECONDS}
              isLoading={isLoadingEstimates}
              isPaused={isAutoRefreshPaused}
              onRefresh={handleManualRefresh}
              onTogglePause={() => setIsAutoRefreshPaused((prev) => !prev)}
              lastUpdated={lastUpdated}
            />

            {/* Grid layout: Map & Estimates */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Map Column */}
              {currentStop && (
                <div className="lg:col-span-5 order-2 lg:order-1">
                  <div className="sticky top-20 flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Mapa de la parada y autobuses
                      </span>
                    </div>
                    <BusMap
                      stop={currentStop}
                      estimates={estimates}
                      userLocation={userLocation}
                      selectedBus={selectedBus}
                      onClearSelectedBus={() => setSelectedBus(null)}
                      isDark={isDark}
                    />
                  </div>
                </div>
              )}

              {/* Estimates List Column */}
              <div
                className={`${
                  currentStop ? 'lg:col-span-7' : 'col-span-12'
                } order-1 lg:order-2 flex flex-col gap-4`}
              >
                <EstimatesList
                  estimates={estimates}
                  isLoading={isLoadingEstimates}
                  error={errorEstimates}
                  onRefresh={handleManualRefresh}
                  selectedLineFilter={selectedLineFilter}
                  onSelectBusOnMap={(bus) => {
                    setSelectedBus(bus);
                    // Scroll up smoothly if on mobile
                    if (window.innerWidth < 1024) {
                      window.scrollTo({ top: 320, behavior: 'smooth' });
                    }
                  }}
                  selectedBus={selectedBus}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer on desktop */}
      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 pb-20 md:pb-6">
        <p>
          Datos oficiales en tiempo real de{' '}
          <a
            href="https://www.emtmadrid.es"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            EMT Madrid
          </a>{' '}
          • Open Data & PMV
        </p>
        <p className="mt-1">PWA moderna adaptada para iPhone y navegación nativa.</p>
      </footer>

      {/* Mobile iOS Tab Bar */}
      <MobileTabBar
        currentTab={currentStopId ? 'home' : 'search'}
        onGoHome={handleGoHome}
        onOpenSearch={() => setIsSearchOpen(true)}
        onNearMe={handleNearMe}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        isLocating={isLocating}
        favoritesCount={favorites.length}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        hasActiveStop={Boolean(currentStopId)}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStop={handleSelectStop}
        userLocation={userLocation}
      />

      {/* Nearest Stops (GPS) Modal */}
      <NearestStopsModal
        isOpen={isNearestOpen}
        onClose={() => setIsNearestOpen(false)}
        stops={nearestStops}
        onSelectStop={handleSelectStop}
      />

      {/* Favorites Modal for Mobile */}
      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favorites}
        onSelectStop={handleSelectStop}
        onRemoveFavorite={handleRemoveFavorite}
        currentStopId={currentStopId}
      />
    </div>
  );
};

export default App;

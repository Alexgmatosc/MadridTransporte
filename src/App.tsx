import React, { useState, useEffect, useCallback } from 'react';
import type { Stop, BusEstimate, StopEstimatesResponse, FavoriteStop } from './types/emt';
import type { MetroStation, FavoriteMetroStation } from './types/metro';
import type { TransportMode } from './types/transport';
import { loadStops, getStopById, findNearestStops, type NearestStop } from './services/stopsService';
import {
  loadMetroStations,
  getMetroStationByCode,
  findNearestMetroStations,
  type NearestMetroStation,
} from './services/metroService';
import { fetchStopEstimates } from './services/emtParser';
import {
  getFavorites,
  toggleFavorite,
  setLastVisitedStopId,
  getFavoriteMetroStations,
  toggleFavoriteMetroStation,
  removeFavoriteMetroStation,
  setLastVisitedMetroStationId,
  getTransportModePreference,
  setTransportModePreference,
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
import { MetroStationView } from './components/MetroStationView';
import { BottomSheet, type SnapPoint } from './components/BottomSheet';

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

  // Transport mode state ('all' | 'bus' | 'metro')
  const [transportMode, setTransportMode] = useState<TransportMode>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const modeParam = urlParams.get('mode') as TransportMode;
      if (modeParam === 'all' || modeParam === 'bus' || modeParam === 'metro') {
        return modeParam;
      }
    }
    return getTransportModePreference();
  });

  // Datasets loaded state
  const [stopsLoaded, setStopsLoaded] = useState(false);
  const [metroStationsLoaded, setMetroStationsLoaded] = useState(false);

  // Active item IDs (from URL param or hash)
  const [currentStopId, setCurrentStopId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const stopParam = urlParams.get('stop') || window.location.hash.replace('#', '');
    return stopParam || null;
  });

  const [currentMetroStationId, setCurrentMetroStationId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const metroParam = urlParams.get('metro');
    return metroParam || null;
  });

  // Entity objects
  const [currentStop, setCurrentStop] = useState<Stop | null>(null);
  const [currentMetroStation, setCurrentMetroStation] = useState<MetroStation | null>(null);

  // Bus estimates state
  const [estimates, setEstimates] = useState<BusEstimate[]>([]);
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false);
  const [errorEstimates, setErrorEstimates] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Auto-refresh countdown for Bus view
  const [countdown, setCountdown] = useState<number>(REFRESH_INTERVAL_SECONDS);
  const [isAutoRefreshPaused, setIsAutoRefreshPaused] = useState(false);

  // UI state
  const [selectedLineFilter, setSelectedLineFilter] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<BusEstimate | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SnapPoint>('half');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNearestOpen, setIsNearestOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [nearestStops, setNearestStops] = useState<NearestStop[]>([]);
  const [nearestMetroStations, setNearestMetroStations] = useState<NearestMetroStation[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Favorites
  const [favorites, setFavorites] = useState<FavoriteStop[]>(() => getFavorites());
  const [metroFavorites, setMetroFavorites] = useState<FavoriteMetroStation[]>(() =>
    getFavoriteMetroStations()
  );

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

  const handleTransportModeChange = (newMode: TransportMode) => {
    setTransportMode(newMode);
    setTransportModePreference(newMode);
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

  // 0. Listen to browser history navigation (back/forward popstate)
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const stopParam = urlParams.get('stop') || window.location.hash.replace('#', '');
      const metroParam = urlParams.get('metro');
      setCurrentStopId(stopParam || null);
      setCurrentMetroStationId(metroParam || null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Initial datasets load
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

    loadMetroStations()
      .then(() => {
        setMetroStationsLoaded(true);
        if (currentMetroStationId) {
          getMetroStationByCode(currentMetroStationId).then((found) => {
            if (found) {
              setCurrentMetroStation(found);
            }
          });
        }
      })
      .catch((err) => {
        console.error('Error loading metro stations:', err);
      });
  }, []);

  // 2. Sync Bus stop state with URL
  useEffect(() => {
    if (!stopsLoaded) return;
    if (!currentStopId) {
      setCurrentStop(null);
      setEstimates([]);
      setErrorEstimates(null);
      return;
    }

    const found = getStopById(currentStopId);
    if (found) {
      setCurrentStop(found);
      setLastVisitedStopId(found.id);
      const url = new URL(window.location.href);
      url.searchParams.set('stop', found.id);
      url.searchParams.delete('metro');
      window.history.replaceState({}, '', url.toString());
    } else {
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

  // 3. Sync Metro station state with URL
  useEffect(() => {
    if (!metroStationsLoaded) return;
    if (!currentMetroStationId) {
      setCurrentMetroStation(null);
      return;
    }

    getMetroStationByCode(currentMetroStationId).then((found) => {
      if (found) {
        setCurrentMetroStation(found);
        setLastVisitedMetroStationId(found.id);
        const url = new URL(window.location.href);
        url.searchParams.set('metro', found.id);
        url.searchParams.delete('stop');
        window.history.replaceState({}, '', url.toString());
      }
    });
  }, [currentMetroStationId, metroStationsLoaded]);

  // Fetch Bus estimates callback
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
        if (res.stopName && (!currentStop || !currentStop.lines.length)) {
          setCurrentStop((prev) => {
            if (!prev) return null;
            const newName = res.stopName || prev.name;
            const newAddress = res.address || prev.address;
            if (prev.name === newName && prev.address === newAddress) {
              return prev;
            }
            return {
              ...prev,
              name: newName,
              address: newAddress,
            };
          });
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

  // Auto-refresh timer loop for Bus view
  useEffect(() => {
    if (!currentStopId) return;
    const timer = setInterval(() => {
      if (isAutoRefreshPaused || isLoadingEstimates) {
        return;
      }

      setCountdown((prev) => {
        if (prev <= 1) {
          loadEstimates(currentStopId);
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoRefreshPaused, isLoadingEstimates, currentStopId, loadEstimates]);

  const handleManualRefresh = () => {
    if (!currentStopId) return;
    setCountdown(REFRESH_INTERVAL_SECONDS);
    loadEstimates(currentStopId);
  };

  // Bus Favorites Handlers
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

  // Metro Favorites Handlers
  const handleToggleMetroFavorite = () => {
    if (!currentMetroStation) return;
    const { favorites: updated } = toggleFavoriteMetroStation(currentMetroStation);
    setMetroFavorites(updated);
  };

  const handleRemoveMetroFavorite = (stationId: string) => {
    const updated = removeFavoriteMetroStation(stationId);
    setMetroFavorites(updated);
  };

  const isCurrentBusFav = favorites.some((f) => f.id === currentStopId);
  const isCurrentMetroFav = metroFavorites.some((f) => f.id === currentMetroStationId);

  // Select Bus Stop
  const handleSelectStop = (stopId: string) => {
    setCurrentMetroStationId(null);
    setCurrentMetroStation(null);
    setSheetSnap('half');
    setCurrentStopId(stopId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Select Metro Station
  const handleSelectMetroStation = (stationId: string) => {
    setCurrentStopId(null);
    setCurrentStop(null);
    setEstimates([]);
    setErrorEstimates(null);
    setSheetSnap('half');
    setCurrentMetroStationId(stationId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear selection & Return to search landing
  const handleGoHome = () => {
    setCurrentStopId(null);
    setCurrentStop(null);
    setCurrentMetroStationId(null);
    setCurrentMetroStation(null);
    setEstimates([]);
    setErrorEstimates(null);
    setSheetSnap('half');

    const url = new URL(window.location.href);
    url.searchParams.delete('stop');
    url.searchParams.delete('metro');
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
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lon: longitude });

        const nearestBuses = findNearestStops(latitude, longitude, 25);
        const nearestMetros = await findNearestMetroStations(latitude, longitude, 25);

        setNearestStops(nearestBuses);
        setNearestMetroStations(nearestMetros);
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

  const hasActiveItem = Boolean(currentStopId || currentMetroStationId);
  const activeType: 'bus' | 'metro' | null = currentMetroStationId
    ? 'metro'
    : currentStopId
    ? 'bus'
    : null;

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors overscroll-none">
      {/* Top Header */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onNearMe={handleNearMe}
        onGoHome={handleGoHome}
        isLocating={isLocating}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        favorites={favorites}
        metroFavorites={metroFavorites}
        currentStopId={currentStopId}
        currentMetroStationId={currentMetroStationId}
        onSelectStop={handleSelectStop}
        onSelectMetroStation={handleSelectMetroStation}
        transportMode={transportMode}
        onTransportModeChange={handleTransportModeChange}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4 sm:py-6 pb-24 md:pb-8 flex flex-col gap-4">
        {!hasActiveItem ? (
          /* Search & Discovery Landing when no stop/station is selected */
          <HomeSearchLanding
            onSelectStop={handleSelectStop}
            onSelectMetroStation={handleSelectMetroStation}
            onNearMe={handleNearMe}
            isLocating={isLocating}
            favorites={favorites}
            metroFavorites={metroFavorites}
            userLocation={userLocation}
            transportMode={transportMode}
            onTransportModeChange={handleTransportModeChange}
          />
        ) : currentMetroStationId ? (
          /* Metro Station View & Spatial Map + BottomSheet */
          <>
            {currentMetroStation ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Spatial Map Canvas (Full-bleed on iPhone/mobile, sticky card on desktop) */}
                <div className="lg:col-span-5 order-2 lg:order-1 max-lg:fixed max-lg:inset-x-0 max-lg:top-[56px] max-lg:bottom-[60px] max-lg:z-10">
                  <div className="lg:sticky lg:top-20 flex flex-col gap-2 w-full h-full">
                    <BusMap
                      metroStation={currentMetroStation}
                      userLocation={userLocation}
                      isDark={isDark}
                      className="max-lg:w-full max-lg:h-full max-lg:rounded-none max-lg:border-0 relative w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md"
                    />
                  </div>
                </div>

                {/* Metro Station Details inside interactive BottomSheet on mobile / right column on desktop */}
                <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-4">
                  <BottomSheet snap={sheetSnap} onSnapChange={setSheetSnap}>
                    <MetroStationView
                      station={currentMetroStation}
                      isFav={isCurrentMetroFav}
                      onToggleFavorite={handleToggleMetroFavorite}
                      onBackToSearch={handleGoHome}
                      onSelectStation={handleSelectMetroStation}
                      isDark={isDark}
                    />
                  </BottomSheet>
                </div>
              </div>
            ) : (
              <div className="h-48 bg-white dark:bg-slate-900 rounded-2xl animate-pulse" />
            )}
          </>
        ) : (
          /* EMT Bus Stop View & Spatial Map + BottomSheet */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Spatial Map Canvas (Full-bleed on iPhone/mobile, sticky card on desktop) */}
            {currentStop && (
              <div className="lg:col-span-5 order-2 lg:order-1 max-lg:fixed max-lg:inset-x-0 max-lg:top-[56px] max-lg:bottom-[60px] max-lg:z-10">
                <div className="lg:sticky lg:top-20 flex flex-col gap-2 w-full h-full">
                  <div className="hidden lg:flex items-center justify-between px-1">
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
                    className="max-lg:w-full max-lg:h-full max-lg:rounded-none max-lg:border-0 relative w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md"
                  />
                </div>
              </div>
            )}

            {/* Bus Stop Details inside interactive BottomSheet on mobile / right column on desktop */}
            <div
              className={`${
                currentStop ? 'lg:col-span-7' : 'col-span-12'
              } order-1 lg:order-2 flex flex-col gap-4`}
            >
              <BottomSheet snap={sheetSnap} onSnapChange={setSheetSnap}>
                {currentStop ? (
                  <StopHeader
                    stop={currentStop}
                    isFav={isCurrentBusFav}
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

                {/* Estimates List */}
                <EstimatesList
                  estimates={estimates}
                  isLoading={isLoadingEstimates}
                  error={errorEstimates}
                  onRefresh={handleManualRefresh}
                  selectedLineFilter={selectedLineFilter}
                  onSelectBusOnMap={(bus) => {
                    setSelectedBus(bus);
                    setSheetSnap('peek');
                  }}
                  selectedBus={selectedBus}
                />
              </BottomSheet>
            </div>
          </div>
        )}
      </main>

      {/* Footer on desktop */}
      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 pb-20 md:pb-6">
        <p>
          Datos oficiales en tiempo real de{' '}
          <a
            href="https://www.metromadrid.es"
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-600 dark:text-rose-400 font-semibold hover:underline"
          >
            Metro de Madrid
          </a>{' '}
          y{' '}
          <a
            href="https://www.emtmadrid.es"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            EMT Madrid
          </a>
        </p>
        <p className="mt-1">PWA moderna de movilidad multimodal para Madrid.</p>
      </footer>

      {/* Mobile iOS Tab Bar */}
      <MobileTabBar
        currentTab={hasActiveItem ? 'home' : 'search'}
        onGoHome={handleGoHome}
        onOpenSearch={() => setIsSearchOpen(true)}
        onNearMe={handleNearMe}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        isLocating={isLocating}
        favoritesCount={favorites.length + metroFavorites.length}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        hasActiveStop={hasActiveItem}
        activeType={activeType}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStop={handleSelectStop}
        onSelectMetroStation={handleSelectMetroStation}
        userLocation={userLocation}
        activeMode={transportMode}
      />

      {/* Nearest Stops (GPS) Modal */}
      <NearestStopsModal
        isOpen={isNearestOpen}
        onClose={() => setIsNearestOpen(false)}
        stops={nearestStops}
        metroStations={nearestMetroStations}
        onSelectStop={handleSelectStop}
        onSelectMetroStation={handleSelectMetroStation}
      />

      {/* Favorites Modal for Mobile */}
      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favorites}
        metroFavorites={metroFavorites}
        onSelectStop={handleSelectStop}
        onSelectMetroStation={handleSelectMetroStation}
        onRemoveFavorite={handleRemoveFavorite}
        onRemoveMetroFavorite={handleRemoveMetroFavorite}
        currentStopId={currentStopId}
        currentMetroStationId={currentMetroStationId}
      />
    </div>
  );
};

export default App;

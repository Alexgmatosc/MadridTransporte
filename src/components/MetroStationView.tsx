import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star,
  Share2,
  Check,
  ArrowLeft,
  Train,
  AlertCircle,
  Clock,
  Compass,
} from 'lucide-react';
import type { MetroStation, MetroPlatformEstimate } from '../types/metro';
import { fetchMetroEstimates } from '../services/metroApi';
import { formatMetroLineBadge, getMetroLine } from '../data/metroLines';
import { AutoRefreshBar } from './AutoRefreshBar';

export interface MetroStationViewProps {
  station: MetroStation;
  isFav: boolean;
  onToggleFavorite: () => void;
  onBackToSearch?: () => void;
  onSelectStation?: (stationId: string) => void;
  isDark?: boolean;
}

const REFRESH_INTERVAL_SECONDS = 30;

export const MetroStationView: React.FC<MetroStationViewProps> = ({
  station,
  isFav,
  onToggleFavorite,
  onBackToSearch,
}) => {
  const [estimates, setEstimates] = useState<MetroPlatformEstimate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Auto-refresh countdown & pause
  const [countdown, setCountdown] = useState<number>(REFRESH_INTERVAL_SECONDS);
  const [isPaused, setIsPaused] = useState(false);

  // Filter by line for multi-line stations
  const [selectedLineFilter, setSelectedLineFilter] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch estimates
  const loadEstimates = useCallback(
    async (code: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchMetroEstimates(code);
        setEstimates(res.estimates);
        setLastUpdated(res.timestamp);
        if (res.error) {
          setError(res.error);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Error al conectar con el servicio de Metro de Madrid.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Initial load when station.id changes
  useEffect(() => {
    setSelectedLineFilter(null);
    setCountdown(REFRESH_INTERVAL_SECONDS);
    loadEstimates(station.id);
  }, [station.id, loadEstimates]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became active again: immediately refresh
        setCountdown(REFRESH_INTERVAL_SECONDS);
        loadEstimates(station.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [station.id, loadEstimates]);

  // 30-second Countdown loop
  useEffect(() => {
    const timer = setInterval(() => {
      // If document is hidden or user paused or currently loading, skip countdown tick
      if (document.visibilityState === 'hidden' || isPaused || isLoading) {
        return;
      }

      setCountdown((prev) => {
        if (prev <= 1) {
          loadEstimates(station.id);
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isLoading, station.id, loadEstimates]);

  const handleManualRefresh = () => {
    setCountdown(REFRESH_INTERVAL_SECONDS);
    loadEstimates(station.id);
  };

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('metro', station.id);
    const shareUrl = url.toString();
    const shareText = `Estación Metro de Madrid: ${station.name} (Líneas: ${station.lines.join(
      ', '
    )})`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${station.name} - Metro de Madrid`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Filter estimates by line if user tapped a specific line filter
  const filteredEstimates = useMemo(() => {
    if (!selectedLineFilter) return estimates;
    return estimates.filter((e) => e.line === selectedLineFilter);
  }, [estimates, selectedLineFilter]);

  // Group estimates by Line -> Platform
  const groupedByLine = useMemo(() => {
    const map = new Map<string, MetroPlatformEstimate[]>();

    // First collect all available lines from station.lines or estimates
    filteredEstimates.forEach((est) => {
      const lineKey = est.line;
      if (!map.has(lineKey)) {
        map.set(lineKey, []);
      }
      map.get(lineKey)!.push(est);
    });

    // Sort platforms within each line (anden 1 first, then anden 2)
    map.forEach((platformEstimates) => {
      platformEstimates.sort((a, b) => a.platform - b.platform);
    });

    return map;
  }, [filteredEstimates]);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Station Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        {onBackToSearch && (
          <div className="mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <button
              onClick={onBackToSearch}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Volver al buscador</span>
            </button>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Metro de Madrid
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Metro Rhombus Badge */}
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-red-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/25 border border-rose-400/40">
              <Train className="w-6 h-6" />
              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-blue-900 text-white font-black text-[9px] rounded-md border border-white/60">
                M
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {station.name}
                </h2>
                {station.zone && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Zona {station.zone}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {station.address || 'Red de Metro de Madrid'}
              </p>

              {/* Station Lines Badges */}
              {station.lines && station.lines.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1">
                    Líneas:
                  </span>
                  {station.lines.map((lineId) => {
                    const badge = formatMetroLineBadge(lineId);
                    const isSelected = selectedLineFilter === lineId;
                    return (
                      <button
                        key={lineId}
                        type="button"
                        onClick={() =>
                          setSelectedLineFilter((prev) => (prev === lineId ? null : lineId))
                        }
                        title={`Filtrar por Línea ${lineId}`}
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          borderColor: badge.border || 'transparent',
                        }}
                        className={`px-2 py-0.5 rounded-lg text-xs font-black shadow-xs transition-transform cursor-pointer border ${
                          isSelected ? 'ring-2 ring-slate-900 dark:ring-white scale-105' : 'hover:scale-105'
                        }`}
                      >
                        {badge.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* Favorite toggle */}
            <button
              type="button"
              onClick={onToggleFavorite}
              title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ios-press ${
                isFav
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Star
                className={`w-4 h-4 ${
                  isFav ? 'fill-amber-400 text-amber-500' : 'text-slate-400'
                }`}
              />
              <span>{isFav ? 'Favorita' : 'Guardar'}</span>
            </button>

            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              title="Compartir estación"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer ios-press"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-slate-400" />
                  <span>Compartir</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Multi-line filter pills bar if station has > 1 line */}
        {station.lines && station.lines.length > 1 && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedLineFilter(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedLineFilter === null
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todas las líneas ({station.lines.length})
            </button>
            {station.lines.map((lineId) => {
              const badge = formatMetroLineBadge(lineId);
              const isSelected = selectedLineFilter === lineId;
              return (
                <button
                  key={lineId}
                  type="button"
                  onClick={() => setSelectedLineFilter(lineId)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-slate-900 dark:ring-white bg-slate-100 dark:bg-slate-800'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.text,
                      borderColor: badge.border || 'transparent',
                    }}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border"
                  >
                    {badge.label}
                  </span>
                  <span>Línea {badge.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Auto Refresh Bar with 30s Countdown */}
      <AutoRefreshBar
        countdown={countdown}
        maxCountdown={REFRESH_INTERVAL_SECONDS}
        isLoading={isLoading}
        isPaused={isPaused}
        onRefresh={handleManualRefresh}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        lastUpdated={lastUpdated}
      />

      {/* Error state alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Aviso del servicio: </span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Stale data warning */}
      {estimates.some((e) => e.isStale) && (
        <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Aviso de teleindicadores: Las previsiones de Metro recibidas tienen más de 20 minutos de antigüedad.
          </span>
        </div>
      )}

      {/* Live Arrivals Grouped by Line & Platform */}
      {isLoading && estimates.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse p-4"
            />
          ))}
        </div>
      ) : groupedByLine.size === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center">
          <Train className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            Sin estimaciones en este momento
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            El servicio de teleindicadores no reporta trenes en directo en esta estación ahora mismo (comprueba si la red está en horario de servicio de 06:00 a 01:30).
          </p>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="mt-4 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Reintentar actualización
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {Array.from(groupedByLine.entries()).map(([lineKey, lineEstimates]) => {
            const badge = formatMetroLineBadge(lineKey);
            const lineConfig = getMetroLine(lineKey);

            return (
              <div
                key={lineKey}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs"
              >
                {/* Line Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.text,
                        borderColor: badge.border || 'transparent',
                      }}
                      className="px-2.5 py-0.5 rounded-lg text-sm font-black border shadow-xs"
                    >
                      {badge.label}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        {lineConfig ? lineConfig.name : `Línea ${badge.label}`}
                      </h3>
                      {lineConfig?.origin && lineConfig?.destination && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          {lineConfig.origin} ↔ {lineConfig.destination}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {lineEstimates.length}{' '}
                    {lineEstimates.length === 1 ? 'andén' : 'andenes'}
                  </span>
                </div>

                {/* Platform Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lineEstimates.map((est, idx) => {
                    const isArriving = est.proximoMinutes === 0 || est.eta === 'Llegando';
                    const hasSecondTrain =
                      est.siguienteMinutes !== null &&
                      est.siguienteMinutes !== undefined &&
                      est.siguienteMinutes > 0;

                    return (
                      <div
                        key={`${est.line}-${est.platform}-${idx}`}
                        className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                          isArriving
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80'
                        }`}
                      >
                        {/* Top: Platform & Direction */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <Compass className="w-3 h-3 text-slate-400" />
                              Andén {est.platform}
                            </span>

                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="text-xs text-slate-400 font-medium">Hacia:</span>
                              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                {est.destination || 'Fin de línea'}
                              </span>
                            </div>
                          </div>

                          {/* Primary ETA Badge */}
                          <div className="text-right shrink-0">
                            <div
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-sm sm:text-base shadow-xs tabular-nums ${
                                isArriving
                                  ? 'bg-emerald-600 text-white'
                                  : est.proximoMinutes !== null
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {isArriving && (
                                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                              )}
                              <span>{est.eta}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Secondary Train & Time */}
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 tabular-nums">
                          <div className="flex items-center gap-1.5">
                            {hasSecondTrain ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                Sig. tren: <strong className="text-slate-900 dark:text-white">{est.siguienteMinutes} min</strong>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">
                                Siguiente tren sin estimación
                              </span>
                            )}
                          </div>

                          {est.timestamp && (
                            <span
                              title={
                                est.isStale
                                  ? 'Aviso: Previsión de Metro con más de 20 minutos de antigüedad'
                                  : undefined
                              }
                              className={`text-[10px] font-mono tabular-nums inline-flex items-center gap-1 ${
                                est.isStale
                                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                                  : 'text-slate-400'
                              }`}
                            >
                              <span>
                                {new Date(est.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {est.isStale && <span className="text-[9px]">(antiguo)</span>}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

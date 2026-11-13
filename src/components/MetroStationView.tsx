import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star,
  Share2,
  Check,
  ArrowLeft,
  AlertCircle,
  Clock,
  Compass,
} from 'lucide-react';
import type { MetroStation, MetroPlatformEstimate } from '../types/metro';
import { fetchMetroEstimates } from '../services/metroApi';
import { formatMetroLineBadge, getMetroLine } from '../data/metroLines';
import { AutoRefreshBar } from './AutoRefreshBar';
import { MetroDiamondLogo } from './TransitIcons';
import { triggerHaptic } from '../utils/haptics';

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

  const [countdown, setCountdown] = useState<number>(REFRESH_INTERVAL_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedLineFilter, setSelectedLineFilter] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadEstimates = useCallback(async (code: string) => {
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
  }, []);

  useEffect(() => {
    setSelectedLineFilter(null);
    setCountdown(REFRESH_INTERVAL_SECONDS);
    loadEstimates(station.id);
  }, [station.id, loadEstimates]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setCountdown(REFRESH_INTERVAL_SECONDS);
        loadEstimates(station.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [station.id, loadEstimates]);

  useEffect(() => {
    const timer = setInterval(() => {
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
    triggerHaptic('selection');
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
        // Fallback
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

  const filteredEstimates = useMemo(() => {
    if (!selectedLineFilter) return estimates;
    return estimates.filter((e) => e.line === selectedLineFilter);
  }, [estimates, selectedLineFilter]);

  const groupedByLine = useMemo(() => {
    const map = new Map<string, MetroPlatformEstimate[]>();

    filteredEstimates.forEach((est) => {
      const lineKey = est.line;
      if (!map.has(lineKey)) {
        map.set(lineKey, []);
      }
      map.get(lineKey)!.push(est);
    });

    map.forEach((platformEstimates) => {
      platformEstimates.sort((a, b) => a.platform - b.platform);
    });

    return map;
  }, [filteredEstimates]);

  return (
    <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
      {/* Station Header Card */}
      <div className="bg-white dark:bg-[#14161A] rounded-2xl p-4 sm:p-5 border border-zinc-200/90 dark:border-zinc-800/90 transition-colors">
        {onBackToSearch && (
          <div className="mb-3 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onBackToSearch();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E30613] dark:text-[#FF5A5A] hover:opacity-80 transition-opacity cursor-pointer group ios-press"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Volver al buscador</span>
            </button>
            <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Metro de Madrid
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Iconic Metro Rhombus Emblem */}
            <div className="w-13 h-13 rounded-2xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0">
              <MetroDiamondLogo className="w-10 h-7.5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight truncate">
                  {station.name}
                </h2>
                {station.zone && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    Zona {station.zone}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                {station.address || 'Red de Metro de Madrid'}
              </p>

              {/* Station Lines Badges */}
              {station.lines && station.lines.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mr-0.5">
                    Líneas:
                  </span>
                  {station.lines.map((lineId) => {
                    const badge = formatMetroLineBadge(lineId);
                    const isSelected = selectedLineFilter === lineId;
                    return (
                      <button
                        key={lineId}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedLineFilter((prev) => (prev === lineId ? null : lineId));
                        }}
                        title={`Filtrar por Línea ${lineId}`}
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          borderColor: badge.border || 'transparent',
                        }}
                        className={`px-2 py-0.5 rounded-md text-xs font-black shadow-2xs transition-transform cursor-pointer border ${
                          isSelected ? 'ring-2 ring-zinc-900 dark:ring-white scale-105' : 'hover:scale-105'
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
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onToggleFavorite();
              }}
              title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold border transition-all cursor-pointer ios-press ${
                isFav
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                  : 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Star
                className={`w-4 h-4 ${
                  isFav ? 'fill-amber-400 text-amber-500' : 'text-zinc-400'
                }`}
              />
              <span>{isFav ? 'Favorita' : 'Guardar'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              title="Compartir estación"
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer ios-press"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-zinc-400" />
                  <span>Compartir</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Multi-line filter pills bar */}
        {station.lines && station.lines.length > 1 && (
          <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setSelectedLineFilter(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                selectedLineFilter === null
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
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
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedLineFilter(lineId);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'ring-2 ring-zinc-900 dark:ring-white bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
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

      {/* Auto Refresh Bar */}
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
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Aviso del servicio: </span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Stale data warning */}
      {estimates.some((e) => e.isStale) && (
        <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Aviso de teleindicadores: Las previsiones de Metro recibidas tienen más de 20 minutos de antigüedad.
          </span>
        </div>
      )}

      {/* Live Arrivals Grouped by Line -> Platform Rows */}
      {isLoading && estimates.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-white dark:bg-[#14161A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 animate-pulse p-4"
            />
          ))}
        </div>
      ) : groupedByLine.size === 0 ? (
        <div className="bg-white dark:bg-[#14161A] rounded-2xl p-8 border border-zinc-200/90 dark:border-zinc-800/90 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <MetroDiamondLogo className="w-9 h-7 opacity-80" />
          </div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Sin estimaciones en este momento
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
            El servicio de teleindicadores no reporta trenes en directo en esta estación ahora mismo (horario habitual de 06:00 a 01:30).
          </p>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="mt-4 px-4 py-2 rounded-xl bg-[#E30613] text-white font-semibold text-xs hover:bg-[#B9050F] transition-colors cursor-pointer ios-press"
          >
            Reintentar actualización
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {Array.from(groupedByLine.entries()).map(([lineKey, lineEstimates]) => {
            const badge = formatMetroLineBadge(lineKey);
            const lineConfig = getMetroLine(lineKey);

            return (
              <div
                key={lineKey}
                className="bg-white dark:bg-[#14161A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 overflow-hidden"
              >
                {/* Line Header */}
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.text,
                        borderColor: badge.border || 'transparent',
                      }}
                      className="px-2.5 py-0.5 rounded-lg text-sm font-black border shadow-2xs shrink-0"
                    >
                      {badge.label}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-zinc-950 dark:text-white truncate">
                        {lineConfig ? lineConfig.name : `Línea ${badge.label}`}
                      </h3>
                      {lineConfig?.origin && lineConfig?.destination && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                          {lineConfig.origin} ↔ {lineConfig.destination}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider shrink-0">
                    {lineEstimates.length}{' '}
                    {lineEstimates.length === 1 ? 'andén' : 'andenes'}
                  </span>
                </div>

                {/* Clean Grouped Platform Rows (No heavy card nesting) */}
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {lineEstimates.map((est, idx) => {
                    const isArriving = est.proximoMinutes === 0 || est.eta === 'Llegando';
                    const isSoon =
                      est.proximoMinutes !== null &&
                      est.proximoMinutes > 0 &&
                      est.proximoMinutes <= 4;
                    const hasSecondTrain =
                      est.siguienteMinutes !== null &&
                      est.siguienteMinutes !== undefined &&
                      est.siguienteMinutes > 0;

                    return (
                      <div
                        key={`${est.line}-${est.platform}-${idx}`}
                        className={`p-4 transition-colors flex flex-col gap-2.5 ${
                          isArriving ? 'bg-emerald-50/50 dark:bg-emerald-950/15' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                <Compass className="w-3 h-3 text-zinc-400" />
                                Andén {est.platform}
                              </span>
                            </div>

                            <div className="flex items-baseline gap-1.5 mt-1.5">
                              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium shrink-0">
                                Hacia:
                              </span>
                              <span className="font-bold text-base text-zinc-950 dark:text-white truncate">
                                {est.destination || 'Fin de línea'}
                              </span>
                            </div>
                          </div>

                          {/* Primary ETA Badge */}
                          <div className="text-right shrink-0">
                            <div
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-sm sm:text-base tabular-nums ${
                                isArriving
                                  ? 'bg-emerald-600 text-white'
                                  : isSoon
                                  ? 'bg-[#0072CE] text-white'
                                  : est.proximoMinutes !== null
                                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950'
                                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                              }`}
                            >
                              {isArriving && (
                                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                              )}
                              <span>{est.eta}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Secondary Train & Timestamp */}
                        <div className="flex items-center justify-between text-xs pt-1 text-zinc-500 dark:text-zinc-400 tabular-nums">
                          <div className="flex items-center gap-1.5">
                            {hasSecondTrain ? (
                              <span className="inline-flex items-center gap-1 font-medium text-zinc-600 dark:text-zinc-300">
                                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                Sig. tren:{' '}
                                <strong className="text-zinc-950 dark:text-white">
                                  {est.siguienteMinutes} min
                                </strong>
                              </span>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-500 italic">
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
                                  : 'text-zinc-400 dark:text-zinc-500'
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

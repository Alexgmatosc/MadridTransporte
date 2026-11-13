import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Star,
  Share2,
  Check,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  TrainFront,
} from 'lucide-react';
import type {
  CercaniasStation,
  CercaniasArrival,
  CercaniasAlert,
  CercaniasTrainPosition,
} from '../types/cercanias';
import { fetchCercaniasEstimates } from '../services/cercaniasApi';
import {
  formatCercaniasLineBadge,
  normalizeCercaniasLineKey,
} from '../data/cercaniasLines';
import { AutoRefreshBar } from './AutoRefreshBar';
import { CercaniasLogo } from './TransitIcons';
import { NearbyConnectionsStrip } from './NearbyConnectionsStrip';
import { triggerHaptic } from '../utils/haptics';

export interface CercaniasStationViewProps {
  station: CercaniasStation;
  isFav: boolean;
  onToggleFavorite: () => void;
  onBackToSearch?: () => void;
  onArrivalsLoaded?: (trains: CercaniasTrainPosition[]) => void;
  onSelectStop?: (stopId: string) => void;
  onSelectMetroStation?: (stationId: string) => void;
  isDark?: boolean;
}

const REFRESH_INTERVAL_SECONDS = 30;

function formatDisplayTime(rawTime?: string): string | null {
  if (!rawTime) return null;
  const trimmed = rawTime.trim();
  if (!trimmed) return null;
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return trimmed.padStart(5, '0');
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return trimmed;
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAlertSeverityStyles(severity?: CercaniasAlert['severity']) {
  if (severity === 'severe') {
    return {
      container:
        'bg-red-50 dark:bg-red-950/35 border-red-200 dark:border-red-800/70 text-red-900 dark:text-red-200',
      iconColor: 'text-red-600 dark:text-red-400',
      label: 'Incidencia grave',
      Icon: AlertCircle,
    };
  }
  if (severity === 'info') {
    return {
      container:
        'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/70 text-sky-900 dark:text-sky-200',
      iconColor: 'text-sky-600 dark:text-sky-400',
      label: 'Aviso informativo',
      Icon: Info,
    };
  }
  return {
    container:
      'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200',
    iconColor: 'text-amber-600 dark:text-amber-400',
    label: 'Aviso de servicio',
    Icon: AlertTriangle,
  };
}

export const CercaniasStationView: React.FC<CercaniasStationViewProps> = ({
  station,
  isFav,
  onToggleFavorite,
  onBackToSearch,
  onArrivalsLoaded,
  onSelectStop,
  onSelectMetroStation,
}) => {
  const [arrivals, setArrivals] = useState<CercaniasArrival[]>([]);
  const [alerts, setAlerts] = useState<CercaniasAlert[]>([]);
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [countdown, setCountdown] = useState<number>(REFRESH_INTERVAL_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [lineFilterState, setLineFilterState] = useState<{
    stationId: string;
    line: string | null;
  }>({ stationId: station.id, line: null });
  const selectedLineFilter =
    lineFilterState.stationId === station.id ? lineFilterState.line : null;
  const setSelectedLineFilter = useCallback(
    (updater: string | null | ((prev: string | null) => string | null)) => {
      setLineFilterState((prev) => {
        const currentLine = prev.stationId === station.id ? prev.line : null;
        const nextLine =
          typeof updater === 'function' ? updater(currentLine) : updater;
        return { stationId: station.id, line: nextLine };
      });
    },
    [station.id]
  );
  const [copied, setCopied] = useState(false);

  const requestSeqRef = useRef(0);
  const onArrivalsLoadedRef = useRef(onArrivalsLoaded);

  useEffect(() => {
    onArrivalsLoadedRef.current = onArrivalsLoaded;
  }, [onArrivalsLoaded]);

  const loadEstimates = useCallback(
    async (stationId: string, stopIds?: string[]) => {
      const seq = ++requestSeqRef.current;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchCercaniasEstimates(stationId, stopIds, {
          includeTrains: Boolean(onArrivalsLoadedRef.current),
        });
        if (seq !== requestSeqRef.current) return;

        setArrivals(res.arrivals);
        setAlerts(res.alerts ?? []);
        setIsStale(Boolean(res.isStale));
        setLastUpdated(res.timestamp);
        setCountdown(REFRESH_INTERVAL_SECONDS);
        if (res.error) {
          setError(res.error);
        }
        if (onArrivalsLoadedRef.current && Array.isArray(res.trains)) {
          onArrivalsLoadedRef.current(res.trains);
        }
      } catch (err: unknown) {
        if (seq !== requestSeqRef.current) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Error al conectar con el servicio de Renfe Cercanías Madrid.';
        setError(msg);
      } finally {
        if (seq === requestSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadEstimates(station.id, station.stopIds);
  }, [station.id, station.stopIds, loadEstimates]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setCountdown(REFRESH_INTERVAL_SECONDS);
        void loadEstimates(station.id, station.stopIds);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [station.id, station.stopIds, loadEstimates]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden' || isPaused || isLoading) {
        return;
      }

      setCountdown((prev) => {
        if (prev <= 1) {
          void loadEstimates(station.id, station.stopIds);
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isLoading, station.id, station.stopIds, loadEstimates]);

  const handleManualRefresh = () => {
    setCountdown(REFRESH_INTERVAL_SECONDS);
    loadEstimates(station.id, station.stopIds);
  };

  const handleShare = async () => {
    triggerHaptic('selection');
    const url = new URL(window.location.href);
    url.searchParams.delete('stop');
    url.searchParams.delete('metro');
    url.searchParams.set('cercanias', station.id);
    const shareUrl = url.toString();
    const linesLabel = station.lines.join(', ');
    const shareText = `Estación Cercanías Madrid: ${station.name}${
      linesLabel ? ` (Líneas: ${linesLabel})` : ''
    }`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${station.name} - Cercanías Madrid`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  const filteredArrivals = useMemo(() => {
    if (!selectedLineFilter) return arrivals;
    const normalizedFilter = normalizeCercaniasLineKey(selectedLineFilter).toUpperCase();
    return arrivals.filter(
      (arrival) =>
        normalizeCercaniasLineKey(arrival.line).toUpperCase() === normalizedFilter
    );
  }, [arrivals, selectedLineFilter]);

  return (
    <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
      {/* Station Header Card */}
      <div className="bg-white dark:bg-[#14161A] rounded-2xl p-4 sm:p-5 border border-zinc-200/90 dark:border-zinc-800/90 transition-colors">
        {onBackToSearch && (
          <div className="mb-3 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onBackToSearch();
              }}
              className="inline-flex items-center gap-1.5 min-h-[36px] text-xs font-semibold text-[#E4002B] dark:text-[#FF5C75] hover:opacity-80 transition-opacity cursor-pointer group ios-press"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Volver al buscador</span>
            </button>
            <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Cercanías Madrid
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Official Cercanías Emblem */}
            <div className="w-13 h-13 rounded-2xl bg-[#E4002B]/10 dark:bg-[#E4002B]/15 border border-[#E4002B]/20 dark:border-[#E4002B]/30 flex items-center justify-center shrink-0">
              <CercaniasLogo className="w-9 h-9" />
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
                {station.address || 'Red de Renfe Cercanías Madrid'}
              </p>

              {/* Station Lines Badges */}
              {station.lines && station.lines.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mr-0.5">
                    Líneas:
                  </span>
                  {station.lines.map((lineId) => {
                    const badge = formatCercaniasLineBadge(lineId);
                    const isSelected = selectedLineFilter === lineId;
                    return (
                      <button
                        key={lineId}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedLineFilter((prev) => (prev === lineId ? null : lineId));
                        }}
                        title={`Filtrar por ${badge.label}`}
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                        }}
                        className={`px-2 py-0.5 rounded-md text-xs font-black shadow-2xs transition-transform cursor-pointer border border-black/10 dark:border-white/10 ${
                          isSelected
                            ? 'ring-2 ring-zinc-900 dark:ring-white scale-105'
                            : 'hover:scale-105'
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
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[40px] rounded-xl text-xs font-semibold border transition-all cursor-pointer ios-press ${
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
              className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[40px] rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer ios-press"
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
              className={`px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                selectedLineFilter === null
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              Todas las líneas ({station.lines.length})
            </button>
            {station.lines.map((lineId) => {
              const badge = formatCercaniasLineBadge(lineId);
              const isSelected = selectedLineFilter === lineId;
              return (
                <button
                  key={`filter-${lineId}`}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedLineFilter(lineId);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'ring-2 ring-zinc-900 dark:ring-white bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.text,
                    }}
                    className="px-1.5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border border-black/10 dark:border-white/10"
                  >
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Nearby Multimodal Connections (< 200 m) */}
        {Number.isFinite(station.lat) &&
          Number.isFinite(station.lon) &&
          (station.lat !== 0 || station.lon !== 0) && (
            <NearbyConnectionsStrip
              lat={station.lat}
              lon={station.lon}
              currentType="cercanias"
              currentId={station.id}
              onSelectStop={onSelectStop}
              onSelectMetroStation={onSelectMetroStation}
            />
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

      {/* Service Alerts Banner */}
      {alerts.length > 0 && (
        <div
          role="region"
          aria-label="Avisos de servicio"
          className="flex flex-col gap-2"
        >
          {alerts.map((alert) => {
            const styles = getAlertSeverityStyles(alert.severity);
            const IconComponent = styles.Icon;
            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-start gap-2.5 ${styles.container}`}
              >
                <IconComponent className={`w-4 h-4 shrink-0 mt-0.5 ${styles.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="font-bold">{alert.header || styles.label}</span>
                    {alert.lines &&
                      alert.lines.map((lineId) => {
                        const badge = formatCercaniasLineBadge(lineId);
                        return (
                          <span
                            key={`alert-${alert.id}-${lineId}`}
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.text,
                            }}
                            className="px-1.5 py-0.2 rounded text-[10px] font-black border border-black/10"
                          >
                            {badge.label}
                          </span>
                        );
                      })}
                  </div>
                  <p className="text-xs leading-relaxed opacity-95">{alert.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Error state alert */}
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 text-xs sm:text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Error de servicio: </span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Stale feed warning */}
      {isStale && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Aviso de feed antiguo: Los datos en tiempo real de Renfe Cercanías tienen más antigüedad de la habitual.
          </span>
        </div>
      )}

      {/* Upcoming Departures / Arrivals Grouped List */}
      {isLoading && arrivals.length === 0 ? (
        <div className="bg-white dark:bg-[#14161A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 h-20 animate-pulse flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                <div className="space-y-2">
                  <div className="w-36 h-4 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="w-24 h-3 rounded bg-zinc-100 dark:bg-zinc-800/70" />
                </div>
              </div>
              <div className="w-16 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : arrivals.length === 0 ? (
        <div className="bg-white dark:bg-[#14161A] rounded-2xl p-8 border border-zinc-200/90 dark:border-zinc-800/90 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#E4002B]/10 dark:bg-[#E4002B]/15 flex items-center justify-center mx-auto mb-3">
            <CercaniasLogo className="w-8 h-8 opacity-90" />
          </div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Sin trenes próximos en este momento
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
            No hay salidas ni llegadas inmediatas registradas para esta estación ahora mismo (posible horario nocturno sin servicio o fin de circulación).
          </p>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="mt-4 px-4 py-2 min-h-[40px] rounded-xl bg-[#E4002B] text-white font-semibold text-xs hover:bg-[#C20024] transition-colors cursor-pointer ios-press"
          >
            Reintentar actualización
          </button>
        </div>
      ) : filteredArrivals.length === 0 ? (
        <div className="bg-white dark:bg-[#14161A] rounded-2xl p-7 border border-zinc-200/90 dark:border-zinc-800/90 text-center">
          <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
            No hay trenes próximos para la línea {selectedLineFilter}
          </p>
          <button
            type="button"
            onClick={() => setSelectedLineFilter(null)}
            className="mt-3 px-3.5 py-2 min-h-[40px] rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-semibold text-xs cursor-pointer ios-press"
          >
            Ver todas las líneas
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#14161A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <TrainFront className="w-3.5 h-3.5 text-[#E4002B]" />
              Próximas salidas y llegadas
            </span>
            <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 tabular-nums">
              {filteredArrivals.length} {filteredArrivals.length === 1 ? 'tren' : 'trenes'}
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredArrivals.map((arrival, idx) => {
              const badge = formatCercaniasLineBadge(arrival.line);
              const isCanceled = arrival.status === 'SUPRIMIDO' || Boolean(arrival.isCanceled);
              const isDelayed =
                !isCanceled &&
                (arrival.status === 'RETRASO' ||
                  (typeof arrival.delayMinutes === 'number' && arrival.delayMinutes >= 2));
              const isArriving =
                !isCanceled && (arrival.etaMinutes === 0 || arrival.eta === 'Llegando');
              const isSoon =
                !isCanceled &&
                arrival.etaMinutes !== null &&
                arrival.etaMinutes > 0 &&
                arrival.etaMinutes <= 4;

              const scheduledDisplay = formatDisplayTime(arrival.scheduledTime);
              const estimatedDisplay = formatDisplayTime(arrival.estimatedTime);
              const etaDisplay =
                arrival.eta ||
                (arrival.etaMinutes !== null
                  ? arrival.etaMinutes === 0
                    ? 'Llegando'
                    : `${arrival.etaMinutes} min`
                  : '—');

              return (
                <div
                  key={`${arrival.tripId}-${idx}`}
                  className={`p-4 transition-colors flex flex-col gap-2 ${
                    isCanceled
                      ? 'bg-red-50/40 dark:bg-red-950/15'
                      : isArriving
                      ? 'bg-emerald-50/45 dark:bg-emerald-950/15'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Line badge + Destination + Platform/Delay chips */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black border border-black/10 dark:border-white/10 shadow-2xs shrink-0 mt-0.5 tabular-nums"
                      >
                        {badge.label}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1 min-w-0">
                          <span
                            className={`font-bold text-sm sm:text-base truncate ${
                              isCanceled
                                ? 'text-zinc-500 dark:text-zinc-400 line-through'
                                : 'text-zinc-950 dark:text-white'
                            }`}
                          >
                            Hacia {arrival.destination || 'Destino sin especificar'}
                          </span>
                        </div>

                        {/* Metadata chips: Vía, Delay, Canceled */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                          {arrival.platform && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/70 dark:border-zinc-700/70 tabular-nums">
                              Vía {arrival.platform}
                            </span>
                          )}

                          {isCanceled && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wide bg-red-600 text-white">
                              SUPRIMIDO
                            </span>
                          )}

                          {isDelayed && typeof arrival.delayMinutes === 'number' && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border tabular-nums ${
                                arrival.delayMinutes >= 10
                                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/70'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/70'
                              }`}
                            >
                              +{arrival.delayMinutes} min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Prominent ETA badge */}
                    <div className="text-right shrink-0">
                      {isCanceled ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/70">
                          SUPRIMIDO
                        </span>
                      ) : (
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-sm sm:text-base tabular-nums ${
                            isArriving
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                              : isSoon
                              ? 'bg-[#E4002B] text-white'
                              : arrival.etaMinutes !== null
                              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950'
                              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {isArriving && (
                            <span
                              aria-hidden="true"
                              className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                            />
                          )}
                          <span>{etaDisplay}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: Scheduled vs Estimated time */}
                  {(scheduledDisplay || estimatedDisplay) && (
                    <div className="flex items-center justify-between text-xs pt-0.5 text-zinc-500 dark:text-zinc-400 tabular-nums">
                      <div className="flex items-center gap-2 flex-wrap">
                        {scheduledDisplay && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Programado: {scheduledDisplay}</span>
                          </span>
                        )}
                        {estimatedDisplay && estimatedDisplay !== scheduledDisplay && !isCanceled && (
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            Est.: {estimatedDisplay}
                          </span>
                        )}
                      </div>

                      {arrival.trainId && (
                        <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                          Tren {arrival.trainId}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

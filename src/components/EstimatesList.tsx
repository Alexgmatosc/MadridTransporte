import React from 'react';
import { Navigation, AlertCircle, RefreshCw } from 'lucide-react';
import type { BusEstimate } from '../types/emt';
import { triggerHaptic } from '../utils/haptics';
import { EmtBusLogo } from './TransitIcons';

interface EstimatesListProps {
  estimates: BusEstimate[];
  isLoading: boolean;
  error?: string | null;
  onRefresh: () => void;
  selectedLineFilter: string | null;
  onSelectBusOnMap: (bus: BusEstimate) => void;
  selectedBus: BusEstimate | null;
}

export const EstimatesList: React.FC<EstimatesListProps> = ({
  estimates,
  isLoading,
  error,
  onRefresh,
  selectedLineFilter,
  onSelectBusOnMap,
  selectedBus,
}) => {
  const filtered = selectedLineFilter
    ? estimates.filter((e) => e.line.toUpperCase() === selectedLineFilter.toUpperCase())
    : estimates;

  if (error && estimates.length === 0) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-center">
        <AlertCircle className="w-9 h-9 text-red-500 mx-auto mb-2.5" />
        <h3 className="text-base font-bold text-red-800 dark:text-red-300">
          Error al obtener estimaciones
        </h3>
        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1 max-w-md mx-auto">
          {error}
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-[#E30613] hover:bg-[#B9050F] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 ios-press"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  if (!isLoading && filtered.length === 0) {
    return (
      <div className="bg-white dark:bg-[#14161A] rounded-2xl p-8 border border-zinc-200/90 dark:border-zinc-800/90 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
          <EmtBusLogo className="w-7 h-7 opacity-70" />
        </div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {selectedLineFilter
            ? `No hay autobuses previstos para la línea ${selectedLineFilter}`
            : 'No hay estimaciones disponibles en este momento'}
        </h3>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
          Es posible que la línea no esté prestando servicio a esta hora o que no haya autobuses en ruta actualmente.
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 ios-press"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Comprobar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <span>Próximas Llegadas</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold tabular-nums">
            {filtered.length} {filtered.length === 1 ? 'bus' : 'buses'}
          </span>
        </h2>
        {selectedLineFilter && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Filtro: <strong className="text-[#0072CE] dark:text-[#389BFF] tabular-nums">Línea {selectedLineFilter}</strong>
          </span>
        )}
      </div>

      {/* iOS Grouped Inset List for clean glanceability */}
      <div className="bg-white dark:bg-[#14161A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden">
        {filtered.map((bus, idx) => {
          const isArriving = bus.etaMinutes === 0;
          const isSoon = bus.etaMinutes !== null && bus.etaMinutes > 0 && bus.etaMinutes <= 5;
          const isModerate = bus.etaMinutes !== null && bus.etaMinutes > 5 && bus.etaMinutes <= 15;
          const hasGps = bus.coordinates !== null;

          const isSelected =
            selectedBus &&
            selectedBus.line === bus.line &&
            selectedBus.coordinates?.lat === bus.coordinates?.lat &&
            selectedBus.coordinates?.lon === bus.coordinates?.lon;

          let badgeStyle =
            'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700';
          if (isArriving) {
            badgeStyle =
              'bg-emerald-600 text-white border-emerald-600 font-black';
          } else if (isSoon) {
            badgeStyle =
              'bg-[#0072CE] text-white border-[#0072CE] font-bold';
          } else if (isModerate) {
            badgeStyle =
              'bg-[#0072CE]/10 dark:bg-[#0072CE]/20 text-[#005AA3] dark:text-[#60B2FF] border-[#0072CE]/25 dark:border-[#0072CE]/35 font-bold';
          }

          return (
            <div
              key={`${bus.line}-${bus.destination}-${bus.eta}-${idx}`}
              className={`px-4 py-3.5 transition-colors flex items-center justify-between gap-3 ${
                isSelected ? 'bg-amber-50/70 dark:bg-amber-950/25' : ''
              }`}
            >
              {/* Left: Line Badge & Destination */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#0072CE] text-white font-black text-base flex items-center justify-center shrink-0 tracking-tight tabular-nums">
                  {bus.line}
                </div>

                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block leading-none mb-1">
                    Hacia
                  </span>
                  <h3 className="font-semibold text-sm sm:text-base text-zinc-950 dark:text-white truncate leading-tight">
                    {bus.destination}
                  </h3>
                  {hasGps && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>GPS en directo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: ETA Pill & Map Pin Button */}
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm text-center flex flex-col items-center justify-center min-w-[78px] tabular-nums ${badgeStyle}`}
                >
                  <span className="tracking-tight leading-tight">{bus.eta}</span>
                  {isArriving && (
                    <span className="text-[10px] uppercase font-bold opacity-95 leading-none mt-0.5">
                      Llegando
                    </span>
                  )}
                </div>

                {hasGps && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      onSelectBusOnMap(bus);
                    }}
                    title="Ver autobús en el mapa"
                    className={`ios-touch-target min-w-[44px] min-h-[44px] p-2 rounded-xl border transition-all cursor-pointer ios-press ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-zinc-100 hover:bg-[#0072CE]/10 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-[#0072CE] dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700'
                    }`}
                  >
                    <Navigation className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

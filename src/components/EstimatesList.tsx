import React from 'react';
import { Bus, Navigation, AlertCircle, RefreshCw } from 'lucide-react';
import type { BusEstimate } from '../types/emt';

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
  // Filter if line selected
  const filtered = selectedLineFilter
    ? estimates.filter((e) => e.line.toUpperCase() === selectedLineFilter.toUpperCase())
    : estimates;

  if (error && estimates.length === 0) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-red-800 dark:text-red-300">
          Error al obtener estimaciones
        </h3>
        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1 max-w-md mx-auto">
          {error}
        </p>
        <button
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  if (!isLoading && filtered.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Bus className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          {selectedLineFilter
            ? `No hay autobuses previstos para la línea ${selectedLineFilter}`
            : 'No hay estimaciones disponibles en este momento'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Es posible que la línea no esté prestando servicio a esta hora o que no haya autobuses en ruta actualmente.
        </p>
        <button
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Comprobar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <span>Próximas Llegadas</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
            {filtered.length} {filtered.length === 1 ? 'bus' : 'buses'}
          </span>
        </h2>
        {selectedLineFilter && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Filtro: <strong className="text-blue-600 dark:text-blue-400">Línea {selectedLineFilter}</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5">
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

          // Badges formatting
          let badgeBg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
          if (isArriving) {
            badgeBg = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-black';
          } else if (isSoon) {
            badgeBg = 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-bold';
          } else if (isModerate) {
            badgeBg = 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold';
          }

          return (
            <div
              key={`${bus.line}-${bus.destination}-${bus.eta}-${idx}`}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border transition-all shadow-xs flex items-center justify-between gap-3 ${
                isSelected
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Left: Line Badge & Destination */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Line Badge */}
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0 tracking-tight">
                  {bus.line}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <span>Destino</span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {bus.destination}
                  </h3>
                  {hasGps && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Posición GPS en directo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: ETA Badge & Map button */}
              <div className="flex items-center gap-2 shrink-0">
                {/* ETA Badge */}
                <div className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm text-center flex flex-col items-center justify-center min-w-[76px] ${badgeBg}`}>
                  <span className="tracking-tight">{bus.eta}</span>
                  {isArriving && (
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 leading-none">
                      Llegando
                    </span>
                  )}
                </div>

                {/* Map Button */}
                {hasGps && (
                  <button
                    onClick={() => onSelectBusOnMap(bus)}
                    title="Ver autobús en el mapa"
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 border-slate-200 dark:border-slate-700'
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

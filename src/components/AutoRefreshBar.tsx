import React, { useState, useEffect } from 'react';
import { RefreshCw, Play, Pause, Clock } from 'lucide-react';

interface AutoRefreshBarProps {
  countdown: number; // 0 to 30
  maxCountdown: number; // 30
  isLoading: boolean;
  isPaused: boolean;
  onRefresh: () => void;
  onTogglePause: () => void;
  lastUpdated: number | null;
}

export const AutoRefreshBar: React.FC<AutoRefreshBarProps> = ({
  countdown,
  maxCountdown,
  isLoading,
  isPaused,
  onRefresh,
  onTogglePause,
  lastUpdated,
}) => {
  const percentage = Math.max(0, Math.min(100, ((maxCountdown - countdown) / maxCountdown) * 100));
  const [relativeTime, setRelativeTime] = useState<string>('Nunca');

  useEffect(() => {
    if (!lastUpdated) {
      setRelativeTime('Nunca');
      return;
    }
    const update = () => {
      const diffSecs = Math.max(0, Math.round((Date.now() - lastUpdated) / 1000));
      if (diffSecs < 5) setRelativeTime('justo ahora');
      else if (diffSecs < 60) setRelativeTime(`hace ${diffSecs}s`);
      else setRelativeTime(`hace ${Math.floor(diffSecs / 60)} min`);
    };
    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-1.5 transition-colors">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 tabular-nums min-w-0">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">
            {isLoading
              ? 'Actualizando estimaciones...'
              : isPaused
              ? 'Actualización automática pausada'
              : `Actualización automática en ${countdown}s`}
          </span>
          <span className="text-slate-300 dark:text-slate-600 shrink-0">•</span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
            Última: {relativeTime}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Pause/Resume button */}
          <button
            onClick={onTogglePause}
            title={isPaused ? 'Reanudar actualización automática' : 'Pausar actualización'}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Manual Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Actualizar ahora"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`}
            />
            <span className="hidden xs:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${
            isLoading
              ? 'bg-blue-600 w-full animate-pulse'
              : isPaused
              ? 'bg-slate-300 dark:bg-slate-600'
              : 'bg-blue-600 dark:bg-blue-500'
          }`}
          style={{ width: isLoading ? '100%' : `${percentage}%` }}
        />
      </div>
    </div>
  );
};

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
    <div className="w-full bg-white dark:bg-[#14161A] rounded-xl px-3.5 py-2.5 border border-zinc-200/90 dark:border-zinc-800/90 flex flex-col gap-1.5 transition-colors">
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5 tabular-nums min-w-0">
          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="truncate">
            {isLoading
              ? 'Actualizando estimaciones...'
              : isPaused
              ? 'Actualización automática pausada'
              : `Actualización automática en ${countdown}s`}
          </span>
          <span className="text-zinc-300 dark:text-zinc-600 shrink-0">•</span>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
            Última: {relativeTime}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Pause/Resume button */}
          <button
            type="button"
            onClick={onTogglePause}
            title={isPaused ? 'Reanudar actualización automática' : 'Pausar actualización'}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Manual Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Actualizar ahora"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#0072CE]' : ''}`}
            />
            <span className="hidden xs:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          data-testid="countdown-progress"
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${
            isLoading
              ? 'bg-[#0072CE] w-full animate-pulse'
              : isPaused
              ? 'bg-zinc-300 dark:bg-zinc-600'
              : 'bg-[#0072CE] dark:bg-[#389BFF]'
          }`}
          style={{ width: isLoading ? '100%' : `${percentage}%` }}
        />
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Star, MapPin, Share2, Check, ArrowLeft } from 'lucide-react';
import type { Stop } from '../types/emt';
import { triggerHaptic } from '../utils/haptics';
import { EmtBusLogo } from './TransitIcons';
import { NearbyConnectionsStrip } from './NearbyConnectionsStrip';

interface StopHeaderProps {
  stop: Stop;
  isFav: boolean;
  onToggleFavorite: () => void;
  selectedLineFilter: string | null;
  onSelectLineFilter: (line: string | null) => void;
  onBackToSearch?: () => void;
  onSelectMetroStation?: (stationId: string) => void;
  onSelectCercaniasStation?: (stationId: string) => void;
}

export const StopHeader: React.FC<StopHeaderProps> = ({
  stop,
  isFav,
  onToggleFavorite,
  selectedLineFilter,
  onSelectLineFilter,
  onBackToSearch,
  onSelectMetroStation,
  onSelectCercaniasStation,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    triggerHaptic('selection');
    const url = window.location.href;
    const shareText = `Parada EMT Madrid ${stop.id}: ${stop.name} (${stop.address})`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Parada ${stop.id} - EMT Madrid`,
          text: shareText,
          url,
        });
        return;
      } catch {
        // Fallback to clipboard if user dismissed or unsupported
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-white dark:bg-[#14161A] rounded-2xl p-4 sm:p-5 border border-zinc-200/90 dark:border-zinc-800/90 transition-colors">
      {onBackToSearch && (
        <div className="mb-3 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onBackToSearch();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0072CE] dark:text-[#389BFF] hover:opacity-80 transition-opacity cursor-pointer group ios-press"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Volver al buscador de paradas</span>
          </button>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            <EmtBusLogo className="w-3.5 h-3.5" />
            EMT Madrid PMV
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        {/* Stop ID Badge + Title */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="shrink-0 flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#0072CE] text-white shadow-xs border border-[#005AA3]">
            <span className="text-[10px] font-bold tracking-wider opacity-90 uppercase leading-none">
              Parada
            </span>
            <span className="text-xl sm:text-2xl font-black tracking-tight leading-tight tabular-nums">
              {stop.id}
            </span>
          </div>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-zinc-950 dark:text-white leading-snug">
              {stop.name}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
              <span className="truncate">{stop.address || 'Madrid'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Star + Share */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onToggleFavorite();
            }}
            title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            className={`ios-touch-target min-w-[44px] min-h-[44px] p-2.5 rounded-xl border transition-all active:scale-90 cursor-pointer ios-press ${
              isFav
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-500'
                : 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-zinc-200/80 dark:border-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <Star
              className={`w-5 h-5 transition-transform ${
                isFav ? 'fill-amber-400 text-amber-500 scale-110' : ''
              }`}
            />
          </button>

          <button
            type="button"
            onClick={handleShare}
            title="Compartir parada"
            className="ios-touch-target min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all active:scale-90 cursor-pointer ios-press"
          >
            {copied ? (
              <Check className="w-5 h-5 text-emerald-500" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Lines Serving This Stop */}
      {stop.lines && stop.lines.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Líneas en esta parada ({stop.lines.length}):
            </span>
            {selectedLineFilter && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  onSelectLineFilter(null);
                }}
                className="text-xs text-[#0072CE] dark:text-[#389BFF] hover:underline font-semibold cursor-pointer"
              >
                Mostrar todas
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {stop.lines.map((line) => {
              const isSelected = selectedLineFilter === line;
              return (
                <button
                  type="button"
                  key={line}
                  onClick={() => {
                    triggerHaptic('selection');
                    onSelectLineFilter(isSelected ? null : line);
                  }}
                  title={`Filtrar por línea ${line}`}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums transition-all cursor-pointer ios-press ${
                    isSelected
                      ? 'bg-[#0072CE] text-white shadow-xs scale-105'
                      : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/70'
                  }`}
                >
                  {line}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Nearby Multimodal Connections (< 200 m) */}
      {Number.isFinite(stop.lat) &&
        Number.isFinite(stop.lon) &&
        (stop.lat !== 0 || stop.lon !== 0) && (
          <NearbyConnectionsStrip
            lat={stop.lat}
            lon={stop.lon}
            currentType="bus"
            currentId={stop.id}
            onSelectMetroStation={onSelectMetroStation}
            onSelectCercaniasStation={onSelectCercaniasStation}
          />
        )}
    </div>
  );
};

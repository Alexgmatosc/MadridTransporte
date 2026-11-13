import React, { useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import {
  findNearbyInterchanges,
  type InterchangeConnection,
  type InterchangeTransportType,
} from '../services/interchangeService';
import { MetroDiamondMark, CercaniasMark, EmtBusLogo } from './TransitIcons';
import { triggerHaptic } from '../utils/haptics';

export interface NearbyConnectionsStripProps {
  lat: number;
  lon: number;
  currentType: InterchangeTransportType;
  currentId: string;
  onSelectStop?: (stopId: string) => void;
  onSelectMetroStation?: (stationId: string) => void;
  onSelectCercaniasStation?: (stationId: string) => void;
}

function formatLinesSummary(type: InterchangeTransportType, lines: string[]): string {
  if (!lines || lines.length === 0) return '';
  const visible = lines.slice(0, 3).map((line) => {
    if (type === 'metro') {
      return /^\d+$/.test(line) ? `L${line}` : line;
    }
    return line;
  });
  const suffix = lines.length > 3 ? ` +${lines.length - 3}` : '';
  return `${visible.join(', ')}${suffix}`;
}

export const NearbyConnectionsStrip: React.FC<NearbyConnectionsStripProps> = ({
  lat,
  lon,
  currentType,
  currentId,
  onSelectStop,
  onSelectMetroStation,
  onSelectCercaniasStation,
}) => {
  const requestKey = `${currentType}:${currentId}:${lat}:${lon}`;
  const [resultState, setResultState] = useState<{
    key: string;
    connections: InterchangeConnection[];
  }>({
    key: '',
    connections: [],
  });

  useEffect(() => {
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      (lat === 0 && lon === 0)
    ) {
      return;
    }

    let cancelled = false;
    const activeKey = `${currentType}:${currentId}:${lat}:${lon}`;

    void findNearbyInterchanges({
      lat,
      lon,
      excludeType: currentType,
      excludeId: currentId,
      radiusMeters: 200,
      limit: 8,
    })
      .then((items) => {
        if (!cancelled) {
          setResultState({ key: activeKey, connections: items });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResultState({ key: activeKey, connections: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon, currentType, currentId]);

  const connections =
    resultState.key === requestKey ? resultState.connections : [];

  if (connections.length === 0) {
    return null;
  }

  const handleChipClick = (conn: InterchangeConnection) => {
    triggerHaptic('selection');
    if (conn.type === 'bus') {
      onSelectStop?.(conn.id);
    } else if (conn.type === 'metro') {
      onSelectMetroStation?.(conn.id);
    } else {
      onSelectCercaniasStation?.(conn.id);
    }
  };

  return (
    <section
      aria-label="Conexiones cercanas en intercambiador"
      className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
          <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          <span>Conexiones cercanas (&lt; 200 m)</span>
        </span>
        <span className="hidden sm:inline text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
          Enlaces en intercambiador
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {connections.map((conn) => {
          const linesSummary = formatLinesSummary(conn.type, conn.lines);

          if (conn.type === 'metro') {
            return (
              <button
                key={`metro-${conn.id}`}
                type="button"
                onClick={() => handleChipClick(conn)}
                title={`Ir a Metro ${conn.name}${linesSummary ? ` (${linesSummary})` : ''} · ${conn.distanceMeters} m`}
                className="ios-press shrink-0 min-h-[36px] inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 text-left cursor-pointer transition-colors"
              >
                <MetroDiamondMark className="w-4.5 h-3.5 shrink-0" />
                <span className="sr-only">Metro </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                  {conn.name}
                </span>
                {linesSummary && (
                  <span className="text-[11px] font-semibold text-[#1D3C87] dark:text-sky-300 whitespace-nowrap">
                    {linesSummary}
                  </span>
                )}
                <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200/70 dark:border-zinc-700/70 whitespace-nowrap">
                  {conn.distanceMeters} m
                </span>
              </button>
            );
          }

          if (conn.type === 'cercanias') {
            return (
              <button
                key={`cercanias-${conn.id}`}
                type="button"
                onClick={() => handleChipClick(conn)}
                title={`Ir a Cercanías ${conn.name}${linesSummary ? ` (${linesSummary})` : ''} · ${conn.distanceMeters} m`}
                className="ios-press shrink-0 min-h-[36px] inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#E4002B]/[0.05] hover:bg-[#E4002B]/[0.10] dark:bg-[#E4002B]/15 dark:hover:bg-[#E4002B]/25 border border-[#E4002B]/20 dark:border-[#E4002B]/35 text-left cursor-pointer transition-colors"
              >
                <CercaniasMark className="w-4 h-4 shrink-0" />
                <span className="sr-only">Cercanías </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                  {conn.name}
                </span>
                {linesSummary && (
                  <span className="text-[11px] font-semibold text-[#B90022] dark:text-[#FF7A90] whitespace-nowrap">
                    {linesSummary}
                  </span>
                )}
                <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-[#E4002B]/15 dark:border-[#E4002B]/30 whitespace-nowrap">
                  {conn.distanceMeters} m
                </span>
              </button>
            );
          }

          return (
            <button
              key={`bus-${conn.id}`}
              type="button"
              onClick={() => handleChipClick(conn)}
              title={`Ir a Parada EMT ${conn.id} · ${conn.name}${linesSummary ? ` (${linesSummary})` : ''} · ${conn.distanceMeters} m`}
              className="ios-press shrink-0 min-h-[36px] inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#0072CE]/[0.05] hover:bg-[#0072CE]/[0.10] dark:bg-[#0072CE]/15 dark:hover:bg-[#0072CE]/25 border border-[#0072CE]/20 dark:border-[#0072CE]/35 text-left cursor-pointer transition-colors"
            >
              <EmtBusLogo className="w-4 h-4 shrink-0" />
              <span className="sr-only">Autobús EMT </span>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap tabular-nums">
                Parada {conn.id}
              </span>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 max-w-[130px] truncate">
                {conn.name}
              </span>
              {linesSummary && (
                <span className="text-[11px] font-semibold text-[#005AA3] dark:text-[#60B2FF] whitespace-nowrap">
                  {linesSummary}
                </span>
              )}
              <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-[#0072CE]/15 dark:border-[#0072CE]/30 whitespace-nowrap">
                {conn.distanceMeters} m
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

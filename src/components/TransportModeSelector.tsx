import React from 'react';
import { Layers } from 'lucide-react';
import type { TransportMode } from '../types/transport';
import { MetroDiamondMark, EmtBusLogo, CercaniasMark } from './TransitIcons';
import { triggerHaptic } from '../utils/haptics';

export interface TransportModeSelectorProps {
  mode: TransportMode;
  onChange: (mode: TransportMode) => void;
  className?: string;
  size?: 'sm' | 'md';
}

const MODES: Array<{
  id: TransportMode;
  label: string;
  shortLabel: string;
  bgActive: string;
}> = [
  {
    id: 'all',
    label: 'Todos',
    shortLabel: 'Todos',
    bgActive: 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs',
  },
  {
    id: 'metro',
    label: 'Metro de Madrid',
    shortLabel: 'Metro',
    bgActive: 'bg-[#E30613] text-white shadow-xs',
  },
  {
    id: 'bus',
    label: 'Autobús EMT',
    shortLabel: 'Autobús',
    bgActive: 'bg-[#0072CE] text-white shadow-xs',
  },
  {
    id: 'cercanias',
    label: 'Cercanías',
    shortLabel: 'Cercanías',
    bgActive: 'bg-[#E4002B] text-white shadow-xs',
  },
];

export const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({
  mode,
  onChange,
  className = '',
  size = 'md',
}) => {
  const isSmall = size === 'sm';

  return (
    <div
      role="radiogroup"
      aria-label="Seleccionar modo de transporte"
      className={`inline-flex items-center max-w-full overflow-x-auto no-scrollbar p-1 rounded-xl bg-zinc-200/75 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 ${className}`}
    >
      {MODES.map((item) => {
        const isSelected = mode === item.id;

        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => {
              triggerHaptic('selection');
              onChange(item.id);
            }}
            className={`relative flex items-center justify-center shrink-0 whitespace-nowrap rounded-lg font-semibold transition-all cursor-pointer ios-press ${
              isSmall
                ? 'gap-1.5 px-2.5 py-1 text-xs'
                : 'gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm min-h-[40px]'
            } ${
              isSelected
                ? item.bgActive
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            {item.id === 'all' && (
              <Layers className={isSmall ? 'w-3.5 h-3.5 shrink-0' : 'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0'} />
            )}
            {item.id === 'metro' && (
              <MetroDiamondMark className={isSmall ? 'w-4 h-3 shrink-0' : 'w-4 h-3 sm:w-5 sm:h-3.5 shrink-0'} />
            )}
            {item.id === 'bus' && (
              <EmtBusLogo className={isSmall ? 'w-4 h-4 shrink-0' : 'w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0'} />
            )}
            {item.id === 'cercanias' && (
              <CercaniasMark className={isSmall ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
            )}
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
};

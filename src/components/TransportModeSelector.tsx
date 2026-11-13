import React from 'react';
import { Layers } from 'lucide-react';
import type { TransportMode } from '../types/transport';
import { MetroDiamondMark, EmtBusLogo } from './TransitIcons';
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
      className={`inline-flex items-center p-1 rounded-xl bg-zinc-200/75 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 ${className}`}
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
            className={`relative flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all cursor-pointer ios-press ${
              isSmall
                ? 'px-2.5 py-1 text-xs'
                : 'px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm min-h-[36px]'
            } ${
              isSelected
                ? item.bgActive
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            {item.id === 'all' && (
              <Layers className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            )}
            {item.id === 'metro' && (
              <MetroDiamondMark className={isSmall ? 'w-4 h-3' : 'w-5 h-3.5'} />
            )}
            {item.id === 'bus' && (
              <EmtBusLogo className={isSmall ? 'w-4 h-4' : 'w-4.5 h-4.5'} />
            )}
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
};

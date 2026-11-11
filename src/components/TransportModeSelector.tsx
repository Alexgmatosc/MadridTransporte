import React from 'react';
import { Bus, Train, Layers } from 'lucide-react';
import type { TransportMode } from '../types/transport';

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
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  bgActive: string;
}> = [
  {
    id: 'all',
    label: 'Todos',
    shortLabel: 'Todos',
    icon: Layers,
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    bgActive: 'bg-indigo-600 text-white shadow-xs',
  },
  {
    id: 'metro',
    label: 'Metro de Madrid',
    shortLabel: 'Metro',
    icon: Train,
    accentColor: 'text-rose-600 dark:text-rose-400',
    bgActive: 'bg-rose-600 text-white shadow-xs',
  },
  {
    id: 'bus',
    label: 'Autobús EMT',
    shortLabel: 'Autobús',
    icon: Bus,
    accentColor: 'text-blue-600 dark:text-blue-400',
    bgActive: 'bg-blue-600 text-white shadow-xs',
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
      className={`inline-flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs ${className}`}
    >
      {MODES.map((item) => {
        const isSelected = mode === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(item.id)}
            className={`relative flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all cursor-pointer ios-press ${
              isSmall
                ? 'px-2.5 py-1 text-xs'
                : 'px-3 sm:px-4 py-1.5 text-xs sm:text-sm'
            } ${
              isSelected
                ? item.bgActive
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Icon
              className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${
                isSelected ? 'text-white' : item.accentColor
              }`}
            />
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
};

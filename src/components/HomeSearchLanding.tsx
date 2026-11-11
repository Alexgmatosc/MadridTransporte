import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Bus, Star, Navigation, ArrowRight, X, HelpCircle } from 'lucide-react';
import type { FavoriteStop } from '../types/emt';
import { searchStops, calculateDistanceMeters } from '../services/stopsService';

interface HomeSearchLandingProps {
  onSelectStop: (stopId: string) => void;
  onNearMe: () => void;
  isLocating: boolean;
  favorites: FavoriteStop[];
  userLocation: { lat: number; lon: number } | null;
}

const POPULAR_HUBS = [
  { id: '2279', name: 'Estrella Polar', desc: 'Estrella Polar, 1' },
  { id: '72', name: 'Cibeles', desc: 'Pza. Cibeles / Casa de América' },
  { id: '5443', name: 'Atocha', desc: 'Intercambiador / Estación' },
  { id: '2807', name: 'Moncloa', desc: 'Pza. Moncloa' },
  { id: '85', name: 'Plaza de Castilla', desc: 'Intercambiador' },
  { id: '1042', name: 'Sol - Sevilla', desc: 'Centro de Madrid' },
];

export const HomeSearchLanding: React.FC<HomeSearchLandingProps> = ({
  onSelectStop,
  onNearMe,
  isLocating,
  favorites,
  userLocation,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = query.trim() ? searchStops(query, 30) : [];

  return (
    <div className="flex flex-col gap-6 py-2 sm:py-6 max-w-3xl mx-auto w-full animate-in fade-in duration-200">
      {/* Hero Welcome Card */}
      <div className="text-center flex flex-col items-center px-4 pt-2 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
          <Bus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>MadridTransporte • Red de Movilidad</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          ¿A dónde te mueves en Madrid?
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg">
          Busca por <strong className="text-slate-800 dark:text-slate-200">calle</strong>,{' '}
          <strong className="text-slate-800 dark:text-slate-200">nombre de estación</strong>,{' '}
          <strong className="text-slate-800 dark:text-slate-200">línea</strong> o{' '}
          <strong className="text-slate-800 dark:text-slate-200">código</strong> para ver tiempos de llegada y autobuses GPS en directo.
        </p>
      </div>

      {/* Main Big Search Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xl shadow-blue-500/5">
        <div className="relative flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe una calle (ej. Princesa), parada o línea..."
            aria-label="Buscar paradas o líneas de transporte"
            className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-base sm:text-lg outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick GPS Action Button right under search */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <button
            onClick={onNearMe}
            disabled={isLocating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Obteniendo GPS...' : 'Usar mi ubicación (Paradas cercanas)'}</span>
          </button>

          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
            4.933 paradas oficiales indexadas
          </span>
        </div>

        {/* Live Search Results */}
        {query.trim() && (
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
              <span>Resultados encontrados ({results.length})</span>
              {results.length > 0 && <span className="text-[11px] font-normal lowercase">pulsa para ver llegadas</span>}
            </div>

            {results.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                <Bus className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="font-semibold text-sm">No se encontraron paradas para "{query}"</p>
                <p className="text-xs mt-1 text-slate-400">
                  Prueba buscando por calle (ej. <em>Alcalá</em>), número (ej. <em>2279</em>) o línea (ej. <em>32</em>).
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {results.map((stop) => {
                  let distanceText = '';
                  if (userLocation && stop.lat && stop.lon) {
                    const meters = calculateDistanceMeters(
                      userLocation.lat,
                      userLocation.lon,
                      stop.lat,
                      stop.lon
                    );
                    distanceText = meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
                  }

                  return (
                    <div
                      key={stop.id}
                      onClick={() => onSelectStop(stop.id)}
                      className="p-3 rounded-2xl hover:bg-blue-50/70 dark:hover:bg-slate-800/80 border border-transparent hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-blue-100/70 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <span className="text-[9px] uppercase font-bold opacity-70">Parada</span>
                          <span className="font-black text-sm leading-none">{stop.id}</span>
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {stop.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {stop.address || 'Madrid'}
                          </p>

                          {/* Lines pills */}
                          {stop.lines && stop.lines.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {stop.lines.slice(0, 8).map((line) => (
                                <span
                                  key={line}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                >
                                  {line}
                                </span>
                              ))}
                              {stop.lines.length > 8 && (
                                <span className="text-[10px] text-slate-400 self-center">
                                  +{stop.lines.length - 8} más
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {distanceText && (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                            {distanceText}
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Favorites Section (if any saved) */}
      {!query && favorites.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Tus Paradas Favoritas
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {favorites.map((fav) => (
              <button
                key={fav.id}
                onClick={() => onSelectStop(fav.id)}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {fav.id}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {fav.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{fav.address}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested / Popular Hubs */}
      {!query && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-3">
            Paradas Populares y Puntos Clave
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {POPULAR_HUBS.map((hub) => (
              <button
                key={hub.id}
                onClick={() => onSelectStop(hub.id)}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/80 text-left transition-all flex items-center justify-between gap-2.5 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {hub.id}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {hub.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{hub.desc}</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Tips Cards */}
      {!query && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Por Calle</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Escribe <em>Princesa</em>, <em>Alcalá</em> o <em>Gran Vía</em> para ver todas las paradas en esa vía.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
            <Bus className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Por Línea</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Escribe <em>32</em>, <em>147</em> o <em>C1</em> para encontrar paradas donde para ese autobús.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Por Código</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Si ves el número en el poste (ej. <em>2279</em>), escríbelo directamente para ver sus tiempos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

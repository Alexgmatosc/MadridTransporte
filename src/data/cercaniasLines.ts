import type { CercaniasLineConfig } from '../types/cercanias.ts';

/**
 * Extended metadata for a Renfe Cercanías Madrid line.
 */
export interface CercaniasLine extends CercaniasLineConfig {
  shortName: string;
  headerName: string;
  terminals: string;
  branchOf?: string;
}

/**
 * Official Renfe Cercanías Madrid (Núcleo 10) lines catalog.
 * Hex colors match official CRTM & Renfe GTFS routes.txt definitions,
 * with accessible foreground contrast colors.
 */
export const CERCANIAS_LINES: Record<string, CercaniasLine> = {
  C1: {
    id: 'C1',
    shortName: 'C1',
    name: 'Línea C-1',
    badgeText: 'C1',
    headerName: 'Chamartín - Aeropuerto T4',
    color: '#75B6E0',
    textColor: '#000000',
    origin: 'Madrid-Chamartín-Clara Campoamor',
    destination: 'Madrid-Aeropuerto T4',
    terminals: 'Príncipe Pío / Chamartín ↔ Aeropuerto T4',
  },
  C2: {
    id: 'C2',
    shortName: 'C2',
    name: 'Línea C-2',
    badgeText: 'C2',
    headerName: 'Guadalajara - Chamartín',
    color: '#00943D',
    textColor: '#FFFFFF',
    origin: 'Guadalajara',
    destination: 'Madrid-Chamartín-Clara Campoamor',
    terminals: 'Guadalajara ↔ Alcalá ↔ Chamartín',
  },
  C3: {
    id: 'C3',
    shortName: 'C3',
    name: 'Línea C-3',
    badgeText: 'C3',
    headerName: 'Aranjuez - Chamartín',
    color: '#952585',
    textColor: '#FFFFFF',
    origin: 'Aranjuez',
    destination: 'Madrid-Chamartín-Clara Campoamor',
    terminals: 'Aranjuez ↔ Atocha ↔ Sol ↔ Chamartín',
  },
  C3a: {
    id: 'C3a',
    shortName: 'C3a',
    name: 'Línea C-3a',
    badgeText: 'C3a',
    headerName: 'Aranjuez - El Escorial',
    color: '#952585',
    textColor: '#FFFFFF',
    origin: 'Aranjuez',
    destination: 'El Escorial',
    terminals: 'Aranjuez ↔ Sol ↔ Chamartín ↔ El Escorial',
    branchOf: 'C3',
  },
  C4: {
    id: 'C4',
    shortName: 'C4',
    name: 'Línea C-4',
    badgeText: 'C4',
    headerName: 'Parla - Alcobendas / Colmenar Viejo',
    color: '#2C2A86',
    textColor: '#FFFFFF',
    origin: 'Parla',
    destination: 'Madrid-Chamartín-Clara Campoamor',
    terminals: 'Parla ↔ Atocha ↔ Sol ↔ Chamartín',
  },
  C4a: {
    id: 'C4a',
    shortName: 'C4a',
    name: 'Línea C-4a',
    badgeText: 'C4a',
    headerName: 'Parla - Alcobendas-S.S. de los Reyes',
    color: '#2C2A86',
    textColor: '#FFFFFF',
    origin: 'Parla',
    destination: 'Alcobendas-San Sebastián de los Reyes',
    terminals: 'Parla ↔ Sol ↔ Alcobendas-S.S. Reyes',
    branchOf: 'C4',
  },
  C4b: {
    id: 'C4b',
    shortName: 'C4b',
    name: 'Línea C-4b',
    badgeText: 'C4b',
    headerName: 'Parla - Colmenar Viejo',
    color: '#2C2A86',
    textColor: '#FFFFFF',
    origin: 'Parla',
    destination: 'Colmenar Viejo',
    terminals: 'Parla ↔ Sol ↔ Tres Cantos ↔ Colmenar Viejo',
    branchOf: 'C4',
  },
  C5: {
    id: 'C5',
    shortName: 'C5',
    name: 'Línea C-5',
    badgeText: 'C5',
    headerName: 'Móstoles-El Soto - Atocha - Humanes',
    color: '#FECB00',
    textColor: '#000000',
    origin: 'Móstoles-El Soto',
    destination: 'Humanes',
    terminals: 'Móstoles-El Soto ↔ Atocha ↔ Fuenlabrada ↔ Humanes',
  },
  C7: {
    id: 'C7',
    shortName: 'C7',
    name: 'Línea C-7',
    badgeText: 'C7',
    headerName: 'Alcalá de Henares - Príncipe Pío',
    color: '#E5202A',
    textColor: '#FFFFFF',
    origin: 'Alcalá de Henares',
    destination: 'Madrid-Príncipe Pío',
    terminals: 'Alcalá de Henares ↔ Atocha ↔ Chamartín ↔ Príncipe Pío',
  },
  C8: {
    id: 'C8',
    shortName: 'C8',
    name: 'Línea C-8',
    badgeText: 'C8',
    headerName: 'Guadalajara - El Escorial / Cercedilla',
    color: '#868584',
    textColor: '#FFFFFF',
    origin: 'Madrid-Chamartín-Clara Campoamor',
    destination: 'Cercedilla',
    terminals: 'Chamartín ↔ Villalba ↔ El Escorial / Cercedilla',
  },
  C8a: {
    id: 'C8a',
    shortName: 'C8a',
    name: 'Línea C-8a',
    badgeText: 'C8a',
    headerName: 'Chamartín - El Escorial - Santa María de la Alameda',
    color: '#868584',
    textColor: '#FFFFFF',
    origin: 'Madrid-Chamartín-Clara Campoamor',
    destination: 'El Escorial',
    terminals: 'Chamartín ↔ Villalba ↔ El Escorial',
    branchOf: 'C8',
  },
  C8b: {
    id: 'C8b',
    shortName: 'C8b',
    name: 'Línea C-8b',
    badgeText: 'C8b',
    headerName: 'Chamartín - Cercedilla',
    color: '#868584',
    textColor: '#FFFFFF',
    origin: 'Madrid-Chamartín-Clara Campoamor',
    destination: 'Cercedilla',
    terminals: 'Chamartín ↔ Villalba ↔ Cercedilla',
    branchOf: 'C8',
  },
  C9: {
    id: 'C9',
    shortName: 'C9',
    name: 'Línea C-9',
    badgeText: 'C9',
    headerName: 'Cercedilla - Los Cotos',
    color: '#915419',
    textColor: '#FFFFFF',
    origin: 'Cercedilla',
    destination: 'Los Cotos',
    terminals: 'Cercedilla ↔ Puerto de Navacerrada ↔ Los Cotos',
  },
  C10: {
    id: 'C10',
    shortName: 'C10',
    name: 'Línea C-10',
    badgeText: 'C10',
    headerName: 'Villalba - Príncipe Pío - Chamartín',
    color: '#BCCF00',
    textColor: '#000000',
    origin: 'Villalba de Guadarrama',
    destination: 'Madrid-Chamartín-Clara Campoamor',
    terminals: 'Villalba ↔ Príncipe Pío ↔ Atocha ↔ Chamartín',
  },
};

/**
 * Ordered list of all 14 Cercanías Madrid lines and sub-branches.
 */
export const CERCANIAS_LINES_LIST: CercaniasLine[] = Object.values(CERCANIAS_LINES);

const CANONICAL_CASE_MAP: Record<string, string> = Object.keys(CERCANIAS_LINES).reduce<
  Record<string, string>
>((acc, key) => {
  acc[key.toUpperCase()] = key;
  return acc;
}, {});

/**
 * Normalizes input line identifier, routeId, or tripId suffix to canonical key:
 * - "c5", "5", "C-5", "Linea C5", "L5" -> "C5"
 * - "c4a", "4A", "C4A" -> "C4a"
 * - "10T0017C5" (GTFS routeId) -> "C5"
 * - "1016V20703C5" (GTFS-RT tripId) -> "C5"
 */
export function normalizeCercaniasLineKey(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return '';

  const upper = trimmed
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Direct canonical match (case-insensitive)
  if (CANONICAL_CASE_MAP[upper]) {
    return CANONICAL_CASE_MAP[upper];
  }

  // GTFS routeId or tripId ending in C1..C10 / C3a / C4a / C4b / C8a / C8b
  // e.g. "10T0017C5", "10T0013C4a", "1016V20703C5", "10T0003C10"
  const gtfsSuffix = upper.match(/(C(?:10|[1-9][AB]?))$/);
  if (gtfsSuffix && CANONICAL_CASE_MAP[gtfsSuffix[1]]) {
    return CANONICAL_CASE_MAP[gtfsSuffix[1]];
  }

  // Strip "LINEA", "L", "C-", "C ", hyphens/spaces
  const cleaned = upper
    .replace(/^(?:LINEA|L)\s*/i, '')
    .replace(/^C[\s-]*/i, '')
    .trim();

  const candidate = `C${cleaned}`;
  if (CANONICAL_CASE_MAP[candidate]) {
    return CANONICAL_CASE_MAP[candidate];
  }

  return trimmed;
}

/**
 * Retrieves Cercanías line configuration by line code, alias, routeId, or tripId.
 */
export function getCercaniasLine(id: string): CercaniasLine | undefined {
  if (!id) return undefined;
  const direct = CERCANIAS_LINES[id];
  if (direct) return direct;

  const key = normalizeCercaniasLineKey(id);
  return CERCANIAS_LINES[key];
}

/**
 * Resolves the official hex background color for a Cercanías line.
 * Defaults to Renfe Cercanías red '#D52B1E' if line is unknown.
 */
export function getCercaniasLineColor(id: string): string {
  const line = getCercaniasLine(id);
  return line ? line.color : '#D52B1E';
}

/**
 * Formats a visual badge specification for a Cercanías line.
 */
export function formatCercaniasLineBadge(id: string): {
  label: string;
  bg: string;
  text: string;
} {
  const line = getCercaniasLine(id);
  if (!line) {
    return {
      label: id.trim() || 'C',
      bg: '#D52B1E',
      text: '#FFFFFF',
    };
  }

  return {
    label: line.badgeText,
    bg: line.color,
    text: line.textColor,
  };
}

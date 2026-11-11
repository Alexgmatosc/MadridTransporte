import type { MetroLineConfig } from '../types/metro';

/**
 * Extended metadata for a Metro / Metro Ligero line.
 */
export interface MetroLine extends MetroLineConfig {
  shortName: string;
  headerName: string;
  terminals: string;
  type: 'metro' | 'ramal' | 'metro_ligero';
  isCircular?: boolean;
  borderColor?: string;
}

/**
 * Official Metro de Madrid & Metro Ligero lines catalog.
 * Hex colors, text contrast colors, and terminus names are verified against CRTM GTFS feeds.
 */
export const METRO_LINES: Record<string, MetroLine> = {
  '1': {
    id: '1',
    shortName: '1',
    name: 'Línea 1',
    badgeText: '1',
    headerName: 'Pinar de Chamartín - Valdecarros',
    color: '#2DBEF0',
    textColor: '#FFFFFF',
    origin: 'Pinar de Chamartín',
    destination: 'Valdecarros',
    terminals: 'Pinar de Chamartín ↔ Valdecarros',
    type: 'metro',
  },
  '2': {
    id: '2',
    shortName: '2',
    name: 'Línea 2',
    badgeText: '2',
    headerName: 'Las Rosas - Cuatro Caminos',
    color: '#ED1C24',
    textColor: '#FFFFFF',
    origin: 'Las Rosas',
    destination: 'Cuatro Caminos',
    terminals: 'Las Rosas ↔ Cuatro Caminos',
    type: 'metro',
  },
  '3': {
    id: '3',
    shortName: '3',
    name: 'Línea 3',
    badgeText: '3',
    headerName: 'Moncloa - El Casar',
    color: '#FFD000',
    textColor: '#000000',
    origin: 'Moncloa',
    destination: 'El Casar',
    terminals: 'Moncloa ↔ El Casar',
    type: 'metro',
  },
  '4': {
    id: '4',
    shortName: '4',
    name: 'Línea 4',
    badgeText: '4',
    headerName: 'Argüelles - Pinar de Chamartín',
    color: '#B65518',
    textColor: '#FFFFFF',
    origin: 'Argüelles',
    destination: 'Pinar de Chamartín',
    terminals: 'Argüelles ↔ Pinar de Chamartín',
    type: 'metro',
  },
  '5': {
    id: '5',
    shortName: '5',
    name: 'Línea 5',
    badgeText: '5',
    headerName: 'Alameda de Osuna - Casa de Campo',
    color: '#8FD400',
    textColor: '#FFFFFF',
    origin: 'Alameda de Osuna',
    destination: 'Casa de Campo',
    terminals: 'Alameda de Osuna ↔ Casa de Campo',
    type: 'metro',
  },
  '6': {
    id: '6',
    shortName: '6',
    name: 'Línea 6',
    badgeText: '6',
    headerName: 'Circular',
    color: '#98989B',
    textColor: '#FFFFFF',
    origin: 'Laguna',
    destination: 'Lucero',
    terminals: 'Circular (Laguna ↔ Cuatro Caminos ↔ Legazpi)',
    type: 'metro',
    isCircular: true,
  },
  '7': {
    id: '7',
    shortName: '7',
    name: 'Línea 7',
    badgeText: '7',
    headerName: 'Hospital del Henares - Pitis',
    color: '#EE7518',
    textColor: '#FFFFFF',
    origin: 'Hospital del Henares',
    destination: 'Pitis',
    terminals: 'Hospital del Henares ↔ Pitis',
    type: 'metro',
  },
  '8': {
    id: '8',
    shortName: '8',
    name: 'Línea 8',
    badgeText: '8',
    headerName: 'Nuevos Ministerios - Aeropuerto T4',
    color: '#EC82B1',
    textColor: '#FFFFFF',
    origin: 'Nuevos Ministerios',
    destination: 'Aeropuerto T4',
    terminals: 'Nuevos Ministerios ↔ Aeropuerto T4',
    type: 'metro',
  },
  '9': {
    id: '9',
    shortName: '9',
    name: 'Línea 9',
    badgeText: '9',
    headerName: 'Paco de Lucía - Arganda del Rey',
    color: '#A60084',
    textColor: '#FFFFFF',
    origin: 'Paco de Lucía',
    destination: 'Arganda del Rey',
    terminals: 'Paco de Lucía ↔ Arganda del Rey',
    type: 'metro',
  },
  '10': {
    id: '10',
    shortName: '10',
    name: 'Línea 10',
    badgeText: '10',
    headerName: 'Hospital Infanta Sofía - Puerta del Sur',
    color: '#005AA9',
    textColor: '#FFFFFF',
    origin: 'Hospital Infanta Sofía',
    destination: 'Puerta del Sur',
    terminals: 'Hospital Infanta Sofía ↔ Puerta del Sur',
    type: 'metro',
  },
  '11': {
    id: '11',
    shortName: '11',
    name: 'Línea 11',
    badgeText: '11',
    headerName: 'Plaza Elíptica - La Fortuna',
    color: '#009B3A',
    textColor: '#FFFFFF',
    origin: 'Plaza Elíptica',
    destination: 'La Fortuna',
    terminals: 'Plaza Elíptica ↔ La Fortuna',
    type: 'metro',
  },
  '12': {
    id: '12',
    shortName: '12',
    name: 'Línea 12',
    badgeText: '12',
    headerName: 'MetroSur',
    color: '#A49800',
    textColor: '#FFFFFF',
    origin: 'Puerta del Sur',
    destination: 'San Nicasio',
    terminals: 'MetroSur (Circular)',
    type: 'metro',
    isCircular: true,
  },
  'R': {
    id: 'R',
    shortName: 'R',
    name: 'Ramal',
    badgeText: 'R',
    headerName: 'Ópera - Príncipe Pío',
    color: '#FFFFFF',
    textColor: '#005AA9',
    borderColor: '#005AA9',
    origin: 'Ópera',
    destination: 'Príncipe Pío',
    terminals: 'Ópera ↔ Príncipe Pío',
    type: 'ramal',
  },
  'ML1': {
    id: 'ML1',
    shortName: 'ML1',
    name: 'Metro Ligero 1',
    badgeText: 'ML1',
    headerName: 'Pinar de Chamartín - Las Tablas',
    color: '#3A7DDA',
    textColor: '#FFFFFF',
    origin: 'Pinar de Chamartín',
    destination: 'Las Tablas',
    terminals: 'Pinar de Chamartín ↔ Las Tablas',
    type: 'metro_ligero',
  },
  'ML2': {
    id: 'ML2',
    shortName: 'ML2',
    name: 'Metro Ligero 2',
    badgeText: 'ML2',
    headerName: 'Colonia Jardín - Estación de Aravaca',
    color: '#A60084',
    textColor: '#FFFFFF',
    origin: 'Colonia Jardín',
    destination: 'Estación de Aravaca',
    terminals: 'Colonia Jardín ↔ Estación de Aravaca',
    type: 'metro_ligero',
  },
  'ML3': {
    id: 'ML3',
    shortName: 'ML3',
    name: 'Metro Ligero 3',
    badgeText: 'ML3',
    headerName: 'Colonia Jardín - Puerta de Boadilla',
    color: '#ED1C24',
    textColor: '#FFFFFF',
    origin: 'Colonia Jardín',
    destination: 'Puerta de Boadilla',
    terminals: 'Colonia Jardín ↔ Puerta de Boadilla',
    type: 'metro_ligero',
  },
};

/**
 * Ordered list of all 16 Metro & Metro Ligero lines.
 */
export const METRO_LINES_LIST: MetroLine[] = Object.values(METRO_LINES);

/**
 * Normalizes input line identifier (e.g. "L1", "l1", "Linea 1", "linea 10", "Ramal")
 * to canonical line key ("1", "10", "R", "ML1").
 */
function normalizeLineKey(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return '';

  const upper = trimmed
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (upper === 'RAMAL' || upper === 'R') return 'R';
  if (upper === 'METROSUR' || upper === 'SUR') return '12';
  if (upper === 'CIRCULAR') return '6';

  // Handle "METRO LIGERO 1" -> "ML1", "ML 1" -> "ML1"
  const mlMatch = upper.match(/^(?:METRO\s*LIGERO|ML)\s*([123])$/);
  if (mlMatch) {
    return `ML${mlMatch[1]}`;
  }

  // Handle "LINEA 1", "L1", "1"
  const lineaMatch = upper.match(/^(?:LINEA\s*|L)?(\d{1,2}|R|ML[123])$/);
  if (lineaMatch) {
    return lineaMatch[1];
  }

  return upper;
}

/**
 * Retrieves line configuration by identifier, supporting variations like "1", "L1", "Linea 1", "R", "ML1".
 */
export function getMetroLine(id: string): MetroLineConfig | undefined {
  if (!id) return undefined;
  const direct = METRO_LINES[id];
  if (direct) return direct;

  const key = normalizeLineKey(id);
  return METRO_LINES[key];
}

/**
 * Resolves the official hex background color for a Metro line.
 * Defaults to '#005AA9' (Metro blue) if line is unknown.
 */
export function getMetroLineColor(id: string): string {
  const line = getMetroLine(id);
  return line ? line.color : '#005AA9';
}

/**
 * Formats a visual badge specification for a Metro line.
 */
export function formatMetroLineBadge(id: string): {
  label: string;
  bg: string;
  text: string;
  border?: string;
} {
  const line = getMetroLine(id) as MetroLine | undefined;
  if (!line) {
    return {
      label: id,
      bg: '#005AA9',
      text: '#FFFFFF',
    };
  }

  return {
    label: line.badgeText,
    bg: line.color,
    text: line.textColor,
    border: line.borderColor,
  };
}

import type {
  MetroPlatformEstimate,
  MetroStationEstimatesResponse,
  RawMetroResponse,
  RawMetroTeleindicador,
} from '../types/metro';
import { formatMetroLineCode } from '../types/metro';

export const METRO_BASE_URL = 'https://serviciosapp.metromadrid.es/servicios/rest/teleindicadores';

/**
 * Maps a single raw teleindicador record into normalized MetroPlatformEstimate
 */
export function formatMetroEstimate(raw: {
  linea: number;
  nombreli?: string;
  estaciontel?: number;
  idnumerica?: number;
  nombreest?: string;
  anden: number;
  sentido?: string;
  proximo: number | null;
  siguiente: number | null;
  fechaHoraEmisionPrevision?: string;
  FECHAHORAEMISIONPREVISION?: string;
}): MetroPlatformEstimate {
  const rawLine = raw.linea;
  const line = formatMetroLineCode(rawLine);
  const lineName = (raw.nombreli || '').trim();
  const destination = (raw.sentido || '').trim();
  const platform = Number(raw.anden) || 1;

  const proximo = raw.proximo !== null && raw.proximo !== undefined ? Number(raw.proximo) : null;
  const siguiente = raw.siguiente !== null && raw.siguiente !== undefined ? Number(raw.siguiente) : null;

  let eta = 'Sin estimación';
  let etaMinutes: number | null = null;
  let nextMinutes: number | null = null;
  let followingMinutes: number | null = null;
  let secondaryEta: string | undefined = undefined;

  if (proximo === 0) {
    eta = 'Llegando';
    etaMinutes = 0;
    nextMinutes = 0;
    followingMinutes = siguiente;
  } else if (proximo !== null && proximo > 0) {
    eta = `${proximo} min`;
    etaMinutes = proximo;
    nextMinutes = proximo;
    followingMinutes = siguiente;
  } else if (proximo === null && siguiente !== null) {
    eta = `${siguiente} min`;
    etaMinutes = siguiente;
    nextMinutes = siguiente;
    followingMinutes = null;
  }

  if (proximo !== null && siguiente !== null) {
    secondaryEta = `Sig: ${siguiente} min`;
  }

  const timestamp =
    raw.fechaHoraEmisionPrevision ||
    raw.FECHAHORAEMISIONPREVISION ||
    new Date().toISOString();

  return {
    line,
    rawLine,
    lineName,
    platform,
    destination,
    proximoMinutes: proximo,
    siguienteMinutes: siguiente,
    nextMinutes,
    followingMinutes,
    eta,
    etaMinutes,
    secondaryEta,
    timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Robust payload parser supporting both JSON and XML responses
 * Handles browser DOMParser and fallback regex parser
 */
export function parseMetroPayload(payload: string, stationCode: string): MetroStationEstimatesResponse {
  const timestamp = Date.now();
  const trimmed = (payload || '').trim();

  if (!trimmed) {
    return {
      stationCode,
      stationId: stationCode,
      stationName: `Estación ${stationCode}`,
      estimates: [],
      timestamp,
      error: 'Respuesta vacía del servidor.',
    };
  }

  // 1. JSON Parsing Attempt
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data: RawMetroResponse = JSON.parse(trimmed);

      // Handle API-level error responses (e.g. {"status":400,"message":"..."})
      if (data.status && data.status >= 400) {
        return {
          stationCode,
          stationId: stationCode,
          stationName: `Estación ${stationCode}`,
          estimates: [],
          timestamp,
          error: data.message || `Error ${data.status} de la API de Metro`,
        };
      }

      const items = Array.isArray(data.Vtelindicadores) ? data.Vtelindicadores : [];
      const stationName = items[0]?.nombreest?.trim() || `Estación ${stationCode}`;

      const estimates = items.map((item: RawMetroTeleindicador) => formatMetroEstimate(item));
      sortEstimates(estimates);

      return {
        stationCode,
        stationId: stationCode,
        stationName,
        estimates,
        timestamp,
      };
    } catch {
      // Fall through to XML parsing
    }
  }

  // 2. XML Parsing (Browser DOMParser or Regex fallback)
  if (trimmed.startsWith('<')) {
    const estimates: MetroPlatformEstimate[] = [];
    let stationName = `Estación ${stationCode}`;

    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(trimmed, 'application/xml');
        const nodes = Array.from(doc.getElementsByTagName('Vtelindicadores'));

        for (const node of nodes) {
          const rawLine = parseInt(node.getElementsByTagName('linea')[0]?.textContent || '0', 10);
          const stNameNode = node.getElementsByTagName('nombreest')[0]?.textContent?.trim();
          if (stNameNode) stationName = stNameNode;

          const lineName = (node.getElementsByTagName('nombreli')[0]?.textContent || '').trim();
          const platform = parseInt(node.getElementsByTagName('anden')[0]?.textContent || '1', 10);
          const destination = (node.getElementsByTagName('sentido')[0]?.textContent || '').trim();

          const pText = node.getElementsByTagName('proximo')[0]?.textContent?.trim();
          const sText = node.getElementsByTagName('siguiente')[0]?.textContent?.trim();
          const proximo = pText && !isNaN(Number(pText)) ? parseInt(pText, 10) : null;
          const siguiente = sText && !isNaN(Number(sText)) ? parseInt(sText, 10) : null;

          const emitDate =
            node.getElementsByTagName('fechaHoraEmisionPrevision')[0]?.textContent?.trim() ||
            node.getElementsByTagName('FECHAHORAEMISIONPREVISION')[0]?.textContent?.trim();

          estimates.push(
            formatMetroEstimate({
              linea: rawLine,
              nombreli: lineName,
              anden: platform,
              sentido: destination,
              proximo,
              siguiente,
              fechaHoraEmisionPrevision: emitDate,
            })
          );
        }
      } catch {
        // Fall back to regex
      }
    }

    // Fallback regex parsing if DOMParser is unavailable or yielded 0 records
    if (estimates.length === 0) {
      const recordMatches = trimmed.match(/<Vtelindicadores>[\s\S]*?<\/Vtelindicadores>/gi) || [];
      for (const recordXml of recordMatches) {
        const getTag = (tag: string) => {
          const m = recordXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
          return m ? m[1].trim() : '';
        };

        const rawLine = parseInt(getTag('linea') || '0', 10);
        const stName = getTag('nombreest');
        if (stName) stationName = stName;

        const lineName = getTag('nombreli');
        const platform = parseInt(getTag('anden') || '1', 10);
        const destination = getTag('sentido');

        const pText = getTag('proximo');
        const sText = getTag('siguiente');
        const proximo = pText && !isNaN(Number(pText)) ? parseInt(pText, 10) : null;
        const siguiente = sText && !isNaN(Number(sText)) ? parseInt(sText, 10) : null;

        const emitDate = getTag('fechaHoraEmisionPrevision') || getTag('FECHAHORAEMISIONPREVISION');

        estimates.push(
          formatMetroEstimate({
            linea: rawLine,
            nombreli: lineName,
            anden: platform,
            sentido: destination,
            proximo,
            siguiente,
            fechaHoraEmisionPrevision: emitDate,
          })
        );
      }
    }

    sortEstimates(estimates);

    return {
      stationCode,
      stationId: stationCode,
      stationName,
      estimates,
      timestamp,
      ...(estimates.length === 0 ? { error: 'No se encontraron estimaciones en el XML.' } : {}),
    };
  }

  return {
    stationCode,
    stationId: stationCode,
    stationName: `Estación ${stationCode}`,
    estimates: [],
    timestamp,
    error: 'Formato de respuesta no reconocido.',
  };
}

/**
 * Sort estimates: soonest arriving trains first, then by line and platform
 */
function sortEstimates(estimates: MetroPlatformEstimate[]): void {
  estimates.sort((a, b) => {
    const aMin = a.etaMinutes !== null ? a.etaMinutes : 9999;
    const bMin = b.etaMinutes !== null ? b.etaMinutes : 9999;
    if (aMin !== bMin) return aMin - bMin;
    if (a.rawLine !== b.rawLine) return a.rawLine - b.rawLine;
    return a.platform - b.platform;
  });
}

/**
 * Fetches live real-time estimates for a Metro station code
 * Executes multi-tier fetching with automatic fallbacks:
 * 1. Vite dev proxy / Vercel production rewrite (/api/metro/{code})
 * 2. Direct fetch to Metro de Madrid REST API
 * 3. Public CORS proxy raw endpoint (allorigins)
 * 4. Secondary CORS proxy (corsproxy.io)
 * 5. Public CORS proxy get endpoint with JSON wrapper (allorigins/get)
 */
export async function fetchMetroEstimates(stationCode: string): Promise<MetroStationEstimatesResponse> {
  const cleanCode = (stationCode || '').trim();
  if (!cleanCode || !/^\d+$/.test(cleanCode)) {
    throw new Error('El código de estación debe ser un valor numérico.');
  }

  const remoteUrl = `${METRO_BASE_URL}/${encodeURIComponent(cleanCode)}`;

  const endpoints = [
    // 1. Primary: Local dev proxy or Vercel serverless rewrite
    `/api/metro/${encodeURIComponent(cleanCode)}`,
    // 2. Direct fetch (if environment allows or native web view)
    remoteUrl,
    // 3. Fallback: allorigins.win raw
    `https://api.allorigins.win/raw?url=${encodeURIComponent(remoteUrl)}`,
    // 4. Fallback: corsproxy.io
    `https://corsproxy.io/?url=${encodeURIComponent(remoteUrl)}`,
    // 5. Fallback: allorigins.win get wrapper
    `https://api.allorigins.win/get?url=${encodeURIComponent(remoteUrl)}`,
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const isGetWrapper = endpoint.includes('/get?url=');
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        continue;
      }

      let payload = await response.text();
      if (!payload || !payload.trim()) {
        continue;
      }

      if (isGetWrapper) {
        try {
          const wrapper = JSON.parse(payload);
          if (wrapper && typeof wrapper.contents === 'string') {
            payload = wrapper.contents;
          }
        } catch {
          // Continue with original payload
        }
      }

      const result = parseMetroPayload(payload, cleanCode);
      if (result.error && result.estimates.length === 0 && !payload.includes('"Vtelindicadores":[]')) {
        // If an explicit error was returned by this endpoint (and not just legitimate empty list), continue
        continue;
      }

      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(
    `No se pudieron cargar las estimaciones para la estación ${cleanCode}. (${lastError?.message || 'Error de conexión'})`
  );
}

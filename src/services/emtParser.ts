import type { BusEstimate, StopEstimatesResponse } from '../types/emt';

/**
 * Extracts numeric minutes from ETA string for sorting
 * "Llegando" -> 0
 * "0 min" -> 0
 * "3 min" -> 3
 * ">20 min" or "> 20 min" -> 21
 */
export function parseEtaMinutes(eta: string): number | null {
  const lower = eta.toLowerCase().trim();
  if (lower.includes('llegando') || lower.includes('inminente')) {
    return 0;
  }
  if (lower.startsWith('>') || lower.includes('mas de') || lower.includes('más de')) {
    const num = lower.match(/\d+/);
    return num ? parseInt(num[0], 10) + 1 : 999;
  }
  const match = lower.match(/(\d+)\s*min/);
  if (match) {
    return parseInt(match[1], 10);
  }
  const anyNum = lower.match(/\d+/);
  return anyNum ? parseInt(anyNum[0], 10) : null;
}

/**
 * Extracts lat and lon from Google Maps URL:
 * https://maps.google.com/?q=40.41691748660822,-3.700048299886669
 */
export function extractCoordinates(url: string | null | undefined): { lat: number; lon: number } | null {
  if (!url) return null;
  const match = url.match(/[?&]q=([-+]?\d*\.?\d+),([-+]?\d*\.?\d+)/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { lat, lon };
    }
  }
  return null;
}

/**
 * Parses PMVVisor HTML into structured StopEstimatesResponse
 */
export function parsePMVHtml(html: string, fallbackStopId: string): StopEstimatesResponse {
  const timestamp = Date.now();

  // Check for error text in HTML
  if (html.includes('Error al obtener las estimaciones') || html.includes('no existe la parada')) {
    return {
      stopId: fallbackStopId,
      stopName: `Parada ${fallbackStopId}`,
      address: '',
      estimates: [],
      timestamp,
      error: 'No se encontraron estimaciones en tiempo real para esta parada.',
    };
  }

  let stopId = fallbackStopId;
  let stopName = '';
  let address = '';
  const estimates: BusEstimate[] = [];

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract headers (Parada, Address)
    const h2Elements = Array.from(doc.querySelectorAll('h2'));
    for (const h2 of h2Elements) {
      const text = h2.textContent?.trim() || '';
      if (text.startsWith('Parada:')) {
        const withoutPrefix = text.replace(/^Parada:\s*/i, '');
        const match = withoutPrefix.match(/^(\d+)\s*(?:[-–]\s*)?(.*)$/);
        if (match) {
          stopId = match[1];
          stopName = match[2] || `Parada ${stopId}`;
        } else {
          stopName = withoutPrefix;
        }
      } else if (!address && !text.toLowerCase().includes('estimaciones') && !text.toLowerCase().includes('línea') && !text.toLowerCase().includes('hacia') && !text.toLowerCase().includes('tiempo') && !text.toLowerCase().includes('dónde')) {
        address = text;
      }
    }

    // Extract estimates table
    const rows = Array.from(doc.querySelectorAll('table tr'));
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 3) continue;

      const lineText = cells[0].textContent?.trim() || '';
      const destText = cells[1].textContent?.trim() || '';
      const etaText = cells[2].textContent?.trim() || '';

      // Skip header row
      if (
        lineText.toLowerCase().includes('línea') ||
        lineText.toLowerCase().includes('linea') ||
        destText.toLowerCase().includes('hacia')
      ) {
        continue;
      }

      if (!lineText) continue;

      let coords: { lat: number; lon: number } | null = null;
      let mapsUrl: string | undefined = undefined;

      // Coordinate link in cell 3 or any link in row
      const mapLink = row.querySelector('a[href*="maps.google.com"]');
      if (mapLink) {
        const href = mapLink.getAttribute('href');
        if (href) {
          mapsUrl = href;
          coords = extractCoordinates(href);
        }
      }

      estimates.push({
        line: lineText,
        destination: destText,
        eta: etaText || 'N/D',
        etaMinutes: parseEtaMinutes(etaText),
        coordinates: coords,
        mapsUrl,
      });
    }
  } else {
    // Fallback regex parsing (for non-browser test environments)
    const paradaMatch = html.match(/Parada:\s*(\d+)\s*(.*?)(?:<\/h2>|$)/i);
    if (paradaMatch) {
      stopId = paradaMatch[1];
      stopName = paradaMatch[2].replace(/^[-–]\s*/, '').trim();
    }

    const rowMatches = html.match(/<tr>[\s\S]*?<\/tr>/gi) || [];
    for (const r of rowMatches) {
      if (r.toLowerCase().includes('l&iacute;nea') || r.toLowerCase().includes('hacia')) continue;
      const tdMatches = Array.from(r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(m =>
        m[1].replace(/<[^>]+>/g, '').trim()
      );
      if (tdMatches.length >= 3 && tdMatches[0]) {
        const linkMatch = r.match(/href=["'](https:\/\/maps\.google\.com\/\?q=[^"']+)["']/i);
        const mapsUrl = linkMatch ? linkMatch[1] : undefined;
        estimates.push({
          line: tdMatches[0],
          destination: tdMatches[1],
          eta: tdMatches[2] || 'N/D',
          etaMinutes: parseEtaMinutes(tdMatches[2]),
          coordinates: extractCoordinates(mapsUrl),
          mapsUrl,
        });
      }
    }
  }

  // Sort estimates by ETA ascending (soonest first)
  estimates.sort((a, b) => {
    const aMin = a.etaMinutes ?? 999;
    const bMin = b.etaMinutes ?? 999;
    return aMin - bMin;
  });

  return {
    stopId,
    stopName: stopName || `Parada ${stopId}`,
    address,
    estimates,
    timestamp,
  };
}

/**
 * Fetches real-time estimates from EMT Madrid PMVVisor with fallbacks
 */
export async function fetchStopEstimates(stopId: string): Promise<StopEstimatesResponse> {
  const targetUrl = `https://www.emtmadrid.es/PMVVisor/pmv.aspx?stopnum=${encodeURIComponent(stopId)}`;
  const endpoints = [
    // 1. Direct fetch (EMT Madrid supports CORS Access-Control-Allow-Origin: *)
    targetUrl,
    // 2. Vite dev proxy endpoint
    `/api/pmv?stopnum=${encodeURIComponent(stopId)}`,
    // 3. Public CORS proxy fallback
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    // 4. Secondary CORS proxy fallback
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        cache: 'no-store',
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml',
        },
      });

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      if (!html || !html.trim()) {
        continue;
      }

      return parsePMVHtml(html, stopId);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to next fallback
    }
  }

  // If all endpoints failed
  throw new Error(
    `No se pudieron cargar los tiempos de espera para la parada ${stopId}. Verifique su conexión de red. (${lastError?.message || 'Error de red'})`
  );
}

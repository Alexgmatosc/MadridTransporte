import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchMetroEstimates,
  METRO_BASE_URL,
} from '../metroApi';
import { formatMetroLineCode } from '../../types/metro';

describe('Empirical Challenger 2: Proxy, Fallback Cascade & Line Code Stress Testing', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('formatMetroLineCode empirical stress test', () => {
    it('accurately maps all official Teleindicadores line numbers', () => {
      // 0 = Ramal
      expect(formatMetroLineCode(0)).toBe('R');
      // 51 = Metro Ligero 1
      expect(formatMetroLineCode(51)).toBe('ML1');
      // 1..12 = Metro Lines 1 to 12
      for (let i = 1; i <= 12; i++) {
        expect(formatMetroLineCode(i)).toBe(String(i));
      }
    });

    it('handles boundary and non-standard numeric inputs without throwing', () => {
      expect(formatMetroLineCode(100)).toBe('100');
      expect(formatMetroLineCode(-1)).toBe('-1');
      expect(formatMetroLineCode(0.5)).toBe('0.5');
      expect(formatMetroLineCode(NaN)).toBe('NaN');
      expect(formatMetroLineCode(Infinity)).toBe('Infinity');
    });

    it('evaluates behavior for ML2 (52) and ML3 (53)', () => {
      // Documenting existing behavior: returns "52" and "53"
      expect(formatMetroLineCode(52)).toBe('52');
      expect(formatMetroLineCode(53)).toBe('53');
    });
  });

  describe('Multi-Tier Fallback Cascade Mechanics', () => {
    const mockJsonValid = JSON.stringify({
      Vtelindicadores: [
        {
          linea: 1,
          nombreli: 'PINAR DE CHAMARTIN-VALDECARROS',
          idnumerica: 112,
          nombreest: 'Sol',
          anden: 1,
          sentido: 'Valdecarros',
          proximo: 2,
          siguiente: 5,
        },
      ],
    });

    const mockXmlValid = `
      <VtelindicadoresCollection>
        <Vtelindicadores>
          <linea>51</linea>
          <nombreli>PINAR DE CHAMARTIN-LAS TABLAS</nombreli>
          <idnumerica>1053</idnumerica>
          <nombreest>Las Tablas</nombreest>
          <anden>1</anden>
          <sentido>Las Tablas</sentido>
          <proximo>3</proximo>
          <siguiente>7</siguiente>
        </Vtelindicadores>
      </VtelindicadoresCollection>
    `;

    it('Scenario 1: Full Cascade Tier 1 -> Tier 2 -> Tier 3 -> Tier 4 -> Tier 5', async () => {
      // Tiers 1-4 fail, Tier 5 succeeds via allorigins get wrapper
      const fetchCalls: string[] = [];
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        fetchCalls.push(url);
        if (url.startsWith('/api/metro/')) {
          // Tier 1: 502 Bad Gateway
          return { ok: false, status: 502, text: async () => 'Bad Gateway' };
        }
        if (url.startsWith(METRO_BASE_URL)) {
          // Tier 2: Network error (CORS preflight fail)
          throw new TypeError('Failed to fetch (CORS block)');
        }
        if (url.includes('api.allorigins.win/raw')) {
          // Tier 3: 504 Gateway Timeout
          return { ok: false, status: 504, text: async () => 'Timeout' };
        }
        if (url.includes('corsproxy.io')) {
          // Tier 4: Rate limit 429
          return { ok: false, status: 429, text: async () => 'Too Many Requests' };
        }
        if (url.includes('api.allorigins.win/get')) {
          // Tier 5: JSON wrapper containing XML
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ contents: mockXmlValid }),
          };
        }
        throw new Error(`Unexpected endpoint: ${url}`);
      });
      globalThis.fetch = fetchMock;

      const result = await fetchMetroEstimates('1053');

      expect(fetchCalls).toHaveLength(5);
      expect(fetchCalls[0]).toBe('/api/metro/1053');
      expect(fetchCalls[1]).toBe('https://serviciosapp.metromadrid.es/servicios/rest/teleindicadores/1053');
      expect(fetchCalls[2]).toContain('api.allorigins.win/raw');
      expect(fetchCalls[3]).toContain('corsproxy.io');
      expect(fetchCalls[4]).toContain('api.allorigins.win/get');

      expect(result.stationCode).toBe('1053');
      expect(result.estimates).toHaveLength(1);
      expect(result.estimates[0].line).toBe('ML1');
      expect(result.estimates[0].destination).toBe('Las Tablas');
      expect(result.estimates[0].eta).toBe('3 min');
    });

    it('Scenario 2: Tier 1 returns empty body or whitespace -> cascades to Tier 2', async () => {
      const fetchCalls: string[] = [];
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        fetchCalls.push(url);
        if (url.startsWith('/api/metro/')) {
          return { ok: true, status: 200, text: async () => '   \n  ' };
        }
        if (url.startsWith(METRO_BASE_URL)) {
          return { ok: true, status: 200, text: async () => mockJsonValid };
        }
        throw new Error(`Unexpected endpoint: ${url}`);
      });
      globalThis.fetch = fetchMock;

      const result = await fetchMetroEstimates('112');
      expect(fetchCalls).toEqual([
        '/api/metro/112',
        'https://serviciosapp.metromadrid.es/servicios/rest/teleindicadores/112',
      ]);
      expect(result.stationName).toBe('Sol');
      expect(result.estimates).toHaveLength(1);
    });

    it('Scenario 3: Tier 1 returns HTML error page (e.g. reverse proxy 502 HTML) -> cascades to Tier 2', async () => {
      const fetchCalls: string[] = [];
      const html502 = '<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>';
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        fetchCalls.push(url);
        if (url.startsWith('/api/metro/')) {
          // Some misconfigured proxies return 200 with HTML error body
          return { ok: true, status: 200, text: async () => html502 };
        }
        if (url.startsWith(METRO_BASE_URL)) {
          return { ok: true, status: 200, text: async () => mockJsonValid };
        }
        throw new Error(`Unexpected endpoint: ${url}`);
      });
      globalThis.fetch = fetchMock;

      const result = await fetchMetroEstimates('112');
      expect(fetchCalls).toEqual([
        '/api/metro/112',
        'https://serviciosapp.metromadrid.es/servicios/rest/teleindicadores/112',
      ]);
      expect(result.stationName).toBe('Sol');
    });

    it('Scenario 4: Tier 1 returns backend API error status 500 JSON -> cascades to Tier 2', async () => {
      const fetchCalls: string[] = [];
      const errorJson = JSON.stringify({ status: 500, message: 'Internal Teleindicador Service Error' });
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        fetchCalls.push(url);
        if (url.startsWith('/api/metro/')) {
          return { ok: true, status: 200, text: async () => errorJson };
        }
        if (url.startsWith(METRO_BASE_URL)) {
          return { ok: true, status: 200, text: async () => mockJsonValid };
        }
        throw new Error(`Unexpected endpoint: ${url}`);
      });
      globalThis.fetch = fetchMock;

      const result = await fetchMetroEstimates('112');
      expect(fetchCalls).toHaveLength(2);
      expect(result.stationName).toBe('Sol');
    });

    it('Scenario 5: Tier 1 returns legitimate empty list {"Vtelindicadores":[]} (night closure) -> DOES NOT cascade', async () => {
      const fetchCalls: string[] = [];
      const nightClosureJson = JSON.stringify({ Vtelindicadores: [] });
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        fetchCalls.push(url);
        return { ok: true, status: 200, text: async () => nightClosureJson };
      });
      globalThis.fetch = fetchMock;

      const result = await fetchMetroEstimates('112');
      // Should stop immediately at Tier 1 without calling Tier 2!
      expect(fetchCalls).toEqual(['/api/metro/112']);
      expect(result.stationCode).toBe('112');
      expect(result.estimates).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it('Scenario 6: All tiers fail -> throws descriptive aggregate error', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Connection aborted by peer'));
      globalThis.fetch = fetchMock;

      await expect(fetchMetroEstimates('112')).rejects.toThrow(
        'No se pudieron cargar las estimaciones para la estación 112. (Connection aborted by peer)'
      );
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });

    it('Scenario 7: CORS Proxy 4 (corsproxy.io) succeeds when Tiers 1-3 fail', async () => {
      const fetchCalls: string[] = [];
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        fetchCalls.push(url);
        if (url.startsWith('/api/metro/')) throw new Error('Proxy down');
        if (url.startsWith(METRO_BASE_URL)) throw new Error('CORS blocked');
        if (url.includes('api.allorigins.win/raw')) throw new Error('AllOrigins down');
        if (url.includes('corsproxy.io')) {
          return { ok: true, status: 200, text: async () => mockJsonValid };
        }
        throw new Error(`Should not reach here: ${url}`);
      });
      globalThis.fetch = fetchMock;

      const result = await fetchMetroEstimates('112');
      expect(fetchCalls).toHaveLength(4);
      expect(result.estimates).toHaveLength(1);
      expect(result.stationName).toBe('Sol');
    });
  });

  describe('Special Station Code Injection / Validation', () => {
    it('rejects station codes with directory traversal, SQL injection, or alphabetic characters', async () => {
      const maliciousCodes = [
        '../admin',
        '112; DROP TABLE stations;',
        '<script>alert(1)</script>',
        '112/teleindicadores',
        '112a',
        '-112',
        '0x70',
        ' 112 ', // Note: cleanCode.trim() allows this if it contains only digits
      ];

      for (const code of maliciousCodes) {
        if (/^\s*\d+\s*$/.test(code)) {
          // Trimmed code is numeric (e.g. " 112 "), should pass validation
          continue;
        }
        await expect(fetchMetroEstimates(code)).rejects.toThrow(
          'El código de estación debe ser un valor numérico.'
        );
      }
    });

    it('accepts trimmed numeric codes properly', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ Vtelindicadores: [] }),
      });
      globalThis.fetch = fetchMock;

      const res = await fetchMetroEstimates('  112  ');
      expect(res.stationCode).toBe('112');
      expect(fetchMock).toHaveBeenCalledWith('/api/metro/112', expect.any(Object));
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatMetroEstimate,
  parseMetroPayload,
  fetchMetroEstimates,
} from '../metroApi';
import { formatMetroLineCode } from '../../types/metro';

describe('Challenger M1 Stress Suite: metroApi', () => {
  describe('1. formatMetroLineCode edge cases', () => {
    it('handles standard and special line codes', () => {
      expect(formatMetroLineCode(0)).toBe('R');
      expect(formatMetroLineCode(51)).toBe('ML1');
      expect(formatMetroLineCode(1)).toBe('1');
      expect(formatMetroLineCode(12)).toBe('12');
    });

    it('handles negative or unusual line numbers gracefully', () => {
      expect(formatMetroLineCode(-1)).toBe('-1');
      expect(formatMetroLineCode(99)).toBe('99');
    });
  });

  describe('2. formatMetroEstimate edge cases & boundary values', () => {
    it('handles extreme proximo numbers: 0, 1, 9999, negative, floats', () => {
      // Zero = arriving
      const est0 = formatMetroEstimate({
        linea: 1,
        anden: 1,
        proximo: 0,
        siguiente: 5,
      });
      expect(est0.eta).toBe('Llegando');
      expect(est0.etaMinutes).toBe(0);
      expect(est0.nextMinutes).toBe(0);
      expect(est0.followingMinutes).toBe(5);
      expect(est0.secondaryEta).toBe('Sig: 5 min');

      // Large positive number
      const estLarge = formatMetroEstimate({
        linea: 1,
        anden: 1,
        proximo: 120,
        siguiente: 240,
      });
      expect(estLarge.eta).toBe('120 min');
      expect(estLarge.etaMinutes).toBe(120);
      expect(estLarge.nextMinutes).toBe(120);
      expect(estLarge.followingMinutes).toBe(240);
      expect(estLarge.secondaryEta).toBe('Sig: 240 min');

      // Negative proximo: should not report negative minutes as valid arrival
      const estNeg = formatMetroEstimate({
        linea: 1,
        anden: 1,
        proximo: -1,
        siguiente: null,
      });
      expect(estNeg.eta).toBe('Sin estimación');
      expect(estNeg.etaMinutes).toBeNull();
      expect(estNeg.nextMinutes).toBeNull();
    });

    it('handles proximo null with siguiente 0 or positive', () => {
      const estSig0 = formatMetroEstimate({
        linea: 2,
        anden: 1,
        proximo: null,
        siguiente: 0,
      });
      expect(estSig0.eta).toBe('0 min');
      expect(estSig0.etaMinutes).toBe(0);
      expect(estSig0.nextMinutes).toBe(0);
      expect(estSig0.followingMinutes).toBeNull();
      expect(estSig0.secondaryEta).toBeUndefined();

      const estSigPos = formatMetroEstimate({
        linea: 2,
        anden: 1,
        proximo: null,
        siguiente: 7,
      });
      expect(estSigPos.eta).toBe('7 min');
      expect(estSigPos.etaMinutes).toBe(7);
      expect(estSigPos.nextMinutes).toBe(7);
      expect(estSigPos.followingMinutes).toBeNull();
      expect(estSigPos.secondaryEta).toBeUndefined();
    });

    it('trims whitespace and sanitizes destination and lineName', () => {
      const est = formatMetroEstimate({
        linea: 3,
        nombreli: '   VILLAVERDE ALTO - MONCLOA   \n\t',
        anden: 2,
        sentido: '   Villaverde Alto   \r\n',
        proximo: 3,
        siguiente: null,
      });
      expect(est.lineName).toBe('VILLAVERDE ALTO - MONCLOA');
      expect(est.destination).toBe('Villaverde Alto');
    });

    it('handles missing or undefined optional fields safely', () => {
      const est = formatMetroEstimate({
        linea: 6,
        anden: 0, // non-standard platform
        proximo: null,
        siguiente: null,
      });
      expect(est.lineName).toBe('');
      expect(est.destination).toBe('');
      expect(est.platform).toBe(1); // falls back to 1 when Number(0) is falsy
      expect(est.eta).toBe('Sin estimación');
      expect(est.etaMinutes).toBeNull();
      expect(est.nextMinutes).toBeNull();
      expect(est.followingMinutes).toBeNull();
      expect(est.timestamp).toBeDefined();
    });

    it('uses FECHAHORAEMISIONPREVISION (uppercase) if fechaHoraEmisionPrevision is absent', () => {
      const est = formatMetroEstimate({
        linea: 10,
        anden: 1,
        proximo: 2,
        siguiente: null,
        FECHAHORAEMISIONPREVISION: '2026-11-11T21:00:00.000Z',
      });
      expect(est.timestamp).toBe('2026-11-11T21:00:00.000Z');
      expect(est.updatedAt).toBe('2026-11-11T21:00:00.000Z');
    });
  });

  describe('3. parseMetroPayload — Malformed & Edge-case JSON', () => {
    it('handles empty string or whitespace payload', () => {
      const empty = parseMetroPayload('', '112');
      expect(empty.estimates).toEqual([]);
      expect(empty.error).toBe('Respuesta vacía del servidor.');

      const whitespace = parseMetroPayload('   \n  \t ', '112');
      expect(whitespace.estimates).toEqual([]);
      expect(whitespace.error).toBe('Respuesta vacía del servidor.');
    });

    it('handles truncated or invalid JSON syntax', () => {
      const truncated = parseMetroPayload('{"Vtelindicadores": [{"linea": 1,', '112');
      expect(truncated.estimates).toEqual([]);
      expect(truncated.error).toBeDefined();
    });

    it('handles JSON with empty object or empty array', () => {
      const emptyObj = parseMetroPayload('{}', '112');
      expect(emptyObj.estimates).toEqual([]);
      expect(emptyObj.error).toBeUndefined();

      const emptyArr = parseMetroPayload('[]', '112');
      expect(emptyArr.estimates).toEqual([]);
      expect(emptyArr.error).toBeUndefined();
    });

    it('handles JSON where Vtelindicadores is not an array (null, string, number)', () => {
      const nullItems = parseMetroPayload(JSON.stringify({ Vtelindicadores: null }), '112');
      expect(nullItems.estimates).toEqual([]);
      expect(nullItems.error).toBeUndefined();

      const stringItems = parseMetroPayload(JSON.stringify({ Vtelindicadores: 'error' }), '112');
      expect(stringItems.estimates).toEqual([]);
      expect(stringItems.error).toBeUndefined();
    });

    it('handles JSON with backend error statuses (400, 404, 500)', () => {
      const err400 = parseMetroPayload(
        JSON.stringify({ status: 400, message: 'Invalid station' }),
        '999'
      );
      expect(err400.estimates).toEqual([]);
      expect(err400.error).toBe('Invalid station');

      const err500 = parseMetroPayload(
        JSON.stringify({ status: 500 }),
        '999'
      );
      expect(err500.estimates).toEqual([]);
      expect(err500.error).toBe('Error 500 de la API de Metro');
    });

    it('handles JSON with items missing fields without crashing', () => {
      const partialItem = JSON.stringify({
        Vtelindicadores: [
          {
            linea: 1,
            // no nombreli, no anden, no sentido, no proximo
          },
        ],
      });
      const res = parseMetroPayload(partialItem, '112');
      expect(res.estimates).toHaveLength(1);
      expect(res.estimates[0].line).toBe('1');
      expect(res.estimates[0].eta).toBe('Sin estimación');
      expect(res.estimates[0].platform).toBe(1);
    });

    it('sorts multiple platforms correctly: Llegando -> 2 min -> 5 min -> Sin estimación', () => {
      const payload = JSON.stringify({
        Vtelindicadores: [
          { linea: 1, anden: 1, proximo: 5, sentido: 'Valdecarros' },
          { linea: 1, anden: 2, proximo: 0, sentido: 'Pinar de Chamartín' },
          { linea: 2, anden: 1, proximo: null, sentido: 'Las Rosas' },
          { linea: 1, anden: 1, proximo: 2, sentido: 'Valdecarros' },
        ],
      });
      const res = parseMetroPayload(payload, '112');
      expect(res.estimates).toHaveLength(4);
      expect(res.estimates[0].eta).toBe('Llegando'); // proximo 0
      expect(res.estimates[1].eta).toBe('2 min'); // proximo 2
      expect(res.estimates[2].eta).toBe('5 min'); // proximo 5
      expect(res.estimates[3].eta).toBe('Sin estimación'); // proximo null
    });
  });

  describe('4. parseMetroPayload — Malformed & Edge-case XML', () => {
    it('handles truncated or malformed XML without throwing', () => {
      const truncatedXml = '<VtelindicadoresCollection><Vtelindicadores><linea>1</linea>';
      const res = parseMetroPayload(truncatedXml, '112');
      expect(res.estimates).toEqual([]);
      expect(res.error).toBeDefined();
    });

    it('works correctly when DOMParser is present in the global scope', () => {
      // Mock a standard DOMParser implementation
      class MockDOMParser {
        parseFromString(text: string, _type: string) {
          if (text.includes('syntax-error')) {
            throw new Error('XML Syntax Error');
          }
          return {
            getElementsByTagName(tagName: string) {
              if (tagName === 'Vtelindicadores') {
                return [
                  {
                    getElementsByTagName(subTag: string) {
                      const tags: Record<string, { textContent: string }[]> = {
                        linea: [{ textContent: '1' }],
                        nombreli: [{ textContent: 'PINAR DE CHAMARTIN-VALDECARROS' }],
                        nombreest: [{ textContent: 'Sol' }],
                        anden: [{ textContent: '2' }],
                        sentido: [{ textContent: 'Pinar de Chamartín' }],
                        proximo: [{ textContent: '0' }],
                        siguiente: [{ textContent: '3' }],
                        fechaHoraEmisionPrevision: [{ textContent: '2026-11-11T20:30:00Z' }],
                      };
                      return tags[subTag] || [];
                    },
                  },
                ];
              }
              return [];
            },
          };
        }
      }

      (globalThis as any).DOMParser = MockDOMParser;

      try {
        const xml = '<VtelindicadoresCollection><Vtelindicadores>...</Vtelindicadores></VtelindicadoresCollection>';
        const res = parseMetroPayload(xml, '112');
        expect(res.stationName).toBe('Sol');
        expect(res.estimates).toHaveLength(1);
        expect(res.estimates[0].line).toBe('1');
        expect(res.estimates[0].eta).toBe('Llegando');
        expect(res.estimates[0].secondaryEta).toBe('Sig: 3 min');
      } finally {
        delete (globalThis as any).DOMParser;
      }
    });

    it('falls back to regex parser if DOMParser throws during parseFromString', () => {
      class CrashingDOMParser {
        parseFromString() {
          throw new Error('DOMParser exploded');
        }
      }

      (globalThis as any).DOMParser = CrashingDOMParser;

      try {
        const xml = `
          <VtelindicadoresCollection>
            <Vtelindicadores>
              <linea>6</linea>
              <nombreest>Moncloa</nombreest>
              <anden>1</anden>
              <sentido>Circular</sentido>
              <proximo>4</proximo>
            </Vtelindicadores>
          </VtelindicadoresCollection>
        `;
        const res = parseMetroPayload(xml, '102');
        expect(res.stationName).toBe('Moncloa');
        expect(res.estimates).toHaveLength(1);
        expect(res.estimates[0].line).toBe('6');
        expect(res.estimates[0].eta).toBe('4 min');
      } finally {
        delete (globalThis as any).DOMParser;
      }
    });

    it('handles XML with self-closing tags (<proximo/>, <siguiente/>)', () => {
      const selfClosingXml = `
        <VtelindicadoresCollection>
          <Vtelindicadores>
            <linea>5</linea>
            <nombreli>ALAMEDA DE OSUNA-CASA DE CAMPO</nombreli>
            <nombreest>Gran Vía</nombreest>
            <anden>1</anden>
            <sentido>Casa de Campo</sentido>
            <proximo/>
            <siguiente/>
          </Vtelindicadores>
        </VtelindicadoresCollection>
      `;
      const res = parseMetroPayload(selfClosingXml, '105');
      expect(res.estimates).toHaveLength(1);
      expect(res.estimates[0].line).toBe('5');
      expect(res.estimates[0].proximoMinutes).toBeNull();
      expect(res.estimates[0].siguienteMinutes).toBeNull();
      expect(res.estimates[0].eta).toBe('Sin estimación');
    });

    it('handles XML with CDATA sections and entity references', () => {
      const cdataXml = `
        <VtelindicadoresCollection>
          <Vtelindicadores>
            <linea>10</linea>
            <nombreli><![CDATA[HOSPITAL INFANTA SOFIA & PUERTA DEL SUR]]></nombreli>
            <nombreest>Tribunal</nombreest>
            <anden>2</anden>
            <sentido><![CDATA[Puerta del Sur & Alcorcón]]></sentido>
            <proximo>1</proximo>
            <siguiente>4</siguiente>
          </Vtelindicadores>
        </VtelindicadoresCollection>
      `;
      const res = parseMetroPayload(cdataXml, '108');
      expect(res.estimates).toHaveLength(1);
      expect(res.estimates[0].line).toBe('10');
      expect(res.estimates[0].eta).toBe('1 min');
      expect(res.estimates[0].destination).toContain('Puerta del Sur');
    });

    it('handles non-teleindicador XML (e.g. HTML 404 or 502 page)', () => {
      const htmlPage = `
        <!DOCTYPE html>
        <html>
          <head><title>502 Bad Gateway</title></head>
          <body><center><h1>502 Bad Gateway</h1></center></body>
        </html>
      `;
      const res = parseMetroPayload(htmlPage, '112');
      expect(res.estimates).toEqual([]);
      expect(res.error).toBe('No se encontraron estimaciones en el XML.');
    });

    it('handles empty XML collection (<VtelindicadoresCollection/>)', () => {
      const emptyXml = '<VtelindicadoresCollection></VtelindicadoresCollection>';
      const res = parseMetroPayload(emptyXml, '112');
      expect(res.estimates).toEqual([]);
      expect(res.error).toBe('No se encontraron estimaciones en el XML.');
    });
  });

  describe('5. fetchMetroEstimates — Network, Validation & Fallback Robustness', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('rejects malicious or injection station codes', async () => {
      const badCodes = [
        '../etc/passwd',
        '112; DROP TABLE stops;',
        '<script>',
        '112/teleindicadores',
        '-1',
        '12.34',
        '   ',
        '',
      ];

      for (const code of badCodes) {
        await expect(fetchMetroEstimates(code)).rejects.toThrow(
          'El código de estación debe ser un valor numérico.'
        );
      }
    });

    it('accepts trimmed numeric station codes (e.g. "  112  ")', async () => {
      const mockPayload = JSON.stringify({
        Vtelindicadores: [
          { linea: 1, anden: 1, proximo: 2, sentido: 'Sol', nombreest: 'Sol' },
        ],
      });
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockPayload,
      });

      const res = await fetchMetroEstimates('  112  ');
      expect(res.stationCode).toBe('112');
      expect(res.estimates).toHaveLength(1);
    });

    it('successfully unpacks allorigins /get JSON wrapper (Tier 5)', async () => {
      const innerPayload = JSON.stringify({
        Vtelindicadores: [
          { linea: 1, anden: 1, proximo: 3, sentido: 'Valdecarros', nombreest: 'Sol' },
        ],
      });
      const wrapperPayload = JSON.stringify({
        contents: innerPayload,
        status: { http_code: 200 },
      });

      // Tiers 1-4 fail, Tier 5 succeeds
      const fetchMock = vi.fn()
        .mockRejectedValueOnce(new Error('Tier 1 failed'))
        .mockRejectedValueOnce(new Error('Tier 2 failed'))
        .mockRejectedValueOnce(new Error('Tier 3 failed'))
        .mockRejectedValueOnce(new Error('Tier 4 failed'))
        .mockResolvedValueOnce({
          ok: true,
          text: async () => wrapperPayload,
        });
      globalThis.fetch = fetchMock;

      const res = await fetchMetroEstimates('112');
      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(res.stationName).toBe('Sol');
      expect(res.estimates[0].line).toBe('1');
      expect(res.estimates[0].eta).toBe('3 min');
    });

    it('correctly handles allorigins /get JSON wrapper containing XML content', async () => {
      const innerXml = `
        <VtelindicadoresCollection>
          <Vtelindicadores>
            <linea>2</linea>
            <anden>1</anden>
            <sentido>Cuatro Caminos</sentido>
            <proximo>1</proximo>
            <siguiente>6</siguiente>
          </Vtelindicadores>
        </VtelindicadoresCollection>
      `;
      const wrapperPayload = JSON.stringify({
        contents: innerXml,
      });

      // Tiers 1-4 fail, Tier 5 succeeds
      const fetchMock = vi.fn()
        .mockRejectedValueOnce(new Error('Tier 1 failed'))
        .mockRejectedValueOnce(new Error('Tier 2 failed'))
        .mockRejectedValueOnce(new Error('Tier 3 failed'))
        .mockRejectedValueOnce(new Error('Tier 4 failed'))
        .mockResolvedValueOnce({
          ok: true,
          text: async () => wrapperPayload,
        });
      globalThis.fetch = fetchMock;

      const res = await fetchMetroEstimates('112');
      expect(res.estimates[0].line).toBe('2');
      expect(res.estimates[0].eta).toBe('1 min');
    });

    it('skips empty or whitespace text responses and continues to next tier', async () => {
      const mockPayload = JSON.stringify({
        Vtelindicadores: [
          { linea: 1, anden: 1, proximo: 2, sentido: 'Sol' },
        ],
      });

      // Tier 1 returns empty body (e.g. 200 OK with 0 bytes)
      // Tier 2 succeeds
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '   ',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockPayload,
        });
      globalThis.fetch = fetchMock;

      const res = await fetchMetroEstimates('112');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(res.estimates).toHaveLength(1);
    });

    it('returns legitimate night-closure empty response without retrying all tiers', async () => {
      const emptyClosurePayload = JSON.stringify({ Vtelindicadores: [] });

      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => emptyClosurePayload,
      });
      globalThis.fetch = fetchMock;

      const res = await fetchMetroEstimates('112');
      // Must not continue to fallback tiers when legitimate empty response is returned
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(res.estimates).toEqual([]);
      expect(res.error).toBeUndefined();
    });
  });

  describe('6. PROJECT.md Interface Contract Conformance', () => {
    it('verifies MetroPlatformEstimate satisfies both PROJECT.md and explorer contracts', () => {
      const raw = {
        linea: 1,
        nombreli: 'PINAR DE CHAMARTIN-VALDECARROS',
        anden: 1,
        sentido: 'Valdecarros',
        proximo: 3,
        siguiente: 8,
        fechaHoraEmisionPrevision: '2026-11-11T20:00:00.000Z',
      };
      const est = formatMetroEstimate(raw);

      // PROJECT.md § Interface Contracts
      expect(typeof est.line).toBe('string');
      expect(typeof est.lineName).toBe('string');
      expect(typeof est.platform).toBe('number');
      expect(typeof est.destination).toBe('string');
      expect(est.nextMinutes).toBe(3);
      expect(est.followingMinutes).toBe(8);
      expect(typeof est.timestamp).toBe('string');

      // Extended parity properties
      expect(est.rawLine).toBe(1);
      expect(est.proximoMinutes).toBe(3);
      expect(est.siguienteMinutes).toBe(8);
      expect(est.eta).toBe('3 min');
      expect(est.etaMinutes).toBe(3);
      expect(est.secondaryEta).toBe('Sig: 8 min');
      expect(est.updatedAt).toBe(est.timestamp);
    });

    it('verifies MetroStationEstimatesResponse satisfies PROJECT.md contract', () => {
      const payload = JSON.stringify({
        Vtelindicadores: [
          { linea: 1, anden: 1, proximo: 0, sentido: 'Sol', nombreest: 'Sol' },
        ],
      });
      const res = parseMetroPayload(payload, '112');

      // PROJECT.md § Interface Contracts
      expect(res.stationCode).toBe('112');
      expect(res.stationName).toBe('Sol');
      expect(Array.isArray(res.estimates)).toBe(true);
      expect(typeof res.timestamp).toBe('number');
      expect(res.error).toBeUndefined();

      // Parity
      expect(res.stationId).toBe('112');
    });
  });
});

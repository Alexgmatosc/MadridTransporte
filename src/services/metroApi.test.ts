import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatMetroEstimate,
  parseMetroPayload,
  fetchMetroEstimates,
} from './metroApi';
import { formatMetroLineCode } from '../types/metro';

describe('metroApi', () => {
  describe('formatMetroLineCode', () => {
    it('maps special raw line numbers to official Metro line codes', () => {
      expect(formatMetroLineCode(0)).toBe('R');
      expect(formatMetroLineCode(51)).toBe('ML1');
      expect(formatMetroLineCode(1)).toBe('1');
      expect(formatMetroLineCode(6)).toBe('6');
      expect(formatMetroLineCode(12)).toBe('12');
    });
  });

  describe('formatMetroEstimate', () => {
    it('handles proximo: 0 as arriving train ("Llegando")', () => {
      const estimate = formatMetroEstimate({
        linea: 1,
        nombreli: '  PINAR DE CHAMARTIN-VALDECARROS  ',
        anden: 1,
        sentido: '  Valdecarros  ',
        proximo: 0,
        siguiente: 4,
        fechaHoraEmisionPrevision: '2026-11-11T20:18:48.000+01:00',
      });

      expect(estimate.line).toBe('1');
      expect(estimate.lineName).toBe('PINAR DE CHAMARTIN-VALDECARROS');
      expect(estimate.destination).toBe('Valdecarros');
      expect(estimate.platform).toBe(1);
      expect(estimate.eta).toBe('Llegando');
      expect(estimate.etaMinutes).toBe(0);
      expect(estimate.nextMinutes).toBe(0);
      expect(estimate.followingMinutes).toBe(4);
      expect(estimate.secondaryEta).toBe('Sig: 4 min');
    });

    it('handles proximo > 0 with secondary train', () => {
      const estimate = formatMetroEstimate({
        linea: 2,
        nombreli: 'LAS ROSAS-CUATRO CAMINOS      ',
        anden: 2,
        sentido: 'Las Rosas',
        proximo: 2,
        siguiente: 7,
      });

      expect(estimate.line).toBe('2');
      expect(estimate.eta).toBe('2 min');
      expect(estimate.etaMinutes).toBe(2);
      expect(estimate.nextMinutes).toBe(2);
      expect(estimate.followingMinutes).toBe(7);
      expect(estimate.secondaryEta).toBe('Sig: 7 min');
    });

    it('handles proximo: null when siguiente is available', () => {
      const estimate = formatMetroEstimate({
        linea: 3,
        nombreli: 'EL CASAR-MONCLOA',
        anden: 2,
        sentido: 'El Casar',
        proximo: null,
        siguiente: 5,
      });

      expect(estimate.line).toBe('3');
      expect(estimate.eta).toBe('5 min');
      expect(estimate.etaMinutes).toBe(5);
      expect(estimate.nextMinutes).toBe(5);
      expect(estimate.secondaryEta).toBeUndefined();
    });

    it('handles both proximo and siguiente being null', () => {
      const estimate = formatMetroEstimate({
        linea: 5,
        anden: 1,
        sentido: 'Casa de Campo',
        proximo: null,
        siguiente: null,
      });

      expect(estimate.line).toBe('5');
      expect(estimate.eta).toBe('Sin estimación');
      expect(estimate.etaMinutes).toBeNull();
      expect(estimate.nextMinutes).toBeNull();
      expect(estimate.followingMinutes).toBeNull();
      expect(estimate.secondaryEta).toBeUndefined();
    });

    it('formats Ramal and ML1 correctly', () => {
      const ramal = formatMetroEstimate({
        linea: 0,
        nombreli: 'OPERA-PRINCIPE PIO',
        anden: 1,
        sentido: 'Príncipe Pío',
        proximo: 1,
        siguiente: null,
      });
      expect(ramal.line).toBe('R');

      const ml1 = formatMetroEstimate({
        linea: 51,
        nombreli: 'PINAR DE CHAMARTIN-LAS TABLAS',
        anden: 1,
        sentido: 'Las Tablas',
        proximo: 3,
        siguiente: null,
      });
      expect(ml1.line).toBe('ML1');
    });
  });

  describe('parseMetroPayload — JSON parsing', () => {
    it('parses valid JSON response with multiple lines and platforms', () => {
      const json = JSON.stringify({
        Vtelindicadores: [
          {
            linea: 1,
            nombreli: 'PINAR DE CHAMARTIN-VALDECARROS',
            estaciontel: 12,
            idnumerica: 112,
            nombreest: 'Sol',
            anden: 1,
            sentido: 'Valdecarros',
            proximo: 4,
            siguiente: null,
            fechaHoraEmisionPrevision: '2026-11-11T20:18:48.000+01:00',
          },
          {
            linea: 2,
            nombreli: 'LAS ROSAS-CUATRO CAMINOS      ',
            estaciontel: 8,
            idnumerica: 112,
            nombreest: 'Sol',
            anden: 1,
            sentido: 'Cuatro Caminos',
            proximo: 0,
            siguiente: 5,
            fechaHoraEmisionPrevision: '2026-11-11T20:18:53.000+01:00',
          },
        ],
      });

      const res = parseMetroPayload(json, '112');
      expect(res.stationCode).toBe('112');
      expect(res.stationId).toBe('112');
      expect(res.stationName).toBe('Sol');
      expect(res.estimates).toHaveLength(2);

      // Verify sorting: proximo 0 (Llegando) comes first
      expect(res.estimates[0].line).toBe('2');
      expect(res.estimates[0].eta).toBe('Llegando');
      expect(res.estimates[0].destination).toBe('Cuatro Caminos');

      expect(res.estimates[1].line).toBe('1');
      expect(res.estimates[1].eta).toBe('4 min');
      expect(res.estimates[1].destination).toBe('Valdecarros');
    });

    it('handles empty Vtelindicadores array (e.g. night closure or empty station)', () => {
      const json = JSON.stringify({ Vtelindicadores: [] });
      const res = parseMetroPayload(json, '112');

      expect(res.stationCode).toBe('112');
      expect(res.estimates).toHaveLength(0);
      expect(res.error).toBeUndefined();
    });

    it('handles API error payload from Metro backend', () => {
      const json = JSON.stringify({
        status: 400,
        message: 'El parámetro IDNUMERICA debe ser un valor numérico.',
      });

      const res = parseMetroPayload(json, 'abc');
      expect(res.estimates).toHaveLength(0);
      expect(res.error).toBe('El parámetro IDNUMERICA debe ser un valor numérico.');
    });
  });

  describe('parseMetroPayload — XML fallback parsing', () => {
    it('parses valid XML payload correctly', () => {
      const xml = `
        <VtelindicadoresCollection>
          <Vtelindicadores>
            <linea>1</linea>
            <nombreli>PINAR DE CHAMARTIN-VALDECARROS   </nombreli>
            <estaciontel>12</estaciontel>
            <idnumerica>112</idnumerica>
            <nombreest>Sol</nombreest>
            <anden>1</anden>
            <sentido>Valdecarros   </sentido>
            <proximo>3</proximo>
            <siguiente>8</siguiente>
            <fechaHoraEmisionPrevision>2026-11-11T20:22:15.000+01:00</fechaHoraEmisionPrevision>
          </Vtelindicadores>
          <Vtelindicadores>
            <linea>3</linea>
            <nombreli>EL CASAR-MONCLOA</nombreli>
            <estaciontel>6</estaciontel>
            <idnumerica>112</idnumerica>
            <nombreest>Sol</nombreest>
            <anden>2</anden>
            <sentido>El Casar</sentido>
            <proximo>0</proximo>
            <siguiente/>
            <fechaHoraEmisionPrevision>2026-11-11T20:22:10.000+01:00</fechaHoraEmisionPrevision>
          </Vtelindicadores>
        </VtelindicadoresCollection>
      `;

      const res = parseMetroPayload(xml, '112');
      expect(res.stationCode).toBe('112');
      expect(res.stationName).toBe('Sol');
      expect(res.estimates).toHaveLength(2);

      // Verify sorting: Línea 3 proximo 0 arrives first
      expect(res.estimates[0].line).toBe('3');
      expect(res.estimates[0].eta).toBe('Llegando');
      expect(res.estimates[0].platform).toBe(2);
      expect(res.estimates[0].secondaryEta).toBeUndefined();

      // Línea 1 proximo 3 with secondary 8
      expect(res.estimates[1].line).toBe('1');
      expect(res.estimates[1].lineName).toBe('PINAR DE CHAMARTIN-VALDECARROS');
      expect(res.estimates[1].destination).toBe('Valdecarros');
      expect(res.estimates[1].eta).toBe('3 min');
      expect(res.estimates[1].secondaryEta).toBe('Sig: 8 min');
    });

    it('handles empty or malformed input gracefully', () => {
      const emptyRes = parseMetroPayload('', '112');
      expect(emptyRes.estimates).toHaveLength(0);
      expect(emptyRes.error).toBeDefined();

      const invalidRes = parseMetroPayload('<html>Not Found</html>', '112');
      expect(invalidRes.estimates).toHaveLength(0);
      expect(invalidRes.error).toBeDefined();
    });
  });

  describe('fetchMetroEstimates — Tiered fallback network execution', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('rejects invalid or non-numeric station codes before making network requests', async () => {
      await expect(fetchMetroEstimates('')).rejects.toThrow('El código de estación debe ser un valor numérico.');
      await expect(fetchMetroEstimates('abc')).rejects.toThrow('El código de estación debe ser un valor numérico.');
      await expect(fetchMetroEstimates('  ')).rejects.toThrow('El código de estación debe ser un valor numérico.');
    });

    it('succeeds via primary Vite/Vercel proxy (/api/metro/:code)', async () => {
      const mockPayload = JSON.stringify({
        Vtelindicadores: [
          {
            linea: 10,
            nombreli: 'HOSPITAL INFANTA SOFIA-PUERTA DEL SUR',
            idnumerica: 101,
            nombreest: 'Plaza de Castilla',
            anden: 1,
            sentido: 'Puerta del Sur',
            proximo: 2,
            siguiente: 6,
          },
        ],
      });

      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockPayload,
      });
      globalThis.fetch = fetchMock;

      const res = await fetchMetroEstimates('101');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/metro/101', expect.objectContaining({
        headers: { Accept: 'application/json' },
      }));
      expect(res.stationName).toBe('Plaza de Castilla');
      expect(res.estimates[0].line).toBe('10');
      expect(res.estimates[0].eta).toBe('2 min');
    });

    it('falls back to direct URL when primary proxy fails with 500 error', async () => {
      const mockPayload = JSON.stringify({
        Vtelindicadores: [
          {
            linea: 6,
            nombreli: 'CIRCULAR',
            idnumerica: 411,
            nombreest: 'Avenida de América',
            anden: 1,
            sentido: 'Circular 1',
            proximo: 1,
            siguiente: null,
          },
        ],
      });

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockPayload,
        });
      globalThis.fetch = fetchMock;

      const res = await fetchMetroEstimates('411');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe('/api/metro/411');
      expect(fetchMock.mock.calls[1][0]).toBe('https://serviciosapp.metromadrid.es/servicios/rest/teleindicadores/411');
      expect(res.stationName).toBe('Avenida de América');
      expect(res.estimates[0].line).toBe('6');
    });

    it('falls back to public CORS proxy (allorigins) returning XML when direct fetch fails', async () => {
      const xmlPayload = `
        <VtelindicadoresCollection>
          <Vtelindicadores>
            <linea>0</linea>
            <nombreli>OPERA-PRINCIPE PIO</nombreli>
            <idnumerica>209</idnumerica>
            <nombreest>Ópera</nombreest>
            <anden>1</anden>
            <sentido>Príncipe Pío</sentido>
            <proximo>0</proximo>
            <siguiente>6</siguiente>
          </Vtelindicadores>
        </VtelindicadoresCollection>
      `;

      const fetchMock = vi.fn()
        // Tier 1 proxy: network error
        .mockRejectedValueOnce(new Error('Network error'))
        // Tier 2 direct: CORS blocked
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        // Tier 3 CORS proxy (allorigins raw XML): success
        .mockResolvedValueOnce({
          ok: true,
          text: async () => xmlPayload,
        });
      globalThis.fetch = fetchMock;

      const res = await fetchMetroEstimates('209');
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(res.stationName).toBe('Ópera');
      expect(res.estimates[0].line).toBe('R');
      expect(res.estimates[0].eta).toBe('Llegando');
    });

    it('throws meaningful error when all fallback tiers fail', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      globalThis.fetch = fetchMock;

      await expect(fetchMetroEstimates('112')).rejects.toThrow(
        /No se pudieron cargar las estimaciones para la estación 112/
      );
    });
  });
});

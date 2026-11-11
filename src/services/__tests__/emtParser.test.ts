import { describe, it, expect } from 'vitest';
import { parseEtaMinutes, extractCoordinates, parsePMVHtml } from '../emtParser';

describe('emtParser', () => {
  describe('parseEtaMinutes', () => {
    it('handles "Llegando" and "0 min"', () => {
      expect(parseEtaMinutes('Llegando')).toBe(0);
      expect(parseEtaMinutes('0 min')).toBe(0);
      expect(parseEtaMinutes('Inminente')).toBe(0);
    });

    it('extracts minutes correctly', () => {
      expect(parseEtaMinutes('3 min')).toBe(3);
      expect(parseEtaMinutes('15 min')).toBe(15);
      expect(parseEtaMinutes('> 20 min')).toBe(21);
      expect(parseEtaMinutes('>20 min')).toBe(21);
    });
  });

  describe('extractCoordinates', () => {
    it('extracts lat and lon from Google Maps URL', () => {
      const url = 'https://maps.google.com/?q=40.41691748660822,-3.700048299886669';
      const coords = extractCoordinates(url);
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBeCloseTo(40.416917);
      expect(coords?.lon).toBeCloseTo(-3.700048);
    });

    it('returns null for empty or invalid url', () => {
      expect(extractCoordinates(null)).toBeNull();
      expect(extractCoordinates('')).toBeNull();
      expect(extractCoordinates('https://google.com')).toBeNull();
    });
  });

  describe('parsePMVHtml', () => {
    const sampleHtml = `
      <p><h2>Parada:72 Cibeles-Casa de América</h2></p>
      <p><h2>Pº de Recoletos, 2 (Pza. de Cibeles)                   </h2></p>
      <p><h2>Estimaciones:</h2></p>
      <table style="border-collapse: collapse; width: 100%;" border="1">
        <tbody>
          <tr>
            <td style="width: 10.8639%;"><h2>L&iacute;nea</h2></td>
            <td style="width: 25.1745%;"><h2>Hacia</h2></td>
            <td style="width: 28.8394%;"><h2>Tiempo</h2></td>
            <td style="width: 35.1222%;"><h2>D&oacute;nde est&aacute; el bus</h2></td>
          </tr>
          <tr>
            <td style="width: 10.8639%;"><h2>53</h2></td>
            <td style="width: 25.1745%;"><h2>ARTURO SORIA</h2></td>
            <td style="width: 28.8394%;"><h2>7 min</h2></td>
            <td style="width: 35.1222%;"><h3><a href="https://maps.google.com/?q=40.41691748660822,-3.700048299886669" target="_blank">Ver ubicaci&oacute;n</a></h3></td>
          </tr>
          <tr>
            <td style="width: 10.8639%;"><h2>14</h2></td>
            <td style="width: 25.1745%;"><h2>CONCHA ESPINA</h2></td>
            <td style="width: 28.8394%;"><h2>0 min</h2></td>
            <td style="width: 35.1222%;"><h3><a href="https://maps.google.com/?q=40.420111,-3.691222" target="_blank">Ver ubicaci&oacute;n</a></h3></td>
          </tr>
        </tbody>
      </table>
    `;

    it('extracts stop metadata and estimates list sorted by ETA', () => {
      const res = parsePMVHtml(sampleHtml, '72');
      expect(res.stopId).toBe('72');
      expect(res.stopName).toContain('Cibeles');
      expect(res.estimates.length).toBe(2);

      // Should be sorted ascending by ETA (0 min first, then 7 min)
      expect(res.estimates[0].line).toBe('14');
      expect(res.estimates[0].etaMinutes).toBe(0);
      expect(res.estimates[0].coordinates?.lat).toBeCloseTo(40.420111);

      expect(res.estimates[1].line).toBe('53');
      expect(res.estimates[1].etaMinutes).toBe(7);
      expect(res.estimates[1].coordinates?.lat).toBeCloseTo(40.416917);
    });

    it('handles error HTML response gracefully', () => {
      const errorHtml = '<p><h2>Error al obtener las estimaciones o no existe la parada</h2></p>';
      const res = parsePMVHtml(errorHtml, '9999');
      expect(res.estimates.length).toBe(0);
      expect(res.error).toBeDefined();
    });
  });
});

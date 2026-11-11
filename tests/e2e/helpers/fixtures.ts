import type { Stop, BusEstimate } from '../../../src/types/emt';
import type { MetroStation, MetroPlatformEstimate } from '../../../src/types/metro';

export const PUERTA_DEL_SOL_COORDS = {
  lat: 40.4168,
  lon: -3.7038,
};

export const FIXTURE_METRO_SOL: MetroStation = {
  id: '0112',
  name: 'Sol',
  address: 'Plaza de la Puerta del Sol 6',
  lat: 40.41688,
  lon: -3.70326,
  lines: ['1', '2', '3'],
  allCodes: ['0112', '0208', '0306'],
  zone: 'A',
};

export const FIXTURE_METRO_OPERA: MetroStation = {
  id: '0209',
  name: 'Ópera',
  address: 'Plaza de Isabel II 9',
  lat: 40.41809,
  lon: -3.70942,
  lines: ['2', '5', 'R'],
  allCodes: ['0001', '0209', '0516'],
  zone: 'A',
};

export const FIXTURE_METRO_ATOCHA: MetroStation = {
  id: '0116',
  name: 'Atocha',
  address: 'Avda de la Ciudad de Barcelona 2 B',
  lat: 40.40659,
  lon: -3.68938,
  lines: ['1'],
  allCodes: ['0116'],
  zone: 'A',
};

export const FIXTURE_METRO_MONCLOA: MetroStation = {
  id: '0311',
  name: 'Moncloa',
  address: 'Plaza de la Moncloa 1',
  lat: 40.43502,
  lon: -3.71945,
  lines: ['3', '6'],
  allCodes: ['0311', '0623'],
  zone: 'A',
};

export const FIXTURE_METRO_NUEVOS_MINISTERIOS: MetroStation = {
  id: '0618',
  name: 'Nuevos Ministerios',
  address: 'Calle de Raimundo Fernández Villaverde 67',
  lat: 40.44662,
  lon: -3.69241,
  lines: ['6', '8', '10'],
  allCodes: ['0618', '0801', '1007'],
  zone: 'A',
};

export const FIXTURE_METRO_STATIONS: MetroStation[] = [
  FIXTURE_METRO_SOL,
  FIXTURE_METRO_OPERA,
  FIXTURE_METRO_ATOCHA,
  FIXTURE_METRO_MONCLOA,
  FIXTURE_METRO_NUEVOS_MINISTERIOS,
];

export const FIXTURE_BUS_CIBELES_72: Stop = {
  id: '72',
  name: 'Cibeles',
  address: 'Paseo de Recoletos',
  lat: 40.419,
  lon: -3.6922,
  lines: ['1', '2', '202'],
};

export const FIXTURE_BUS_CRISTO_REY_4514: Stop = {
  id: '4514',
  name: 'Cristo Rey',
  address: 'Plaza de Cristo Rey',
  lat: 40.4395,
  lon: -3.7188,
  lines: ['1', '82'],
};

export const FIXTURE_BUS_ALCALA_100: Stop = {
  id: '100',
  name: 'Alcalá - Gran Vía',
  address: 'Calle de Alcalá 28',
  lat: 40.4185,
  lon: -3.7005,
  lines: ['1', '2', '46', '74'],
};

export const FIXTURE_BUS_STOPS: Stop[] = [
  FIXTURE_BUS_CIBELES_72,
  FIXTURE_BUS_CRISTO_REY_4514,
  FIXTURE_BUS_ALCALA_100,
];

export function createPMVHtmlResponse(stopId: string, stopName = 'Cibeles', address = 'Paseo de Recoletos') {
  return `
    <p><h2>Parada:${stopId} ${stopName}</h2></p>
    <p><h2>${address}</h2></p>
    <p><h2>Estimaciones:</h2></p>
    <table border="1">
      <tbody>
        <tr>
          <td><h2>Línea</h2></td>
          <td><h2>Hacia</h2></td>
          <td><h2>Tiempo</h2></td>
          <td><h2>Dónde está el bus</h2></td>
        </tr>
        <tr>
          <td><h2>1</h2></td>
          <td><h2>CRISTO REY</h2></td>
          <td><h2>Llegando</h2></td>
          <td><a href="https://maps.google.com/?q=40.4195,-3.6925">Ver</a></td>
        </tr>
        <tr>
          <td><h2>2</h2></td>
          <td><h2>MANUEL BECERRA</h2></td>
          <td><h2>4 min</h2></td>
          <td><a href="https://maps.google.com/?q=40.4180,-3.6910">Ver</a></td>
        </tr>
        <tr>
          <td><h2>202</h2></td>
          <td><h2>PAVONES</h2></td>
          <td><h2>12 min</h2></td>
          <td><a href="https://maps.google.com/?q=40.4150,-3.6890">Ver</a></td>
        </tr>
      </tbody>
    </table>
  `;
}

export function createMetroTeleindicadoresResponse(code: string) {
  const clean = code.replace(/^0+/, '');
  if (clean === '112') {
    return {
      Vtelindicadores: [
        {
          linea: 1,
          nombreli: 'PINAR DE CHAMARTIN-VALDECARROS',
          idnumerica: 112,
          nombreest: 'Sol',
          anden: 1,
          sentido: 'Pinar de Chamartín',
          proximo: 0,
          siguiente: 4,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
        {
          linea: 1,
          nombreli: 'PINAR DE CHAMARTIN-VALDECARROS',
          idnumerica: 112,
          nombreest: 'Sol',
          anden: 2,
          sentido: 'Valdecarros',
          proximo: 2,
          siguiente: 6,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
        {
          linea: 2,
          nombreli: 'LAS ROSAS-CUATRO CAMINOS',
          idnumerica: 112,
          nombreest: 'Sol',
          anden: 1,
          sentido: 'Cuatro Caminos',
          proximo: 3,
          siguiente: 8,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
        {
          linea: 3,
          nombreli: 'VILLAVERDE ALTO-MONCLOA',
          idnumerica: 112,
          nombreest: 'Sol',
          anden: 1,
          sentido: 'Moncloa',
          proximo: 1,
          siguiente: 5,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
      ],
    };
  }

  if (clean === '209') {
    return {
      Vtelindicadores: [
        {
          linea: 2,
          nombreli: 'LAS ROSAS-CUATRO CAMINOS',
          idnumerica: 209,
          nombreest: 'Ópera',
          anden: 1,
          sentido: 'Cuatro Caminos',
          proximo: 2,
          siguiente: 7,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
        {
          linea: 5,
          nombreli: 'ALAMEDA DE OSUNA-CASA DE CAMPO',
          idnumerica: 209,
          nombreest: 'Ópera',
          anden: 1,
          sentido: 'Casa de Campo',
          proximo: 0,
          siguiente: 5,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
        {
          linea: 0, // Ramal
          nombreli: 'RAMAL OPERA-PRINCIPE PIO',
          idnumerica: 209,
          nombreest: 'Ópera',
          anden: 1,
          sentido: 'Príncipe Pío',
          proximo: 1,
          siguiente: 6,
          FECHAHORAEMISIONPREVISION: new Date().toISOString(),
        },
      ],
    };
  }

  return {
    Vtelindicadores: [
      {
        linea: 1,
        nombreli: 'LÍNEA 1',
        idnumerica: Number(clean) || 1,
        nombreest: `Estación ${code}`,
        anden: 1,
        sentido: 'Cabecera Norte',
        proximo: 2,
        siguiente: 6,
        FECHAHORAEMISIONPREVISION: new Date().toISOString(),
      },
      {
        linea: 1,
        nombreli: 'LÍNEA 1',
        idnumerica: Number(clean) || 1,
        nombreest: `Estación ${code}`,
        anden: 2,
        sentido: 'Cabecera Sur',
        proximo: 5,
        siguiente: 11,
        FECHAHORAEMISIONPREVISION: new Date().toISOString(),
      },
    ],
  };
}

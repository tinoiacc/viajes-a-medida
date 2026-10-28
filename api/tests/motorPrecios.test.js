import { describe, it, expect } from 'vitest';
import { calcularCantidad, convertir, calcularPrecio, noches } from '../src/modulos/precios/motorPrecios.js';

// Datos de prueba con números redondos, para verificar el cálculo a mano
const FECHA = new Date('2026-10-28T12:00:00Z');
const DESDE = new Date('2026-01-01T00:00:00Z');
const PARAMETROS = [
  { concepto: 'Margen', aplicaA: 'Todos', valorPorcentual: 10, vigenciaDesde: DESDE, vigenciaHasta: null },
  { concepto: 'Tasa', aplicaA: 'Todos', valorPorcentual: 5, vigenciaDesde: DESDE, vigenciaHasta: null },
  { concepto: 'Impuesto', aplicaA: 'Alojamiento', valorPorcentual: 10, vigenciaDesde: DESDE, vigenciaHasta: null },
];
const TIPOS_DE_CAMBIO = { ARS: 1540 };
const HOTEL = { tipo: 'Alojamiento', montoNeto: 100, moneda: 'USD', cantidad: 3 };     // 3 noches a USD 100
const EXCURSION = { tipo: 'Excursion', montoNeto: 100, moneda: 'USD', cantidad: 2 };   // 2 personas a USD 100

describe('Cantidad a cobrar de cada servicio', () => {
  it('cuenta las noches entre dos fechas', () => {
    expect(noches('2026-12-12', '2026-12-19')).toBe(7);
  });

  it('alojamiento: 2 pasajeros en base doble, 7 noches = 7 unidades', () => {
    expect(calcularCantidad({ tipo: 'Alojamiento', baseOcupacion: 2, noches: 7, pasajeros: 2 })).toBe(7);
  });

  it('alojamiento: 3 pasajeros en base doble necesitan 2 habitaciones', () => {
    expect(calcularCantidad({ tipo: 'Alojamiento', baseOcupacion: 2, noches: 7, pasajeros: 3 })).toBe(14);
  });

  it('excursión: se cobra por persona', () => {
    expect(calcularCantidad({ tipo: 'Excursion', baseOcupacion: 1, noches: 7, pasajeros: 2 })).toBe(2);
  });

  it('adicional: la cantidad la define el agente', () => {
    expect(calcularCantidad({ tipo: 'Adicional', baseOcupacion: 1, noches: 7, pasajeros: 2, cantidadAdicional: 3 })).toBe(3);
  });
});

describe('Conversión de moneda (HU-12, crit. 2)', () => {
  it('convierte pesos a dólares con el tipo de cambio', () => {
    expect(convertir(154000, 'ARS', TIPOS_DE_CAMBIO)).toBe(100);
  });

  it('deja los dólares como están', () => {
    expect(convertir(100, 'USD', TIPOS_DE_CAMBIO)).toBe(100);
  });

  it('avisa si falta el tipo de cambio de una moneda', () => {
    expect(() => convertir(100, 'EUR', TIPOS_DE_CAMBIO)).toThrow(/tipo de cambio/);
  });
});

describe('Precio de una opción (HU-12)', () => {
  it('suma el costo neto y aplica margen, tasas e impuestos (crit. 1)', () => {
    const precio = calcularPrecio({
      servicios: [HOTEL, EXCURSION], parametros: PARAMETROS, tiposDeCambio: TIPOS_DE_CAMBIO, fecha: FECHA,
    });
    // Hotel: 300 + 30 de margen + 49,50 (15 % de 330). Excursión: 200 + 20 + 11 (5 % de 220)
    expect(precio).toMatchObject({ costoNeto: 500, margen: 50, impuestos: 60.5, aereo: 0, precioFinal: 610.5 });
  });

  it('el impuesto de alojamiento no se aplica a una excursión', () => {
    const precio = calcularPrecio({
      servicios: [EXCURSION], parametros: PARAMETROS, tiposDeCambio: TIPOS_DE_CAMBIO, fecha: FECHA,
    });
    expect(precio).toMatchObject({ impuestos: 11, precioFinal: 231 });
  });

  it('convierte a dólares los servicios en pesos (crit. 2)', () => {
    const hotelEnPesos = { ...HOTEL, montoNeto: 154000, moneda: 'ARS' };
    const precio = calcularPrecio({
      servicios: [hotelEnPesos], parametros: PARAMETROS, tiposDeCambio: TIPOS_DE_CAMBIO, fecha: FECHA,
    });
    expect(precio).toMatchObject({ moneda: 'USD', costoNeto: 300, precioFinal: 379.5 });
  });

  it('suma el aéreo al precio final (HU-13, crit. 1)', () => {
    const precio = calcularPrecio({
      servicios: [HOTEL, EXCURSION], parametros: PARAMETROS, tiposDeCambio: TIPOS_DE_CAMBIO,
      importeAereo: 400, fecha: FECHA,
    });
    expect(precio).toMatchObject({ aereo: 400, precioFinal: 1010.5 });
  });

  it('no aplica un parámetro que ya venció', () => {
    const margenVencido = [
      { ...PARAMETROS[0], vigenciaHasta: new Date('2026-01-31T00:00:00Z') },
      PARAMETROS[1],
      PARAMETROS[2],
    ];
    const precio = calcularPrecio({
      servicios: [EXCURSION], parametros: margenVencido, tiposDeCambio: TIPOS_DE_CAMBIO, fecha: FECHA,
    });
    expect(precio).toMatchObject({ margen: 0, impuestos: 10, precioFinal: 210 });
  });

  it('el desglose suma exactamente el precio final (crit. 3)', () => {
    const p = calcularPrecio({
      servicios: [HOTEL, EXCURSION], parametros: PARAMETROS, tiposDeCambio: TIPOS_DE_CAMBIO,
      importeAereo: 123.45, fecha: FECHA,
    });
    expect(p.costoNeto + p.margen + p.impuestos + p.aereo).toBeCloseTo(p.precioFinal, 2);
  });
});
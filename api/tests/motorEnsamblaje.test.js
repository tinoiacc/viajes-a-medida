import { describe, it, expect } from 'vitest';
import { ensamblar, cantidadExcursiones } from '../src/modulos/ensamblaje/motorEnsamblaje.js';

// Un catálogo chico, sin parámetros comerciales: el precio de cada opción es su costo neto.
// 2 pasajeros, 4 noches. Traslado 20 × 2 = 40; excursiones A (25) y B (40) × 2 = 130.
// Hoteles en base doble, 1 habitación × 4 noches: Económico 400, Medio 600, Lujo 1.200.
const FECHA = new Date('2026-10-28T12:00:00Z');

const servicio = (idServicio, tipo, nombre, montoNeto, { categoria = null, moneda = 'USD' } = {}) => ({
  idServicio,
  tipo,
  nombre,
  categoria,
  tarifa: { id: idServicio * 10, montoNeto, moneda, baseOcupacion: tipo === 'Alojamiento' ? 2 : 1 },
});

const tramo = (servicios, cambios = {}) => ({
  idDestino: 1,
  destino: 'Destino de prueba',
  fechaDesde: new Date('2027-01-10T00:00:00Z'),
  fechaHasta: new Date('2027-01-14T00:00:00Z'),
  servicios,
  ...cambios,
});

const ECONOMICO = servicio(1, 'Alojamiento', 'Hotel Económico', 100, { categoria: '2' });
const MEDIO = servicio(2, 'Alojamiento', 'Hotel Medio', 150, { categoria: '3' });
const LUJO = servicio(3, 'Alojamiento', 'Hotel Lujo', 300, { categoria: '5' });
const TRASLADO = servicio(4, 'Traslado', 'Traslado aeropuerto', 20);
const EXCURSION_A = servicio(5, 'Excursion', 'Excursión A', 30);
const EXCURSION_A_OTRO = servicio(6, 'Excursion', 'Excursión A', 25000, { moneda: 'ARS' }); // USD 25
const EXCURSION_B = servicio(7, 'Excursion', 'Excursión B', 40);
const EXCURSION_C = servicio(8, 'Excursion', 'Excursión C', 50);
const CATALOGO = [ECONOMICO, MEDIO, LUJO, TRASLADO, EXCURSION_A, EXCURSION_A_OTRO, EXCURSION_B, EXCURSION_C];

const BASE = {
  pasajeros: 2,
  prioridadPrecioConfort: 3,
  prioridadRitmo: 3,
  presupuestoMax: 5000,
  parametros: [],
  tiposDeCambio: { ARS: 1000 },
  fecha: FECHA,
};

const armar = (cambios = {}, tramos = [tramo(CATALOGO)]) => ensamblar({ ...BASE, tramos, ...cambios });
const hoteles = (resultado) => resultado.opciones.map((o) => o.items[0].idServicio);
const servicios = (opcion) => opcion.items.map((i) => i.idServicio);

describe('Motor de ensamblaje (HU-11)', () => {
  it('calcula cuántas excursiones lleva según el ritmo', () => {
    expect(cantidadExcursiones(7, 1)).toBe(0); // ritmo 1: ninguna
    expect(cantidadExcursiones(7, 2)).toBe(2);
    expect(cantidadExcursiones(7, 5)).toBe(7); // ritmo 5: una por noche
  });

  it('arma 3 opciones con todos los servicios (crit. 1)', () => {
    const r = armar();
    expect(r.opciones).toHaveLength(3);
    // Cada opción: hotel + traslado + 2 excursiones (4 noches con ritmo 3)
    r.opciones.forEach((o) => expect(o.items).toHaveLength(4));
  });

  it('si el cliente prioriza el precio, la más barata va primero (crit. 2)', () => {
    const r = armar({ prioridadPrecioConfort: 1 });
    expect(hoteles(r)).toEqual([1, 2, 3]);
    expect(r.opciones.map((o) => o.precio)).toEqual([570, 770, 1370]);
  });

  it('si el cliente prioriza la categoría, la mejor va primero (crit. 2)', () => {
    const r = armar({ prioridadPrecioConfort: 5 });
    expect(hoteles(r)).toEqual([3, 2, 1]);
  });

  it('no repite una excursión que ofrecen dos proveedores: elige la más barata', () => {
    const [primera] = armar().opciones;
    expect(servicios(primera)).toContain(6);       // Excursión A a USD 25
    expect(servicios(primera)).not.toContain(5);   // Excursión A a USD 30
  });

  it('con ritmo 1 no incluye excursiones', () => {
    const r = armar({ prioridadRitmo: 1 });
    r.opciones.forEach((o) => expect(o.items).toHaveLength(2)); // hotel + traslado
  });

  it('descarta las opciones que superan el presupuesto con tolerancia', () => {
    const CARO = servicio(9, 'Alojamiento', 'Hotel Caro', 500, { categoria: '4' }); // 2.170 en total
    const r = armar({ presupuestoMax: 1500 }, [tramo([...CATALOGO, CARO])]);     // tolerancia hasta 1.650
    expect(hoteles(r)).not.toContain(9);
  });

  it('si quedan menos de 3 dentro del presupuesto, toma las más baratas y avisa', () => {
    const r = armar({ presupuestoMax: 700 }); // solo 570 y 770 entran con la tolerancia
    expect(r.opciones).toHaveLength(3);
    expect(r.opciones.filter((o) => o.excedePresupuesto)).toHaveLength(2); // 770 y 1.370 superan 700
    expect(r.avisos.some((a) => a.includes('supera el presupuesto'))).toBe(true);
  });

  it('combina los alojamientos de varios destinos', () => {
    const sur = tramo(
      [
        servicio(11, 'Alojamiento', 'Posada Sur', 80, { categoria: '3' }),
        servicio(12, 'Alojamiento', 'Hotel Sur', 120, { categoria: '4' }),
      ],
      { idDestino: 2, destino: 'Sur', fechaDesde: new Date('2027-01-14T00:00:00Z'), fechaHasta: new Date('2027-01-16T00:00:00Z') },
    );
    const r = armar({}, [tramo([ECONOMICO, MEDIO, TRASLADO, EXCURSION_A, EXCURSION_B]), sur]);
    expect(r.opciones).toHaveLength(3);
    r.opciones.forEach((o) => {
      const ids = servicios(o);
      expect(ids.some((id) => [1, 2].includes(id))).toBe(true);   // un hotel del primer destino
      expect(ids.some((id) => [11, 12].includes(id))).toBe(true); // y uno del segundo
    });
    expect(r.avisos.some((a) => a.includes('No hay traslados disponibles en Sur'))).toBe(true);
  });

  it('avisa si el catálogo alcanza para menos de 3 opciones', () => {
    const r = armar({}, [tramo([ECONOMICO, MEDIO, TRASLADO])]);
    expect(r.opciones).toHaveLength(2);
    expect(r.avisos.some((a) => a.includes('solo se pudieron armar 2 opciones'))).toBe(true);
  });

  it('informa cuando un destino no tiene servicios disponibles (crit. 3)', () => {
    expect(() => armar({}, [tramo([])])).toThrow(/No hay servicios disponibles en Destino de prueba/);
  });

  it('informa cuando un destino no tiene alojamientos', () => {
    expect(() => armar({}, [tramo([TRASLADO, EXCURSION_A])])).toThrow(/No hay alojamientos disponibles/);
  });
});
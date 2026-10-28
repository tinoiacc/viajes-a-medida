import { calcularPrecio, calcularCantidad, convertir, noches } from '../precios/motorPrecios.js';
import { normalizar } from '../../lib/formato.js';

// Motor de ensamblaje (HU-11). Funciones puras, igual que el motor de precios:
// reciben el catálogo ya filtrado y devuelven las opciones, sin tocar la base.

export class ErrorEnsamblaje extends Error {}

export const MAX_OPCIONES = 3;
export const MAX_ALOJAMIENTOS_POR_DESTINO = 4; // acota las combinaciones con varios destinos
export const TOLERANCIA_PRESUPUESTO = 1.1;     // se aceptan opciones hasta un 10 % sobre el presupuesto

const plural = (n, singular, pluralTexto) => `${n} ${n === 1 ? singular : pluralTexto}`;

// Cantidad de excursiones según el ritmo (1 = ninguna, 5 = una por noche)
export const cantidadExcursiones = (cantidadNoches, ritmo) =>
  Math.round((cantidadNoches * (ritmo - 1)) / 4);

// Suma ponderada (análisis multicriterio): S = (1 − w)·Pn + w·Cn, con w = (prioridad − 1) / 4.
// Pn vale 1 para el candidato más barato; Cn vale 1 para el de mejor categoría.
export function puntuar(candidatos, prioridadPrecioConfort) {
  const w = (prioridadPrecioConfort - 1) / 4;
  const precios = candidatos.map((c) => c.precio);
  const categorias = candidatos.map((c) => c.categoria);
  const pMin = Math.min(...precios);
  const pMax = Math.max(...precios);
  const cMin = Math.min(...categorias);
  const cMax = Math.max(...categorias);

  return candidatos.map((c) => {
    const pn = pMax === pMin ? 1 : (pMax - c.precio) / (pMax - pMin);
    const cn = cMax === cMin ? 1 : (c.categoria - cMin) / (cMax - cMin);
    return { ...c, puntaje: (1 - w) * pn + w * cn };
  });
}

// Mayor puntaje primero; si empatan, la más barata
const porPuntaje = (a, b) => b.puntaje - a.puntaje || a.precio - b.precio;

// HU-11: arma las opciones de viaje
export function ensamblar({
  tramos, pasajeros, prioridadPrecioConfort, prioridadRitmo, presupuestoMax,
  parametros, tiposDeCambio, fecha = new Date(),
}) {
  const avisos = [];
  const usd = (s) => convertir(Number(s.tarifa.montoNeto), s.tarifa.moneda, tiposDeCambio);
  const porPrecio = (a, b) => usd(a) - usd(b);

  // 1. Por cada destino: alojamientos candidatos y servicios fijos (traslado y excursiones)
  const partes = tramos.map((t) => {
    if (t.servicios.length === 0) {
      throw new ErrorEnsamblaje(`No hay servicios disponibles en ${t.destino} para esas fechas`); // crit. 3
    }

    const cantidadNoches = noches(t.fechaDesde, t.fechaHasta);
    const delTipo = (tipo) => t.servicios.filter((s) => s.tipo === tipo);
    const item = (s) => ({
      servicio: s,
      idServicio: s.idServicio,
      idTarifa: s.tarifa.id,
      fechaDesde: t.fechaDesde,
      fechaHasta: t.fechaHasta,
      cantidad: calcularCantidad({
        tipo: s.tipo, baseOcupacion: s.tarifa.baseOcupacion, noches: cantidadNoches, pasajeros,
      }),
    });

    const alojamientos = delTipo('Alojamiento');
    if (alojamientos.length === 0) {
      throw new ErrorEnsamblaje(`No hay alojamientos disponibles en ${t.destino} para esas fechas`);
    }

    // Traslado: el más barato
    const [traslado] = delTipo('Traslado').sort(porPrecio);
    if (!traslado) avisos.push(`No hay traslados disponibles en ${t.destino}: las opciones no lo incluyen`);

    // Excursiones: sin repetir (si dos proveedores ofrecen la misma, la más barata),
    // las más económicas primero, tantas como pida el ritmo del cliente
    const unicas = new Map();
    for (const e of delTipo('Excursion')) {
      const clave = normalizar(e.nombre);
      if (!unicas.has(clave) || usd(e) < usd(unicas.get(clave))) unicas.set(clave, e);
    }
    const pedidas = cantidadExcursiones(cantidadNoches, prioridadRitmo);
    const excursiones = [...unicas.values()].sort(porPrecio).slice(0, pedidas);
    if (excursiones.length < pedidas) {
      avisos.push(
        `En ${t.destino} hay ${plural(excursiones.length, 'excursión disponible', 'excursiones disponibles')} ` +
        `de las ${pedidas} que pide el ritmo del cliente`,
      );
    }

    // Alojamientos: los mejores según las prioridades del cliente, para acotar las combinaciones
    const mejores = puntuar(
      alojamientos.map((a) => ({ servicio: a, precio: usd(a), categoria: Number(a.categoria) || 0 })),
      prioridadPrecioConfort,
    ).sort(porPuntaje).slice(0, MAX_ALOJAMIENTOS_POR_DESTINO);

    return {
      alojamientos: mejores.map((m) => item(m.servicio)),
      fijos: [traslado, ...excursiones].filter(Boolean).map(item),
    };
  });

  // 2. Combinaciones: un alojamiento por destino (producto cartesiano)
  let combinaciones = [[]];
  for (const p of partes) {
    combinaciones = combinaciones.flatMap((combo) => p.alojamientos.map((a) => [...combo, a]));
  }
  const fijos = partes.flatMap((p) => p.fijos);

  // 3. Precio de cada combinación, con el motor de precios
  const candidatos = combinaciones.map((alojamientosElegidos) => {
    const items = [...alojamientosElegidos, ...fijos];
    const { precioFinal } = calcularPrecio({
      servicios: items.map((i) => ({
        tipo: i.servicio.tipo,
        montoNeto: i.servicio.tarifa.montoNeto,
        moneda: i.servicio.tarifa.moneda,
        cantidad: i.cantidad,
      })),
      parametros,
      tiposDeCambio,
      fecha,
    });
    const categoria =
      alojamientosElegidos.reduce((suma, a) => suma + (Number(a.servicio.categoria) || 0), 0) /
      alojamientosElegidos.length;
    // Lo que se guarda de cada servicio, sin el objeto completo del catálogo
    return { items: items.map(({ servicio, ...resto }) => resto), precio: precioFinal, categoria };
  });

  // 4. Presupuesto: se descartan las que lo superan (con tolerancia).
  //    Si quedan menos de 3, se toman igual las 3 más baratas
  let elegibles = candidatos.filter((c) => c.precio <= presupuestoMax * TOLERANCIA_PRESUPUESTO);
  if (elegibles.length < MAX_OPCIONES) {
    elegibles = [...candidatos].sort((a, b) => a.precio - b.precio).slice(0, MAX_OPCIONES);
  }

  // 5. Puntaje según las prioridades del cliente y orden (crit. 2)
  const opciones = puntuar(elegibles, prioridadPrecioConfort)
    .sort(porPuntaje)
    .slice(0, MAX_OPCIONES)
    .map((o) => ({ ...o, excedePresupuesto: o.precio > presupuestoMax }));

  if (opciones.length < MAX_OPCIONES) {
    avisos.push(`Con el catálogo disponible solo se pudieron armar ${plural(opciones.length, 'opción', 'opciones')}`);
  }
  opciones.forEach((o, i) => {
    if (o.excedePresupuesto) avisos.push(`La opción ${i + 1} supera el presupuesto del cliente`);
  });

  return { opciones, avisos };
}
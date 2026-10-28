import { normalizar } from '../../lib/formato.js';

// Motor de precios (HU-12). Funciones puras: reciben datos y devuelven resultados,
// sin acceder a la base. Por eso se pueden verificar con pruebas automáticas.

export const MONEDA_COTIZACION = 'USD';

const CONCEPTOS_MARGEN = ['margen', 'comision'];  // se aplican sobre el costo neto
const CONCEPTOS_IMPUESTO = ['tasa', 'impuesto'];  // se aplican sobre costo neto + margen

// Redondeo a 2 decimales (centavos)
export const redondear = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Fecha como texto AAAA-MM-DD, para comparar días sin importar la hora
const dia = (fecha) => new Date(fecha).toISOString().slice(0, 10);

// Noches entre dos fechas
export const noches = (desde, hasta) =>
  Math.round((new Date(hasta) - new Date(desde)) / 86400000);

// Unidades a cobrar de un servicio.
// La tarifa vale para "base" pasajeros: con base 2, 3 pasajeros necesitan 2 unidades.
export function calcularCantidad({ tipo, baseOcupacion, noches: cantidadNoches, pasajeros, cantidadAdicional = 1 }) {
  const unidades = Math.ceil(pasajeros / baseOcupacion);
  switch (tipo) {
    case 'Alojamiento':
      return unidades * cantidadNoches; // habitaciones × noches
    case 'Traslado':
    case 'Excursion':
      return unidades;                  // con base 1, una por persona
    case 'Adicional':
      return cantidadAdicional;         // la define el agente
    default:
      throw new Error(`Tipo de servicio desconocido: ${tipo}`);
  }
}

// HU-12, criterio 2: convierte un monto a la moneda de cotización
export function convertir(monto, moneda, tiposDeCambio) {
  if (moneda === MONEDA_COTIZACION) return monto;
  const tipoCambio = tiposDeCambio[moneda];
  if (!tipoCambio) throw new Error(`No hay tipo de cambio configurado para ${moneda}`);
  return monto / tipoCambio;
}

// Suma los porcentajes de los parámetros que aplican a un tipo de servicio en una fecha
function porcentajeAplicable(parametros, conceptos, tipo, fecha) {
  const hoy = dia(fecha);
  return parametros
    .filter((p) => conceptos.includes(normalizar(p.concepto)))
    .filter((p) => p.aplicaA === 'Todos' || p.aplicaA === tipo)
    .filter((p) => dia(p.vigenciaDesde) <= hoy && (!p.vigenciaHasta || dia(p.vigenciaHasta) >= hoy))
    .reduce((suma, p) => suma + Number(p.valorPorcentual), 0);
}

// HU-12: precio de una opción, con su desglose
export function calcularPrecio({ servicios, parametros, tiposDeCambio, importeAereo = 0, fecha = new Date() }) {
  const lineas = servicios.map((s) => {
    const neto = convertir(Number(s.montoNeto), s.moneda, tiposDeCambio) * s.cantidad;
    const margen = (neto * porcentajeAplicable(parametros, CONCEPTOS_MARGEN, s.tipo, fecha)) / 100;
    const impuestos =
      ((neto + margen) * porcentajeAplicable(parametros, CONCEPTOS_IMPUESTO, s.tipo, fecha)) / 100;
    return { neto, margen, impuestos };
  });

  const sumar = (campo) => redondear(lineas.reduce((total, l) => total + l[campo], 0));
  const costoNeto = sumar('neto');
  const margen = sumar('margen');
  const impuestos = sumar('impuestos');
  const aereo = redondear(Number(importeAereo));

  return {
    moneda: MONEDA_COTIZACION,
    costoNeto,
    margen,
    impuestos,
    aereo,
    // El final se arma con las partes ya redondeadas: el desglose siempre suma exacto
    precioFinal: redondear(costoNeto + margen + impuestos + aereo),
  };
}
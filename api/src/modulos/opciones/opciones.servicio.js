import { prisma } from '../../lib/prisma.js';
import { ErrorHttp } from '../../middlewares/errores.js';
import { ESTADOS } from '../estados/maquinaEstados.js';
import { obtenerSolicitud } from '../panel/panel.servicio.js';
import { calcularPrecio, calcularCantidad, convertir, noches, redondear } from '../precios/motorPrecios.js';

const tiposDeCambio = () => ({ ARS: Number(process.env.TIPO_CAMBIO_ARS_USD) });

// Solo estos tipos se agregan o se quitan; el alojamiento y el traslado se reemplazan
const AGREGABLES = ['Excursion', 'Adicional'];

const pasajerosDe = (solicitud) => solicitud.cantidadAdultos + solicitud.cantidadMenores;

// Tarifa del servicio vigente durante todo el período (si hay varias, la última cargada)
export function tarifaVigente(idServicio, desde, hasta) {
  return prisma.tarifa.findFirst({
    where: { idServicio, vigenciaDesde: { lte: desde }, vigenciaHasta: { gte: hasta } },
    orderBy: { id: 'desc' },
  });
}

// HU-12: recalcula con el motor de precios y guarda el resultado en la opción
export async function recalcularOpcion(idOpcion) {
  const [opcion, parametros] = await Promise.all([
    prisma.opcion.findUnique({
      where: { id: idOpcion },
      include: { servicios: { include: { servicio: true, tarifa: true } } },
    }),
    prisma.parametroComercial.findMany(),
  ]);

  const precio = calcularPrecio({
    servicios: opcion.servicios.map((os) => ({
      tipo: os.servicio.tipo,
      montoNeto: os.tarifa.montoNeto,
      moneda: os.tarifa.moneda,
      cantidad: os.cantidad,
    })),
    parametros,
    tiposDeCambio: tiposDeCambio(),
    importeAereo: opcion.importeAereo,
  });

  await prisma.opcion.update({
    where: { id: idOpcion },
    data: {
      costoNetoTotal: precio.costoNeto,
      margenAplicado: precio.margen,
      precioFinal: precio.precioFinal,
      moneda: precio.moneda,
    },
  });
  return precio;
}

// Crea una opción con sus servicios y calcula su precio (la va a usar el motor de ensamblaje)
export async function crearOpcion(idSolicitud, items, orden) {
  const opcion = await prisma.opcion.create({
    data: {
      idSolicitud,
      origen: 'Armada',
      orden,
      costoNetoTotal: 0,
      margenAplicado: 0,
      precioFinal: 0,
      servicios: { create: items },
    },
  });
  const precio = await recalcularOpcion(opcion.id);
  return { id: opcion.id, ...precio };
}

// Busca la opción y verifica que se pueda modificar
async function opcionEditable(idOpcion) {
  const opcion = await prisma.opcion.findUnique({
    where: { id: idOpcion },
    include: {
      solicitud: { include: { destinos: true } },
      servicios: { include: { servicio: true } },
    },
  });
  if (!opcion) throw new ErrorHttp(404, 'La opción no existe');
  if (opcion.solicitud.estado !== ESTADOS.EN_ARMADO) {
    throw new ErrorHttp(409, 'Solo se pueden modificar las opciones de una solicitud En armado');
  }
  return opcion;
}

function lineaDe(opcion, idLinea) {
  const linea = opcion.servicios.find((os) => os.id === idLinea);
  if (!linea) throw new ErrorHttp(404, 'El servicio no pertenece a esta opción');
  return linea;
}

// HU-13, criterio 1: carga del importe aéreo conseguido por fuera de la plataforma
export async function cargarAereo(idOpcion, importe) {
  const opcion = await opcionEditable(idOpcion);
  await prisma.opcion.update({ where: { id: idOpcion }, data: { importeAereo: importe } });
  await recalcularOpcion(idOpcion);
  return obtenerSolicitud(opcion.idSolicitud);
}

// HU-14, criterio 2: descartar (o recuperar) una opción
export async function descartarOpcion(idOpcion, descartada) {
  const opcion = await opcionEditable(idOpcion);
  await prisma.opcion.update({ where: { id: idOpcion }, data: { descartada } });
  return obtenerSolicitud(opcion.idSolicitud);
}

// Servicios que pueden reemplazar a uno de la opción: mismo tipo, mismo destino,
// con tarifa vigente para esas fechas. Incluye el proveedor para comparar.
export async function listarAlternativas(idOpcion, idLinea) {
  const opcion = await opcionEditable(idOpcion);
  const linea = lineaDe(opcion, idLinea);

  const candidatos = await prisma.servicio.findMany({
    where: {
      tipo: linea.servicio.tipo,
      idDestino: linea.servicio.idDestino,
      id: { not: linea.idServicio },
    },
    include: { proveedor: true },
    orderBy: { nombre: 'asc' },
  });

  const alternativas = [];
  for (const s of candidatos) {
    const tarifa = await tarifaVigente(s.id, linea.fechaDesde, linea.fechaHasta);
    if (!tarifa) continue;
    alternativas.push({
      idServicio: s.id,
      nombre: s.nombre,
      categoria: s.categoria,
      proveedor: s.proveedor.nombre,
      montoNeto: Number(tarifa.montoNeto),
      moneda: tarifa.moneda,
      montoUSD: redondear(convertir(Number(tarifa.montoNeto), tarifa.moneda, tiposDeCambio())),
      baseOcupacion: tarifa.baseOcupacion,
    });
  }
  return alternativas;
}

// HU-14, criterio 1: reemplazar un servicio y recalcular el precio
export async function reemplazarServicio(idOpcion, idLinea, idServicioNuevo) {
  const opcion = await opcionEditable(idOpcion);
  const linea = lineaDe(opcion, idLinea);

  const nuevo = await prisma.servicio.findUnique({ where: { id: idServicioNuevo } });
  if (!nuevo) throw new ErrorHttp(404, 'El servicio no existe');
  if (nuevo.tipo !== linea.servicio.tipo || nuevo.idDestino !== linea.servicio.idDestino) {
    throw new ErrorHttp(409, 'El reemplazo debe ser del mismo tipo y del mismo destino');
  }

  const tarifa = await tarifaVigente(nuevo.id, linea.fechaDesde, linea.fechaHasta);
  if (!tarifa) throw new ErrorHttp(409, 'El servicio no tiene una tarifa vigente para esas fechas');

  // La cantidad se recalcula: el servicio nuevo puede tener otra base de ocupación
  const cantidad = nuevo.tipo === 'Adicional'
    ? linea.cantidad
    : calcularCantidad({
        tipo: nuevo.tipo,
        baseOcupacion: tarifa.baseOcupacion,
        noches: noches(linea.fechaDesde, linea.fechaHasta),
        pasajeros: pasajerosDe(opcion.solicitud),
      });

  await prisma.opcionServicio.update({
    where: { id: idLinea },
    data: { idServicio: nuevo.id, idTarifa: tarifa.id, cantidad },
  });
  await recalcularOpcion(idOpcion);
  return obtenerSolicitud(opcion.idSolicitud);
}

// HU-14, criterio 1: agregar una excursión o un adicional a la opción
export async function agregarServicio(idOpcion, { idServicio, cantidad }) {
  const opcion = await opcionEditable(idOpcion);

  const servicio = await prisma.servicio.findUnique({ where: { id: idServicio } });
  if (!servicio) throw new ErrorHttp(404, 'El servicio no existe');
  if (!AGREGABLES.includes(servicio.tipo)) {
    throw new ErrorHttp(409, 'Solo se agregan excursiones y adicionales; el alojamiento y el traslado se reemplazan');
  }

  // El servicio tiene que ser de uno de los destinos pedidos; toma las fechas de ese tramo
  const tramo = opcion.solicitud.destinos.find((d) => d.idDestino === servicio.idDestino);
  if (!tramo) throw new ErrorHttp(409, 'El servicio no corresponde a ningún destino de la solicitud');

  const tarifa = await tarifaVigente(servicio.id, tramo.fechaDesde, tramo.fechaHasta);
  if (!tarifa) throw new ErrorHttp(409, 'El servicio no tiene una tarifa vigente para esas fechas');

  const unidades = servicio.tipo === 'Adicional'
    ? cantidad
    : calcularCantidad({
        tipo: servicio.tipo,
        baseOcupacion: tarifa.baseOcupacion,
        noches: noches(tramo.fechaDesde, tramo.fechaHasta),
        pasajeros: pasajerosDe(opcion.solicitud),
      });

  await prisma.opcionServicio.create({
    data: {
      idOpcion,
      idServicio: servicio.id,
      idTarifa: tarifa.id,
      fechaDesde: tramo.fechaDesde,
      fechaHasta: tramo.fechaHasta,
      cantidad: unidades,
    },
  });
  await recalcularOpcion(idOpcion);
  return obtenerSolicitud(opcion.idSolicitud);
}

// HU-14, criterio 1: quitar una excursión o un adicional
export async function quitarServicio(idOpcion, idLinea) {
  const opcion = await opcionEditable(idOpcion);
  const linea = lineaDe(opcion, idLinea);
  if (!AGREGABLES.includes(linea.servicio.tipo)) {
    throw new ErrorHttp(409, 'El alojamiento y el traslado no se quitan: se reemplazan');
  }
  await prisma.opcionServicio.delete({ where: { id: idLinea } });
  await recalcularOpcion(idOpcion);
  return obtenerSolicitud(opcion.idSolicitud);
}
// Excursiones y adicionales que se pueden sumar a la opción: de los destinos pedidos,
// con tarifa vigente para su tramo y que la opción todavía no tenga
export async function listarAgregables(idOpcion) {
  const opcion = await opcionEditable(idOpcion);
  const yaIncluidos = new Set(opcion.servicios.map((os) => os.idServicio));
  const resultado = [];

  for (const tramo of opcion.solicitud.destinos) {
    const servicios = await prisma.servicio.findMany({
      where: { idDestino: tramo.idDestino, tipo: { in: AGREGABLES } },
      include: { proveedor: true, destino: true },
      orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }],
    });
    for (const s of servicios) {
      if (yaIncluidos.has(s.id)) continue;
      const tarifa = await tarifaVigente(s.id, tramo.fechaDesde, tramo.fechaHasta);
      if (!tarifa) continue;
      resultado.push({
        idServicio: s.id,
        tipo: s.tipo,
        nombre: s.nombre,
        destino: s.destino.nombre,
        proveedor: s.proveedor.nombre,
        montoNeto: Number(tarifa.montoNeto),
        moneda: tarifa.moneda,
        montoUSD: redondear(convertir(Number(tarifa.montoNeto), tarifa.moneda, tiposDeCambio())),
      });
    }
  }
  return resultado;
}
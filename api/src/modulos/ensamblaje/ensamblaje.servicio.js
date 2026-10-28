import { prisma } from '../../lib/prisma.js';
import { ErrorHttp } from '../../middlewares/errores.js';
import { ESTADOS } from '../estados/maquinaEstados.js';
import { obtenerSolicitud } from '../panel/panel.servicio.js';
import { crearOpcion } from '../opciones/opciones.servicio.js';
import { ensamblar, ErrorEnsamblaje } from './motorEnsamblaje.js';

// Los adicionales no se ensamblan: los agrega el agente al ajustar la propuesta
const TIPOS_ENSAMBLADOS = ['Alojamiento', 'Traslado', 'Excursion'];

// Servicios de un destino con tarifa vigente durante todo el tramo (la última cargada)
async function catalogoDelTramo(tramo) {
  const servicios = await prisma.servicio.findMany({
    where: { idDestino: tramo.idDestino, tipo: { in: TIPOS_ENSAMBLADOS } },
    include: {
      tarifas: {
        where: { vigenciaDesde: { lte: tramo.fechaDesde }, vigenciaHasta: { gte: tramo.fechaHasta } },
        orderBy: { id: 'desc' },
        take: 1,
      },
    },
  });

  return servicios
    .filter((s) => s.tarifas.length > 0)
    .map((s) => ({
      idServicio: s.id,
      tipo: s.tipo,
      nombre: s.nombre,
      categoria: s.categoria,
      tarifa: s.tarifas[0],
    }));
}

// HU-11: arma y guarda las opciones de viaje de una solicitud
export async function generarOpciones(idSolicitud) {
  const solicitud = await prisma.solicitud.findUnique({
    where: { id: idSolicitud },
    include: { destinos: { include: { destino: true }, orderBy: { fechaDesde: 'asc' } } },
  });
  if (!solicitud) throw new ErrorHttp(404, 'La solicitud no existe');
  if (solicitud.estado !== ESTADOS.EN_ARMADO) {
    throw new ErrorHttp(409, 'Para armar opciones, la solicitud tiene que estar En armado');
  }

  // El catálogo vigente de cada destino pedido
  const tramos = [];
  for (const d of solicitud.destinos) {
    tramos.push({
      idDestino: d.idDestino,
      destino: d.destino.nombre,
      fechaDesde: d.fechaDesde,
      fechaHasta: d.fechaHasta,
      servicios: await catalogoDelTramo(d),
    });
  }

  let resultado;
  try {
    resultado = ensamblar({
      tramos,
      pasajeros: solicitud.cantidadAdultos + solicitud.cantidadMenores,
      prioridadPrecioConfort: solicitud.prioridadPrecioConfort,
      prioridadRitmo: solicitud.prioridadRitmo,
      presupuestoMax: Number(solicitud.presupuestoMax),
      parametros: await prisma.parametroComercial.findMany(),
      tiposDeCambio: { ARS: Number(process.env.TIPO_CAMBIO_ARS_USD) },
    });
  } catch (e) {
    // Los errores del motor (destino sin servicios) se informan al agente con un 409
    if (e instanceof ErrorEnsamblaje) throw new ErrorHttp(409, e.message);
    throw e;
  }

  // Las opciones nuevas reemplazan a las anteriores de la solicitud
  await prisma.opcion.deleteMany({ where: { idSolicitud } });
  for (const [i, opcion] of resultado.opciones.entries()) {
    await crearOpcion(idSolicitud, opcion.items, i + 1);
  }

  return { ...(await obtenerSolicitud(idSolicitud)), avisos: resultado.avisos };
}
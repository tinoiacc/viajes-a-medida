import { prisma } from '../../lib/prisma.js';
import { ErrorHttp } from '../../middlewares/errores.js';
import { generarCodigo } from './codigo.js';
import { enviarCodigoSeguimiento } from '../notificaciones/correo.js';

export async function crearSolicitud(datos) {
  // Verifica que los destinos elegidos existan
  const ids = [...new Set(datos.destinos.map((d) => d.idDestino))];
  const existentes = await prisma.destino.count({ where: { id: { in: ids } } });
  if (existentes !== ids.length) {
    throw new ErrorHttp(400, 'Alguno de los destinos seleccionados no existe');
  }

  // HU-03, criterio 1: código único y no secuencial
  let codigo;
  do {
    codigo = generarCodigo();
  } while (await prisma.solicitud.findUnique({ where: { codigoSeguimiento: codigo } }));

  // HU-01, criterio 3: se registra en estado RECIBIDA, junto con sus destinos
  const solicitud = await prisma.solicitud.create({
    data: {
      codigoSeguimiento: codigo,
      nombreCliente: datos.nombreCliente,
      apellidoCliente: datos.apellidoCliente,
      email: datos.email,
      comentarios: datos.comentarios || null,
      cantidadAdultos: datos.cantidadAdultos,
      cantidadMenores: datos.cantidadMenores,
      presupuestoMax: datos.presupuestoMax,
      prioridadPrecioConfort: datos.prioridadPrecioConfort,
      prioridadRitmo: datos.prioridadRitmo,
      estado: 'RECIBIDA',
      destinos: {
        create: datos.destinos.map((d) => ({
          idDestino: d.idDestino,
          fechaDesde: d.fechaDesde,
          fechaHasta: d.fechaHasta,
        })),
      },
    },
  });

  await enviarCodigoSeguimiento({ email: solicitud.email, nombre: solicitud.nombreCliente, codigo });

  return {
    codigoSeguimiento: solicitud.codigoSeguimiento,
    estado: solicitud.estado,
    fechaIngreso: solicitud.fechaIngreso,
  };
}
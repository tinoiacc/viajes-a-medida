import { prisma } from '../../lib/prisma.js';
import { aNumero } from '../../lib/formato.js';
import { ErrorHttp } from '../../middlewares/errores.js';
import { ESTADOS, ETIQUETAS, estadosPosibles, verificarTransicion } from '../estados/maquinaEstados.js';
import { redondear } from '../precios/motorPrecios.js';
import { enviarAvisoPropuesta } from '../notificaciones/correo.js';

// HU-10, criterios 1 y 2: listado de solicitudes, con filtro por estado
export async function listarSolicitudes({ estado }) {
  const solicitudes = await prisma.solicitud.findMany({
    where: estado ? { estado } : {},
    orderBy: { fechaIngreso: 'asc' }, // las más antiguas primero: el orden para atenderlas
    include: { destinos: { include: { destino: true }, orderBy: { fechaDesde: 'asc' } } },
  });

  return solicitudes.map((s) => ({
    id: s.id,
    codigoSeguimiento: s.codigoSeguimiento,
    cliente: `${s.nombreCliente} ${s.apellidoCliente}`,
    fechaIngreso: s.fechaIngreso,
    estado: s.estado,
    estadoEtiqueta: ETIQUETAS[s.estado],
    destinos: s.destinos.map((d) => d.destino.nombre),
  }));
}

// HU-10 criterio 3, HU-12 criterio 3 y HU-15 criterio 1: el detalle completo
export async function obtenerSolicitud(id) {
  const s = await prisma.solicitud.findUnique({
    where: { id },
    include: {
      usuario: { select: { id: true, nombre: true } },
      destinos: { include: { destino: true }, orderBy: { fechaDesde: 'asc' } },
      opciones: {
        orderBy: { orden: 'asc' },
        include: {
          servicios: {
            orderBy: { id: 'asc' },
            include: { servicio: { include: { proveedor: true } }, tarifa: true },
          },
        },
      },
    },
  });
  if (!s) throw new ErrorHttp(404, 'La solicitud no existe');

  return {
    id: s.id,
    codigoSeguimiento: s.codigoSeguimiento,
    nombreCliente: s.nombreCliente,
    apellidoCliente: s.apellidoCliente,
    email: s.email,
    cantidadAdultos: s.cantidadAdultos,
    cantidadMenores: s.cantidadMenores,
    presupuestoMax: aNumero(s.presupuestoMax),
    prioridadPrecioConfort: s.prioridadPrecioConfort,
    prioridadRitmo: s.prioridadRitmo,
    fechaIngreso: s.fechaIngreso,
    fechaUltimoCambio: s.fechaUltimoCambio,
    estado: s.estado,
    estadoEtiqueta: ETIQUETAS[s.estado],
    estadosPosibles: estadosPosibles(s.estado).map((e) => ({ estado: e, etiqueta: ETIQUETAS[e] })),
    agente: s.usuario,
    destinos: s.destinos.map((d) => ({
      id: d.id,
      idDestino: d.idDestino,
      destino: d.destino.nombre,
      fechaDesde: d.fechaDesde,
      fechaHasta: d.fechaHasta,
    })),
    // El agente ve todas las opciones, incluidas las descartadas, con su desglose
    opciones: s.opciones.map((o) => {
      const costoNeto = aNumero(o.costoNetoTotal);
      const margen = aNumero(o.margenAplicado);
      const aereo = aNumero(o.importeAereo);
      const precioFinal = aNumero(o.precioFinal);
      return {
        id: o.id,
        origen: o.origen,
        orden: o.orden,
        descartada: o.descartada,
        moneda: o.moneda,
        costoNetoTotal: costoNeto,
        margenAplicado: margen,
        tasasEImpuestos: redondear(precioFinal - costoNeto - margen - aereo), // HU-12, crit. 3
        importeAereo: aereo,
        precioFinal,
        servicios: o.servicios.map((os) => ({
          id: os.id,
          idServicio: os.idServicio,
          tipo: os.servicio.tipo,
          nombre: os.servicio.nombre,
          categoria: os.servicio.categoria,
          proveedor: os.servicio.proveedor.nombre,
          fechaDesde: os.fechaDesde,
          fechaHasta: os.fechaHasta,
          cantidad: os.cantidad,
          montoNeto: aNumero(os.tarifa.montoNeto),
          monedaTarifa: os.tarifa.moneda,
        })),
      };
    }),
  };
}

// HU-15, criterios 2 y 3, y HU-14 criterio 3: cambio de estado validado
export async function cambiarEstado(id, estadoNuevo, idAgente) {
  const s = await prisma.solicitud.findUnique({
    where: { id },
    include: { opciones: { where: { descartada: false }, select: { id: true } } },
  });
  if (!s) throw new ErrorHttp(404, 'La solicitud no existe');

  verificarTransicion(s.estado, estadoNuevo);

  // Condición de la transición: no se envía una propuesta vacía (HU-14, criterio 3)
  if (estadoNuevo === ESTADOS.PROPUESTA_ENVIADA && s.opciones.length === 0) {
    throw new ErrorHttp(409, 'La propuesta necesita al menos una opción vigente para enviarse');
  }

  await prisma.solicitud.update({
    where: { id },
    data: {
      estado: estadoNuevo,
      fechaUltimoCambio: new Date(),
      // Al tomarla para armar, la solicitud queda asignada al agente (relación "atiende" del DER)
      ...(estadoNuevo === ESTADOS.EN_ARMADO ? { idUsuario: idAgente } : {}),
    },
  });

  // Al validar la propuesta, se avisa al cliente que ya puede ver sus opciones
  if (estadoNuevo === ESTADOS.PROPUESTA_ENVIADA) {
    await enviarAvisoPropuesta({ email: s.email, nombre: s.nombreCliente, codigo: s.codigoSeguimiento });
  }

  return obtenerSolicitud(id);
}
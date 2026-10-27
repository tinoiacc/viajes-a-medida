import { prisma } from '../../lib/prisma.js';
import { ErrorHttp } from '../../middlewares/errores.js';

// Guarda un servicio y su tarifa. Si el servicio ya existe para ese proveedor
// y destino, solo le agrega la tarifa nueva (por ejemplo, la de otra temporada).
export async function guardarServicio(idProveedor, idDestino, d) {
  let servicio = await prisma.servicio.findFirst({
    where: { idProveedor, idDestino, tipo: d.tipo, nombre: d.nombre },
  });
  const servicioNuevo = !servicio;

  if (servicioNuevo) {
    servicio = await prisma.servicio.create({
      data: {
        idProveedor,
        idDestino,
        tipo: d.tipo,
        nombre: d.nombre,
        // La categoría solo tiene sentido en los alojamientos
        categoria: d.tipo === 'Alojamiento' ? d.categoria ?? null : null,
      },
    });
  }

  const tarifa = await prisma.tarifa.create({
    data: {
      idServicio: servicio.id,
      montoNeto: d.montoNeto,
      moneda: d.moneda,
      baseOcupacion: d.baseOcupacion,
      vigenciaDesde: d.vigenciaDesde,
      vigenciaHasta: d.vigenciaHasta,
    },
  });

  return { servicio, tarifa, servicioNuevo };
}

// HU-08, criterio 1: carga manual de un servicio desde el formulario del agente
export async function cargarServicioManual(datos) {
  const [proveedor, destino] = await Promise.all([
    prisma.proveedor.findUnique({ where: { id: datos.idProveedor } }),
    prisma.destino.findUnique({ where: { id: datos.idDestino } }),
  ]);
  if (!proveedor) throw new ErrorHttp(400, 'El proveedor no existe');
  if (!destino) throw new ErrorHttp(400, 'El destino no existe');

  const r = await guardarServicio(proveedor.id, destino.id, datos);
  return { idServicio: r.servicio.id, idTarifa: r.tarifa.id, servicioNuevo: r.servicioNuevo };
}

// Servicios ya cargados de un proveedor en un destino (para autocompletar)
export function listarServicios({ idProveedor, idDestino }) {
  return prisma.servicio.findMany({
    where: { idProveedor, idDestino },
    orderBy: { nombre: 'asc' },
    select: { id: true, tipo: true, nombre: true, categoria: true },
  });
}
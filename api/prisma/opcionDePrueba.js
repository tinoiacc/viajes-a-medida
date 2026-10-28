import { prisma } from '../src/lib/prisma.js';
import { crearOpcion, tarifaVigente } from '../src/modulos/opciones/opciones.servicio.js';
import { calcularCantidad, noches } from '../src/modulos/precios/motorPrecios.js';

// Crea una opción de prueba para la primera solicitud En armado.
// Se usa solo hasta tener el motor de ensamblaje (Sesión 5).
async function main() {
  const solicitud = await prisma.solicitud.findFirst({
    where: { estado: 'EN_ARMADO' },
    include: { destinos: true },
  });
  if (!solicitud) {
    throw new Error('No hay solicitudes En armado: pasá una a En armado desde pruebas.http');
  }

  const tramo = solicitud.destinos[0];
  const pasajeros = solicitud.cantidadAdultos + solicitud.cantidadMenores;
  const nombres = [
    'Hotel Altos del Valle',
    'Traslado aeropuerto - hotel (ida y vuelta)',
    'Circuito Chico',
    'Cerro Tronador',
  ];

  const items = [];
  for (const nombre of nombres) {
    const servicio = await prisma.servicio.findFirst({
      where: { nombre, idDestino: tramo.idDestino, proveedor: { nombre: 'Andes Receptivo' } },
    });
    if (!servicio) continue;
    const tarifa = await tarifaVigente(servicio.id, tramo.fechaDesde, tramo.fechaHasta);
    if (!tarifa) continue;
    items.push({
      idServicio: servicio.id,
      idTarifa: tarifa.id,
      fechaDesde: tramo.fechaDesde,
      fechaHasta: tramo.fechaHasta,
      cantidad: calcularCantidad({
        tipo: servicio.tipo,
        baseOcupacion: tarifa.baseOcupacion,
        noches: noches(tramo.fechaDesde, tramo.fechaHasta),
        pasajeros,
      }),
    });
  }

  const opcion = await crearOpcion(solicitud.id, items, 1);
  console.log(`Opción ${opcion.id} creada para ${solicitud.codigoSeguimiento}:`, opcion);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
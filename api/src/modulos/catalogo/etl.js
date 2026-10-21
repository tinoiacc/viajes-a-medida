import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { perfiles, FORMATO_ESTANDAR, normalizar } from './perfiles.js';

// Formato común: toda fila transformada debe cumplirlo para guardarse
const filaComun = z
  .object({
    tipo: z.enum(['Alojamiento', 'Traslado', 'Excursion', 'Adicional'], {
      message: 'tipo de servicio desconocido',
    }),
    destino: z.string({ message: 'falta el destino' }).min(1, { message: 'falta el destino' }),
    nombre: z.string({ message: 'falta el nombre del servicio' })
      .min(2, { message: 'falta el nombre del servicio' }),
    categoria: z.string().nullable(),
    montoNeto: z.number({ message: 'la tarifa no es un número válido' })
      .positive({ message: 'la tarifa debe ser mayor a cero' }),
    moneda: z.enum(['USD', 'ARS'], { message: 'moneda no soportada' }),
    baseOcupacion: z.number({ message: 'base de ocupación inválida' })
      .int({ message: 'base de ocupación inválida' })
      .min(1, { message: 'base de ocupación inválida' })
      .max(4, { message: 'base de ocupación inválida' }),
    vigenciaDesde: z.date({ message: 'fecha de inicio de vigencia inválida' }),
    vigenciaHasta: z.date({ message: 'fecha de fin de vigencia inválida' }),
  })
  .refine((f) => f.vigenciaHasta >= f.vigenciaDesde, {
    message: 'el fin de vigencia es anterior al inicio',
  });

// E: Extracción. Lee el archivo según el separador del perfil
function extraer(contenido, perfil) {
  return parse(contenido, {
    columns: true,
    delimiter: perfil.delimitador,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

// L: Carga. Reutiliza el servicio si ya existe y le agrega la tarifa
async function cargar(idProveedor, idDestino, d) {
  let servicio = await prisma.servicio.findFirst({
    where: { idProveedor, idDestino, tipo: d.tipo, nombre: d.nombre },
  });
  if (!servicio) {
    servicio = await prisma.servicio.create({
      data: { idProveedor, idDestino, tipo: d.tipo, nombre: d.nombre, categoria: d.categoria },
    });
  }
  await prisma.tarifa.create({
    data: {
      idServicio: servicio.id,
      montoNeto: d.montoNeto,
      moneda: d.moneda,
      baseOcupacion: d.baseOcupacion,
      vigenciaDesde: d.vigenciaDesde,
      vigenciaHasta: d.vigenciaHasta,
    },
  });
}

export async function importarCatalogo(idProveedor, contenido) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id: idProveedor } });
  if (!proveedor) throw new Error('El proveedor no existe');

  // Perfil propio del proveedor o, si no tiene, el formato estándar
  const perfil = perfiles[proveedor.nombre] ?? FORMATO_ESTANDAR;

  const registros = extraer(contenido, perfil);
  const destinos = await prisma.destino.findMany();
  const idPorNombre = new Map(destinos.map((d) => [normalizar(d.nombre), d.id]));

  const resultado = { importadas: 0, rechazadas: [] };

  for (const [i, registro] of registros.entries()) {
    const fila = i + 2; // la fila 1 es el encabezado

    // T: Transformación al formato común + validación con Zod
    const validacion = filaComun.safeParse(perfil.transformar(registro));
    if (!validacion.success) {
      resultado.rechazadas.push({ fila, motivo: validacion.error.issues[0].message });
      continue;
    }

    const datos = validacion.data;
    const idDestino = idPorNombre.get(normalizar(datos.destino));
    if (!idDestino) {
      resultado.rechazadas.push({ fila, motivo: `destino no registrado: ${datos.destino}` });
      continue;
    }

    await cargar(proveedor.id, idDestino, datos);
    resultado.importadas++;
  }

  return resultado;
}
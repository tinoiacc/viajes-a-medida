import { parse } from 'csv-parse/sync';
import { prisma } from '../../lib/prisma.js';
import { ErrorHttp } from '../../middlewares/errores.js';
import { perfiles, FORMATO_ESTANDAR, normalizar } from './perfiles.js';
import { filaComun } from './catalogo.esquemas.js';
import { guardarServicio } from './catalogo.servicio.js';

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

export async function importarCatalogo(idProveedor, contenido) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id: idProveedor } });
  if (!proveedor) throw new ErrorHttp(400, 'El proveedor no existe');

  // Perfil propio del proveedor o, si no tiene, la plantilla estándar
  const perfil = perfiles[proveedor.nombre] ?? FORMATO_ESTANDAR;

  let registros;
  try {
    registros = extraer(contenido, perfil);
  } catch {
    throw new ErrorHttp(400, 'El archivo no tiene un formato CSV válido');
  }

  const destinos = await prisma.destino.findMany();
  const idPorNombre = new Map(destinos.map((d) => [normalizar(d.nombre), d.id]));
  const resultado = { importadas: 0, rechazadas: [] };

  for (const [i, registro] of registros.entries()) {
    const fila = i + 2; // la fila 1 es el encabezado

    // T: Transformación al formato común + validación (mismas reglas que la carga manual)
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

    // L: Carga
    await guardarServicio(proveedor.id, idDestino, datos);
    resultado.importadas++;
  }

  return resultado;
}
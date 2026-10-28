import { z } from 'zod';

const id = z.coerce.number().int().positive({ message: 'Identificador inválido' });

export const parametrosOpcion = z.object({ id });
export const parametrosLinea = z.object({ id, idLinea: id });

// HU-13: importe del aéreo (0 = sin aéreo)
export const esquemaAereo = z.object({
  importe: z.number({ message: 'Ingrese el importe del aéreo' })
    .min(0, { message: 'El importe no puede ser negativo' }),
});

// HU-14, criterio 2: descartar o recuperar una opción
export const esquemaDescarte = z.object({
  descartada: z.boolean({ message: 'Indique si la opción se descarta' }),
});

// HU-14, criterio 1: reemplazar un servicio por otro
export const esquemaReemplazo = z.object({
  idServicio: z.number({ message: 'Seleccione el servicio' }).int().positive(),
});

// Agregar una excursión o un adicional (la cantidad solo cuenta para adicionales)
export const esquemaAgregado = z.object({
  idServicio: z.number({ message: 'Seleccione el servicio' }).int().positive(),
  cantidad: z.number().int().min(1, { message: 'La cantidad mínima es 1' }).max(99).default(1),
});
import { z } from 'zod';
import { ESTADOS } from '../estados/maquinaEstados.js';

const listaEstados = Object.keys(ESTADOS);

// HU-10, criterio 2: filtro opcional por estado
export const filtroSolicitudes = z.object({
  estado: z.enum(listaEstados, { message: 'Estado desconocido' }).optional(),
});

// El :id de la URL llega como texto; lo convertimos a número
export const parametroId = z.object({
  id: z.coerce.number().int().positive({ message: 'Identificador inválido' }),
});

export const esquemaCambioEstado = z.object({
  estado: z.enum(listaEstados, { message: 'Estado desconocido' }),
});
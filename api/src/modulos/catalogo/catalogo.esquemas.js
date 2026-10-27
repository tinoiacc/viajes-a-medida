import { z } from 'zod';

export const TIPOS_SERVICIO = ['Alojamiento', 'Traslado', 'Excursion', 'Adicional'];
export const MONEDAS = ['USD', 'ARS'];

// Campos comunes a todo servicio, venga de la carga manual o de un CSV
const camposServicio = {
  tipo: z.enum(TIPOS_SERVICIO, { message: 'tipo de servicio desconocido' }),
  nombre: z.string({ message: 'falta el nombre del servicio' }).trim()
    .min(2, { message: 'falta el nombre del servicio' })
    .max(150, { message: 'el nombre no puede superar los 150 caracteres' }),
  categoria: z.string().nullable().optional(),
  montoNeto: z.number({ message: 'la tarifa no es un número válido' })
    .positive({ message: 'la tarifa debe ser mayor a cero' }),
  moneda: z.enum(MONEDAS, { message: 'moneda no soportada' }),
  baseOcupacion: z.number({ message: 'base de ocupación inválida' })
    .int({ message: 'base de ocupación inválida' })
    .min(1, { message: 'base de ocupación inválida' })
    .max(4, { message: 'base de ocupación inválida' }),
  vigenciaDesde: z.coerce.date({ message: 'fecha de inicio de vigencia inválida' }),
  vigenciaHasta: z.coerce.date({ message: 'fecha de fin de vigencia inválida' }),
};

const vigenciaValida = (f) => f.vigenciaHasta >= f.vigenciaDesde;
const mensajeVigencia = {
  message: 'el fin de vigencia es anterior al inicio',
  path: ['vigenciaHasta'],
};

// Una fila del CSV ya transformada (el destino viene por nombre)
export const filaComun = z
  .object({
    ...camposServicio,
    destino: z.string({ message: 'falta el destino' }).min(1, { message: 'falta el destino' }),
  })
  .refine(vigenciaValida, mensajeVigencia);

// HU-08, criterio 1: un servicio cargado a mano desde el formulario
export const esquemaCargaManual = z
  .object({
    ...camposServicio,
    idProveedor: z.number({ message: 'Seleccione un proveedor' }).int().positive(),
    idDestino: z.number({ message: 'Seleccione un destino' }).int().positive(),
  })
  .refine(vigenciaValida, mensajeVigencia);

// Importación de un archivo con la plantilla estándar
export const esquemaImportacion = z.object({
  idProveedor: z.number({ message: 'Seleccione un proveedor' }).int().positive(),
  contenido: z.string({ message: 'Falta el contenido del archivo' })
    .min(1, { message: 'El archivo está vacío' }),
});
import { z } from 'zod';

const hoy = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

const tramo = z
  .object({
    idDestino: z.number({ message: 'Seleccione un destino' }).int().positive(),
    fechaDesde: z.coerce.date({ message: 'La fecha de partida no es válida' }),
    fechaHasta: z.coerce.date({ message: 'La fecha de regreso no es válida' }),
  })
  // HU-01, criterio 2
  .refine((t) => t.fechaHasta > t.fechaDesde, {
    message: 'La fecha de regreso debe ser posterior a la de partida',
    path: ['fechaHasta'],
  })
  .refine((t) => t.fechaDesde >= hoy(), {
    message: 'La fecha de partida no puede ser anterior a hoy',
    path: ['fechaDesde'],
  });

const prioridad = z.number().int().min(1).max(5).default(3); // HU-02, criterio 2

// HU-01, criterio 1: todos los campos obligatorios validados
export const esquemaAltaSolicitud = z.object({
  nombreCliente: z.string({ message: 'Ingrese su nombre' }).trim()
    .min(2, { message: 'Ingrese su nombre' }).max(100),
  apellidoCliente: z.string({ message: 'Ingrese su apellido' }).trim()
    .min(2, { message: 'Ingrese su apellido' }).max(100),
  email: z.string({ message: 'Ingrese su correo' }).trim().toLowerCase()
    .email({ message: 'El correo no es válido' }),
  cantidadAdultos: z.number({ message: 'Indique la cantidad de adultos' }).int()
    .min(1, { message: 'Debe viajar al menos un adulto' }).max(20),
  cantidadMenores: z.number().int().min(0).max(20).default(0),
  presupuestoMax: z.number({ message: 'Ingrese un presupuesto' })
    .positive({ message: 'El presupuesto debe ser mayor a cero' }),
  prioridadPrecioConfort: prioridad,
  prioridadRitmo: prioridad,
  
// Pedidos especiales del cliente (hotel con pileta, viaja con un bebé...)
  comentarios: z.string().trim()
    .max(500, { message: 'Los comentarios no pueden superar los 500 caracteres' })
    .optional(),

  // Ley 25.326 y Decreto 1558/2001: consentimiento para el almacenamiento fuera del país
  consentimientoDatos: z.literal(true, {
    message: 'Debe aceptar el tratamiento de sus datos para continuar',
  }),
  destinos: z.array(tramo)
    .min(1, { message: 'Indique al menos un destino' })
    .max(5, { message: 'Se admiten hasta 5 destinos' }),
});
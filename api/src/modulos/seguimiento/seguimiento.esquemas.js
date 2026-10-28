import { z } from 'zod';

export const esquemaConsulta = z.object({
  // Acepta "h7k29xq4", "H7K2 9XQ4" o "H7K2-9XQ4" y lo lleva a H7K2-9XQ4
  codigo: z
    .string({ message: 'Ingrese el código de seguimiento' })
    .transform((c) => {
      const limpio = c.replace(/[\s-]/g, '').toUpperCase();
      return limpio.length === 8 ? `${limpio.slice(0, 4)}-${limpio.slice(4)}` : limpio;
    })
    .pipe(z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, { message: 'El código tiene el formato XXXX-XXXX' })),
  apellido: z.string({ message: 'Ingrese su apellido' }).trim()
    .min(2, { message: 'Ingrese su apellido' }),
});
import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { validar } from '../../middlewares/validar.js';
import { requiereAgente } from '../../middlewares/autenticacion.js';
import { ErrorHttp } from '../../middlewares/errores.js';

const esquemaLogin = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'El correo no es válido' }),
  contrasena: z.string().min(1, { message: 'Ingrese la contraseña' }),
});

export const rutasAuth = Router();

// HU-07: ingreso del agente
rutasAuth.post('/login', validar(esquemaLogin), async (req, res) => {
  const { email, contrasena } = req.body;
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const valida = usuario && (await bcrypt.compare(contrasena, usuario.hashContrasena));

  // Mismo mensaje si falla el correo o la contraseña: no revela cuál de los dos es
  if (!valida) throw new ErrorHttp(401, 'Correo o contraseña incorrectos');

  const token = jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );
  res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol } });
});

// Devuelve los datos del agente con sesión iniciada
rutasAuth.get('/yo', requiereAgente, (req, res) => {
  res.json({ usuario: req.usuario });
});
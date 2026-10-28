import { Router } from 'express';
import { validar } from '../../middlewares/validar.js';
import { esquemaConsulta } from './seguimiento.esquemas.js';
import { consultarSolicitud } from './seguimiento.servicio.js';

export const rutasSeguimiento = Router();

// HU-04: consulta del cliente. Es POST para que el apellido no viaje en la URL
rutasSeguimiento.post('/', validar(esquemaConsulta), async (req, res) => {
  res.json(await consultarSolicitud(req.body, req.ip));
});
import { Router } from 'express';
import { validar } from '../../middlewares/validar.js';
import { esquemaAltaSolicitud } from './solicitudes.esquemas.js';
import { crearSolicitud } from './solicitudes.servicio.js';

export const rutasSolicitudes = Router();

// HU-01: el cliente envía su solicitud (público, sin cuenta)
rutasSolicitudes.post('/', validar(esquemaAltaSolicitud), async (req, res) => {
  res.status(201).json(await crearSolicitud(req.body));
});
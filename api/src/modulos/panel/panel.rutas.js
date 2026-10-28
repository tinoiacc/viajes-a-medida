import { Router } from 'express';
import { validar } from '../../middlewares/validar.js';
import { requiereAgente } from '../../middlewares/autenticacion.js';
import { filtroSolicitudes, parametroId, esquemaCambioEstado } from './panel.esquemas.js';
import { listarSolicitudes, obtenerSolicitud, cambiarEstado } from './panel.servicio.js';

export const rutasPanel = Router();

// Todas las rutas del panel requieren un agente con sesión iniciada
rutasPanel.use(requiereAgente);

// HU-10: listado, con filtro opcional ?estado=
rutasPanel.get('/solicitudes', async (req, res) => {
  res.json(await listarSolicitudes(filtroSolicitudes.parse(req.query)));
});

// HU-10 crit. 3: detalle de una solicitud
rutasPanel.get('/solicitudes/:id', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await obtenerSolicitud(id));
});

// HU-15: cambio de estado
rutasPanel.patch('/solicitudes/:id/estado', validar(esquemaCambioEstado), async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await cambiarEstado(id, req.body.estado, req.usuario.id));
});
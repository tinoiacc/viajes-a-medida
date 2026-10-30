import { Router } from 'express';
import { validar } from '../../middlewares/validar.js';
import { requiereAgente } from '../../middlewares/autenticacion.js';
import {
  parametrosOpcion, parametrosLinea, esquemaAereo, esquemaDescarte, esquemaReemplazo, esquemaAgregado,
} from './opciones.esquemas.js';
import {
  cargarAereo, descartarOpcion, listarAlternativas, reemplazarServicio, agregarServicio, quitarServicio, listarAgregables,
} from './opciones.servicio.js';

export const rutasOpciones = Router();
rutasOpciones.use(requiereAgente);

// HU-13: importe del aéreo
rutasOpciones.patch('/:id/aereo', validar(esquemaAereo), async (req, res) => {
  const { id } = parametrosOpcion.parse(req.params);
  res.json(await cargarAereo(id, req.body.importe));
});

// HU-14, crit. 2: descartar o recuperar
rutasOpciones.patch('/:id/descartar', validar(esquemaDescarte), async (req, res) => {
  const { id } = parametrosOpcion.parse(req.params);
  res.json(await descartarOpcion(id, req.body.descartada));
});

// Alternativas para reemplazar un servicio
rutasOpciones.get('/:id/servicios/:idLinea/alternativas', async (req, res) => {
  const { id, idLinea } = parametrosLinea.parse(req.params);
  res.json(await listarAlternativas(id, idLinea));
});

// Excursiones y adicionales disponibles para agregar
rutasOpciones.get('/:id/agregables', async (req, res) => {
  const { id } = parametrosOpcion.parse(req.params);
  res.json(await listarAgregables(id));
});

// HU-14, crit. 1: reemplazar un servicio
rutasOpciones.patch('/:id/servicios/:idLinea', validar(esquemaReemplazo), async (req, res) => {
  const { id, idLinea } = parametrosLinea.parse(req.params);
  res.json(await reemplazarServicio(id, idLinea, req.body.idServicio));
});

// Agregar una excursión o un adicional
rutasOpciones.post('/:id/servicios', validar(esquemaAgregado), async (req, res) => {
  const { id } = parametrosOpcion.parse(req.params);
  res.status(201).json(await agregarServicio(id, req.body));
});

// Quitar una excursión o un adicional
rutasOpciones.delete('/:id/servicios/:idLinea', async (req, res) => {
  const { id, idLinea } = parametrosLinea.parse(req.params);
  res.json(await quitarServicio(id, idLinea));
});
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { validar } from '../../middlewares/validar.js';
import { requiereAgente } from '../../middlewares/autenticacion.js';
import { esquemaCargaManual, esquemaImportacion } from './catalogo.esquemas.js';
import { cargarServicioManual, listarServicios } from './catalogo.servicio.js';
import { importarCatalogo } from './etl.js';

export const rutasCatalogo = Router();

// Destinos disponibles (público: los usa el asistente del cliente)
rutasCatalogo.get('/destinos', async (req, res) => {
  const destinos = await prisma.destino.findMany({
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, provincia: true },
  });
  res.json(destinos);
});

// Proveedores (solo agente): para elegir en el formulario de carga
rutasCatalogo.get('/proveedores', requiereAgente, async (req, res) => {
  const proveedores = await prisma.proveedor.findMany({ orderBy: { nombre: 'asc' } });
  res.json(proveedores);
});

// Servicios existentes de un proveedor en un destino (autocompletado)
const filtroServicios = z.object({
  idProveedor: z.coerce.number().int().positive(),
  idDestino: z.coerce.number().int().positive(),
});
rutasCatalogo.get('/servicios', requiereAgente, async (req, res) => {
  const filtro = filtroServicios.parse(req.query);
  res.json(await listarServicios(filtro));
});

// HU-08, criterio 1: carga manual de un servicio
rutasCatalogo.post('/servicios', requiereAgente, validar(esquemaCargaManual), async (req, res) => {
  res.status(201).json(await cargarServicioManual(req.body));
});

// HU-08: importación con la plantilla estándar (ETL)
rutasCatalogo.post('/servicios/importar', requiereAgente, validar(esquemaImportacion), async (req, res) => {
  res.json(await importarCatalogo(req.body.idProveedor, req.body.contenido));
});
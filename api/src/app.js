import express from 'express';
import cors from 'cors';
import { rutasAuth } from './modulos/auth/auth.rutas.js';
import { rutasSolicitudes } from './modulos/solicitudes/solicitudes.rutas.js';
import { rutasCatalogo } from './modulos/catalogo/catalogo.rutas.js';
import { manejarErrores } from './middlewares/errores.js';

export const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' })); // 2 MB para admitir archivos CSV

app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));
app.use('/api/auth', rutasAuth);
app.use('/api/solicitudes', rutasSolicitudes);
app.use('/api', rutasCatalogo);

app.use(manejarErrores); // siempre al final
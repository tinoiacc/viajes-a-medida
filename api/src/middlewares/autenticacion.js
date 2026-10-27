import jwt from 'jsonwebtoken';
import { ErrorHttp } from './errores.js';

// Protege las rutas del panel: solo un agente con sesión válida puede pasar
export function requiereAgente(req, res, next) {
  const [tipo, token] = (req.headers.authorization ?? '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    throw new ErrorHttp(401, 'Se requiere iniciar sesión');
  }
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ErrorHttp(401, 'La sesión expiró o no es válida');
  }
  if (req.usuario.rol !== 'AGENTE') {
    throw new ErrorHttp(403, 'No tiene permisos para esta acción');
  }
  next();
}
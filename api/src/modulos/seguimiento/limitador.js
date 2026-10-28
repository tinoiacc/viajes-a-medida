import { ErrorHttp } from '../../middlewares/errores.js';

// Intentos fallidos por clave (un código o una IP), guardados en memoria
const registros = new Map();

const minutosDeBloqueo = () => Number(process.env.BLOQUEO_MINUTOS) || 15;

// Si la clave está bloqueada, corta el pedido con un 429
export function verificarBloqueo(clave) {
  const r = registros.get(clave);
  if (r && r.bloqueadoHasta > Date.now()) {
    const minutos = Math.ceil((r.bloqueadoHasta - Date.now()) / 60000);
    throw new ErrorHttp(
      429,
      `Demasiados intentos fallidos. Probá de nuevo en ${minutos} minuto${minutos === 1 ? '' : 's'}.`,
    );
  }
}

// Suma un intento fallido; al llegar al máximo, bloquea la clave
export function registrarFallo(clave, maximo) {
  const ahora = Date.now();
  let r = registros.get(clave);
  if (!r || (r.bloqueadoHasta && r.bloqueadoHasta <= ahora)) {
    r = { fallos: 0, bloqueadoHasta: 0 }; // sin registro, o el bloqueo anterior ya venció
  }
  r.fallos++;
  if (r.fallos >= maximo) r.bloqueadoHasta = ahora + minutosDeBloqueo() * 60000;
  registros.set(clave, r);
}

// Un acceso correcto reinicia el contador ("tres intentos fallidos seguidos")
export function reiniciarIntentos(clave) {
  registros.delete(clave);
}
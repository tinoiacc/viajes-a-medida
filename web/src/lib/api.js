const URL_API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Error que trae el código HTTP y, si los hay, los errores por campo de la API
export class ErrorApi extends Error {
  constructor(mensaje, estado, detalles = []) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles;
  }
}

// Hace un pedido a la API y devuelve la respuesta en JSON
export async function pedir(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${URL_API}${ruta}`, {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. Verificá que la API esté encendida.', 0);
  }

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorApi(datos?.error ?? 'Ocurrió un error inesperado', respuesta.status, datos?.detalles ?? []);
  }
  return datos;
}

// Los pedidos que usa el cliente
export const api = {
  destinos: () => pedir('/destinos'),
  crearSolicitud: (datos) => pedir('/solicitudes', { metodo: 'POST', cuerpo: datos }),
  consultarSolicitud: (codigo, apellido) =>
    pedir('/seguimiento', { metodo: 'POST', cuerpo: { codigo, apellido } }),
};
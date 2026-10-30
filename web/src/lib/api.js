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
  login: (email, contrasena) =>
    pedir('/auth/login', { metodo: 'POST', cuerpo: { email, contrasena } }),
};

// Pedidos del panel del agente: llevan el token de sesión.
// Si la API responde 401 (sesión vencida), se avisa con alExpirar para cerrar la sesión.
export function apiAgente(token, alExpirar) {
  const llamar = async (ruta, opciones = {}) => {
    try {
      return await pedir(ruta, { ...opciones, token });
    } catch (e) {
      if (e.estado === 401) alExpirar?.();
      throw e;
    }
  };

  return {
    solicitudes: (estado) => llamar(`/panel/solicitudes${estado ? `?estado=${estado}` : ''}`),
    solicitud: (id) => llamar(`/panel/solicitudes/${id}`),
    cambiarEstado: (id, estado) =>
      llamar(`/panel/solicitudes/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado } }),
    armarOpciones: (id) => llamar(`/panel/solicitudes/${id}/opciones`, { metodo: 'POST' }),
    cargarAereo: (idOpcion, importe) =>
      llamar(`/panel/opciones/${idOpcion}/aereo`, { metodo: 'PATCH', cuerpo: { importe } }),
    descartar: (idOpcion, descartada) =>
      llamar(`/panel/opciones/${idOpcion}/descartar`, { metodo: 'PATCH', cuerpo: { descartada } }),
    alternativas: (idOpcion, idLinea) => llamar(`/panel/opciones/${idOpcion}/servicios/${idLinea}/alternativas`),
    reemplazar: (idOpcion, idLinea, idServicio) =>
      llamar(`/panel/opciones/${idOpcion}/servicios/${idLinea}`, { metodo: 'PATCH', cuerpo: { idServicio } }),
    agregables: (idOpcion) => llamar(`/panel/opciones/${idOpcion}/agregables`),
    agregar: (idOpcion, idServicio, cantidad) =>
      llamar(`/panel/opciones/${idOpcion}/servicios`, { metodo: 'POST', cuerpo: { idServicio, cantidad } }),
    quitar: (idOpcion, idLinea) => llamar(`/panel/opciones/${idOpcion}/servicios/${idLinea}`, { metodo: 'DELETE' }),
    proveedores: () => llamar('/proveedores'),
    servicios: (idProveedor, idDestino) => llamar(`/servicios?idProveedor=${idProveedor}&idDestino=${idDestino}`),
    cargarServicio: (datos) => llamar('/servicios', { metodo: 'POST', cuerpo: datos }),
    importar: (idProveedor, contenido) =>
      llamar('/servicios/importar', { metodo: 'POST', cuerpo: { idProveedor, contenido } }),
  };
}
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { apiAgente } from './api.js';

const CLAVE = 'sesionAgente';
const ContextoSesion = createContext(null);

// La sesión dura lo que la pestaña del navegador: se guarda en sessionStorage
function leerSesion() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE));
  } catch {
    return null;
  }
}

// Comparte la sesión del agente con todas las pantallas
export function ProveedorSesion({ children }) {
  const [sesion, setSesion] = useState(leerSesion);

  const iniciarSesion = useCallback((datos) => {
    try { sessionStorage.setItem(CLAVE, JSON.stringify(datos)); } catch { /* sin almacenamiento: dura hasta recargar */ }
    setSesion(datos);
  }, []);

  const cerrarSesion = useCallback(() => {
    try { sessionStorage.removeItem(CLAVE); } catch { /* nada que borrar */ }
    setSesion(null);
  }, []);

  // Los pedidos del panel, ya con el token de esta sesión
  const agente = useMemo(() => (sesion ? apiAgente(sesion.token, cerrarSesion) : null), [sesion, cerrarSesion]);
  const valor = useMemo(
    () => ({ sesion, iniciarSesion, cerrarSesion, agente }),
    [sesion, iniciarSesion, cerrarSesion, agente],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export const useSesion = () => useContext(ContextoSesion);
import { ErrorHttp } from '../../middlewares/errores.js';

// Estados posibles de una solicitud (enumeración Estado del diagrama de clases)
export const ESTADOS = {
  RECIBIDA: 'RECIBIDA',
  EN_ARMADO: 'EN_ARMADO',
  PROPUESTA_ENVIADA: 'PROPUESTA_ENVIADA',
  DESESTIMADA: 'DESESTIMADA',
};

// Cómo se muestra cada estado en pantalla
export const ETIQUETAS = {
  RECIBIDA: 'Recibida',
  EN_ARMADO: 'En armado',
  PROPUESTA_ENVIADA: 'Propuesta enviada',
  DESESTIMADA: 'Desestimada',
};

// Transiciones permitidas: desde cada estado, a cuáles se puede pasar
const TRANSICIONES = {
  RECIBIDA: ['EN_ARMADO', 'DESESTIMADA'],       // HU-15, criterio 2
  EN_ARMADO: ['PROPUESTA_ENVIADA', 'DESESTIMADA'],
  PROPUESTA_ENVIADA: ['EN_ARMADO'],             // el cliente pide cambios
  DESESTIMADA: [],                              // estado final
};

// HU-15, criterio 1: los estados a los que puede pasar una solicitud
export const estadosPosibles = (estadoActual) => TRANSICIONES[estadoActual] ?? [];

// Lanza un error si el cambio de estado no está permitido
export function verificarTransicion(estadoActual, estadoNuevo) {
  if (!estadosPosibles(estadoActual).includes(estadoNuevo)) {
    throw new ErrorHttp(
      409,
      `No se puede pasar de "${ETIQUETAS[estadoActual]}" a "${ETIQUETAS[estadoNuevo] ?? estadoNuevo}"`,
    );
  }
}
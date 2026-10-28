import { describe, it, expect } from 'vitest';
import { estadosPosibles, verificarTransicion } from '../src/modulos/estados/maquinaEstados.js';

describe('Máquina de estados de la solicitud (HU-15)', () => {
  it('desde Recibida solo ofrece En armado y Desestimada', () => {
    expect(estadosPosibles('RECIBIDA')).toEqual(['EN_ARMADO', 'DESESTIMADA']);
  });

  it('permite pasar de En armado a Propuesta enviada', () => {
    expect(() => verificarTransicion('EN_ARMADO', 'PROPUESTA_ENVIADA')).not.toThrow();
  });

  it('no permite saltar de Recibida a Propuesta enviada', () => {
    expect(() => verificarTransicion('RECIBIDA', 'PROPUESTA_ENVIADA')).toThrow(/No se puede pasar/);
  });

  it('si el cliente pide cambios, la propuesta vuelve a En armado', () => {
    expect(() => verificarTransicion('PROPUESTA_ENVIADA', 'EN_ARMADO')).not.toThrow();
  });

  it('Desestimada es un estado final', () => {
    expect(estadosPosibles('DESESTIMADA')).toEqual([]);
  });
});
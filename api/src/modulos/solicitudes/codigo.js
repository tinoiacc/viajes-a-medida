import { randomInt } from 'node:crypto';

// Sin 0, O, 1 ni I para evitar confusiones al tipearlo
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Genera un código aleatorio y no secuencial con el formato XXXX-XXXX
export function generarCodigo() {
  let codigo = '';
  for (let i = 0; i < 8; i++) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
    if (i === 3) codigo += '-';
  }
  return codigo;
}
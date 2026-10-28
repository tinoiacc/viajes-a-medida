// Compara textos sin importar mayúsculas ni acentos ("Pérez" = "perez")
export const normalizar = (t) =>
  (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Prisma devuelve los montos como Decimal; para el JSON los pasamos a número
export const aNumero = (valor) => (valor === null || valor === undefined ? null : Number(valor));
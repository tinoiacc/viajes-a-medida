// Un "perfil" describe cómo leer el archivo de un proveedor y cómo
// transformar cada fila al formato común del catálogo.
// Los proveedores sin perfil propio usan el FORMATO_ESTANDAR.

export const normalizar = (t) =>
  (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const vacioANull = (t) => (t && t.trim() !== '' ? t.trim() : null);

const fechaISO = (t) =>
  /^\d{4}-\d{2}-\d{2}$/.test(t ?? '') ? new Date(`${t}T00:00:00Z`) : new Date(NaN);

const TIPOS = { alojamiento: 'Alojamiento', traslado: 'Traslado', excursion: 'Excursion', adicional: 'Adicional' };

// Formato estándar de carga de la plataforma
export const FORMATO_ESTANDAR = {
  delimitador: ',',
  transformar: (r) => ({
    tipo: TIPOS[normalizar(r.tipo)],
    destino: r.destino,
    nombre: r.servicio,
    categoria: vacioANull(r.categoria),
    montoNeto: r.tarifa_neta ? Number(r.tarifa_neta) : NaN,
    moneda: r.moneda,
    baseOcupacion: Number(r.base),
    vigenciaDesde: fechaISO(r.vigencia_desde),
    vigenciaHasta: fechaISO(r.vigencia_hasta),
  }),
};

// Perfiles de proveedores que envían sus tarifas en un formato propio.
// Se completan a partir de los tarifarios reales relevados.
export const perfiles = {};
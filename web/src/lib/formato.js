// Fechas del viaje: llegan como medianoche UTC; se muestran en UTC para que no se corra el día
export const formatearFecha = (fecha) =>
  new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(fecha));

// Momentos (por ejemplo, un cambio de estado): se muestran en la hora local
export const formatearMomento = (fecha) =>
  new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .format(new Date(fecha));

export const formatearDolares = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(monto);

export const noches = (desde, hasta) => Math.round((new Date(hasta) - new Date(desde)) / 86400000);

// Fecha de hoy como texto AAAA-MM-DD (el formato de los campos de fecha)
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const plural = (n, singular, pluralTexto) => `${n} ${Number(n) === 1 ? singular : pluralTexto}`;

export const estrellas = (categoria) => (categoria ? '★'.repeat(Number(categoria)) : '');
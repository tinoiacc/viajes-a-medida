import { prisma } from '../../lib/prisma.js';
import { normalizar, aNumero } from '../../lib/formato.js';
import { ErrorHttp } from '../../middlewares/errores.js';
import { ESTADOS, ETIQUETAS } from '../estados/maquinaEstados.js';
import { verificarBloqueo, registrarFallo, reiniciarIntentos } from './limitador.js';

const MAX_INTENTOS_POR_CODIGO = 3;  // HU-04, criterio 3
const MAX_INTENTOS_POR_IP = 10;     // frena a quien prueba muchos códigos distintos

const MENSAJES = {
  RECIBIDA: 'Recibimos tu solicitud. Un agente va a empezar a armar tu viaje.',
  EN_ARMADO: 'Un agente está armando las opciones de tu viaje.',
  DESESTIMADA: 'Tu solicitud fue desestimada. Contactate con la agencia para más información.',
};

// HU-04: acceso con código y apellido
export async function consultarSolicitud({ codigo, apellido }, ip) {
  const claveCodigo = `codigo:${codigo}`;
  const claveIp = `ip:${ip}`;
  verificarBloqueo(claveCodigo);
  verificarBloqueo(claveIp);

  const s = await prisma.solicitud.findUnique({
    where: { codigoSeguimiento: codigo },
    include: {
      destinos: { include: { destino: true }, orderBy: { fechaDesde: 'asc' } },
      opciones: {
        where: { descartada: false }, // HU-14 crit. 2: el cliente no ve las descartadas
        orderBy: { orden: 'asc' },
        include: { servicios: { include: { servicio: true } } },
      },
    },
  });

  // Mismo mensaje si el código no existe o si el apellido no coincide (HU-04, crit. 2)
  const coincide = s && normalizar(s.apellidoCliente) === normalizar(apellido);
  if (!coincide) {
    registrarFallo(claveCodigo, MAX_INTENTOS_POR_CODIGO);
    registrarFallo(claveIp, MAX_INTENTOS_POR_IP);
    throw new ErrorHttp(401, 'El código y el apellido no coinciden con ninguna solicitud');
  }

  reiniciarIntentos(claveCodigo);
  return vistaCliente(s);
}

// Lo que ve el cliente: nunca costos netos, márgenes ni parámetros (Tabla 26)
function vistaCliente(s) {
  const propuestaVisible = s.estado === ESTADOS.PROPUESTA_ENVIADA; // HU-05, crit. 2

  return {
    codigoSeguimiento: s.codigoSeguimiento,
    nombreCliente: s.nombreCliente,
    estado: s.estado,
    estadoEtiqueta: ETIQUETAS[s.estado],
    fechaUltimoCambio: s.fechaUltimoCambio, // HU-06, crit. 1
    fechaIngreso: s.fechaIngreso,
    cantidadAdultos: s.cantidadAdultos,
    cantidadMenores: s.cantidadMenores,
    presupuestoMax: aNumero(s.presupuestoMax),
    destinos: s.destinos.map((d) => ({
      destino: d.destino.nombre,
      fechaDesde: d.fechaDesde,
      fechaHasta: d.fechaHasta,
    })),
    mensaje: propuestaVisible ? null : MENSAJES[s.estado],
    // HU-05, criterios 1 y 3: las opciones con su precio y sus servicios
    opciones: propuestaVisible
      ? s.opciones.map((o) => ({
          orden: o.orden,
          precioFinal: aNumero(o.precioFinal),
          moneda: o.moneda,
          incluyeAereo: aNumero(o.importeAereo) > 0, // HU-13, crit. 2
          servicios: o.servicios.map((os) => ({
            tipo: os.servicio.tipo,
            nombre: os.servicio.nombre,
            categoria: os.servicio.categoria,
            fechaDesde: os.fechaDesde,
            fechaHasta: os.fechaHasta,
            cantidad: os.cantidad,
          })),
        }))
      : [],
  };
}
import { useState } from 'react';
import { AGENCIA } from '../../lib/agencia.js';
import { formatearDolares, formatearFecha, plural } from '../../lib/formato.js';

// El mensaje predeterminado: los datos de la solicitud y la opción que eligió el cliente
function armarMensaje(s, o) {
  const viaje = s.destinos
    .map((d) => `${d.destino} (${formatearFecha(d.fechaDesde)} al ${formatearFecha(d.fechaHasta)})`)
    .join(', ');
  const pasajeros = plural(s.cantidadAdultos, 'adulto', 'adultos') +
    (s.cantidadMenores > 0 ? ` y ${plural(s.cantidadMenores, 'menor', 'menores')}` : '');
  const alojamiento = o.servicios.filter((x) => x.tipo === 'Alojamiento').map((x) => x.nombre).join(' + ');

  return [
    `Hola, soy ${s.nombreCliente} ${s.apellidoCliente}.`,
    `Quiero avanzar con la opción ${o.orden} de mi solicitud ${s.codigoSeguimiento}:`,
    `- Viaje: ${viaje}, ${pasajeros}`,
    `- Alojamiento: ${alojamiento}`,
    `- Precio final: ${formatearDolares(o.precioFinal)} (${o.incluyeAereo ? 'incluye aéreo' : 'no incluye el pasaje aéreo'})`,
    '¿Cómo seguimos?',
  ].join('\n');
}

// Con la propuesta enviada, el cliente le escribe a la agencia para cerrar la compra.
// La compra sigue fuera de la plataforma, por los canales que la agencia ya usa.
export function ContactoAgencia({ solicitud, opcion }) {
  const [copiado, setCopiado] = useState(false);
  const mensaje = opcion ? armarMensaje(solicitud, opcion) : '';

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
    } catch {
      setCopiado(false); // sin permiso para el portapapeles: el mensaje queda a la vista para copiarlo a mano
    }
  }

  return (
    <section className="tarjeta contacto">
      <h2>¿Querés avanzar con tu viaje?</h2>
      <p className="texto-suave">
        Para confirmar la compra o hacernos consultas, escribinos con este mensaje.
      </p>

      {!opcion ? (
        <p className="alerta alerta-info">Elegí una de las opciones de arriba para armar tu mensaje.</p>
      ) : (
        <div className="contacto-fila">
          <pre className="mensaje-predeterminado">{mensaje}</pre>
          <div className="contacto-telefono">
            <span className="campo-etiqueta">Teléfono de la agencia</span>
            <a className="numero" href={`tel:+${AGENCIA.whatsapp}`}>{AGENCIA.telefono}</a>
            <a className="boton" target="_blank" rel="noreferrer"
              href={`https://wa.me/${AGENCIA.whatsapp}?text=${encodeURIComponent(mensaje)}`}>
              Enviar por WhatsApp
            </a>
            <button type="button" className="boton boton-secundario" onClick={copiar}>
              {copiado ? 'Mensaje copiado' : 'Copiar mensaje'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

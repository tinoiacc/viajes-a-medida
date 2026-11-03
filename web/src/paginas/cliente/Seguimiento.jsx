import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../../lib/api.js';
import { formatearFecha, formatearMomento, plural } from '../../lib/formato.js';
import { Campo } from '../../componentes/Campo.jsx';
import { TarjetaOpcion } from './TarjetaOpcion.jsx';
import { ContactoAgencia } from './ContactoAgencia.jsx';

// Las etapas por las que avanza una solicitud, en orden (mismas etiquetas que la API)
const ETAPAS = [
  ['RECIBIDA', 'Recibida'],
  ['EN_ARMADO', 'En armado'],
  ['PROPUESTA_ENVIADA', 'Propuesta enviada'],
];

// HU-04: el cliente entra con su código y su apellido
export function Seguimiento() {
  const [parametros] = useSearchParams();
  const [codigo, setCodigo] = useState(parametros.get('codigo') ?? '');
  const [apellido, setApellido] = useState('');
  const [solicitud, setSolicitud] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function consultar(evento) {
    evento.preventDefault();
    setError('');
    setCargando(true);
    try {
      setSolicitud(await api.consultarSolicitud(codigo, apellido));
    } catch (err) {
      // 400 (formato), 401 (no coinciden) o 429 (bloqueado): se muestra el mensaje de la API
      setSolicitud(null);
      setError(err.detalles[0]?.mensaje ?? err.message);
    } finally {
      setCargando(false);
    }
  }

  if (solicitud) return <DetalleSolicitud solicitud={solicitud} alVolver={() => setSolicitud(null)} />;

  return (
    <section className="formulario-consulta">
      <h1>Consultá tu solicitud</h1>
      <p className="texto-suave">Ingresá el código que recibiste por correo y tu apellido.</p>
      <form className="tarjeta" onSubmit={consultar}>
        <Campo etiqueta="Código de seguimiento">
          <input value={codigo} placeholder="XXXX-XXXX" autoComplete="off"
            onChange={(e) => setCodigo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Apellido">
          <input value={apellido} autoComplete="family-name" onChange={(e) => setApellido(e.target.value)} />
        </Campo>
        {error && <p className="alerta alerta-error">{error}</p>}
        <button className="boton" disabled={cargando}>{cargando ? 'Consultando…' : 'Consultar'}</button>
      </form>
    </section>
  );
}

// HU-05 y HU-06: el estado de la solicitud y, si ya se validó, las opciones
function DetalleSolicitud({ solicitud, alVolver }) {
  const [elegida, setElegida] = useState(null); // el número de la opción que eligió el cliente
  const pasajeros =
    plural(solicitud.cantidadAdultos, 'adulto', 'adultos') +
    (solicitud.cantidadMenores > 0 ? ` y ${plural(solicitud.cantidadMenores, 'menor', 'menores')}` : '');

  return (
    <section>
      <div className="cabecera-solicitud">
        <div>
          <h1>Solicitud {solicitud.codigoSeguimiento}</h1>
          <p><strong>{solicitud.nombreCliente} {solicitud.apellidoCliente}</strong></p>
          <p className="texto-suave">
            {solicitud.destinos
              .map((d) => `${d.destino}, ${formatearFecha(d.fechaDesde)} al ${formatearFecha(d.fechaHasta)}`)
              .join(' · ')}{' '}
            · {pasajeros}
          </p>
        </div>
        <div className="estado-solicitud">
          <EstadoSolicitud estado={solicitud.estado} etiqueta={solicitud.estadoEtiqueta} />
          <p className="texto-suave">Último cambio: {formatearMomento(solicitud.fechaUltimoCambio)}</p>
        </div>
      </div>

      {solicitud.comentarios && (
        <div className="comentarios">
          <strong>Tus comentarios</strong>
          <p>{solicitud.comentarios}</p>
        </div>
      )}

      {/* HU-05, crit. 2: mientras la propuesta no esté validada, solo se informa el estado */}
      {solicitud.mensaje && <p className="alerta alerta-info">{solicitud.mensaje}</p>}

      {solicitud.opciones.length > 0 && (
        <>
          <p>Estas son las opciones que armamos, ordenadas según las prioridades que nos indicaste. Elegí la que más te guste.</p>
          <div className="opciones">
            {solicitud.opciones.map((o) => (
              <TarjetaOpcion key={o.orden} opcion={o}
                elegida={elegida === o.orden} alElegir={() => setElegida(o.orden)} />
            ))}
          </div>
          <p className="nota">Los precios son estimados y quedan sujetos a confirmación de disponibilidad.</p>
          <ContactoAgencia solicitud={solicitud} opcion={solicitud.opciones.find((o) => o.orden === elegida)} />
        </>
      )}

      <button type="button" className="boton boton-secundario" onClick={alVolver}>
        Consultar otra solicitud
      </button>
    </section>
  );
}

// Muestra en qué etapa está la solicitud: las anteriores quedan marcadas como cumplidas.
// Si el agente la desestimó, se muestra solo ese estado.
function EstadoSolicitud({ estado, etiqueta }) {
  if (estado === 'DESESTIMADA') return <span className="estado estado-DESESTIMADA">{etiqueta}</span>;

  const actual = ETAPAS.findIndex(([clave]) => clave === estado);
  return (
    <ol className="linea-estados">
      {ETAPAS.map(([clave, texto], i) => (
        <li key={clave} className={i < actual ? 'hecho' : i === actual ? 'actual' : ''}
          aria-current={i === actual ? 'step' : undefined}>
          <span className="punto" />
          {texto}
        </li>
      ))}
    </ol>
  );
}

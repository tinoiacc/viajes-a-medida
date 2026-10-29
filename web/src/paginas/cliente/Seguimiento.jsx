import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../../lib/api.js';
import { formatearFecha, formatearMomento, plural } from '../../lib/formato.js';
import { Campo } from '../../componentes/Campo.jsx';
import { TarjetaOpcion } from './TarjetaOpcion.jsx';

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
  const pasajeros =
    plural(solicitud.cantidadAdultos, 'adulto', 'adultos') +
    (solicitud.cantidadMenores > 0 ? ` y ${plural(solicitud.cantidadMenores, 'menor', 'menores')}` : '');

  return (
    <section>
      <div className="cabecera-solicitud">
        <div>
          <h1>Solicitud {solicitud.codigoSeguimiento}</h1>
          <p className="texto-suave">
            {solicitud.destinos
              .map((d) => `${d.destino}, ${formatearFecha(d.fechaDesde)} al ${formatearFecha(d.fechaHasta)}`)
              .join(' · ')}{' '}
            · {pasajeros}
          </p>
        </div>
        <div>
          <span className={`estado estado-${solicitud.estado}`}>{solicitud.estadoEtiqueta}</span>
          <p className="texto-suave">Último cambio: {formatearMomento(solicitud.fechaUltimoCambio)}</p>
        </div>
      </div>

      {/* HU-05, crit. 2: mientras la propuesta no esté validada, solo se informa el estado */}
      {solicitud.mensaje && <p className="alerta alerta-info">{solicitud.mensaje}</p>}

      {solicitud.opciones.length > 0 && (
        <>
          <p>Estas son las opciones que armamos, ordenadas según las prioridades que nos indicaste.</p>
          <div className="opciones">
            {solicitud.opciones.map((o) => <TarjetaOpcion key={o.orden} opcion={o} />)}
          </div>
          <p className="nota">Los precios son estimados y quedan sujetos a confirmación de disponibilidad.</p>
        </>
      )}

      <button type="button" className="boton boton-secundario" onClick={alVolver}>
        Consultar otra solicitud
      </button>
    </section>
  );
}
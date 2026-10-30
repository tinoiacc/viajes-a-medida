import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useSesion } from '../../lib/sesion.jsx';
import { formatearDolares, formatearFecha, formatearMomento, noches, plural } from '../../lib/formato.js';
import { OpcionAgente } from './OpcionAgente.jsx';

// El detalle de una solicitud y el armado de la propuesta (Figura 14 de la tesis)
export function DetalleSolicitud() {
  const { id } = useParams();
  const { agente } = useSesion();
  const [detalle, setDetalle] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    agente.solicitud(id).then(setDetalle).catch((e) => setError(e.message));
  }, [agente, id]);

  // Ejecuta una acción del agente. Todas devuelven el detalle actualizado, que reemplaza al anterior
  const ejecutar = useCallback(async (accion) => {
    setError('');
    setOcupado(true);
    try {
      const nuevo = await accion();
      setDetalle(nuevo);
      return nuevo;
    } catch (e) {
      setError(e.detalles[0]?.mensaje ?? e.message);
      return null;
    } finally {
      setOcupado(false);
    }
  }, []);

  if (!detalle) {
    return error ? <p className="alerta alerta-error">{error}</p> : <p className="texto-suave">Cargando…</p>;
  }

  const editable = detalle.estado === 'EN_ARMADO';
  const vigentes = detalle.opciones.filter((o) => !o.descartada).length;

  // HU-15: cambio de estado, solo a los estados permitidos
  async function cambiarEstado(estado) {
    if (estado === 'DESESTIMADA' && !window.confirm('¿Desestimar esta solicitud? Es un estado final.')) return;
    await ejecutar(() => agente.cambiarEstado(detalle.id, estado));
  }

  // HU-11: armado automático de las opciones
  async function armarOpciones() {
    if (detalle.opciones.length > 0 &&
      !window.confirm('Las opciones actuales, con sus ajustes, se reemplazan por las nuevas. ¿Continuar?')) return;
    const nuevo = await ejecutar(() => agente.armarOpciones(detalle.id));
    setAvisos(nuevo?.avisos ?? []);
  }

  // HU-14, crit. 3: validar y enviar la propuesta
  async function validar() {
    if (!window.confirm('¿Enviar la propuesta? El cliente va a poder ver las opciones y recibe un aviso por correo.')) return;
    await cambiarEstado('PROPUESTA_ENVIADA');
    setAvisos([]);
  }

  return (
    <section>
      <Link to="/agente" className="volver">← Volver a las solicitudes</Link>

      <div className="cabecera-solicitud">
        <div>
          <h1>Solicitud {detalle.codigoSeguimiento} · {detalle.nombreCliente} {detalle.apellidoCliente}</h1>
          <p className="texto-suave">
            Ingresó el {formatearMomento(detalle.fechaIngreso)} · último cambio {formatearMomento(detalle.fechaUltimoCambio)}
            {detalle.agente && ` · atiende ${detalle.agente.nombre}`}
          </p>
        </div>
        {/* HU-15, crit. 1 y 2: el estado actual y los estados a los que puede pasar */}
        <div className="cambio-estado">
          <span className={`estado estado-${detalle.estado}`}>{detalle.estadoEtiqueta}</span>
          {detalle.estadosPosibles
            .filter((e) => e.estado !== 'PROPUESTA_ENVIADA') // se envía con "Validar y enviar propuesta"
            .map((e) => (
              <button key={e.estado} type="button" disabled={ocupado} onClick={() => cambiarEstado(e.estado)}
                className={e.estado === 'DESESTIMADA' ? 'boton boton-peligro boton-chico' : 'boton boton-secundario boton-chico'}>
                {e.estado === 'DESESTIMADA' ? 'Desestimar' : `Pasar a ${e.etiqueta}`}
              </button>
            ))}
        </div>
      </div>

      {error && <p className="alerta alerta-error">{error}</p>}

      {/* HU-10 crit. 3 y HU-02 crit. 3: todos los datos del cliente, con sus prioridades */}
      <div className="tarjeta">
        <dl className="detalle grilla-datos">
          <div>
            <dt>Destinos</dt>
            <dd>
              {detalle.destinos.map((d) => (
                <div key={d.id}>
                  {d.destino}: {formatearFecha(d.fechaDesde)} al {formatearFecha(d.fechaHasta)}{' '}
                  ({plural(noches(d.fechaDesde, d.fechaHasta), 'noche', 'noches')})
                </div>
              ))}
            </dd>
          </div>
          <div>
            <dt>Pasajeros</dt>
            <dd>
              {plural(detalle.cantidadAdultos, 'adulto', 'adultos')}
              {detalle.cantidadMenores > 0 && ` y ${plural(detalle.cantidadMenores, 'menor', 'menores')}`}
            </dd>
          </div>
          <div>
            <dt>Presupuesto</dt>
            <dd>hasta {formatearDolares(detalle.presupuestoMax)}</dd>
          </div>
          <div>
            <dt>Prioridades del cliente</dt>
            <dd>Precio y categoría: {detalle.prioridadPrecioConfort} de 5 · Ritmo: {detalle.prioridadRitmo} de 5</dd>
          </div>
          <div>
            <dt>Contacto</dt>
            <dd>{detalle.email}</dd>
          </div>
        </dl>
        {detalle.comentarios && (
          <div className="comentarios">
            <strong>Comentarios del cliente</strong>
            <p>{detalle.comentarios}</p>
          </div>
        )}
      </div>

      <div className="cabecera-solicitud seccion-opciones">
        <h2>Opciones</h2>
        {editable && (
          <button type="button" className="boton" disabled={ocupado} onClick={armarOpciones}>
            {detalle.opciones.length ? 'Volver a armar opciones' : 'Armar opciones'}
          </button>
        )}
      </div>

      {detalle.estado === 'RECIBIDA' && (
        <p className="alerta alerta-info">Pasá la solicitud a En armado para armar las opciones.</p>
      )}
      {detalle.estado === 'PROPUESTA_ENVIADA' && (
        <p className="alerta alerta-info">La propuesta ya se envió al cliente. Para modificarla, pasala a En armado.</p>
      )}
      {detalle.estado === 'DESESTIMADA' && <p className="alerta alerta-info">La solicitud fue desestimada.</p>}

      {avisos.map((aviso) => <p key={aviso} className="alerta alerta-aviso">{aviso}</p>)}

      {detalle.opciones.length === 0 ? (
        editable && <p className="texto-suave">Todavía no hay opciones armadas.</p>
      ) : (
        <div className="opciones-agente">
          {detalle.opciones.map((o) => (
            <OpcionAgente key={o.id} opcion={o} presupuesto={detalle.presupuestoMax}
              editable={editable} ocupado={ocupado} ejecutar={ejecutar} />
          ))}
        </div>
      )}

      {editable && detalle.opciones.length > 0 && (
        <div className="validar">
          <p className="texto-suave">
            {vigentes === 0
              ? 'Todas las opciones están descartadas: recuperá al menos una para enviar la propuesta.'
              : `Se van a enviar ${plural(vigentes, 'opción', 'opciones')} al cliente.`}
          </p>
          <button type="button" className="boton" disabled={ocupado || vigentes === 0} onClick={validar}>
            Validar y enviar propuesta
          </button>
        </div>
      )}
    </section>
  );
}
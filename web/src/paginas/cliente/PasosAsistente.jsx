import { Campo } from '../../componentes/Campo.jsx';
import { formatearFecha, formatearDolares, hoyISO, noches, plural } from '../../lib/formato.js';

const nombreDestino = (destinos, id) => destinos.find((d) => String(d.id) === String(id))?.nombre ?? '';

// Paso 1: destinos, fechas y presupuesto
export function PasoViaje({ solicitud, cambiar, errores, destinos }) {
  const tramos = solicitud.destinos;
  const cambiarTramo = (i, campo, valor) =>
    cambiar('destinos', tramos.map((t, j) => (j === i ? { ...t, [campo]: valor } : t)));
  const agregarTramo = () =>
    cambiar('destinos', [...tramos, { idDestino: '', fechaDesde: tramos.at(-1).fechaHasta, fechaHasta: '' }]);
  const quitarTramo = (i) => cambiar('destinos', tramos.filter((_, j) => j !== i));

  return (
    <>
      <h2>¿A dónde querés viajar?</h2>
      <p className="texto-suave">Podés armar un viaje con uno o varios destinos.</p>

      {tramos.map((t, i) => (
        <fieldset key={i} className="tramo">
          <legend>Destino {i + 1}</legend>
          <div className="fila">
            <Campo etiqueta="Destino" error={errores[`destinos.${i}.idDestino`]}>
              <select value={t.idDestino} onChange={(e) => cambiarTramo(i, 'idDestino', e.target.value)}>
                <option value="">Elegí un destino</option>
                {destinos.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre} ({d.provincia})</option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Desde" error={errores[`destinos.${i}.fechaDesde`]}>
              <input type="date" min={hoyISO()} value={t.fechaDesde}
                onChange={(e) => cambiarTramo(i, 'fechaDesde', e.target.value)} />
            </Campo>
            <Campo etiqueta="Hasta" error={errores[`destinos.${i}.fechaHasta`]}>
              <input type="date" min={t.fechaDesde || hoyISO()} value={t.fechaHasta}
                onChange={(e) => cambiarTramo(i, 'fechaHasta', e.target.value)} />
            </Campo>
          </div>
          {tramos.length > 1 && (
            <button type="button" className="boton-enlace" onClick={() => quitarTramo(i)}>
              Quitar este destino
            </button>
          )}
        </fieldset>
      ))}

      {tramos.length < 5 && (
        <button type="button" className="boton boton-secundario" onClick={agregarTramo}>
          + Agregar otro destino
        </button>
      )}

      <h2>Presupuesto</h2>
      <Campo etiqueta="Presupuesto máximo (USD)" ayuda="Para todo el viaje, sin contar el pasaje aéreo"
        error={errores.presupuestoMax}>
        <input type="number" min="1" step="50" value={solicitud.presupuestoMax}
          onChange={(e) => cambiar('presupuestoMax', e.target.value)} />
      </Campo>
    </>
  );
}

// Paso 2: pasajeros y datos de contacto
export function PasoPasajeros({ solicitud, cambiar, errores }) {
  return (
    <>
      <h2>¿Quiénes viajan?</h2>
      <div className="fila">
        <Campo etiqueta="Adultos" error={errores.cantidadAdultos}>
          <input type="number" min="1" max="20" value={solicitud.cantidadAdultos}
            onChange={(e) => cambiar('cantidadAdultos', e.target.value)} />
        </Campo>
        <Campo etiqueta="Menores" ayuda="Menores de 18 años" error={errores.cantidadMenores}>
          <input type="number" min="0" max="20" value={solicitud.cantidadMenores}
            onChange={(e) => cambiar('cantidadMenores', e.target.value)} />
        </Campo>
      </div>

      <h2>Tus datos de contacto</h2>
      <div className="fila">
        <Campo etiqueta="Nombre" error={errores.nombreCliente}>
          <input value={solicitud.nombreCliente} autoComplete="given-name"
            onChange={(e) => cambiar('nombreCliente', e.target.value)} />
        </Campo>
        <Campo etiqueta="Apellido" error={errores.apellidoCliente}>
          <input value={solicitud.apellidoCliente} autoComplete="family-name"
            onChange={(e) => cambiar('apellidoCliente', e.target.value)} />
        </Campo>
      </div>
      <Campo etiqueta="Correo electrónico" ayuda="Te enviamos ahí el código de seguimiento" error={errores.email}>
        <input type="email" value={solicitud.email} autoComplete="email"
          onChange={(e) => cambiar('email', e.target.value)} />
      </Campo>
    </>
  );
}

// Un control deslizante de 1 a 5 que muestra el valor elegido (HU-02, crit. 1)
function Deslizador({ etiqueta, izquierda, derecha, valor, alCambiar }) {
  return (
    <div className="deslizador">
      <span className="campo-etiqueta">{etiqueta}</span>
      <input type="range" min="1" max="5" step="1" value={valor} aria-label={etiqueta}
        onChange={(e) => alCambiar(Number(e.target.value))} />
      <div className="deslizador-extremos">
        <span>{izquierda}</span>
        <strong>{valor} de 5</strong>
        <span>{derecha}</span>
      </div>
    </div>
  );
}

// Paso 3: prioridades del cliente y pedidos especiales
export function PasoPrioridades({ solicitud, cambiar, errores }) {
  return (
    <>
      <h2>¿Qué te importa más?</h2>
      <p className="texto-suave">Contanos qué preferís. Con esto ordenamos las opciones que te vamos a proponer.</p>
      <Deslizador
        etiqueta="Precio y categoría del alojamiento"
        izquierda="Prefiero gastar menos"
        derecha="Prefiero mejor categoría"
        valor={solicitud.prioridadPrecioConfort}
        alCambiar={(v) => cambiar('prioridadPrecioConfort', v)}
      />
      <Deslizador
        etiqueta="Ritmo del viaje"
        izquierda="Pocas actividades por día"
        derecha="Muchas actividades por día"
        valor={solicitud.prioridadRitmo}
        alCambiar={(v) => cambiar('prioridadRitmo', v)}
      />
      <Campo
        etiqueta="¿Algo más que tengamos que saber? (opcional)"
        ayuda={`Por ejemplo: hotel con pileta, viajamos con un bebé. ${solicitud.comentarios.length}/500`}
        error={errores.comentarios}
      >
        <textarea rows="4" maxLength={500} value={solicitud.comentarios}
          onChange={(e) => cambiar('comentarios', e.target.value)} />
      </Campo>
    </>
  );
}

// Paso 4: resumen completo y consentimiento
export function PasoConfirmacion({ solicitud, cambiar, errores, destinos }) {
  return (
    <>
      <h2>Revisá tu pedido</h2>
      <dl className="detalle">
        <dt>Destinos</dt>
        <dd>
          {solicitud.destinos.map((t, i) => (
            <div key={i}>
              {nombreDestino(destinos, t.idDestino)}: {formatearFecha(t.fechaDesde)} al {formatearFecha(t.fechaHasta)}{' '}
              ({plural(noches(t.fechaDesde, t.fechaHasta), 'noche', 'noches')})
            </div>
          ))}
        </dd>
        <dt>Pasajeros</dt>
        <dd>
          {plural(solicitud.cantidadAdultos, 'adulto', 'adultos')}
          {Number(solicitud.cantidadMenores) > 0 && ` y ${plural(solicitud.cantidadMenores, 'menor', 'menores')}`}
        </dd>
        <dt>Presupuesto</dt>
        <dd>hasta {formatearDolares(Number(solicitud.presupuestoMax))}</dd>
        <dt>Prioridades</dt>
        <dd>Precio y categoría: {solicitud.prioridadPrecioConfort} de 5 · Ritmo: {solicitud.prioridadRitmo} de 5</dd>
        <dt>Contacto</dt>
        <dd>{solicitud.nombreCliente} {solicitud.apellidoCliente} · {solicitud.email}</dd>
        {solicitud.comentarios.trim() && (
          <>
            <dt>Comentarios</dt>
            <dd className="texto-con-saltos">{solicitud.comentarios}</dd>
          </>
        )}
      </dl>

      <label className="casilla">
        <input type="checkbox" checked={solicitud.consentimientoDatos}
          onChange={(e) => cambiar('consentimientoDatos', e.target.checked)} />
        <span>
          Acepto que mis datos se usen para armar la propuesta y que se almacenen en servidores
          fuera del país (Ley 25.326 y Decreto 1558/2001).
        </span>
      </label>
      {errores.consentimientoDatos && <p className="campo-error">{errores.consentimientoDatos}</p>}
    </>
  );
}

// El recuadro "Tu pedido", que se actualiza mientras el cliente completa los pasos
export function ResumenPedido({ solicitud, destinos }) {
  const tramos = solicitud.destinos.filter((t) => t.idDestino);
  const primero = solicitud.destinos[0];
  const ultimo = solicitud.destinos.at(-1);

  return (
    <aside className="tarjeta resumen">
      <h3>Tu pedido</h3>
      <dl>
        <dt>Destino</dt>
        <dd>{tramos.length ? tramos.map((t) => nombreDestino(destinos, t.idDestino)).join(' → ') : '—'}</dd>
        <dt>Fechas</dt>
        <dd>
          {primero.fechaDesde && ultimo.fechaHasta
            ? `${formatearFecha(primero.fechaDesde)} al ${formatearFecha(ultimo.fechaHasta)}`
            : '—'}
        </dd>
        <dt>Pasajeros</dt>
        <dd>
          {plural(solicitud.cantidadAdultos || 0, 'adulto', 'adultos')}
          {Number(solicitud.cantidadMenores) > 0 && ` y ${plural(solicitud.cantidadMenores, 'menor', 'menores')}`}
        </dd>
        <dt>Presupuesto</dt>
        <dd>{solicitud.presupuestoMax ? `hasta ${formatearDolares(Number(solicitud.presupuestoMax))}` : '—'}</dd>
      </dl>
    </aside>
  );
}
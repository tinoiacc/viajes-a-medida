import { Fragment, useState } from 'react';
import { useSesion } from '../../lib/sesion.jsx';
import { estrellas, formatearDolares } from '../../lib/formato.js';

const AGREGABLES = ['Excursion', 'Adicional'];
const NOMBRE_TIPO = { Alojamiento: 'Alojamiento', Traslado: 'Traslado', Excursion: 'Excursión', Adicional: 'Adicional' };

// Una opción de la propuesta, como la ve el agente
export function OpcionAgente({ opcion, presupuesto, editable, ocupado, ejecutar }) {
  const { agente } = useSesion();
  const [aereo, setAereo] = useState(opcion.importeAereo ? String(opcion.importeAereo) : '');
  const [reemplazo, setReemplazo] = useState(null);   // { idLinea, alternativas }
  const [agregables, setAgregables] = useState(null); // servicios disponibles para sumar
  const [elegido, setElegido] = useState({ idServicio: '', cantidad: 1 });
  const [error, setError] = useState('');

  const alojamientos = opcion.servicios.filter((s) => s.tipo === 'Alojamiento');
  const seleccionado = agregables?.find((a) => a.idServicio === Number(elegido.idServicio));

  // Consultas que no modifican la opción (alternativas, servicios para agregar)
  async function consultar(pedido) {
    setError('');
    try {
      return await pedido();
    } catch (e) {
      setError(e.message);
      return null;
    }
  }

  async function abrirReemplazo(idLinea) {
    if (reemplazo?.idLinea === idLinea) { setReemplazo(null); return; }
    const alternativas = await consultar(() => agente.alternativas(opcion.id, idLinea));
    if (alternativas) setReemplazo({ idLinea, alternativas });
  }

  // HU-14, crit. 1: reemplazar un servicio; el precio se recalcula en la API
  async function reemplazar(idServicio) {
    if (await ejecutar(() => agente.reemplazar(opcion.id, reemplazo.idLinea, idServicio))) setReemplazo(null);
  }

  async function abrirAgregado() {
    if (agregables) { setAgregables(null); return; }
    const lista = await consultar(() => agente.agregables(opcion.id));
    if (lista) {
      setAgregables(lista);
      setElegido({ idServicio: lista[0]?.idServicio ?? '', cantidad: 1 });
    }
  }

  async function agregar() {
    const ok = await ejecutar(() => agente.agregar(opcion.id, Number(elegido.idServicio), Number(elegido.cantidad)));
    if (ok) setAgregables(null);
  }

  return (
    <article className={`tarjeta opcion-agente${opcion.descartada ? ' descartada' : ''}`}>
      <div className="cabecera-opcion">
        <div>
          <span className="opcion-numero">Opción {opcion.orden}{opcion.descartada && ' · descartada'}</span>
          <h3>{alojamientos.map((a) => `${a.nombre} ${estrellas(a.categoria)}`).join(' + ')}</h3>
        </div>
        {/* HU-14, crit. 2: descartar (o recuperar) la opción */}
        {editable && (
          <button type="button" className="boton boton-secundario boton-chico" disabled={ocupado}
            onClick={() => ejecutar(() => agente.descartar(opcion.id, !opcion.descartada))}>
            {opcion.descartada ? 'Recuperar' : 'Descartar opción'}
          </button>
        )}
      </div>

      <div className="tabla-contenedor">
        <table className="tabla tabla-servicios">
          <thead>
            <tr>
              <th>Servicio</th><th>Proveedor</th><th>Cant.</th><th>Tarifa neta</th>
              {editable && <th />}
            </tr>
          </thead>
          <tbody>
            {opcion.servicios.map((s) => (
              <Fragment key={s.id}>
                <tr>
                  <td>
                    <strong>{s.nombre}</strong> {estrellas(s.categoria)}
                    <br />
                    <span className="texto-suave">{NOMBRE_TIPO[s.tipo]}</span>
                  </td>
                  <td>{s.proveedor}</td>
                  <td>{s.cantidad}</td>
                  <td>{s.monedaTarifa} {s.montoNeto.toLocaleString('es-AR')}</td>
                  {editable && (
                    <td className="acciones-fila">
                      <button type="button" className="boton-enlace enlace" disabled={ocupado}
                        onClick={() => abrirReemplazo(s.id)}>Reemplazar</button>
                      {AGREGABLES.includes(s.tipo) && (
                        <button type="button" className="boton-enlace" disabled={ocupado}
                          onClick={() => ejecutar(() => agente.quitar(opcion.id, s.id))}>Quitar</button>
                      )}
                    </td>
                  )}
                </tr>
                {reemplazo?.idLinea === s.id && (
                  <tr>
                    <td colSpan={5}>
                      <div className="alternativas">
                        {reemplazo.alternativas.length === 0 ? (
                          <span className="texto-suave">No hay otros servicios de este tipo con tarifa vigente.</span>
                        ) : (
                          reemplazo.alternativas.map((a) => (
                            <button key={a.idServicio} type="button" className="alternativa" disabled={ocupado}
                              onClick={() => reemplazar(a.idServicio)}>
                              <strong>{a.nombre} {estrellas(a.categoria)}</strong>
                              <span className="texto-suave">
                                {a.proveedor} · {a.moneda} {a.montoNeto.toLocaleString('es-AR')} ({formatearDolares(a.montoUSD)})
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="bloque-agregar">
          <button type="button" className="boton-enlace enlace" disabled={ocupado} onClick={abrirAgregado}>
            {agregables ? 'Cancelar' : '+ Agregar excursión o adicional'}
          </button>
          {agregables && (agregables.length === 0 ? (
            <p className="texto-suave">No hay más excursiones ni adicionales disponibles para estos destinos.</p>
          ) : (
            <div className="fila-agregar">
              <label className="campo">
                <span className="campo-etiqueta">Servicio</span>
                <select value={elegido.idServicio}
                  onChange={(e) => setElegido({ ...elegido, idServicio: e.target.value })}>
                  {agregables.map((a) => (
                    <option key={a.idServicio} value={a.idServicio}>
                      {NOMBRE_TIPO[a.tipo]}: {a.nombre} ({a.destino}, {a.proveedor}, {formatearDolares(a.montoUSD)})
                    </option>
                  ))}
                </select>
              </label>
              {seleccionado?.tipo === 'Adicional' && (
                <label className="campo campo-angosto">
                  <span className="campo-etiqueta">Cantidad</span>
                  <input type="number" min="1" max="99" value={elegido.cantidad}
                    onChange={(e) => setElegido({ ...elegido, cantidad: e.target.value })} />
                </label>
              )}
              <button type="button" className="boton" disabled={ocupado} onClick={agregar}>Agregar</button>
            </div>
          ))}
        </div>
      )}

      {/* HU-12, crit. 3: el desglose del precio */}
      <dl className="desglose">
        <dt>Costo neto de los servicios</dt><dd>{formatearDolares(opcion.costoNetoTotal)}</dd>
        <dt>Margen de la agencia</dt><dd>{formatearDolares(opcion.margenAplicado)}</dd>
        <dt>Tasas e impuestos</dt><dd>{formatearDolares(opcion.tasasEImpuestos)}</dd>
        <dt>Componente aéreo</dt>
        <dd>{opcion.importeAereo > 0 ? formatearDolares(opcion.importeAereo) : 'sin cargar'}</dd>
        <dt className="total">Precio final</dt><dd className="total">{formatearDolares(opcion.precioFinal)}</dd>
      </dl>
      {opcion.precioFinal > presupuesto && (
        <p className="alerta alerta-aviso">Supera el presupuesto del cliente ({formatearDolares(presupuesto)}).</p>
      )}

      {/* HU-13: importe del aéreo conseguido por fuera */}
      {editable && (
        <div className="fila-aereo">
          <label className="campo campo-angosto">
            <span className="campo-etiqueta">Importe aéreo (USD)</span>
            <input type="number" min="0" step="10" value={aereo} onChange={(e) => setAereo(e.target.value)} />
          </label>
          <button type="button" className="boton boton-secundario" disabled={ocupado}
            onClick={() => ejecutar(() => agente.cargarAereo(opcion.id, Number(aereo) || 0))}>
            Guardar aéreo
          </button>
        </div>
      )}

      {error && <p className="alerta alerta-error">{error}</p>}
    </article>
  );
}
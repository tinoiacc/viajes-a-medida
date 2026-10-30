import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { useSesion } from '../../lib/sesion.jsx';
import { estrellas, formatearFecha, plural } from '../../lib/formato.js';
import { Campo } from '../../componentes/Campo.jsx';

const TIPOS = [['Alojamiento', 'Alojamiento'], ['Traslado', 'Traslado'], ['Excursion', 'Excursión'], ['Adicional', 'Adicional']];
const AYUDA_TARIFA = {
  Alojamiento: 'Por noche y por habitación',
  Traslado: 'Por persona',
  Excursion: 'Por persona',
  Adicional: 'Por unidad (la cantidad se define al armar la propuesta)',
};
const VACIO = {
  idProveedor: '', idDestino: '', tipo: 'Alojamiento', nombre: '', categoria: '',
  montoNeto: '', moneda: 'USD', baseOcupacion: 2, vigenciaDesde: '', vigenciaHasta: '',
};
const PLANTILLA =
  'tipo,destino,servicio,categoria,tarifa_neta,moneda,base,vigencia_desde,vigencia_hasta\n' +
  'Alojamiento,San Carlos de Bariloche,Hotel de ejemplo,4,150.00,USD,2,2026-11-01,2027-03-31\n';

// HU-08: carga del catálogo, a mano o con la plantilla estándar
export function Catalogo() {
  const { agente } = useSesion();
  const [vista, setVista] = useState('manual');
  const [proveedores, setProveedores] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([agente.proveedores(), api.destinos()])
      .then(([p, d]) => { setProveedores(p); setDestinos(d); })
      .catch((e) => setError(e.message));
  }, [agente]);

  return (
    <>
      <h1>Catálogo de servicios</h1>
      <div className="pestanas pestanas-secundarias">
        <button type="button" className={vista === 'manual' ? 'active' : ''} onClick={() => setVista('manual')}>
          Carga manual
        </button>
        <button type="button" className={vista === 'importar' ? 'active' : ''} onClick={() => setVista('importar')}>
          Importar CSV
        </button>
      </div>
      {error && <p className="alerta alerta-error">{error}</p>}
      {vista === 'manual'
        ? <CargaManual agente={agente} proveedores={proveedores} destinos={destinos} />
        : <ImportarCsv agente={agente} proveedores={proveedores} />}
    </>
  );
}

// Carga manual rápida: "Guardar y cargar otro" conserva todo salvo el servicio y su precio
function CargaManual({ agente, proveedores, destinos }) {
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [existentes, setExistentes] = useState([]);
  const [cargados, setCargados] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const refNombre = useRef(null);

  const cambiar = (campo, valor) => setDatos((d) => ({ ...d, [campo]: valor }));

  // Autocompletado: los servicios que ya existen de ese proveedor en ese destino
  useEffect(() => {
    if (!datos.idProveedor || !datos.idDestino) return;
    agente.servicios(datos.idProveedor, datos.idDestino).then(setExistentes).catch(() => setExistentes([]));
  }, [agente, datos.idProveedor, datos.idDestino]);

  // Al elegir el proveedor, se sugiere la moneda en la que trabaja
  function elegirProveedor(id) {
    const proveedor = proveedores.find((p) => String(p.id) === id);
    setDatos((d) => ({ ...d, idProveedor: id, moneda: proveedor?.monedaOperacion ?? d.moneda }));
  }

  // La base de ocupación y la categoría solo aplican al alojamiento
  function elegirTipo(tipo) {
    setDatos((d) => ({
      ...d, tipo,
      baseOcupacion: tipo === 'Alojamiento' ? 2 : 1,
      categoria: tipo === 'Alojamiento' ? d.categoria : '',
    }));
  }

  // Si se elige un servicio existente, se completan su tipo y su categoría
  function cambiarNombre(nombre) {
    const existente = existentes.find((s) => s.nombre === nombre);
    setDatos((d) => existente
      ? { ...d, nombre, tipo: existente.tipo, categoria: existente.categoria ?? '', baseOcupacion: existente.tipo === 'Alojamiento' ? d.baseOcupacion : 1 }
      : { ...d, nombre });
  }

  async function guardar(evento) {
    evento.preventDefault();
    setMensaje('');
    setErrores({});
    setGuardando(true);
    try {
      const respuesta = await agente.cargarServicio({
        idProveedor: Number(datos.idProveedor) || undefined,
        idDestino: Number(datos.idDestino) || undefined,
        tipo: datos.tipo,
        nombre: datos.nombre,
        categoria: datos.tipo === 'Alojamiento' && datos.categoria ? String(datos.categoria) : null,
        montoNeto: datos.montoNeto === '' ? undefined : Number(datos.montoNeto),
        moneda: datos.moneda,
        baseOcupacion: Number(datos.baseOcupacion),
        vigenciaDesde: datos.vigenciaDesde,
        vigenciaHasta: datos.vigenciaHasta,
      });

      setCargados((lista) => [{ ...datos, id: respuesta.idTarifa, nuevo: respuesta.servicioNuevo }, ...lista]);
      setMensaje(respuesta.servicioNuevo
        ? `"${datos.nombre}" se agregó al catálogo.`
        : `Se agregó una tarifa nueva a "${datos.nombre}".`);

      // Guardar y cargar otro: quedan proveedor, destino, tipo, moneda, base y vigencias
      setDatos((d) => ({ ...d, nombre: '', categoria: '', montoNeto: '' }));
      refNombre.current?.focus();
      agente.servicios(datos.idProveedor, datos.idDestino).then(setExistentes).catch(() => {});
    } catch (err) {
      setErrores(err.detalles.length
        ? Object.fromEntries(err.detalles.map((d) => [d.campo, d.mensaje]))
        : { general: err.message });
    } finally {
      setGuardando(false);
    }
  }

  const nombreProveedor = (id) => proveedores.find((p) => String(p.id) === String(id))?.nombre ?? '';
  const nombreDestino = (id) => destinos.find((d) => String(d.id) === String(id))?.nombre ?? '';

  return (
    <>
      <form className="tarjeta" onSubmit={guardar}>
        <div className="fila">
          <Campo etiqueta="Proveedor" error={errores.idProveedor}>
            <select value={datos.idProveedor} onChange={(e) => elegirProveedor(e.target.value)}>
              <option value="">Elegí un proveedor</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Destino" error={errores.idDestino}>
            <select value={datos.idDestino} onChange={(e) => cambiar('idDestino', e.target.value)}>
              <option value="">Elegí un destino</option>
              {destinos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </Campo>
        </div>

        <div className="campo">
          <span className="campo-etiqueta">Tipo de servicio</span>
          <div className="selector-tipo">
            {TIPOS.map(([valor, texto]) => (
              <button key={valor} type="button" onClick={() => elegirTipo(valor)}
                className={datos.tipo === valor ? 'opcion-tipo activa' : 'opcion-tipo'}>{texto}</button>
            ))}
          </div>
        </div>

        <div className="fila">
          <Campo etiqueta="Nombre del servicio" error={errores.nombre}
            ayuda="Sumá el régimen o la habitación si hace falta: Doble estándar – Media pensión">
            <input ref={refNombre} list="servicios-existentes" value={datos.nombre}
              onChange={(e) => cambiarNombre(e.target.value)} />
          </Campo>
          {datos.tipo === 'Alojamiento' && (
            <Campo etiqueta="Categoría" error={errores.categoria}>
              <select value={datos.categoria} onChange={(e) => cambiar('categoria', e.target.value)}>
                <option value="">Sin categoría</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{estrellas(n)}</option>)}
              </select>
            </Campo>
          )}
        </div>
        <datalist id="servicios-existentes">
          {existentes.map((s) => <option key={s.id} value={s.nombre} />)}
        </datalist>

        <div className="fila">
          <Campo etiqueta="Tarifa neta" ayuda={AYUDA_TARIFA[datos.tipo]} error={errores.montoNeto}>
            <input type="number" min="0" step="0.01" value={datos.montoNeto}
              onChange={(e) => cambiar('montoNeto', e.target.value)} />
          </Campo>
          <Campo etiqueta="Moneda" error={errores.moneda}>
            <select value={datos.moneda} onChange={(e) => cambiar('moneda', e.target.value)}>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </Campo>
          {datos.tipo === 'Alojamiento' && (
            <Campo etiqueta="Pasajeros por habitación" error={errores.baseOcupacion}>
              <select value={datos.baseOcupacion} onChange={(e) => cambiar('baseOcupacion', e.target.value)}>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Campo>
          )}
        </div>

        <div className="fila">
          <Campo etiqueta="Vigente desde" error={errores.vigenciaDesde}>
            <input type="date" value={datos.vigenciaDesde} onChange={(e) => cambiar('vigenciaDesde', e.target.value)} />
          </Campo>
          <Campo etiqueta="Vigente hasta" error={errores.vigenciaHasta}>
            <input type="date" min={datos.vigenciaDesde} value={datos.vigenciaHasta}
              onChange={(e) => cambiar('vigenciaHasta', e.target.value)} />
          </Campo>
        </div>

        {errores.general && <p className="alerta alerta-error">{errores.general}</p>}
        {mensaje && <p className="alerta alerta-exito">{mensaje}</p>}
        <button className="boton" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar y cargar otro'}</button>
      </form>

      {cargados.length > 0 && (
        <div className="tarjeta tabla-contenedor bloque-cargados">
          <table className="tabla">
            <thead>
              <tr><th>Cargados ahora</th><th>Proveedor</th><th>Destino</th><th>Tarifa</th><th>Vigencia</th></tr>
            </thead>
            <tbody>
              {cargados.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.nombre}</strong>{' '}
                    <span className="texto-suave">{c.nuevo ? '(nuevo)' : '(tarifa agregada)'}</span>
                  </td>
                  <td>{nombreProveedor(c.idProveedor)}</td>
                  <td>{nombreDestino(c.idDestino)}</td>
                  <td>{c.moneda} {Number(c.montoNeto).toLocaleString('es-AR')}</td>
                  <td>{formatearFecha(c.vigenciaDesde)} al {formatearFecha(c.vigenciaHasta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// Importación de un archivo con la plantilla estándar (ETL)
function ImportarCsv({ agente, proveedores }) {
  const [idProveedor, setIdProveedor] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [importando, setImportando] = useState(false);

  async function importar(evento) {
    evento.preventDefault();
    setError('');
    setResultado(null);
    if (!idProveedor || !archivo) {
      setError('Elegí el proveedor y el archivo');
      return;
    }
    setImportando(true);
    try {
      setResultado(await agente.importar(Number(idProveedor), await archivo.text()));
    } catch (err) {
      setError(err.detalles[0]?.mensaje ?? err.message);
    } finally {
      setImportando(false);
    }
  }

  // Genera la plantilla en el navegador y la descarga
  function descargarPlantilla() {
    const url = URL.createObjectURL(new Blob([PLANTILLA], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'plantilla_catalogo.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }

  return (
    <form className="tarjeta" onSubmit={importar}>
      <p className="texto-suave">
        Cargá muchos servicios de una vez con la plantilla estándar de la plataforma (CSV separado por comas).{' '}
        <button type="button" className="boton-enlace enlace" onClick={descargarPlantilla}>Descargar la plantilla</button>
      </p>
      <div className="fila">
        <Campo etiqueta="Proveedor">
          <select value={idProveedor} onChange={(e) => setIdProveedor(e.target.value)}>
            <option value="">Elegí un proveedor</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Archivo CSV">
          <input type="file" accept=".csv,text/csv" onChange={(e) => setArchivo(e.target.files[0] ?? null)} />
        </Campo>
      </div>
      {error && <p className="alerta alerta-error">{error}</p>}
      <button className="boton" disabled={importando}>{importando ? 'Importando…' : 'Importar'}</button>

      {resultado && (
        <div className="resultado-importacion">
          <p className="alerta alerta-exito">{plural(resultado.importadas, 'fila importada', 'filas importadas')}</p>
          {resultado.rechazadas.length > 0 && (
            <>
              <p className="alerta alerta-aviso">
                {plural(resultado.rechazadas.length, 'fila rechazada', 'filas rechazadas')}: corregilas y volvé a importarlas.
              </p>
              <table className="tabla">
                <thead><tr><th>Fila</th><th>Motivo</th></tr></thead>
                <tbody>
                  {resultado.rechazadas.map((r) => <tr key={r.fila}><td>{r.fila}</td><td>{r.motivo}</td></tr>)}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </form>
  );
}
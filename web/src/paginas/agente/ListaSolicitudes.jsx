import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSesion } from '../../lib/sesion.jsx';
import { formatearMomento } from '../../lib/formato.js';

const FILTROS = [
  ['', 'Todas'],
  ['RECIBIDA', 'Recibidas'],
  ['EN_ARMADO', 'En armado'],
  ['PROPUESTA_ENVIADA', 'Propuesta enviada'],
  ['DESESTIMADA', 'Desestimadas'],
];

// HU-10: las solicitudes, de la más antigua a la más reciente, con filtro por estado
export function ListaSolicitudes() {
  const { agente } = useSesion();
  const navegar = useNavigate();
  const [estado, setEstado] = useState('');
  const [solicitudes, setSolicitudes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    agente.solicitudes(estado).then(setSolicitudes).catch((e) => setError(e.message));
  }, [agente, estado]);

  const abrir = (id) => navegar(`/agente/solicitudes/${id}`);

  return (
    <>
      <div className="cabecera-solicitud">
        <h1>Solicitudes</h1>
        <label className="filtro">
          <span className="campo-etiqueta">Estado</span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            {FILTROS.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="alerta alerta-error">{error}</p>}

      {!solicitudes ? (
        <p className="texto-suave">Cargando…</p>
      ) : solicitudes.length === 0 ? (
        <p className="tarjeta texto-suave">No hay solicitudes {estado ? 'en este estado' : 'todavía'}.</p>
      ) : (
        <div className="tarjeta tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr><th>Código</th><th>Cliente</th><th>Destinos</th><th>Ingreso</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id} className="fila-clic" tabIndex={0} onClick={() => abrir(s.id)}
                  onKeyDown={(e) => e.key === 'Enter' && abrir(s.id)}>
                  <td><strong>{s.codigoSeguimiento}</strong></td>
                  <td>{s.cliente}</td>
                  <td>{s.destinos.join(' → ')}</td>
                  <td>{formatearMomento(s.fechaIngreso)}</td>
                  <td><span className={`estado estado-${s.estado}`}>{s.estadoEtiqueta}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
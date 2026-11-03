import { useState } from 'react';
import { formatearDolares, formatearFecha, estrellas, noches, plural } from '../../lib/formato.js';

// Una opción de viaje, como la Figura 13 de la tesis
export function TarjetaOpcion({ opcion, elegida, alElegir }) {
  const [abierta, setAbierta] = useState(false);
  const alojamientos = opcion.servicios.filter((s) => s.tipo === 'Alojamiento');
  const otros = opcion.servicios.filter((s) => s.tipo !== 'Alojamiento');

  return (
    <article className={`tarjeta tarjeta-opcion${elegida ? ' elegida' : ''}`}>
      <span className="opcion-numero">Opción {opcion.orden}</span>
      <h3>{alojamientos.map((a) => a.nombre).join(' + ')}</h3>
      <p className="texto-suave">{alojamientos.map((a) => estrellas(a.categoria)).join(' · ')}</p>

      <ul className="lista-servicios">
        {alojamientos.map((a, i) => (
          <li key={`a${i}`}>{plural(noches(a.fechaDesde, a.fechaHasta), 'noche', 'noches')} de alojamiento</li>
        ))}
        {otros.map((s, i) => <li key={`o${i}`}>{s.nombre}</li>)}
      </ul>

      <p className="precio">{formatearDolares(opcion.precioFinal)}</p>
      {/* HU-13, crit. 2: se aclara si el precio no incluye el aéreo */}
      <p className="texto-suave">
        {opcion.incluyeAereo ? 'Precio final · incluye aéreo' : 'Precio final · no incluye el pasaje aéreo'}
      </p>

      {/* HU-05, crit. 3: los servicios que componen la opción */}
      <div className="acciones-opcion">
        <button type="button" className="boton boton-secundario" onClick={() => setAbierta(!abierta)}>
          {abierta ? 'Ocultar detalle' : 'Ver detalle'}
        </button>
        <button type="button" className="boton" onClick={alElegir} aria-pressed={elegida}>
          {elegida ? 'Opción elegida ✓' : 'Elegir esta opción'}
        </button>
      </div>
      {abierta && (
        <table className="detalle-servicios">
          <tbody>
            {opcion.servicios.map((s, i) => (
              <tr key={i}>
                <td>
                  <strong>{s.nombre}</strong> {s.tipo === 'Alojamiento' && estrellas(s.categoria)}
                  <br />
                  <span className="texto-suave">
                    {s.tipo} · {formatearFecha(s.fechaDesde)} al {formatearFecha(s.fechaHasta)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}
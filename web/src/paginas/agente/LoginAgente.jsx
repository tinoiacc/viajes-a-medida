import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useSesion } from '../../lib/sesion.jsx';
import { Campo } from '../../componentes/Campo.jsx';

// HU-07: ingreso del agente con correo y contraseña
export function LoginAgente() {
  const { iniciarSesion } = useSesion();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function ingresar(evento) {
    evento.preventDefault();
    setError('');
    setCargando(true);
    try {
      iniciarSesion(await api.login(email, contrasena)); // crit. 1: entra al panel
    } catch (err) {
      setError(err.detalles[0]?.mensaje ?? err.message); // crit. 2: no entra e indica el error
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="formulario-consulta">
      <h1>Ingreso de agentes</h1>
      <form className="tarjeta" onSubmit={ingresar}>
        <Campo etiqueta="Correo electrónico">
          <input type="email" value={email} autoComplete="username" onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        <Campo etiqueta="Contraseña">
          <input type="password" value={contrasena} autoComplete="current-password"
            onChange={(e) => setContrasena(e.target.value)} />
        </Campo>
        {error && <p className="alerta alerta-error">{error}</p>}
        <button className="boton" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </section>
  );
}
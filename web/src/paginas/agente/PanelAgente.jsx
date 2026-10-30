import { NavLink, Route, Routes } from 'react-router';
import { useSesion } from '../../lib/sesion.jsx';
import { LoginAgente } from './LoginAgente.jsx';
import { ListaSolicitudes } from './ListaSolicitudes.jsx';
import { DetalleSolicitud } from './DetalleSolicitud.jsx';
import { Catalogo } from './Catalogo.jsx';

// HU-07: sin sesión iniciada, el panel muestra el ingreso
export function PanelAgente() {
  const { sesion, cerrarSesion } = useSesion();
  if (!sesion) return <LoginAgente />;

  return (
    <section>
      <div className="barra-panel">
        <nav className="pestanas">
          <NavLink to="/agente" end>Solicitudes</NavLink>
          <NavLink to="/agente/catalogo">Catálogo</NavLink>
        </nav>
        <div className="sesion-agente">
          <span className="texto-suave">{sesion.usuario.nombre}</span>
          <button type="button" className="boton boton-secundario boton-chico" onClick={cerrarSesion}>Salir</button>
        </div>
      </div>

      <Routes>
        <Route index element={<ListaSolicitudes />} />
        <Route path="solicitudes/:id" element={<DetalleSolicitud />} />
        <Route path="catalogo" element={<Catalogo />} />
      </Routes>
    </section>
  );
}
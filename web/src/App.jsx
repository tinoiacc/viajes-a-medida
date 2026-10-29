import { Routes, Route, Link, NavLink } from 'react-router';
import { Inicio } from './paginas/Inicio.jsx';
import { Asistente } from './paginas/cliente/Asistente.jsx';
import { Seguimiento } from './paginas/cliente/Seguimiento.jsx';
import { PanelAgente } from './paginas/agente/PanelAgente.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="encabezado">
        <div className="contenedor encabezado-interno">
          <Link to="/" className="marca">Viajes a Medida</Link>
          <nav className="navegacion">
            <NavLink to="/solicitud">Armá tu viaje</NavLink>
            <NavLink to="/seguimiento">Consultá tu solicitud</NavLink>
            <NavLink to="/agente">Agentes</NavLink>
          </nav>
        </div>
      </header>

      <main className="contenedor contenido">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/solicitud" element={<Asistente />} />
          <Route path="/seguimiento" element={<Seguimiento />} />
          <Route path="/agente/*" element={<PanelAgente />} />
          <Route path="*" element={<p className="tarjeta centrada">La página no existe.</p>} />
        </Routes>
      </main>

      <footer className="pie">Prototipo · Trabajo Final de Grado · Datos de demostración ficticios</footer>
    </div>
  );
}
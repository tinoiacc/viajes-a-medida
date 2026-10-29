import { Link } from 'react-router';

export function Inicio() {
  return (
    <>
      <section className="portada">
        <h1>Tu viaje, armado a tu medida</h1>
        <p className="texto-suave">
          Contanos a dónde querés ir y qué te importa. Te proponemos opciones con su precio,
          revisadas por un agente de viajes.
        </p>
      </section>
      <div className="opciones-inicio">
        <article className="tarjeta">
          <h2>Armá tu viaje</h2>
          <p className="texto-suave">Completá tu pedido en cuatro pasos y recibí un código para seguirlo.</p>
          <Link className="boton" to="/solicitud">Empezar</Link>
        </article>
        <article className="tarjeta">
          <h2>Consultá tu solicitud</h2>
          <p className="texto-suave">Con tu código y tu apellido, mirá el estado de tu pedido y las opciones que te armamos.</p>
          <Link className="boton boton-secundario" to="/seguimiento">Consultar</Link>
        </article>
      </div>
    </>
  );
}
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../lib/api.js';
import { hoyISO } from '../../lib/formato.js';
import {
  PasoViaje, PasoPasajeros, PasoPrioridades, PasoConfirmacion, ResumenPedido,
} from './PasosAsistente.jsx';

const PASOS = ['Viaje', 'Pasajeros', 'Prioridades', 'Confirmación'];

const SOLICITUD_INICIAL = {
  destinos: [{ idDestino: '', fechaDesde: '', fechaHasta: '' }],
  presupuestoMax: '',
  cantidadAdultos: 2,
  cantidadMenores: 0,
  nombreCliente: '',
  apellidoCliente: '',
  email: '',
  prioridadPrecioConfort: 3, // HU-02, crit. 2: valores intermedios por defecto
  prioridadRitmo: 3,
  consentimientoDatos: false,
};

// Validación de cada paso en el navegador (HU-01, crit. 1 y 2).
// Los nombres de los errores son los mismos que usa la API ("destinos.0.fechaHasta").
function validarPaso(paso, s) {
  const errores = {};
  if (paso === 0) {
    s.destinos.forEach((t, i) => {
      if (!t.idDestino) errores[`destinos.${i}.idDestino`] = 'Seleccione un destino';
      if (!t.fechaDesde) errores[`destinos.${i}.fechaDesde`] = 'Indique la fecha de partida';
      else if (t.fechaDesde < hoyISO()) errores[`destinos.${i}.fechaDesde`] = 'La fecha de partida no puede ser anterior a hoy';
      if (!t.fechaHasta) errores[`destinos.${i}.fechaHasta`] = 'Indique la fecha de regreso';
      else if (t.fechaDesde && t.fechaHasta <= t.fechaDesde) {
        errores[`destinos.${i}.fechaHasta`] = 'La fecha de regreso debe ser posterior a la de partida';
      }
    });
    if (!(Number(s.presupuestoMax) > 0)) errores.presupuestoMax = 'Ingrese un presupuesto mayor a cero';
  }
  if (paso === 1) {
    if (!(Number(s.cantidadAdultos) >= 1)) errores.cantidadAdultos = 'Debe viajar al menos un adulto';
    if (Number(s.cantidadAdultos) > 20) errores.cantidadAdultos = 'Se admiten hasta 20 adultos';
    if (!(Number(s.cantidadMenores) >= 0 && Number(s.cantidadMenores) <= 20)) {
      errores.cantidadMenores = 'Indique entre 0 y 20 menores';
    }
    if (s.nombreCliente.trim().length < 2) errores.nombreCliente = 'Ingrese su nombre';
    if (s.apellidoCliente.trim().length < 2) errores.apellidoCliente = 'Ingrese su apellido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim())) errores.email = 'Ingrese un correo válido';
  }
  if (paso === 3 && !s.consentimientoDatos) {
    errores.consentimientoDatos = 'Debe aceptar el tratamiento de sus datos para continuar';
  }
  return errores;
}

// A qué paso pertenece cada campo, para llevar al cliente al error que devuelva la API
function pasoDelCampo(campo) {
  if (campo.startsWith('destinos') || campo === 'presupuestoMax') return 0;
  if (['cantidadAdultos', 'cantidadMenores', 'nombreCliente', 'apellidoCliente', 'email'].includes(campo)) return 1;
  if (campo.startsWith('prioridad')) return 2;
  return 3;
}

export function Asistente() {
  const [paso, setPaso] = useState(0);
  const [solicitud, setSolicitud] = useState(SOLICITUD_INICIAL);
  const [errores, setErrores] = useState({});
  const [destinos, setDestinos] = useState([]);
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  // Al abrir el asistente, trae los destinos disponibles
  useEffect(() => {
    api.destinos().then(setDestinos).catch((e) => setErrorGeneral(e.message));
  }, []);

  const cambiar = (campo, valor) => setSolicitud((s) => ({ ...s, [campo]: valor }));

  // HU-01, crit. 1: si hay errores, se marcan y no avanza
  function siguiente() {
    const nuevosErrores = validarPaso(paso, solicitud);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length === 0) setPaso(paso + 1);
  }

  function atras() {
    setErrores({});
    setPaso(paso - 1);
  }

  // HU-01, crit. 3: envía la solicitud a la API
  async function enviar() {
    const nuevosErrores = validarPaso(3, solicitud);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    setErrorGeneral('');
    try {
      const respuesta = await api.crearSolicitud({
        ...solicitud,
        presupuestoMax: Number(solicitud.presupuestoMax),
        cantidadAdultos: Number(solicitud.cantidadAdultos),
        cantidadMenores: Number(solicitud.cantidadMenores),
        destinos: solicitud.destinos.map((t) => ({ ...t, idDestino: Number(t.idDestino) })),
      });
      setResultado(respuesta);
    } catch (err) {
      if (err.detalles.length > 0) {
        // La API rechazó algún dato: se marca el campo y se vuelve al paso donde está
        setErrores(Object.fromEntries(err.detalles.map((d) => [d.campo, d.mensaje])));
        setPaso(Math.min(...err.detalles.map((d) => pasoDelCampo(d.campo))));
      } else {
        setErrorGeneral(err.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) return <SolicitudEnviada resultado={resultado} email={solicitud.email} />;

  const propiedades = { solicitud, cambiar, errores, destinos };

  return (
    <section>
      <h1>Armá tu viaje a medida</h1>

      <ol className="pasos">
        {PASOS.map((nombre, i) => (
          <li key={nombre} className={i < paso ? 'paso hecho' : i === paso ? 'paso actual' : 'paso'}>
            {i + 1}. {nombre}{i < paso ? ' ✓' : ''}
          </li>
        ))}
      </ol>

      <div className="asistente">
        <div className="tarjeta">
          {paso === 0 && <PasoViaje {...propiedades} />}
          {paso === 1 && <PasoPasajeros {...propiedades} />}
          {paso === 2 && <PasoPrioridades {...propiedades} />}
          {paso === 3 && <PasoConfirmacion {...propiedades} />}

          {errorGeneral && <p className="alerta alerta-error">{errorGeneral}</p>}

          <div className="acciones">
            <button type="button" className="boton boton-secundario" onClick={atras} disabled={paso === 0}>
              Atrás
            </button>
            {paso < PASOS.length - 1 ? (
              <button type="button" className="boton" onClick={siguiente}>Siguiente</button>
            ) : (
              <button type="button" className="boton" onClick={enviar} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            )}
          </div>
        </div>

        <ResumenPedido solicitud={solicitud} destinos={destinos} />
      </div>
    </section>
  );
}

// HU-03, crit. 2: el código se muestra en pantalla
function SolicitudEnviada({ resultado, email }) {
  return (
    <section className="tarjeta centrada">
      <h1>¡Recibimos tu solicitud!</h1>
      <p>Tu código de seguimiento es</p>
      <p className="codigo">{resultado.codigoSeguimiento}</p>
      <p className="texto-suave">
        También te lo enviamos a {email}. Guardalo: con este código y tu apellido podés consultar
        el estado de tu viaje en cualquier momento.
      </p>
      <Link className="boton" to={`/seguimiento?codigo=${resultado.codigoSeguimiento}`}>
        Consultar mi solicitud
      </Link>
    </section>
  );
}
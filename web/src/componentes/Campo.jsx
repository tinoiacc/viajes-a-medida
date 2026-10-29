// Un campo de formulario con su etiqueta, una ayuda opcional y el mensaje de error
export function Campo({ etiqueta, ayuda, error, children }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">{etiqueta}</span>
      {children}
      {ayuda && !error && <span className="campo-ayuda">{ayuda}</span>}
      {error && <span className="campo-error">{error}</span>}
    </label>
  );
}
// Valida el cuerpo de la petición con un esquema de Zod antes de procesarla
export const validar = (esquema) => (req, res, next) => {
  req.body = esquema.parse(req.body);
  next();
};
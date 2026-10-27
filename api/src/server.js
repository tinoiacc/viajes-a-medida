import './lib/env.js';
import { app } from './app.js';

const puerto = process.env.PORT || 3000;
app.listen(puerto, () => {
  console.log(`API escuchando en http://localhost:${puerto}`);
});
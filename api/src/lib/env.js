import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Carga api/.env sin importar desde dónde se ejecute
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

for (const variable of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[variable]) {
    throw new Error(`Falta la variable ${variable} en api/.env`);
  }
}
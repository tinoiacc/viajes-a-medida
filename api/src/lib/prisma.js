import './env.js';
import { PrismaClient } from '@prisma/client';

// Una sola instancia para toda la aplicación
export const prisma = new PrismaClient();
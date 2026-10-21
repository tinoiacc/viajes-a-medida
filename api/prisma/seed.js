import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { importarCatalogo } from '../src/modulos/catalogo/etl.js';

async function limpiar() {
  // Orden inverso a las claves foráneas
  await prisma.opcionServicio.deleteMany();
  await prisma.opcion.deleteMany();
  await prisma.destinoSolicitado.deleteMany();
  await prisma.solicitud.deleteMany();
  await prisma.paqueteServicio.deleteMany();
  await prisma.paquete.deleteMany();
  await prisma.tarifa.deleteMany();
  await prisma.servicio.deleteMany();
  await prisma.proveedor.deleteMany();
  await prisma.destino.deleteMany();
  await prisma.parametroComercial.deleteMany();
  await prisma.usuario.deleteMany();
}

async function main() {
  await limpiar();

  await prisma.usuario.create({
    data: {
      nombre: 'Agente de Viajes',
      email: 'agente@demo.com',
      hashContrasena: await bcrypt.hash('Agente#2026', 10),
      rol: 'AGENTE',
    },
  });

  await prisma.destino.createMany({
    data: [
      { nombre: 'San Carlos de Bariloche', provincia: 'Río Negro', pais: 'Argentina' },
      { nombre: 'San Martín de los Andes', provincia: 'Neuquén', pais: 'Argentina' },
      { nombre: 'El Calafate', provincia: 'Santa Cruz', pais: 'Argentina' },
    ],
  });

  // Valores de ejemplo para la demo
  const desde = new Date('2026-01-01T00:00:00Z');
  await prisma.parametroComercial.createMany({
    data: [
      { concepto: 'Margen', aplicaA: 'Todos', valorPorcentual: 15, vigenciaDesde: desde },
      { concepto: 'Tasa', aplicaA: 'Todos', valorPorcentual: 3, vigenciaDesde: desde },
      { concepto: 'Impuesto', aplicaA: 'Alojamiento', valorPorcentual: 2.5, vigenciaDesde: desde },
    ],
  });

  const andes = await prisma.proveedor.create({
    data: { nombre: 'Andes Receptivo', monedaOperacion: 'USD' },
  });
  const lagos = await prisma.proveedor.create({
    data: { nombre: 'Lagos del Sur', monedaOperacion: 'ARS' },
  });

  for (const [proveedor, archivo] of [
    [andes, 'proveedor_andes.csv'],
    [lagos, 'proveedor_lagos.csv'],
  ]) {
    const ruta = new URL(`../../datos-demo/${archivo}`, import.meta.url);
    const contenido = await readFile(ruta, 'utf8');
    const resultado = await importarCatalogo(proveedor.id, contenido);
    console.log(`\n${proveedor.nombre}: ${resultado.importadas} filas importadas`);
    for (const r of resultado.rechazadas) {
      console.log(`  ✗ fila ${r.fila}: ${r.motivo}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
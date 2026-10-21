-- CreateTable
CREATE TABLE "proveedor" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "moneda_operacion" VARCHAR(3) NOT NULL,

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destino" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "provincia" VARCHAR(100) NOT NULL,
    "pais" VARCHAR(100) NOT NULL,

    CONSTRAINT "destino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "hash_contrasena" VARCHAR(100) NOT NULL,
    "rol" VARCHAR(20) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametro_comercial" (
    "id" SERIAL NOT NULL,
    "concepto" VARCHAR(15) NOT NULL,
    "aplica_a" VARCHAR(20) NOT NULL,
    "valor_porcentual" DECIMAL(5,2) NOT NULL,
    "vigencia_desde" DATE NOT NULL,
    "vigencia_hasta" DATE,

    CONSTRAINT "parametro_comercial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicio" (
    "id" SERIAL NOT NULL,
    "id_proveedor" INTEGER NOT NULL,
    "id_destino" INTEGER NOT NULL,
    "tipo" VARCHAR(15) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "categoria" VARCHAR(10),

    CONSTRAINT "servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paquete" (
    "id" SERIAL NOT NULL,
    "id_proveedor" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "fecha_salida" DATE NOT NULL,
    "fecha_regreso" DATE NOT NULL,
    "cupo_disponible" INTEGER NOT NULL,
    "precio_global" DECIMAL(12,2) NOT NULL,
    "moneda" VARCHAR(3) NOT NULL,

    CONSTRAINT "paquete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paquete_servicio" (
    "id_paquete" INTEGER NOT NULL,
    "id_servicio" INTEGER NOT NULL,

    CONSTRAINT "paquete_servicio_pkey" PRIMARY KEY ("id_paquete","id_servicio")
);

-- CreateTable
CREATE TABLE "tarifa" (
    "id" SERIAL NOT NULL,
    "id_servicio" INTEGER NOT NULL,
    "monto_neto" DECIMAL(12,2) NOT NULL,
    "moneda" VARCHAR(3) NOT NULL,
    "base_ocupacion" INTEGER NOT NULL,
    "vigencia_desde" DATE NOT NULL,
    "vigencia_hasta" DATE NOT NULL,

    CONSTRAINT "tarifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER,
    "codigo_seguimiento" VARCHAR(9) NOT NULL,
    "nombre_cliente" VARCHAR(100) NOT NULL,
    "apellido_cliente" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "cantidad_adultos" INTEGER NOT NULL,
    "cantidad_menores" INTEGER NOT NULL DEFAULT 0,
    "fecha_ingreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "presupuesto_max" DECIMAL(12,2) NOT NULL,
    "prioridad_precio_confort" INTEGER NOT NULL DEFAULT 3,
    "prioridad_ritmo" INTEGER NOT NULL DEFAULT 3,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'RECIBIDA',
    "fecha_ultimo_cambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destino_solicitado" (
    "id" SERIAL NOT NULL,
    "id_solicitud" INTEGER NOT NULL,
    "id_destino" INTEGER NOT NULL,
    "fecha_desde" DATE NOT NULL,
    "fecha_hasta" DATE NOT NULL,

    CONSTRAINT "destino_solicitado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opcion" (
    "id" SERIAL NOT NULL,
    "id_solicitud" INTEGER NOT NULL,
    "id_paquete" INTEGER,
    "origen" VARCHAR(10) NOT NULL DEFAULT 'Armada',
    "costo_neto_total" DECIMAL(12,2) NOT NULL,
    "margen_aplicado" DECIMAL(12,2) NOT NULL,
    "importe_aereo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "precio_final" DECIMAL(12,2) NOT NULL,
    "moneda" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "orden" INTEGER NOT NULL,
    "descartada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "opcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opcion_servicio" (
    "id" SERIAL NOT NULL,
    "id_opcion" INTEGER NOT NULL,
    "id_servicio" INTEGER NOT NULL,
    "id_tarifa" INTEGER NOT NULL,
    "fecha_desde" DATE NOT NULL,
    "fecha_hasta" DATE NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "opcion_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_codigo_seguimiento_key" ON "solicitud"("codigo_seguimiento");

-- AddForeignKey
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_id_destino_fkey" FOREIGN KEY ("id_destino") REFERENCES "destino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paquete" ADD CONSTRAINT "paquete_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paquete_servicio" ADD CONSTRAINT "paquete_servicio_id_paquete_fkey" FOREIGN KEY ("id_paquete") REFERENCES "paquete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paquete_servicio" ADD CONSTRAINT "paquete_servicio_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifa" ADD CONSTRAINT "tarifa_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destino_solicitado" ADD CONSTRAINT "destino_solicitado_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destino_solicitado" ADD CONSTRAINT "destino_solicitado_id_destino_fkey" FOREIGN KEY ("id_destino") REFERENCES "destino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_id_paquete_fkey" FOREIGN KEY ("id_paquete") REFERENCES "paquete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_servicio" ADD CONSTRAINT "opcion_servicio_id_opcion_fkey" FOREIGN KEY ("id_opcion") REFERENCES "opcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_servicio" ADD CONSTRAINT "opcion_servicio_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_servicio" ADD CONSTRAINT "opcion_servicio_id_tarifa_fkey" FOREIGN KEY ("id_tarifa") REFERENCES "tarifa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

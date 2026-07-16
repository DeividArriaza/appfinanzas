# Cuencla

Aplicacion de finanzas personales para una pareja (nombre: **Cuencla**, de
"cuentas claras"). Presupuesto mensual por categorias, movimientos fijos o
variables, vista individual y vista comun.

El detalle de decisiones y el plan estan en `CLAUDE.md`.

## Como correr en local

Requisitos: Docker y Docker Compose instalados.

1. Copia las variables de entorno de ejemplo:

   ```bash
   cp .env.example .env
   ```

   (Para desarrollo local los valores por defecto sirven tal cual.)

2. Levanta todo:

   ```bash
   docker compose up
   ```

   La primera vez tarda un poco porque descarga imagenes e instala dependencias.

3. Abre en el navegador:

   - Frontend (la app): http://localhost:5174
   - API (salud):       http://localhost:3001/health

   Si en la app ves "API: ok" y "Base de datos: conectada", todo esta bien.

   Nota: se usan los puertos 5174 y 3001 (y no los tipicos 5173/3000) porque
   esos ya estaban ocupados por otras apps en esta maquina. Se ajustan en `.env`
   con `WEB_HOST_PORT` y `API_HOST_PORT`.

## Estructura

```
appfinanzas/
  db/               Esquema de la base de datos (init.sql)
  api/              Backend: Node + Fastify + TypeScript
  web/              Frontend: React + Vite + Tailwind (PWA)
  docker-compose.yml  Orquesta base de datos + API + frontend
  .env.example      Plantilla de variables de entorno
```

## Notas

- La base de datos guarda sus datos en un volumen de Docker llamado `pgdata`.
  Persisten aunque recrees el contenedor. Para empezar de cero:
  `docker compose down -v` (borra el volumen y vuelve a ejecutar `init.sql`).
- El esquema `db/init.sql` solo se ejecuta cuando el volumen esta vacio.

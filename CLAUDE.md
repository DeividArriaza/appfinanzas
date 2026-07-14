# appfinanzas

App de finanzas personales para una pareja. Presupuesto mensual por categorías,
movimientos clasificados como fijos o variables, vista individual y vista "común"
combinada entre los dos usuarios.

> Estado: **fase de planificación**. Aún no hay código. Este archivo es la fuente
> de verdad de las decisiones tomadas y el plan a seguir.

## Objetivo y alcance

- App **móvil** (iOS y Android) sin publicar en tiendas → se construye como **PWA**
  (web app instalable, HTTPS, funciona en ambos sistemas).
- Uso privado inicial: el desarrollador y su pareja. Posible publicación futura,
  por eso desde el inicio hay **login real** (no atajos que impidan escalar).
- **Sin pagos dentro de la app.**

### Funcionalidad principal

- Presupuesto mensual por **categoría**: `ingreso`, `gasto`, `ahorro`, `inversion`.
- Cada movimiento (ingreso/gasto) se subclasifica en **fijo** o **variable**.
- **Login** con credenciales (correo + contraseña).
- **Vinculación de pareja**: buscar al otro usuario por **código único** o **correo**,
  enviar invitación, y al aceptar quedar vinculados.
- **Tres vistas**: la propia, la de la pareja (solo lectura), y una vista **"común"**
  que suma los datos de ambos. Los mismos datos, no se duplican.
- **Doble moneda**: cada movimiento guarda su monto y moneda original (GTQ o USD);
  un switch global convierte todo a la moneda elegida usando un tipo de cambio
  configurable (o consultado ~1 vez al día).
- **Reportes**: empezar simple (presupuesto vs. gastado del mes). Gráficas después.
- **Reporte mensual automático por correo** al cerrar el mes (mes y año).
- **Respaldo automático diario** de la base de datos (ver más abajo — NO es lo mismo
  que el reporte por correo).

## Stack técnico

Se **descartó Supabase**: aunque era cómodo en la nube, self-hosteado son ~12
contenedores (Postgres, GoTrue, PostgREST, Realtime, Storage, Kong, Studio…),
sobredimensionado y frágil para 2 usuarios. Se optó por un stack liviano y bajo
control total.

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite + TypeScript + Tailwind CSS (PWA con `vite-plugin-pwa`) |
| Backend/API | Node + Fastify + TypeScript |
| Base de datos | PostgreSQL |
| Auth | Propia: correo + contraseña con **bcrypt** para el hash + **JWT** para sesión |
| Contenedores | Docker + Docker Compose (2–3 contenedores: frontend estático, API, Postgres) |
| Reverse proxy (prod) | Caddy (HTTPS automático) |
| Hosting (prod) | VPS Contabo existente |

**Costo objetivo: $0** salvo un dominio opcional (~$10/año).

## Arquitectura y deploy

- **Aislamiento**: la app corre en su propia red y volumen de Docker Compose, aislada
  de otras apps del mismo Contabo (ej. el contenedor `servigt`). Nota honesta:
  contenedores ≠ VMs (comparten kernel); el aislamiento es lógico, suficiente para
  apps propias y confiables, no una barrera de seguridad fuerte.
- **Persistencia**: los datos de Postgres viven en un **volumen nombrado** de Docker
  (en el disco del host), no dentro del contenedor. Sobreviven recreación del contenedor.
- **Eficiencia de datos móviles** (requisito explícito): solo JSON, PWA cacheada, se
  pide solo el mes en vista, no todo el historial.

### Persistente ≠ respaldado (importante)

- **Reporte mensual por correo** = resumen legible para humanos. NO permite restaurar datos.
- **Respaldo (`pg_dump`)** = copia restaurable completa de la base. Cron nocturno →
  genera archivo `.sql` → lo copia **fuera de Contabo** (ej. Backblaze B2, 10 GB gratis)
  → rota los viejos. Ambos se implementan; ninguno es opcional.

## Modelo de datos (borrador)

```
usuarios      → id, correo, nombre, codigo_unico, moneda_preferida, password_hash
vinculos      → usuario_a, usuario_b, estado (pendiente | activo)
categorias    → ingreso | gasto | ahorro | inversion
presupuestos  → usuario, mes, categoria, monto_planificado
movimientos   → usuario, fecha, monto, moneda (GTQ|USD), categoria,
                tipo (fijo | variable), descripcion
```

## Roadmap

1. **Local primero**: proyecto corriendo 100% en la compu del desarrollador con Docker
   (frontend + API + Postgres). Nada toca Contabo hasta que esté sólido.
2. Features: login → vinculación de pareja → presupuestos → movimientos →
   vista individual/común → doble moneda.
3. Reporte mensual por correo + respaldo automático diario.
4. Producción: conseguir dominio/subdominio → Caddy → deploy a Contabo.

## Pendientes / decisiones abiertas

- Conseguir dominio o subdominio (gratis tipo DuckDNS, o `.com` ~$10/año). No urge
  hasta el deploy.
- Confirmar RAM libre del Contabo (`free -h`) y si hay reverse proxy (`docker ps`,
  `ss -tlnp | grep -E ':80|:443'`). No urge hasta el deploy.
- ¿Diseñar bocetos de pantallas antes de codear, o montar el esqueleto técnico primero?

## Convenciones

- Idioma del producto y de la comunicación: **español (Guatemala)**.
- Código y nombres de identificadores en el modelo de datos: como en el borrador de arriba.

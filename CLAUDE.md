# Cuencla

Nombre del producto: **Cuencla** (de "cuentas claras"). El identificador técnico
del repositorio, la carpeta y la base de datos siguen siendo `appfinanzas`.

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
- **Doble moneda**: los movimientos se guardan en la moneda preferida del usuario;
  un **switch global GTQ/USD** en el Resumen convierte todo lo mostrado. El tipo de
  cambio es **automático**: `GET /tipo-cambio` lo consulta de open.er-api.com
  (gratis, sin API key), lo cachea ~1 día y tiene respaldo si la API falla.
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
usuarios      → id, correo, nombre, codigo_unico, moneda_preferida,
                limite_balance (alerta naranja del balance), password_hash
vinculos      → usuario_a, usuario_b, estado (pendiente | activo)
categorias    → ingreso | gasto | ahorro | inversion  (enum fijo)
subcategorias → usuario, categoria, tipo (fijo|variable, solo ingreso/gasto),
                nombre  (creadas por el usuario, ej. "Gasolina")
presupuestos  → usuario, anio, mes, categoria, monto_planificado, moneda
movimientos   → usuario, fecha, monto, moneda (GTQ|USD), categoria,
                tipo (fijo | variable), subcategoria_id (opcional), descripcion
```

Balance del mes = `ingresos − gastos − ahorro − inversión` (lo que queda libre).
Se muestra en **rojo** si es negativo, **naranja** si cae hasta el límite, normal
si está holgado. El editor de presupuesto planificado se descartó; la tarjeta de
categorías ahora son solo los **totales por categoría** del mes.

**Alerta de balance por vista** (aislada, todos los límites en GTQ):
- Vista **Yo**: límite personal editable (`usuarios.limite_balance`).
- Vista **Común**: límite propio de la cuenta común, compartido y editable por
  ambos (`vinculos.limite_balance`).
- Vista **Pareja**: **solo lectura** (espectador). Se ve el límite personal de la
  pareja pero no se edita nada; tampoco se pueden borrar sus movimientos.
Endpoints: `PUT /auth/limite-balance` (personal), `PUT /vinculo/limite-balance`
(común). El editor es una ventana modal que se abre desde el Resumen.

### Migraciones

`db/init.sql` es la verdad para instalaciones nuevas (corre solo con el volumen
vacío). Los cambios de esquema sobre una base existente van en `db/migrations/`
(SQL idempotente, ej. `001_subcategorias.sql`) y se aplican con:
`docker compose exec -T db psql -U appfinanzas -d appfinanzas < db/migrations/XXX.sql`.
Ambos deben quedar equivalentes. A futuro conviene una herramienta de migraciones.

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
- **Ocultar/eliminar categorías desde el menú**: a futuro, permitir que el usuario
  oculte categorías que no usa (ej. `inversion`). Hoy las 4 categorías son fijas
  (enum en la base). Sería una preferencia por usuario, no borrar el enum.

## Sistema de diseño

Lenguaje visual **minimalista**, inspirado en Apple, Linear y Stripe: mucho espacio
en blanco, grid de 8 px (usar solo múltiplos pares de la escala de Tailwind),
sombras muy sutiles. **Sin degradados, sin glassmorphism, sin neumorphism.**

- **Radios**: 16 px para tarjetas/contenedores (`rounded-card`), 12 px para
  controles como botones e inputs (`rounded-control`).
- **Tipografía**: **Manrope**, autohospedada con `@fontsource/manrope` (no CDN
  externo, para offline y ahorro de datos).
- **Los números son el elemento visual más importante**: cifras tabulares
  (`.nums`, `tabular-nums`), grandes y con peso fuerte. El componente `Amount`
  centraliza esto.
- **El color solo comunica, no decora**: verde (income) y rojo (expense) se usan
  **únicamente** en montos; azul (primary) **solo** en la acción principal.

Paleta (definida como tokens en `web/tailwind.config.js`):

| Token | Uso | Valor |
|-------|-----|-------|
| `bg` | Fondo de la app | `#F8FAFC` |
| `card` | Superficie de tarjetas | `#FFFFFF` |
| `ink` | Texto principal | `#111827` |
| `muted` | Texto secundario | `#6B7280` |
| `primary` | Acción principal | `#2563EB` |
| `income` | Montos de ingreso | `#16A34A` |
| `expense` | Montos de gasto | `#DC2626` |
| `line` | Bordes | `#E5E7EB` |

Componentes base en `web/src/components/ui.tsx`: `Card`, `Button`, `Field`, `Amount`.

## Navegación

Barra inferior fija (`web/src/components/BottomNav.tsx`) con tres secciones,
respetando el área segura de iOS. El estado de la pestaña activa vive en
`Dashboard.tsx` (por ahora con estado local, sin router). Íconos SVG propios
(`components/icons.tsx`), sin emojis. Activo en negro, inactivos en gris; el azul
se reserva para el botón central de agregar.

- **Resumen** (`screens/Resumen.tsx`): balance del mes, totales por categoría,
  gráficas de desglose (`GraficoDesglose`: gastos e ingresos por subcategoría, con
  selector Totales/Fijos/Variables y porcentaje), lista de movimientos, alerta de
  balance, y switches de moneda y de vista (Yo/Común/Pareja).
- **Agregar** (`screens/Agregar.tsx`): registrar/editar/eliminar movimientos.
  Botón central azul (acción principal).
- **Perfil** (`screens/Perfil.tsx`): datos de la cuenta, moneda preferida,
  vinculación de pareja (`VinculoPareja`) y cerrar sesión.

## Convenciones

- Idioma del producto y de la comunicación: **español (Guatemala)**.
- Código y nombres de identificadores en el modelo de datos: como en el borrador de arriba.
- Puertos locales publicados: web en **5174**, API en **3001** (los 5173/3000 ya
  estaban ocupados por otras apps de la máquina). Postgres no se expone al host.

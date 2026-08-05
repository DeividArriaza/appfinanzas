# Compila el frontend y lo sirve con Caddy, que ademas hace de reverse proxy a
# la API (/api) y saca HTTPS automatico si se le da un dominio.
FROM node:20-slim AS build
WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
# En produccion el frontend llama a la API en el mismo origen, bajo /api.
ENV VITE_API_URL=/api
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /web/dist /srv
COPY caddy/Caddyfile /etc/caddy/Caddyfile

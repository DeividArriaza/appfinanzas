# Imagen de desarrollo del frontend (servidor de Vite con recarga en vivo).
# Para produccion mas adelante haremos un build estatico servido por Caddy.
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]

# Imagen de desarrollo de la API.
# Para produccion mas adelante haremos una version optimizada (multi-stage).
FROM node:20-slim

WORKDIR /app

# Instalar dependencias primero para aprovechar la cache de Docker.
COPY package.json package-lock.json* ./
RUN npm install

# El resto del codigo se monta como volumen en desarrollo (ver docker-compose),
# por eso aqui no copiamos src/. Igual lo dejamos para builds sin volumen.
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

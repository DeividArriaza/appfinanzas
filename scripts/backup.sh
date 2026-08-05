#!/bin/sh
# Respaldo diario de la base de datos de Cuencla.
# Genera un .sql.gz restaurable y rota los de mas de 14 dias.
# Programar en cron (ver DEPLOY.md). Correr desde la carpeta del proyecto.
set -e

DESTINO="${BACKUP_DIR:-./backups}"
mkdir -p "$DESTINO"
ARCHIVO="$DESTINO/cuencla-$(date +%F-%H%M).sql.gz"

docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db \
	pg_dump -U "${POSTGRES_USER:-appfinanzas}" "${POSTGRES_DB:-appfinanzas}" \
	| gzip >"$ARCHIVO"

echo "Respaldo creado: $ARCHIVO"

# Rotacion: borrar respaldos con mas de 14 dias.
find "$DESTINO" -name 'cuencla-*.sql.gz' -mtime +14 -delete

# IMPORTANTE: esto guarda el respaldo en el MISMO servidor. Para estar seguros
# hay que copiarlo tambien FUERA (ej. Backblaze B2). Ver DEPLOY.md.

#!/usr/bin/env bash
#
# Copia de seguridad de DnDVoices: base de datos y audio.
#
# Los volúmenes de Docker no son una copia de seguridad: un `down -v` mal dado,
# un disco lleno o una instancia recreada se lo llevan todo. La base de datos es
# lo irreemplazable —campañas, reparto, guiones, quién está en cada mesa—; el
# audio se puede regenerar, pero cuesta dinero en ElevenLabs.
#
# Uso:  ./scripts/backup.sh [directorio-destino]
# Cron: 0 4 * * * cd /srv/dndvoices && ./scripts/backup.sh >> /var/log/dndvoices-backup.log 2>&1
set -euo pipefail

DEST="${1:-/srv/backups/dndvoices}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%F-%H%M)"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

mkdir -p "$DEST"

# --- Base de datos ----------------------------------------------------------
# Formato custom (-Fc): comprimido y restaurable con pg_restore tabla a tabla.
echo "[$(date +%T)] volcando la base de datos…"
$COMPOSE exec -T postgres pg_dump -U dndvoices -Fc dndvoices > "$DEST/db-$STAMP.dump.tmp"
mv "$DEST/db-$STAMP.dump.tmp" "$DEST/db-$STAMP.dump"

# --- Audio ------------------------------------------------------------------
# Sólo los clips: son la caché que evita volver a facturar. Las mezclas se
# rehacen gratis a partir de ellos, así que no se copian.
echo "[$(date +%T)] empaquetando los clips…"
$COMPOSE exec -T web tar -cf - -C /app/storage clips 2>/dev/null \
  | gzip -1 > "$DEST/clips-$STAMP.tar.gz.tmp"
mv "$DEST/clips-$STAMP.tar.gz.tmp" "$DEST/clips-$STAMP.tar.gz"

# --- Rotación ---------------------------------------------------------------
# Los .tmp de una copia interrumpida se limpian también.
find "$DEST" -name "*.tmp" -mtime +1 -delete
find "$DEST" -name "db-*.dump" -mtime "+$KEEP_DAYS" -delete
find "$DEST" -name "clips-*.tar.gz" -mtime "+$KEEP_DAYS" -delete

echo "[$(date +%T)] listo:"
du -sh "$DEST/db-$STAMP.dump" "$DEST/clips-$STAMP.tar.gz" | sed 's/^/  /'
df -h "$DEST" | tail -1 | awk '{print "  disco: "$4" libres de "$2}'

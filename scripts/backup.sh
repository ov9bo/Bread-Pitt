#!/usr/bin/env bash
# Bread Pitt backup — run from project root or via cron on the host.
# Uses sqlite3 .backup so it's safe under WAL with the app running.
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DATA_DIR="${DATA_DIR:-$PROJECT_DIR/data}"
DB_PATH="${DB_PATH:-$DATA_DIR/bread-pitt.db}"
BACKUP_DIR="${BACKUP_DIR:-$DATA_DIR/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"

if [ ! -f "$DB_PATH" ]; then
  echo "✗ no db at $DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/bread-pitt-$STAMP.db"

# Prefer running sqlite3 inside the container so we use the same lib.
if command -v docker >/dev/null 2>&1 && docker compose ps bread-pitt --status running >/dev/null 2>&1; then
  docker compose exec -T bread-pitt \
    node -e "const d=require('better-sqlite3')('data/bread-pitt.db'); d.backup('data/backups/$(basename "$OUT")').then(()=>console.log('ok')).catch(e=>{console.error(e);process.exit(1)})"
elif command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '$OUT'"
else
  echo "✗ neither docker nor sqlite3 available" >&2
  exit 1
fi

gzip -9 "$OUT"
echo "✓ backup → ${OUT}.gz"

# Prune old backups
find "$BACKUP_DIR" -name 'bread-pitt-*.db.gz' -type f -mtime +"$RETAIN_DAYS" -print -delete

#!/usr/bin/env sh
set -e

echo "[bread-pitt] applying migrations…"
node node_modules/tsx/dist/cli.mjs scripts/migrate.ts

echo "[bread-pitt] syncing knowledge…"
node node_modules/tsx/dist/cli.mjs scripts/sync-knowledge.ts

# Optional: seed admin if ADMIN_PASSWORD is set and no user exists yet.
if [ -n "${ADMIN_PASSWORD:-}" ]; then
  if node -e "
    const Database = require('better-sqlite3');
    const db = new Database('data/bread-pitt.db');
    const c = db.prepare('SELECT count(*) AS n FROM users').get();
    process.exit(c.n > 0 ? 1 : 0);
  " 2>/dev/null; then
    echo "[bread-pitt] seeding admin…"
    node node_modules/tsx/dist/cli.mjs scripts/seed-admin.ts \
      "$ADMIN_PASSWORD" "${ADMIN_DISPLAY_NAME:-Baker}" || true
  fi
fi

echo "[bread-pitt] starting server on :${PORT:-3000}"
exec "$@"

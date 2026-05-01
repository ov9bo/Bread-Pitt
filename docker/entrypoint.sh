#!/usr/bin/env sh
set -e

echo "[crustopher] applying migrations…"
node node_modules/tsx/dist/cli.mjs scripts/migrate.ts

echo "[crustopher] syncing knowledge…"
node node_modules/tsx/dist/cli.mjs scripts/sync-knowledge.ts

# Optional: seed admin if ADMIN_PASSWORD is set and no user exists yet.
if [ -n "${ADMIN_PASSWORD:-}" ]; then
  if node -e "
    const Database = require('better-sqlite3');
    const db = new Database('data/crustopher.db');
    const c = db.prepare('SELECT count(*) AS n FROM users').get();
    process.exit(c.n > 0 ? 1 : 0);
  " 2>/dev/null; then
    echo "[crustopher] seeding admin…"
    node node_modules/tsx/dist/cli.mjs scripts/seed-admin.ts \
      "$ADMIN_PASSWORD" "${ADMIN_DISPLAY_NAME:-Baker}" || true
  fi
fi

echo "[crustopher] starting server on :${PORT:-3000}"
exec "$@"

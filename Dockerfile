# syntax=docker/dockerfile:1.7

# ---------- deps ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# better-sqlite3 builds a native binding; needs build tooling at install time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV CI=1 \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./
# Install with whichever lockfile is present.
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then corepack prepare yarn@stable --activate && yarn install --immutable; \
    else npm install; fi

# ---------- build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the app. `output: "standalone"` is set in next.config.ts.
RUN if [ -f pnpm-lock.yaml ]; then pnpm build; \
    elif [ -f package-lock.json ]; then npm run build; \
    elif [ -f yarn.lock ]; then yarn build; \
    else npm run build; fi

# Strip dev deps for a leaner copy of node_modules to runtime.
RUN if [ -f pnpm-lock.yaml ]; then pnpm prune --prod; \
    elif [ -f package-lock.json ]; then npm prune --omit=dev; \
    elif [ -f yarn.lock ]; then yarn workspaces focus --production || true; \
    else npm prune --omit=dev; fi

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# Minimal runtime: ca-certs for HTTPS to Telegram, tini for proper signal handling.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r breadpitt && useradd -r -g breadpitt -d /app breadpitt

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone server (Next assembles the minimal node_modules itself).
COPY --from=build --chown=breadpitt:breadpitt /app/.next/standalone ./
COPY --from=build --chown=breadpitt:breadpitt /app/.next/static ./.next/static
COPY --from=build --chown=breadpitt:breadpitt /app/public ./public

# Drizzle migrations + scripts run via tsx at boot — copy what we need outside standalone.
COPY --from=build --chown=breadpitt:breadpitt /app/drizzle ./drizzle
COPY --from=build --chown=breadpitt:breadpitt /app/scripts ./scripts
COPY --from=build --chown=breadpitt:breadpitt /app/lib ./lib
COPY --from=build --chown=breadpitt:breadpitt /app/tsconfig.json ./tsconfig.json
COPY --from=build --chown=breadpitt:breadpitt /app/tsconfig.scripts.json ./tsconfig.scripts.json
COPY --from=build --chown=breadpitt:breadpitt /app/package.json ./package.json
# Pruned production node_modules for migration scripts (better-sqlite3, drizzle, tsx, etc).
COPY --from=build --chown=breadpitt:breadpitt /app/node_modules ./node_modules

# Knowledge source — read at boot by lib/knowledge/parse.ts from cwd.
COPY --from=build --chown=breadpitt:breadpitt /app/sourdough_complete_guide.md ./sourdough_complete_guide.md
COPY --from=build --chown=breadpitt:breadpitt /app/sourdough_discard_and_starter_care.md ./sourdough_discard_and_starter_care.md

# Entrypoint runs migrations + knowledge sync, then hands off to the standalone server.
COPY --chown=breadpitt:breadpitt docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Persistent data: SQLite + uploads + backups.
RUN mkdir -p data data/uploads data/backups && chown -R breadpitt:breadpitt data
VOLUME ["/app/data"]

USER breadpitt
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]

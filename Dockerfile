# syntax=docker/dockerfile:1

# Debian y no Alpine: los binarios del motor de esquema de Prisma se compilan
# contra glibc, y en musl habría que resolver la variante a mano.
FROM node:24-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# --- Dependencias completas (incluye devDependencies, para compilar) ---------
FROM base AS deps
COPY package.json package-lock.json ./
# --ignore-scripts evita el postinstall de Prisma: se ejecuta abajo, cuando el
# esquema ya está copiado.
RUN npm ci --ignore-scripts

# --- Dependencias de producción ---------------------------------------------
FROM base AS prod-deps
COPY package.json package-lock.json ./
# --omit=optional además de --omit=dev: npm marca varias devDependencies como
# "devOptional" y las conserva si sólo se omite dev (883 MB frente a 409 MB).
RUN npm ci --omit=dev --omit=optional --ignore-scripts

# --- Compilación -------------------------------------------------------------
FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build && npm run build:worker

# --- Migraciones (contenedor de un solo uso) ---------------------------------
FROM base AS migrate
COPY --from=deps /app/node_modules ./node_modules
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
CMD ["npx", "prisma", "migrate", "deploy"]

# --- Servidor web ------------------------------------------------------------
FROM base AS web
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# El chown va en el COPY: un `RUN chown -R` posterior duplicaría en una capa
# nueva todo lo copiado.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# El servidor sólo lee audio ya generado; escribirlo es cosa del worker.
RUN install -d -o node -g node /app/storage
USER node
EXPOSE 3000
CMD ["node", "server.js"]

# --- Worker ------------------------------------------------------------------
# ffmpeg vive sólo aquí: el web no monta audio y no tiene por qué cargar con él.
FROM base AS worker
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
# El worker va compilado a un único .mjs: nada de tsx ni de esbuild en runtime,
# que además es lo que rompía con --omit=optional (falta el binario de esbuild).
COPY --from=build --chown=node:node /app/dist/worker.mjs ./dist/worker.mjs
COPY --chown=node:node package.json ./
RUN install -d -o node -g node /app/storage
USER node
CMD ["node", "dist/worker.mjs"]

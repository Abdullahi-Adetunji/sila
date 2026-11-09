# Single image for Render: Next.js + Express in one container.
#
# - Next.js listens on the public $PORT Render injects.
# - Express listens on 127.0.0.1:4000 only. Next.js rewrites /api/* to it.
# - Compile the TypeScript API at build time (no tsx at runtime) so the free
#   512 MB / 0.1 CPU instance isn't paying for a transpiler.
# - If either process exits, start.sh exits so Render restarts the container.

# ---------- Stage 1: install all deps (dev + prod) ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- Stage 2: build Next (standalone) and compile Express ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /build
ENV NODE_ENV=production
# NEXT_TELEMETRY_DISABLED keeps the build quiet in CI.
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /build/node_modules ./node_modules
COPY . .
# Next build (writes .next/standalone + .next/static).
RUN npx next build
# Compile Express to JS under server/dist. Keep source maps off for size.
RUN npx tsc -p server/tsconfig.build.json

# ---------- Stage 3: production-only deps for the Express runtime ----------
FROM node:20-bookworm-slim AS api-deps
WORKDIR /api
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && npm cache clean --force

# ---------- Stage 4: runtime image ----------
FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Render injects PORT at runtime. If it's missing (local run), fall back to 10000.
ENV PORT=10000
# Bind Express to loopback only so it is never reachable from outside the
# container; Next.js reaches it via the rewrite.
ENV SILA_API_HOST=127.0.0.1
ENV SILA_API_PORT=4000
# Cap each Node process so both fit inside Render's free 512 MB.
ENV NEXT_NODE_OPTIONS="--max-old-space-size=220"
ENV API_NODE_OPTIONS="--max-old-space-size=180"

WORKDIR /app

# Create a non-root user. Next's standalone output expects /app ownership.
RUN groupadd --system --gid 1001 app \
  && useradd --system --uid 1001 --gid app --home /app --shell /usr/sbin/nologin app

# ---- API files ----
# Compiled JS + the prod-only node_modules the Express entry needs.
COPY --chown=app:app --from=api-deps   /api/node_modules      /app/api/node_modules
COPY --chown=app:app --from=builder    /build/server/dist     /app/api/server/dist
# Runtime assets the API reads by relative path (see services/{volunteer,quiz,metrics}.ts).
COPY --chown=app:app --from=builder    /build/data            /app/api/data
COPY --chown=app:app --from=builder    /build/drizzle         /app/api/drizzle
COPY --chown=app:app --from=builder    /build/scripts/sql     /app/api/scripts/sql
# The engine and the content catalog live under src/ and are imported from the
# compiled server via the "@/*" alias; after tsc they resolve relative to
# server/dist/, so we need src/ alongside server/dist/. We ship only the two
# subtrees the server reaches into.
COPY --chown=app:app --from=builder    /build/src/lib/genetics /app/api/src/lib/genetics
COPY --chown=app:app --from=builder    /build/src/content      /app/api/src/content
COPY --chown=app:app --from=builder    /build/package.json     /app/api/package.json

# ---- Web files (Next.js standalone) ----
COPY --chown=app:app --from=builder    /build/.next/standalone /app/web
COPY --chown=app:app --from=builder    /build/.next/static     /app/web/.next/static
COPY --chown=app:app --from=builder    /build/public           /app/web/public
# The /docs/data-governance page reads this at request time.
COPY --chown=app:app --from=builder    /build/docs             /app/web/docs

# ---- Entrypoint ----
COPY --chown=app:app scripts/start.sh  /app/start.sh
RUN chmod +x /app/start.sh

USER app
# Render reads PORT from the env; EXPOSE is documentation only.
EXPOSE 10000
CMD ["/app/start.sh"]

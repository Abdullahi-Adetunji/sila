# Single image for Render: Next.js + Express in one container.
#
# - Next.js listens on the public $PORT Render injects.
# - Express listens on 127.0.0.1:4000. Next.js rewrites /api/* to it.
# - Compile Express TS to JS at build time (no tsx at runtime).
# - argon2 has no prebuilt binaries for musl or recent glibc, so it needs
#   python3 + g++ + make to build via node-gyp. We do that in dedicated
#   build stages and copy the compiled node_modules into a runtime stage
#   that has no compilers at all. The build stages must share the exact
#   same base image as the runtime stage — a native .node binary built
#   against glibc 2.36 will not load on an Alpine musl runtime.

ARG NODE_IMAGE=node:24.22.2-bookworm-slim

# ---------- Stage 1: all deps (dev + prod), with native-build toolchain ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /build
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ pkg-config ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- Stage 2: Next.js standalone build + tsc of Express ----------
FROM ${NODE_IMAGE} AS builder
WORKDIR /build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /build/node_modules ./node_modules
COPY . .
RUN npx next build
RUN npx tsc -p server/tsconfig.build.json

# ---------- Stage 3: prod-only deps for the Express runtime, with toolchain ----------
FROM ${NODE_IMAGE} AS api-deps
WORKDIR /api
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ pkg-config ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && npm cache clean --force

# ---------- Stage 4: runtime (no compilers). Same base image as above. ----------
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Render injects PORT at runtime; 10000 is only used if nothing sets it.
ENV PORT=10000
# Bind Express to loopback only: never public, reached via the Next rewrite.
ENV SILA_API_HOST=127.0.0.1
ENV SILA_API_PORT=4000
# Keep both Node processes inside Render's free 512 MB budget.
ENV NEXT_NODE_OPTIONS="--max-old-space-size=220"
ENV API_NODE_OPTIONS="--max-old-space-size=180"

WORKDIR /app

RUN groupadd --system --gid 1001 app \
  && useradd --system --uid 1001 --gid app --home /app --shell /usr/sbin/nologin app

# ---- API files ----
COPY --chown=app:app --from=api-deps   /api/node_modules      /app/api/node_modules
COPY --chown=app:app --from=builder    /build/server/dist     /app/api/server/dist
COPY --chown=app:app --from=builder    /build/data            /app/api/data
COPY --chown=app:app --from=builder    /build/drizzle         /app/api/drizzle
COPY --chown=app:app --from=builder    /build/scripts/sql     /app/api/scripts/sql
COPY --chown=app:app --from=builder    /build/src/lib/genetics /app/api/src/lib/genetics
COPY --chown=app:app --from=builder    /build/src/content      /app/api/src/content
COPY --chown=app:app --from=builder    /build/package.json     /app/api/package.json

# ---- Web files (Next.js standalone) ----
COPY --chown=app:app --from=builder    /build/.next/standalone /app/web
COPY --chown=app:app --from=builder    /build/.next/static     /app/web/.next/static
COPY --chown=app:app --from=builder    /build/public           /app/web/public
COPY --chown=app:app --from=builder    /build/docs             /app/web/docs

# ---- Entrypoint ----
COPY --chown=app:app scripts/start.sh  /app/start.sh
RUN chmod +x /app/start.sh

USER app
EXPOSE 10000
CMD ["/app/start.sh"]

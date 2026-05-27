FROM oven/bun:1.3.13-alpine AS deps
WORKDIR /app
# Build tools for native modules (better-sqlite3) — needed on musl when no prebuild matches.
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

FROM oven/bun:1.3.13-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1.3.13-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Drizzle migrations applied at runtime by lib/db/client.ts on first DB access.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# Default SQLite location (override with TYPELENS_DB_PATH). When deploying with
# a persistent volume, mount it at /data and ensure it's owned by uid 1001.
RUN mkdir -p /data && chown -R nextjs:nodejs /data
ENV TYPELENS_DB_PATH=/data/typelens.db

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "run", "server.js"]

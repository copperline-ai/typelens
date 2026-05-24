FROM oven/bun:1.3.13-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

FROM oven/bun:1.3.13-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY next.config.ts tsconfig.json postcss.config.mjs components.json ./
COPY src/ ./src/
COPY public/ ./public/
RUN --mount=type=cache,target=/app/.next/cache \
    bun run build

FROM oven/bun:1.3.13-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --link --from=builder /app/public ./public
COPY --link --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --link --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "run", "server.js"]

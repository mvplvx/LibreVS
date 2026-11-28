FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time only. The runner rejects this placeholder before it serves traffic.
ARG DATABASE_URL=postgresql://librevs:librevs@localhost:5432/librevs?schema=public
ENV DATABASE_URL=${DATABASE_URL}
ENV BETTER_AUTH_SECRET=docker-build-placeholder-secret-32chars-min
ENV BETTER_AUTH_URL=http://localhost:3000
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate \
  && npm run build \
  && node scripts/bundle-provision.mjs

FROM node:22-bookworm-slim AS proddeps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
ARG DATABASE_URL=postgresql://librevs:librevs@localhost:5432/librevs?schema=public
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 librevs \
  && useradd --system --uid 1001 --gid librevs --home-dir /app --shell /usr/sbin/nologin librevs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/assets/fonts ./assets/fonts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/docker/provision-auth-user.cjs ./provision-auth-user.cjs
COPY --from=proddeps /app/node_modules ./node_modules
COPY scripts/docker-entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
  && chown -R librevs:librevs /app

USER librevs
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]

# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --legacy-peer-deps

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]

# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

# Install native build tools required by bcrypt
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

# Development image with full dependencies and hot reload
FROM deps AS development
ENV NODE_ENV=development
COPY docker/dev-entrypoint.sh /usr/local/bin/dev-entrypoint.sh
RUN chmod +x /usr/local/bin/dev-entrypoint.sh
EXPOSE 8088
ENTRYPOINT ["dev-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# Production image — minimal runtime footprint
FROM base AS production
ENV NODE_ENV=production

RUN apk add --no-cache dumb-init

COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN npm prune --omit=dev && npm cache clean --force

USER node

EXPOSE 8088

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8088) + '/api/v1/health/ready').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]

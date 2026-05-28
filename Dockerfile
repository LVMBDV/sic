# syntax=docker/dockerfile:1.7

# 1. Install all workspace deps + build both
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci || npm install
COPY backend/ backend/
COPY frontend/ frontend/
RUN npm run build

# 2. Production deps only (workspace-aware)
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev || npm install --omit=dev

# 3. Runtime
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    SIC_BIND=0.0.0.0:6767 \
    DATABASE_URL=/data/sic.db

COPY --from=build      /app/backend/dist            ./backend/dist
COPY --from=build      /app/frontend/dist           ./frontend/dist
COPY --from=prod-deps  /app/node_modules            ./node_modules
COPY --from=prod-deps  /app/backend/node_modules    ./backend/node_modules
COPY --from=build      /app/backend/package.json    ./backend/package.json

RUN mkdir -p /data && chown -R node:node /data
USER node
WORKDIR /app/backend
EXPOSE 6767
ENTRYPOINT ["node", "--enable-source-maps", "dist/server.js"]

FROM node:24.15.0-bookworm-slim

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock .yarnrc ./
COPY .yarn/ .yarn/
COPY backend/package.json backend/package.json
COPY mobile/package.json mobile/package.json
RUN yarn install --frozen-lockfile --non-interactive

COPY backend/prisma backend/prisma
RUN yarn workspace task-manager-backend prisma:generate
COPY backend/src backend/src

RUN mkdir -p backend/uploads && chown -R node:node /app
USER node
EXPOSE 3000

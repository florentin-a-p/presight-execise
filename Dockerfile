# syntax=docker/dockerfile:1

# ---- Build: install all deps, build client and server -----------------------
FROM node:20-bookworm-slim AS build
WORKDIR /app
# Toolchain in case better-sqlite3 has to compile from source.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock lerna.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY client client
COPY server server
RUN yarn build

# ---- Production dependencies only ------------------------------------------
FROM build AS prod-deps
RUN rm -rf node_modules client/node_modules server/node_modules \
  && yarn install --frozen-lockfile --production --network-timeout 600000

# ---- Runtime ----------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/users.db \
    SEED_COUNT=10000
WORKDIR /app
# sqlite3 CLI for inspecting the database: `docker compose exec app sqlite3 /data/users.db`
RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/server/package.json server/
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Seeds the database on first start if it is empty, then serves API + client.
WORKDIR /app/server
CMD ["node", "dist/index.js"]

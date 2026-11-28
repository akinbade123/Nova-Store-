# The NOVA API. Build from the repository root, because the API imports the storefront's shared rules
# and sample data from ../src (see server/src/shared.ts):
#   docker build -f server/Dockerfile -t nova-api .
FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependencies first, so they're cached until the lockfile changes. Production dependencies only.
COPY server/package.json server/package-lock.json server/
RUN cd server && npm ci --omit=dev && npm cache clean --force

COPY server/ server/
COPY src/ src/

WORKDIR /app/server
USER node
EXPOSE 4000
# Migrations run at startup, then the server listens on $PORT (default 4000). On SIGTERM it stops
# taking new requests, finishes the ones in progress and exits (server/README.md, "Deploying").
CMD ["node", "src/index.ts"]

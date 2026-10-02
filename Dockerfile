FROM ghcr.io/hazmi35/node:22-dev-alpine@sha256:e81c055a964a9d8b86d357a5ffd288d703c5d8728175ce0743050ac04da1ccf7 AS build-stage

# Prepare pnpm with corepack (experimental feature)
RUN corepack enable && corepack prepare pnpm@latest

# Copy package.json, lockfile and npm config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml *.npmrc  ./

# Fetch dependencies to virtual store
RUN pnpm fetch

# Install dependencies
RUN pnpm install --offline --frozen-lockfile

# Copy Project files
COPY . .

# Build TypeScript Project
RUN pnpm run build

# Prune devDependencies
RUN pnpm prune --production

# Get ready for production
FROM ghcr.io/hazmi35/node:22-alpine@sha256:5f20382c7f644a69e4a40358891194a162241a09c28bb8e303eabea6ef60d3c3

LABEL name="venti"
LABEL maintainer="Kakushin Devs <hello@kakushin.dev>"

# Copy needed files
COPY --from=build-stage /tmp/build/package.json .
COPY --from=build-stage /tmp/build/node_modules ./node_modules
COPY --from=build-stage /tmp/build/dist ./dist

# Start the app with node
CMD ["node", "--experimental-specifier-resolution=node", "dist/main.js"]
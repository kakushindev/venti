FROM ghcr.io/hazmi35/node:24.21.0-dev-alpine@sha256:f6d677e6475e587c287965230d97295637f11b3b4686b6787e8ae8c7ef612d9a AS build-stage

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
FROM ghcr.io/hazmi35/node:24.21.0-alpine@sha256:e34e43c8d3ba794d4444a5de7609fda2fdb087f934f0435d93b56f8a5c869978

LABEL name="venti"
LABEL maintainer="Kakushin Devs <hello@kakushin.dev>"

# Copy needed files
COPY --from=build-stage /tmp/build/package.json .
COPY --from=build-stage /tmp/build/node_modules ./node_modules
COPY --from=build-stage /tmp/build/dist ./dist

# Start the app with node
CMD ["node", "--experimental-specifier-resolution=node", "dist/main.js"]
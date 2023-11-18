FROM ghcr.io/hazmi35/node:18-dev-alpine as build-stage

# Prepare pnpm with corepack (experimental feature)
RUN corepack enable && corepack prepare pnpm@latest

# Copy package.json, lockfile and npm config files
COPY package.json pnpm-lock.yaml *.npmrc  ./

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
FROM ghcr.io/hazmi35/node:18-alpine

LABEL name "venti"
LABEL maintainer "Kakushin Devs <hello@kakushin.dev>"

# Copy needed files
COPY --from=build-stage /tmp/build/package.json .
COPY --from=build-stage /tmp/build/node_modules ./node_modules
COPY --from=build-stage /tmp/build/dist ./dist

# Start the app with node
CMD ["node", "--experimental-specifier-resolution=node", "dist/main.js"]
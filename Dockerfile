FROM ghcr.io/hazmi35/node:24.20.0-dev-alpine@sha256:c630bc50725ca4ce7098a8c3f085ed4cd6ab12e1cb672e1040cc419dccaa2d03 AS build-stage

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
FROM ghcr.io/hazmi35/node:24.20.0-alpine@sha256:fc6b225e44e91104e3c4ae93f9f7344f249fbb419a9beaed9bba466700a5b2b9

LABEL name="venti"
LABEL maintainer="Kakushin Devs <hello@kakushin.dev>"

# Copy needed files
COPY --from=build-stage /tmp/build/package.json .
COPY --from=build-stage /tmp/build/node_modules ./node_modules
COPY --from=build-stage /tmp/build/dist ./dist

# Start the app with node
CMD ["node", "--experimental-specifier-resolution=node", "dist/main.js"]
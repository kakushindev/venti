FROM ghcr.io/hazmi35/node:22.23.4-dev-alpine@sha256:efbef37288c637d29650d212bdceeb7332dd1c771f00917d0eeb6fc9b80add03 AS build-stage

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
FROM ghcr.io/hazmi35/node:22.23.4-alpine@sha256:ea74ac05cb2214477b631c7da3ace4fa0c5d421f1c6dfc1ddf1cfb8dd6989f2a

LABEL name="venti"
LABEL maintainer="Kakushin Devs <hello@kakushin.dev>"

# Copy needed files
COPY --from=build-stage /tmp/build/package.json .
COPY --from=build-stage /tmp/build/node_modules ./node_modules
COPY --from=build-stage /tmp/build/dist ./dist

# Start the app with node
CMD ["node", "--experimental-specifier-resolution=node", "dist/main.js"]
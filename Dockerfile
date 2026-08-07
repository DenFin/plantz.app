ARG NODE_VERSION=23

FROM node:${NODE_VERSION}-slim as base

ARG PORT=3000

WORKDIR /src

# Build
FROM base as build

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY --link . .

# Same reason as the CI build step: the build host has 2.8 GB of RAM and node's
# default heap ceiling is too low for the nitro build.
ENV NODE_OPTIONS=--max-old-space-size=2048

RUN npm run build

# Run
FROM base

# The commit the image was built from. INS-01 reports it as plantz_build_info.
ARG BUILD_TAG=dev

ENV PORT=$PORT
ENV NODE_ENV=production
ENV BUILD_TAG=$BUILD_TAG

COPY --from=build /src/.output /src/.output

CMD [ "node", ".output/server/index.mjs" ]
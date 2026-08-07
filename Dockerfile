ARG NODE_VERSION=23

FROM node:${NODE_VERSION}-slim as base

ARG PORT=3000

WORKDIR /src

# Build
FROM base as build

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY --link . .

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
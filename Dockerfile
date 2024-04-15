# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 as base
WORKDIR /usr/src/app
EXPOSE 3000

FROM base as dev
RUN --mount=type=bind,target=package.json,source=package.json \
    --mount=type=bind,target=bun.lockb,source=bun.lockb \
    --mount=type=cache,target=~/.bun/install/cache \
    bun install --frozen-lockfile
USER bun
COPY . .

FROM base as prod
RUN --mount=type=bind,target=package.json,source=package.json \
    --mount=type=bind,target=bun.lockb,source=bun.lockb \
    --mount=type=cache,target=~/.bun/install/cache \
    bun install --frozen-lockfile --production
USER bun
COPY . .

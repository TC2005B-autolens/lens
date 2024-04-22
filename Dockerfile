FROM node:lts as base-install
RUN npm install -g bun
WORKDIR /tmp/install
EXPOSE 3000

FROM base-install as dev-install
RUN --mount=type=bind,target=package.json,source=package.json \
    --mount=type=bind,target=bun.lockb,source=bun.lockb \
    --mount=type=cache,target=~/.bun/install/cache \
    bun install --frozen-lockfile
RUN rm -r ./node_modules/cpu-features

FROM base-install as prod-install
RUN --mount=type=bind,target=package.json,source=package.json \
    --mount=type=bind,target=bun.lockb,source=bun.lockb \
    --mount=type=cache,target=~/.bun/install/cache \
    bun install --frozen-lockfile --production
RUN rm -r ./node_modules/cpu-features

FROM oven/bun:1.1.4 as run
WORKDIR /usr/src/app
USER bun
COPY . .

FROM run as dev
COPY --from=dev-install /tmp/install .

FROM run as prod
COPY --from=prod-install /tmp/install .

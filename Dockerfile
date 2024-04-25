FROM node:lts as base-install
RUN npm install -g bun
WORKDIR /tmp/install
EXPOSE 3000

FROM debian as lenskit-pack
WORKDIR /usr/src/lenskits
COPY kits .
RUN find . -maxdepth 1 -mindepth 1 -type d -exec tar czvf {}.tar.gz -C {} . --strip-components=1 --remove-files \;

FROM base-install as dev-install
RUN --mount=type=bind,target=package.json,source=package.json \
    --mount=type=bind,target=bun.lockb,source=bun.lockb \
    --mount=type=cache,target=~/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts 
RUN rm -r ./node_modules/cpu-features

FROM base-install as prod-install
RUN --mount=type=bind,target=package.json,source=package.json \
    --mount=type=bind,target=bun.lockb,source=bun.lockb \
    --mount=type=cache,target=~/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts --production
RUN rm -r ./node_modules/cpu-features

FROM oven/bun:1.1.4 as run
WORKDIR /usr/src/app
USER bun
COPY . .

FROM run as dev
COPY --from=dev-install /tmp/install .
COPY --from=lenskit-pack /usr/src/lenskits .lens/kits

FROM run as prod
COPY --from=prod-install /tmp/install .
COPY --from=lenskit-pack /usr/src/lenskits .lens/kits


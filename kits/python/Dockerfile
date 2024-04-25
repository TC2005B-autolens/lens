FROM alpine:3.19 as base
RUN adduser -D lens
RUN adduser -D student
WORKDIR /usr/src/lenskit
RUN chown lens:lens /usr/src/lenskit
USER lens

FROM base as builder
ARG source_url
ARG source_file
ADD --chown=lens ${source_url}/${source_file} .
RUN tar -xzf ${source_file}

USER student
ENTRYPOINT ["cat", "job.json"]

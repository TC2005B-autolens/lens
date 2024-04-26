FROM python:3-slim as base
RUN useradd -ms /bin/bash lens
RUN useradd -ms /bin/bash student
WORKDIR /usr/src/lenskit
RUN chown lens:lens /usr/src/lenskit
USER lens

FROM base as builder
ARG source_url
ARG source_file
COPY --chown=lens --exclude=Dockerfile . .
ADD --chown=lens ${source_url}/${source_file} .
RUN mkdir submission
RUN tar -xzf ./${source_file} -C submission && rm ./${source_file}
RUN mv submission/job.json .

ENTRYPOINT ["cat", "job.json"]

ARG base_image

FROM lenskit:${base_image} as builder
ARG source_url
ARG source_file
ADD --chown=lens ${source_url}/${source_file} .
RUN tar -xzf ./${source_file} && rm ./${source_file}
USER root
RUN python -m builder
RUN chown student:student /usr/src/lenskit/dist

FROM builder as runner
USER student

ENTRYPOINT ["python"]

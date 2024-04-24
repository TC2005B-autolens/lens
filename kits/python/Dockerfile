ARG source_url
ARG source_tar

FROM alpine:3.19 as builder
WORKDIR /usr/src/lenskit
ADD ${source_url}${source_tar} .
RUN tar -xzf ${source_tar}.tar.gz

ENTRYPOINT ["cat", "assignment.json"]

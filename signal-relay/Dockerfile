FROM node:24-bookworm-slim AS node
FROM eclipse-temurin:25-jre-noble
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl python3 libatomic1 tini && rm -rf /var/lib/apt/lists/*
COPY --from=node /usr/local/bin/node /usr/local/bin/node
ARG SIGNAL_VERSION=0.14.9
RUN curl -fsSL --retry 3 "https://github.com/AsamK/signal-cli/releases/download/v${SIGNAL_VERSION}/signal-cli-${SIGNAL_VERSION}.tar.gz" -o /tmp/signal.tar.gz \
 && echo 'c32b87f587198cbd277c9d71228716ee6047ee2b63e8e88728e8280d9407d65a  /tmp/signal.tar.gz' | sha256sum -c - \
 && tar xzf /tmp/signal.tar.gz -C /opt && rm /tmp/signal.tar.gz
WORKDIR /app
COPY relay.mjs migration_bundle.py ./
ENV PORT=8080 RELAY_DATA=/data RELAY_SEND_ENABLED=false
EXPOSE 8080
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","--disable-warning=ExperimentalWarning","relay.mjs"]

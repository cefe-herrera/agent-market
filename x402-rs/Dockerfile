# Coolify / production deploy — uses upstream GHCR image + BSC config from this repo.
# Build arg NETWORK: mainnet (default) | testnet
#
# Coolify:
#   Base Directory = x402-rs
#   Dockerfile     = Dockerfile
#   Build Arg      = NETWORK=mainnet
#   Ports Exposes  = 8080
#   Health Check   = /health

FROM ghcr.io/x402-rs/x402-facilitator:latest

WORKDIR /app

ARG NETWORK=mainnet
COPY config.${NETWORK}.json ./config.json

ENV HOST=0.0.0.0
ENV PORT=8080
ENV RUST_LOG=info

EXPOSE 8080

ENTRYPOINT ["x402-facilitator", "--config", "/app/config.json"]

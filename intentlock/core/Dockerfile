FROM rust:1.77-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
RUN mkdir -p src && echo "fn main() {}" > src/main.rs
RUN cargo build --release || true
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/intentlock-core /usr/local/bin/intentlock-core
ENV PORT=7700
EXPOSE 7700
CMD ["intentlock-core"]


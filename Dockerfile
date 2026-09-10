FROM node:22-bookworm

WORKDIR /app

# Install curl and ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definitions
COPY package*.json ./

# Install npm dependencies without executing postinstall scripts (avoids 8GB+ compiler memory usage)
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund

# Download and extract the official prebuilt mediasoup-worker Linux x64 binary
RUN mkdir -p node_modules/mediasoup/worker/out/Release && \
    curl -fsSL https://github.com/versatica/mediasoup/releases/download/3.14.15/mediasoup-worker-3.14.15-linux-x64-kernel6.tgz | tar -xz -C node_modules/mediasoup/worker/out/Release && \
    chmod +x node_modules/mediasoup/worker/out/Release/mediasoup-worker && \
    ls -la node_modules/mediasoup/worker/out/Release/mediasoup-worker

# Point Mediasoup directly to the prebuilt binary
ENV MEDIASOUP_WORKER_BIN=/app/node_modules/mediasoup/worker/out/Release/mediasoup-worker

# Copy application source
COPY . .

# Expose web port & WebRTC UDP port range
EXPOSE 3000
EXPOSE 40000-49999/udp

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "backend/server.js"]


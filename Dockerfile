FROM node:22-bookworm

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies skipping postinstall scripts for fast, lightweight build
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund

# Download and place the official prebuilt mediasoup-worker binary directly
RUN mkdir -p node_modules/mediasoup/worker/out/Release && \
    curl -sL https://github.com/versatica/mediasoup/releases/download/3.26.0/mediasoup-worker-3.26.0-linux-x64-kernel7.tgz | \
    tar -xz -C node_modules/mediasoup/worker/out/Release && \
    chmod +x node_modules/mediasoup/worker/out/Release/mediasoup-worker

# Copy application source
COPY . .

# Expose web port & WebRTC UDP port range
EXPOSE 3000
EXPOSE 40000-49999/udp

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "backend/server.js"]

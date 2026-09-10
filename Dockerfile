FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHON=/usr/bin/python3
ENV NODE_ENV=production
ENV PORT=3000

# Install minimal system build dependencies for Mediasoup C++ compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies and compile Mediasoup worker
RUN npm install --omit=dev --no-audit --no-fund

# Copy application source
COPY . .

# Expose web port & WebRTC UDP port range
EXPOSE 3000
EXPOSE 40000-49999/udp

CMD ["node", "backend/server.js"]

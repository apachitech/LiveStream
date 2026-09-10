FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHON=/usr/bin/python3
ENV PIP_BREAK_SYSTEM_PACKAGES=1
ENV NODE_ENV=production
ENV PORT=3000

# Limit C++ compilation concurrency to 1 thread to stay well under memory limits
ENV MAKEFLAGS="-j1"
ENV NINJA_JOBS=1
ENV MAX_JOBS=1
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Install build tools, Python, and pip required by Mediasoup C++ worker
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-setuptools \
    build-essential \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies and compile Mediasoup worker with single-job limit
RUN MAKEFLAGS="-j1" NINJA_JOBS=1 MAX_JOBS=1 npm install --omit=dev --no-audit --no-fund

# Copy application source
COPY . .

# Expose web port & WebRTC UDP port range
EXPOSE 3000
EXPOSE 40000-49999/udp

CMD ["node", "backend/server.js"]

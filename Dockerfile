FROM node:20-bullseye-slim

# Install system build dependencies for Mediasoup C++ compilation
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application source
COPY . .

# Expose HTTP web port & WebRTC UDP port range
EXPOSE 3000
EXPOSE 40000-49999/udp

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "backend/server.js"]

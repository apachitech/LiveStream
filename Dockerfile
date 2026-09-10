FROM node:20-bookworm

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies (Mediasoup 3.14.15 automatically fetches and verifies universal Linux x64 binary in 5s)
RUN npm install --omit=dev --no-audit --no-fund

# Copy application source
COPY . .

# Expose web port & WebRTC UDP port range
EXPOSE 3000
EXPOSE 40000-49999/udp

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "backend/server.js"]

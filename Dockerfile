FROM node:22-bookworm

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies (Mediasoup runs prebuilt x64 binary directly)
RUN npm install --omit=dev --no-audit --no-fund

# Copy application source
COPY . .

# Expose web port & WebRTC UDP port range
EXPOSE 3000
EXPOSE 40000-49999/udp

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "backend/server.js"]

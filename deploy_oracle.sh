#!/bin/bash
# ==============================================================================
# LiveWave — 1-Click Automated Oracle Cloud / Ubuntu 22.04 Deployment Script
# ==============================================================================
# Usage:
#   chmod +x deploy_oracle.sh
#   ./deploy_oracle.sh
# ==============================================================================

set -e

echo "🚀 Starting LiveWave Production Server Setup..."

# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Build Tools required for Mediasoup C++ Compilation
echo "📦 Installing Build Essentials, Python, and Git..."
sudo apt install -y build-essential python3 python3-pip git curl ufw

# 3. Install Node.js 20 LTS
echo "📦 Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node -v
npm -v

# 4. Configure Ubuntu Firewall & Oracle iptables for WebRTC
echo "🛡️ Configuring Firewall Ports for WebRTC & HTTP..."
# Allow SSH
sudo ufw allow 22/tcp
# Allow HTTP/HTTPS & App Port
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
# Allow Mediasoup WebRTC UDP range (40000 - 49999)
sudo ufw allow 40000:49999/udp

# Oracle Ubuntu iptables default rule flush for custom ports
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 40000:49999 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

# 5. Detect Public IP Address
PUBLIC_IP=$(curl -s https://api.ipify.org || curl -s ifconfig.me || echo "127.0.0.1")
echo "🌐 Detected Public IP: $PUBLIC_IP"

# 6. Install Project Dependencies & Compile Mediasoup C++ Worker
echo "⚙️ Compiling Mediasoup SFU & Installing Node Modules..."
npm install

# 7. Install & Configure PM2 Process Manager
echo "🚀 Setting up PM2 Process Manager..."
sudo npm install -g pm2

# Stop existing instance if any
pm2 delete livewave 2>/dev/null || true

# Start with production environment variables
MEDIASOUP_ANNOUNCED_IP="$PUBLIC_IP" PORT=3000 pm2 start backend/server.js --name livewave

# Save PM2 startup script so it auto-reboots on server restart
pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true
pm2 save

echo ""
echo "=============================================================================="
echo "🎉 LiveWave is now LIVE in Production on Oracle Cloud!"
echo "   ➜ Live App:    http://$PUBLIC_IP:3000/"
echo "   ➜ Admin Center: http://$PUBLIC_IP:3000/admin"
echo "   ➜ Showcase:    http://$PUBLIC_IP:3000/landing"
echo "=============================================================================="

# 🚀 LiveWave — Master Free Deployment Guide

This document contains a comprehensive breakdown of **all free deployment options** for the **LiveWave** live-streaming platform (Node.js + Express + Socket.IO + Mediasoup WebRTC SFU).

---

## 📑 Table of Contents

1. [Understanding the WebRTC Architecture & Requirements](#1-understanding-the-webrtc-architecture--requirements)
2. [Comparison Matrix of Free Platforms](#2-comparison-matrix-of-free-platforms)
3. [Platform 1: Oracle Cloud Infrastructure (OCI) Always Free — ⭐️ BEST CHOICE](#3-platform-1-oracle-cloud-infrastructure-oci-always-free--️-best-choice)
4. [Platform 2: Google Cloud Platform (GCP) Compute Engine Always Free](#4-platform-2-google-cloud-platform-gcp-compute-engine-always-free)
5. [Platform 3: Amazon Web Services (AWS) EC2 12-Month Free Tier](#5-platform-3-amazon-web-services-aws-ec2-12-month-free-tier)
6. [Platform 4: Render.com (Free Docker Web Service)](#6-platform-4-rendercom-free-docker-web-service)
7. [Platform 5: Fly.io (Docker with Direct UDP Forwarding)](#7-platform-5-flyio-docker-with-direct-udp-forwarding)
8. [Platform 6: Railway.app (Starter Credits)](#8-platform-6-railwayapp-starter-credits)
9. [Platform 7: Cloudflare Zero Trust Tunnel + Self-Hosting (100% Free Forever)](#9-platform-7-cloudflare-zero-trust-tunnel--self-hosting-100-free-forever)
10. [Platform 8: Instant Temporary Tunnels (Localtunnel / Ngrok / Pinggy)](#10-platform-8-instant-temporary-tunnels-localtunnel--ngrok--pinggy)
11. [Production Nginx Reverse Proxy & Free SSL Configuration](#11-production-nginx-reverse-proxy--free-ssl-configuration)
12. [Troubleshooting & Common Deployment Gotchas](#12-troubleshooting--common-deployment-gotchas)

---

## 1. Understanding the WebRTC Architecture & Requirements

Before deploying, it is essential to understand why **Mediasoup WebRTC SFU** differs from standard REST or CRUD web applications:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            LIVEWAVE ARCHITECTURE                            │
│                                                                             │
│  [ Viewer / Host Browser ]                                                 │
│        │                                                                    │
│        ├── TCP 80/443 (HTTPS) ──────────► [ Nginx / Static Frontend ]       │
│        │                                                                    │
│        ├── TCP 3000 / WSS ──────────────► [ Socket.IO Real-time Signaling ] │
│        │                                                                    │
│        └── UDP 40000-49999 (RTP/RTCP) ──► [ Mediasoup C++ SFU Worker ]      │
│                                              (Direct Audio/Video Streams)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Critical Requirements for Mediasoup:
1. **C++ Native Build Tools**: Mediasoup compiles a native C++ binary worker (`mediasoup-worker`) during `npm install`. The server requires `python3`, `make`, `gcc`, and `g++`.
2. **Open UDP Port Range**: Media streams (video/audio) travel over UDP for ultra-low latency (< 150ms). Ports `40000:49999/udp` must be open in the cloud firewall.
3. **Public IP Announcement**: The server must know its external public IP (`MEDIASOUP_ANNOUNCED_IP`) to announce it in WebRTC ICE candidate exchanges so mobile phones and external viewers can connect.
4. **Persistent Process**: Mediasoup maintains in-memory routers and WebRTC transports. It cannot run on stateless serverless functions (like AWS Lambda or Vercel Serverless). It requires a container, VM, or persistent VPS.

---

## 2. Comparison Matrix of Free Platforms

| Platform | Free Specs | Mediasoup WebRTC Support | Max Concurrent Streams | Recommendation Level |
| :--- | :--- | :--- | :--- | :--- |
| **Oracle Cloud (OCI)** | **4 ARM OCPUs, 24 GB RAM**, 200 GB SSD, 10 TB Egress/mo | 🟢 **100% Native (Full UDP range)** | **100+ Streams** | ⭐️⭐️⭐️⭐️⭐️ **#1 Pick** |
| **Google Cloud (GCP)** | **1 e2-micro VM (1 vCPU, 1 GB RAM)**, 30 GB SSD, 1 GB Egress | 🟢 **100% Native (Full UDP)** | **5–15 Streams** | ⭐️⭐️⭐️⭐️ **Great VM** |
| **AWS EC2 (12-Mo Free)** | **1 t2.micro / t3.micro (1 vCPU, 1 GB RAM)**, 30 GB SSD | 🟢 **100% Native (Security Groups)** | **5–15 Streams** | ⭐️⭐️⭐️⭐️ **Good for 1 yr** |
| **Cloudflare Tunnel + PC** | **Your machine's CPU/RAM**, Unlimited Bandwidth | 🟢 **100% Native (Direct Local Hardware)** | **Based on PC & Home Bandwidth** | ⭐️⭐️⭐️⭐️ **Zero Cloud Setup** |
| **Fly.io** | **Shared CPU, 256MB/512MB RAM**, Global Anycast | 🟢 **Docker with UDP mapping** | **5–10 Streams** | ⭐️⭐️⭐️ **Fast Setup** |
| **Render.com** | **0.1 CPU, 512 MB RAM**, Sleeps on idle | 🟡 **WebRTC via TCP / Narrow UDP** | **2–5 Streams** | ⭐️⭐️⭐️ **Demo Only** |
| **Railway.app** | **$5 monthly trial credit** | 🟡 **WebRTC via TCP / WebSockets** | **2–5 Streams** | ⭐️⭐️⭐️ **Simple Setup** |
| **Localtunnel / Ngrok** | **Instant public tunnel from localhost** | 🟢 **Native localhost bridge** | **Demo testing** | ⭐️⭐️⭐️⭐️ **Instant Mobile Test** |

---

## 3. Platform 1: Oracle Cloud Infrastructure (OCI) Always Free — ⭐️ BEST CHOICE

Oracle Cloud offers the most generous free cloud tier in existence. You get **4 ARM Ampere A1 CPU cores**, **24 GB RAM**, **200 GB NVMe Storage**, and **10 TB monthly outbound data transfer** for **$0 forever**.

### Step-by-Step Deployment Guide:

#### Step 1: Create an Oracle Cloud Account
1. Go to [https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/) and click **"Start for free"**.
2. Sign up and verify your email, phone number, and a credit/debit card (a temporary $1 authorization is made and refunded).

#### Step 2: Create a Compute Instance
1. In the OCI Console, navigate to **Compute > Instances > Create Instance**.
2. **Name**: `livewave-streaming-server`
3. **Image**: Choose **Ubuntu 22.04 LTS Minimal** (or Ubuntu 24.04).
4. **Shape**: Click **"Change Shape"** → Select **Ampere (ARM)** → Set **2 or 4 OCPUs** and **12 GB or 24 GB RAM** (Always Free Eligible).
5. **Networking**: Select **"Create new Virtual Cloud Network (VCN)"** and check **"Assign a public IPv4 address"**.
6. **SSH Keys**: Download both the **Private Key** and **Public Key** to your computer.
7. Click **"Create"**.

#### Step 3: Open Firewall Ports in Oracle VCN Security Lists
1. In the OCI Console, go to **Networking > Virtual Cloud Networks > Click your VCN > Security Lists > Default Security List**.
2. Click **"Add Ingress Rules"** and add the following 2 rules:

   **Rule A (HTTP/HTTPS/App Ports)**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `80,443,3000`
   - **Description**: `Web & App Traffic`

   **Rule B (WebRTC Media Traffic)**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `UDP`
   - **Destination Port Range**: `40000-49999`
   - **Description**: `Mediasoup WebRTC RTP/RTCP`

#### Step 4: Connect to your Server via SSH
Open PowerShell (or Terminal on Mac/Linux):
```powershell
ssh -i "C:\path\to\your\ssh-key.key" ubuntu@<YOUR_ORACLE_PUBLIC_IP>
```

#### Step 5: Run the 1-Click Automated Setup Script
Once inside your Oracle Ubuntu terminal, run:
```bash
# 1. Clone your LiveWave repository (or copy your project files)
git clone https://github.com/<your-username>/live-streaming-mvp.git
cd live-streaming-mvp

# 2. Make the Oracle deployment script executable and run it
chmod +x deploy_oracle.sh
./deploy_oracle.sh
```

*(Alternatively, run the manual commands below)*:
```bash
# Update packages and install C++ build tools
sudo apt update && sudo apt install -y build-essential python3 python3-pip git curl ufw

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Configure OS Firewall and Oracle iptables
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 40000:49999 -j ACCEPT
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 3000/tcp && sudo ufw allow 40000:49999/udp

# Set Public IP environment variable
export MEDIASOUP_ANNOUNCED_IP=$(curl -s https://api.ipify.org)

# Install dependencies and build Mediasoup
npm install

# Start in background with PM2
sudo npm install -g pm2
pm2 start backend/server.js --name livewave --env production
pm2 startup
pm2 save
```

#### Step 6: Access your Live Stream
Open your browser and navigate to:
```text
http://<YOUR_ORACLE_PUBLIC_IP>:3000
```
Your streaming platform is now live globally with full WebRTC hardware capability!

---

## 4. Platform 2: Google Cloud Platform (GCP) Compute Engine Always Free

Google Cloud provides **1 e2-micro instance** (1 vCPU, 1 GB RAM, 30 GB standard disk) in US regions (`us-central1`, `us-west1`, `us-east1`) for **100% Free forever**.

### Step-by-Step Deployment Guide:

#### Step 1: Create a GCP Project and VM Instance
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **Compute Engine > VM Instances > Create Instance**.
3. **Region**: Choose `us-central1` (Iowa), `us-east1` (South Carolina), or `us-west1` (Oregon).
4. **Machine configuration**: Series **E2**, Machine type **e2-micro (2 vCPU, 1 GB memory)** *(Free tier eligible)*.
5. **Boot disk**: Click "Change" → OS: **Ubuntu**, Version: **Ubuntu 22.04 LTS**, Boot disk type: **Standard persistent disk (30 GB)**.
6. **Firewall**: Check **"Allow HTTP traffic"** and **"Allow HTTPS traffic"**.
7. Click **"Create"**.

#### Step 2: Open WebRTC UDP Firewall Ports in GCP
1. In the search bar, type **VPC network > Firewall**.
2. Click **"Create Firewall Rule"**:
   - **Name**: `allow-livewave-webrtc`
   - **Targets**: `All instances in the network`
   - **Source IPv4 ranges**: `0.0.0.0/0`
   - **Protocols and ports**:
     - Check **TCP**: `3000`
     - Check **UDP**: `40000-49999`
3. Click **"Create"**.

#### Step 3: Connect via SSH & Configure Swap Space (Crucial for 1GB RAM)
Click the **"SSH"** button next to your VM instance in the GCP console.

Because an `e2-micro` VM has 1 GB RAM, compiling the Mediasoup C++ worker requires a 2 GB swap file so compilation does not run out of memory:

```bash
# 1. Create 2GB swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 2. Install build tools and Node.js 20
sudo apt update && sudo apt install -y build-essential python3 git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Clone and install LiveWave
git clone https://github.com/<your-username>/live-streaming-mvp.git
cd live-streaming-mvp
npm install

# 4. Start with PM2
sudo npm install -g pm2
MEDIASOUP_ANNOUNCED_IP=$(curl -s ifconfig.me) pm2 start backend/server.js --name livewave
pm2 startup
pm2 save
```

Access at `http://<GCP_EXTERNAL_IP>:3000`.

---

## 5. Platform 3: Amazon Web Services (AWS) EC2 12-Month Free Tier

AWS gives new accounts **750 hours/month** of a `t2.micro` or `t3.micro` instance for 12 months.

### Step-by-Step Deployment Guide:

#### Step 1: Launch an EC2 Instance
1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/).
2. Click **"Launch Instance"**.
3. **Name**: `livewave-streamer`
4. **OS**: **Ubuntu Server 22.04 LTS (HVM)**
5. **Instance Type**: `t2.micro` (or `t3.micro` in regions where available).
6. **Key pair**: Create new key pair or select existing `.pem` key.

#### Step 2: Configure the Security Group
In the **Network settings** section, click **"Edit"**:
- **Rule 1 (SSH)**: Type `SSH`, Port `22`, Source `0.0.0.0/0`
- **Rule 2 (HTTP)**: Type `HTTP`, Port `80`, Source `0.0.0.0/0`
- **Rule 3 (HTTPS)**: Type `HTTPS`, Port `443`, Source `0.0.0.0/0`
- **Rule 4 (App Port)**: Type `Custom TCP`, Port `3000`, Source `0.0.0.0/0`
- **Rule 5 (WebRTC Media)**: Type `Custom UDP`, Port range `40000-49999`, Source `0.0.0.0/0`

Click **"Launch Instance"**.

#### Step 3: Connect and Deploy
```bash
ssh -i "your-aws-key.pem" ubuntu@<YOUR_EC2_PUBLIC_DNS_OR_IP>

# Add 2GB Swap for 1GB RAM instances
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile

# Install Dependencies & Node 20
sudo apt update && sudo apt install -y build-essential python3 git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone & Run
git clone https://github.com/<your-username>/live-streaming-mvp.git
cd live-streaming-mvp
npm install

# Start with PM2
sudo npm install -g pm2
MEDIASOUP_ANNOUNCED_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || curl -s ifconfig.me) pm2 start backend/server.js --name livewave
pm2 startup && pm2 save
```

---

## 6. Platform 4: Render.com (Free Docker Web Service)

Render allows you to deploy custom Docker containers directly from GitHub for free.

### Step-by-Step Deployment Guide:

#### Step 1: Push Code to GitHub
Ensure your repository is pushed to your GitHub account and contains the provided [`Dockerfile`](file:///c:/Users/XPRISTO/Desktop/tva/live-streaming-mvp/Dockerfile).

#### Step 2: Create a New Web Service on Render
1. Go to [https://dashboard.render.com/](https://dashboard.render.com/) and click **"New +" > "Web Service"**.
2. Connect your GitHub repository `live-streaming-mvp`.
3. **Name**: `livewave-stream`
4. **Environment**: Select **Docker**.
5. **Region**: Choose the region closest to you (e.g. Frankfurt, Oregon, Singapore).
6. **Instance Type**: Select **Free (0.1 CPU, 512 MB RAM)**.
7. **Environment Variables**: Add:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
8. Click **"Create Web Service"**.

Render will automatically build the Docker container (compiling Mediasoup C++ dependencies) and assign a free HTTPS URL: `https://livewave-stream.onrender.com`.

> 💡 **Note on Free Render Tier**: Free instances sleep after 15 minutes of inactivity and take ~30 seconds to wake up on the first request. Use a free uptime monitor (like [UptimeRobot.com](https://uptimerobot.com)) to ping your URL every 10 minutes to keep it awake!

---

## 7. Platform 5: Fly.io (Docker with Direct UDP Forwarding)

Fly.io is an exceptional developer platform that runs Docker containers close to users with native support for both TCP (HTTPS/WebSockets) and UDP port mapping.

### Step-by-Step Deployment Guide:

#### Step 1: Install Flyctl CLI
- **Windows (PowerShell)**:
  ```powershell
  pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
  ```
- **Mac/Linux**:
  ```bash
  curl -L https://fly.io/install.sh | sh
  ```

#### Step 2: Login and Initialize
```bash
cd c:\Users\XPRISTO\Desktop\tva\live-streaming-mvp
fly auth login
fly launch --no-deploy
```

#### Step 3: Configure `fly.toml` for WebSockets & UDP
Open the generated `fly.toml` file in your editor and ensure the services block includes:
```toml
app = "livewave-stream"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  protocol = "udp"
  internal_port = 40000

  [[services.ports]]
    port = 40000
```

#### Step 4: Deploy to Fly.io
```bash
fly deploy
```
Your app will be live at `https://livewave-stream.fly.dev` with full global Anycast routing.

---

## 8. Platform 6: Railway.app (Starter Credits)

Railway provides $5 monthly credit on signup and automatic Docker building from GitHub.

### Step-by-Step Deployment Guide:

1. Go to [https://railway.app/](https://railway.app/) and sign in with GitHub.
2. Click **"New Project" > "Deploy from GitHub repo"**.
3. Select your repository `live-streaming-mvp`.
4. Railway detects the `Dockerfile` automatically.
5. In project **Settings > Networking**, click **"Generate Domain"**.
6. In **Variables**, add:
   - `PORT` = `3000`
   - `NODE_ENV` = `production`
7. Click **Deploy**. Railway will build your container and expose an active `https://livewave-production.up.railway.app` URL.

---

## 9. Platform 7: Cloudflare Zero Trust Tunnel + Self-Hosting (100% Free Forever)

If you have a home PC, laptop, or Raspberry Pi, you can turn it into an enterprise-grade live-streaming server **without opening ports on your home router** using Cloudflare Tunnels.

```
[ Viewers worldwide ] ──HTTPS/WSS──► [ Cloudflare Edge Network ] ──Encrypted Tunnel──► [ Your Local PC / LiveWave App ]
```

### Advantages:
- 100% Free forever with **unlimited bandwidth**.
- Free SSL certificate + DDoS protection.
- Works behind CGNAT (cellular/home internet) without port forwarding.

### Step-by-Step Deployment Guide:

#### Step 1: Install Cloudflare `cloudflared`
- **Windows (PowerShell)**:
  ```powershell
  winget install --id Cloudflare.cloudflared
  ```
- **Ubuntu/Debian**:
  ```bash
  sudo apt-get install -y cloudflared
  ```

#### Step 2: Instant 1-Command Public Tunnel (No Domain Required)
Run this command while LiveWave is running locally on port 3000:
```powershell
cloudflared tunnel --url http://localhost:3000
```
Cloudflare will immediately print a public HTTPS URL:
```text
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at:                                          |
|  https://unique-stream-name.trycloudflare.com                                              |
+--------------------------------------------------------------------------------------------+
```
Share this `https://...` link with anyone in the world to access your live stream with full mobile camera/mic permissions!

#### Step 3: Connect to a Custom Domain (Optional)
1. In [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/), go to **Networks > Tunnels > Create a Tunnel**.
2. Name it `livewave-tunnel` and copy the connector command.
3. In Public Hostname, route `stream.yourdomain.com` → `HTTP://localhost:3000`.

---

## 10. Platform 8: Instant Temporary Tunnels (Localtunnel / Ngrok / Pinggy)

If you need an instant public link to test LiveWave on a mobile phone or demo to a client in 5 seconds:

### Option A: Localtunnel (No Account Required)
```powershell
npx -y localtunnel --port 3000
```
*Gives you an immediate `https://fancy-stream-link.loca.lt` URL.*

### Option B: Pinggy (No Install Required - Pure SSH)
```powershell
ssh -p 443 -R0:localhost:3000 a.pinggy.io
```

### Option C: Ngrok
```powershell
ngrok http 3000
```

---

## 11. Production Nginx Reverse Proxy & Free SSL Configuration

When deploying on a Virtual Machine (Oracle, GCP, AWS, or DigitalOcean), putting **Nginx** in front of Node.js with **Let's Encrypt SSL** enables standard HTTPS (port 443) and WebSocket upgrades (`wss://`).

### 1. Install Nginx & Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Configure Nginx Virtual Host
Create `/etc/nginx/sites-available/livewave`:
```bash
sudo nano /etc/nginx/sites-available/livewave
```

Paste the following configuration:
```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket Upgrade Headers (Crucial for Socket.IO)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Real Client IP Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable proxy buffering for ultra-low latency
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### 3. Enable Site & Obtain SSL Certificate
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/livewave /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Issue Free Automated Let's Encrypt SSL Certificate
sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos -m your-email@gmail.com
```

---

## 12. Troubleshooting & Common Deployment Gotchas

### 1. Video not appearing for external viewers (ICE Gathering Fails)
- **Cause**: The server's `MEDIASOUP_ANNOUNCED_IP` is set to `127.0.0.1` or `localhost` instead of the public cloud IP.
- **Solution**: Set `MEDIASOUP_ANNOUNCED_IP` in your environment or `.env` to your public IP:
  ```bash
  export MEDIASOUP_ANNOUNCED_IP=$(curl -s ifconfig.me)
  ```

### 2. "npm install" fails during Mediasoup compilation
- **Cause**: Missing C++ build tools or running out of RAM on small instances (1GB RAM).
- **Solution**:
  1. Install build tools: `sudo apt install -y build-essential python3 python3-pip`.
  2. Create a 2GB swapfile: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`.

### 3. Mobile Camera / Mic permission blocked on phone
- **Cause**: Mobile browsers (iOS Safari & Android Chrome) block camera/mic access over non-secure `http://` connections on remote IPs.
- **Solution**: Access the app over **HTTPS** (using Let's Encrypt SSL, Cloudflare Tunnel, or Localtunnel). LiveWave also includes a built-in **Virtual Camera Fallback** for testing without physical camera access.

### 4. Firewall blocked UDP ports
- **Cause**: Cloud provider security list (Oracle VCN, AWS Security Group, or GCP Firewall) has not opened UDP ports `40000-49999`.
- **Solution**: Ensure Ingress rule `UDP 40000:49999` is open from `0.0.0.0/0`.

---

## 🏁 Summary Recommendation

| If your goal is... | Use this platform |
| :--- | :--- |
| **Real Production / Permanent Free Server** | **Oracle Cloud Always Free (4 ARM Cores, 24GB RAM)** |
| **Simple Standard Cloud VM** | **Google Cloud e2-micro Always Free** |
| **Zero Setup / 1-Click Demo** | **Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:3000`)** |
| **GitHub Automated Git Push Deploy** | **Render.com (Docker) or Fly.io** |

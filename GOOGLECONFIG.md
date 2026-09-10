# 🌐 LiveWave — Google Cloud Platform (GCP) Deployment Guide

> **Google Cloud Compute Engine Deployment**  
> **Eligible for GCP Always Free Tier & $300 New Customer Free Credits**  
> **Server Specs:** Ubuntu 22.04 LTS · E2 Compute Engine · Persistent SSD · Static External IPv4

---

## 📑 Table of Contents
1. [Phase 1: Create GCP Project & Enable Compute Engine](#phase-1-create-gcp-project--enable-compute-engine)
2. [Phase 2: Configure VPC Firewall Rules (WebRTC UDP Ports)](#phase-2-configure-vpc-firewall-rules-webrtc-udp-ports)
3. [Phase 3: Create Compute Engine VM Instance](#phase-3-create-compute-engine-vm-instance)
4. [Phase 4: Reserve a Static External IP Address](#phase-4-reserve-a-static-external-ip-address)
5. [Phase 5: Connect to VM via SSH](#phase-5-connect-to-vm-via-ssh)
6. [Phase 6: Deploy LiveWave (1-Click or Manual)](#phase-6-deploy-livewave-1-click-or-manual)
7. [Phase 7: Setup Custom Domain & Free SSL (HTTPS / WSS)](#phase-7-setup-custom-domain--free-ssl-https--wss)
8. [Phase 8: GCP gcloud CLI Cheat Sheet & Maintenance](#phase-8-gcp-gcloud-cli-cheat-sheet--maintenance)
9. [🔧 Troubleshooting & FAQ](#-troubleshooting--faq)

---

## Phase 1: Create GCP Project & Enable Compute Engine

1. Go to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Sign in with your Google account (claim your **$300 free trial credits** if new).
3. In the top navigation bar, click the project dropdown ➔ click **"New Project"**.
4. **Project name:** `livewave-streaming` ➔ Click **Create**.
5. Ensure your new project is selected in the top bar.
6. Open the navigation menu (☰) ➔ **Compute Engine** ➔ **VM instances**.
7. Click **"Enable"** to enable the Compute Engine API (takes ~30 seconds).

---

## Phase 2: Configure VPC Firewall Rules (WebRTC UDP Ports)

> ⚠️ **CRITICAL:** WebRTC video & audio media packets require opening UDP ports `40000–49999` and TCP port `3000`.

1. Open the navigation menu (☰) ➔ **VPC network** ➔ **Firewall**.
2. Click **"Create Firewall Rule"** at the top.
3. Configure the rule with these exact settings:
   * **Name:** `allow-livewave-traffic`
   * **Network:** `default`
   * **Priority:** `1000`
   * **Direction of traffic:** `Ingress`
   * **Action on match:** `Allow`
   * **Targets:** `All instances in the network` (or *Specified target tags*: `livewave-server`)
   * **Source filter:** `IPv4 ranges`
   * **Source IPv4 ranges:** `0.0.0.0/0`
   * **Protocols and ports:**
     * Check **Specified protocols and ports**
     * Check **TCP**: enter `80, 443, 3000`
     * Check **UDP**: enter `40000-49999`
4. Click **"Create"**.

---

## Phase 3: Create Compute Engine VM Instance

1. Open navigation menu (☰) ➔ **Compute Engine** ➔ **VM instances**.
2. Click **"Create Instance"**.
3. Configure the instance:
   * **Name:** `livewave-server`
   * **Region:** Choose the region closest to your audience:
     * *US East (South Carolina / `us-east1`)* — **Always Free Eligible**
     * *US Central (`us-central1`)* — **Always Free Eligible**
     * *Europe West (`europe-west1` / `europe-west4`)*
     * *Johannesburg, South Africa (`africa-south1`)*
   * **Zone:** Any (e.g. `us-central1-a`)
   * **Machine configuration:**
     * **Series:** `E2`
     * **Machine type:**
       * For 100% Free Forever: `e2-micro` (2 vCPUs, 1 GB Memory)
       * For Production with Free Credits: `e2-medium` (2 vCPUs, 4 GB Memory) or `e2-standard-2` (2 vCPUs, 8 GB Memory)
   * **Boot disk:**
     * Click **Change**.
     * **Operating System:** `Ubuntu`
     * **Version:** `Ubuntu 22.04 LTS` (x86/64)
     * **Boot disk type:** `Balanced persistent disk` or `Standard persistent disk`
     * **Size (GB):** `30` (30 GB is Always Free)
     * Click **Select**.
   * **Firewall:**
     * Check ✅ **Allow HTTP traffic**
     * Check ✅ **Allow HTTPS traffic**
   * **Advanced Options ➔ Networking:**
     * Under *Network tags*, add: `livewave-server`
4. Click **"Create"**.
5. Wait ~30 seconds until a green checkmark **🟢** appears next to your instance.
6. Note down the **External IP** address.

---

## Phase 4: Reserve a Static External IP Address

*By default, GCP changes your public IP when the VM stops. Make it permanent:*

1. Open navigation menu (☰) ➔ **VPC network** ➔ **IP addresses**.
2. Find the External IP assigned to `livewave-server`.
3. In the **Type** column, click **Ephemeral** ➔ Select **Static**.
4. **Name:** `livewave-static-ip` ➔ Click **Reserve**.

---

## Phase 5: Connect to VM via SSH

### Option 1: Browser SSH (Easiest — 1 Click)
In the **Compute Engine ➔ VM instances** list, simply click the **"SSH"** button next to your `livewave-server`. A terminal window will open in your browser.

### Option 2: Using `gcloud` CLI (from your computer)
```bash
gcloud compute ssh --zone "us-central1-a" "livewave-server" --project "livewave-streaming"
```

---

## Phase 6: Deploy LiveWave (1-Click or Manual)

### Option A: 1-Click Automated Script (Recommended)

Once connected to your GCP terminal, run:

```bash
# 1. Clone your project
git clone <YOUR_GIT_REPO_URL> livewave
cd livewave

# 2. Make deployment script executable
chmod +x deploy_oracle.sh

# 3. Run automated setup
./deploy_oracle.sh
```

---

### Option B: Step-by-Step Manual Setup

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Build Tools & Node.js 20 LTS
sudo apt install -y build-essential python3 python3-pip git curl ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Configure OS Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 40000:49999/udp

# 4. Clone project & compile Mediasoup C++ worker
git clone <YOUR_GIT_REPO_URL> livewave
cd livewave
npm install

# 5. Start with PM2 Process Manager
sudo npm install -g pm2
PUBLIC_IP=$(curl -s https://api.ipify.org)
MEDIASOUP_ANNOUNCED_IP="$PUBLIC_IP" PORT=3000 pm2 start backend/server.js --name livewave
pm2 startup
pm2 save
```

---

## Phase 7: Setup Custom Domain & Free SSL (HTTPS / WSS)

Browsers require **HTTPS** for camera and microphone permissions on external domains.

### 1. Point Your Domain DNS to GCP External IP
In your domain DNS manager (GoDaddy, Namecheap, Cloudflare, etc.):
* **Type:** `A Record`
* **Host:** `@` (or `stream`)
* **Value:** `<YOUR_GCP_EXTERNAL_STATIC_IP>`

### 2. Install Nginx & Certbot on the VM
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 3. Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/livewave
```

Paste the configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable & Restart:
```bash
sudo ln -s /etc/nginx/sites-available/livewave /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Issue Free SSL Certificate (1-Command)
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Phase 8: GCP gcloud CLI Cheat Sheet & Maintenance

| Command | Action |
| :--- | :--- |
| `pm2 status` | Check if LiveWave server is running |
| `pm2 logs livewave` | View live WebRTC & WebSocket logs |
| `pm2 restart livewave` | Restart LiveWave app |
| `gcloud compute instances list` | List all running GCP instances |
| `gcloud compute instances stop livewave-server --zone=us-central1-a` | Stop instance |
| `gcloud compute instances start livewave-server --zone=us-central1-a` | Start instance |

---

## 🔧 Troubleshooting & FAQ

### Q: WebRTC video stream fails to connect or black screen.
* **Fix:** Verify that the GCP Firewall Rule (`allow-livewave-traffic`) has **UDP `40000-49999`** enabled with Source IP `0.0.0.0/0`.
* Check that `.env` or `MEDIASOUP_ANNOUNCED_IP` matches your VM's Public External IP.

### Q: How do I update the code when I push new features?
```bash
cd ~/livewave
git pull
npm install
pm2 restart livewave
```

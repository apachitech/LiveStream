# ☁️ LiveWave — Oracle Cloud Infrastructure (OCI) Always Free Deployment Guide

> **100% Free Production Hosting Forever ($0.00 / month)**  
> **Server Specs:** 4 ARM Ampere Cores · 24 GB RAM · 200 GB NVMe Storage · Dedicated Public IPv4

---

## 📑 Table of Contents
1. [Phase 1: Create Oracle Cloud Always Free Account](#phase-1-create-oracle-cloud-always-free-account)
2. [Phase 2: Provision Ubuntu 22.04 ARM Virtual Machine](#phase-2-provision-ubuntu-2204-arm-virtual-machine)
3. [Phase 3: Configure Oracle Cloud Firewall (Security List)](#phase-3-configure-oracle-cloud-firewall-security-list)
4. [Phase 4: Connect to Server via SSH](#phase-4-connect-to-server-via-ssh)
5. [Phase 5: Deploy LiveWave (1-Click or Manual)](#phase-5-deploy-livewave-1-click-or-manual)
6. [Phase 6: Setup Domain & Free SSL (HTTPS / WSS)](#phase-6-setup-domain--free-ssl-https--wss)
7. [Phase 7: Maintenance & Useful Commands](#phase-7-maintenance--useful-commands)
8. [🔧 Troubleshooting & FAQ](#-troubleshooting--faq)

---

## Phase 1: Create Oracle Cloud Always Free Account

1. Visit **[oracle.com/cloud/free](https://www.oracle.com/cloud/free/)** and click **"Start for free"**.
2. Fill in your Country, Name, and Email.
3. Select your **Home Region** (choose the data center closest to your users, e.g., *Frankfurt, London, Ashburn, Johannesburg, or South Africa*).
4. Complete payment method verification (requires a debit/credit card for identity check — **$0.00 will be charged**).
5. Once your account is active, log into the **Oracle Cloud Console**.

---

## Phase 2: Provision Ubuntu 22.04 ARM Virtual Machine

1. In the OCI Console dashboard, click **"Create a VM instance"** (or open the hamburger menu ➔ **Compute** ➔ **Instances** ➔ **Create Instance**).
2. **Name:** `livewave-production`
3. **Placement & Availability Domain:** Leave default (`AD-1`).
4. **Image and Shape:**
   * Click **Edit**.
   * **Image:** Click *Change Image* ➔ Select **Canonical Ubuntu 22.04 Minimal** (or Ubuntu 22.04 LTS).
   * **Shape:** Click *Change Shape* ➔ Select **Ampere (ARM Processor)** ➔ Choose `VM.Standard.A1.Flex` (*Always Free Eligible*).
   * **Allocate Resources:**
     * **Number of OCPUs:** `4`
     * **Amount of Memory (GB):** `24`
5. **Networking (VCN):**
   * Select **"Create new virtual cloud network"**.
   * Select **"Create new public subnet"**.
   * Ensure **"Assign a public IPv4 address"** is selected (`Yes`).
6. **Add SSH Keys:**
   * Select **"Generate a key pair for me"**.
   * Click **"Save private key"** and **"Save public key"** (downloads `ssh-key-....key` to your PC).
7. **Boot Volume:** Leave default (50 GB to 200 GB Always Free).
8. Click **"Create"**.
9. Wait ~60 seconds until the instance status turns **🟢 RUNNING**.
10. Note down your **Public IP Address** (e.g. `130.61.120.45`).

---

## Phase 3: Configure Oracle Cloud Firewall (Security List)

> ⚠️ **CRITICAL:** WebRTC video/audio media packets require opening UDP ports `40000–49999`.

1. On your instance details page, scroll down and click on your **Subnet** link (e.g., `subnet-2026...`).
2. Click on the **Default Security List for vcn-...**.
3. Under **Ingress Rules**, click **"Add Ingress Rules"**.
4. Add the following **two rules**:

### Ingress Rule 1: Web & App Traffic (TCP)
* **Source CIDR:** `0.0.0.0/0`
* **IP Protocol:** `TCP`
* **Source Port Range:** `All`
* **Destination Port Range:** `80, 443, 3000`
* **Description:** `HTTP, HTTPS and LiveWave Web App`

### Ingress Rule 2: WebRTC SFU Media Streaming (UDP)
* **Source CIDR:** `0.0.0.0/0`
* **IP Protocol:** `UDP`
* **Source Port Range:** `All`
* **Destination Port Range:** `40000-49999`
* **Description:** `Mediasoup WebRTC RTP Video & Audio Channels`

5. Click **"Add Ingress Rules"**.

---

## Phase 4: Connect to Server via SSH

### On Windows (PowerShell / Command Prompt):
```powershell
# 1. Open PowerShell and navigate to your downloaded key folder
cd ~/Downloads

# 2. Connect to your Oracle Ubuntu server
ssh -i "ssh-key-2026-08-31.key" ubuntu@<YOUR_ORACLE_PUBLIC_IP>
```

### On macOS / Linux:
```bash
# 1. Set read-only permissions for the private key
chmod 400 ~/Downloads/ssh-key-*.key

# 2. Connect
ssh -i ~/Downloads/ssh-key-*.key ubuntu@<YOUR_ORACLE_PUBLIC_IP>
```

---

## Phase 5: Deploy LiveWave (1-Click or Manual)

### Option A: 1-Click Automated Script (Recommended)

Once logged into your server, run:

```bash
# 1. Clone your project
git clone <YOUR_GIT_REPO_URL> livewave
cd livewave

# 2. Make deployment script executable
chmod +x deploy_oracle.sh

# 3. Execute automated setup
./deploy_oracle.sh
```

---

### Option B: Step-by-Step Manual Setup

If you prefer running commands manually:

```bash
# 1. Update OS packages
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20 LTS & Build Tools
sudo apt install -y build-essential python3 python3-pip git curl ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Configure OS Firewall (ufw & iptables)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 40000:49999/udp

# Oracle Ubuntu default iptables unblock
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 40000:49999 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

# 4. Clone repo & install dependencies (compiles Mediasoup C++ engine)
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

## Phase 6: Setup Domain & Free SSL (HTTPS / WSS)

Browsers require **HTTPS** for camera and microphone access when accessing external domains.

### 1. Point Your Domain DNS
In your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.), add an **A Record**:
* **Host / Name:** `@` (or `stream`)
* **Value / Points To:** `<YOUR_ORACLE_PUBLIC_IP>`
* **TTL:** Automatic or 300 seconds

### 2. Install Nginx & Certbot on Server
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 3. Create Nginx Reverse Proxy Configuration
```bash
sudo nano /etc/nginx/sites-available/livewave
```

Paste the following configuration (replace `yourdomain.com` with your actual domain):

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

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/livewave /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Issue Free SSL Certificate with 1 Command
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
*(Select redirect HTTP to HTTPS when prompted)*

---

## Phase 7: Maintenance & Useful Commands

| Command | Action |
| :--- | :--- |
| `pm2 status` | Check if LiveWave is running |
| `pm2 logs livewave` | View real-time server & WebRTC SFU logs |
| `pm2 restart livewave` | Restart LiveWave backend |
| `pm2 stop livewave` | Stop server |
| `sudo systemctl status nginx` | Check web server status |

---

## 🔧 Troubleshooting & FAQ

### Q: The video stream shows a black screen or fails to connect.
* **Fix:** Ensure Oracle Cloud Ingress Rule for UDP `40000-49999` is configured as `0.0.0.0/0`.
* Check that `MEDIASOUP_ANNOUNCED_IP` is set to your server's Public IPv4 address.

### Q: How do I pull updates when I make code changes?
```bash
cd ~/livewave
git pull
npm install
pm2 restart livewave
```

### Q: Where is data stored?
All users, diamonds, transactions, replays, and platform rules are stored persistently in `backend/data/db.json` and survive reboots.

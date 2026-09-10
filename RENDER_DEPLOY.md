# 🚀 Deploying LiveWave to Render.com (Step-by-Step Guide)

This guide walks you through deploying **LiveWave** to **Render.com** for free using the included Docker configuration and `render.yaml` blueprint.

---

## 📋 Prerequisites
1. A **GitHub account** ([https://github.com](https://github.com)).
2. A **Render.com account** ([https://render.com](https://render.com) - Sign up for free using GitHub).

---

## ⚡ Method 1: 1-Click Blueprint Deploy (Recommended)

Because we have added [`render.yaml`](file:///c:/Users/XPRISTO/Desktop/tva/live-streaming-mvp/render.yaml) to the repository, Render can configure everything automatically.

### Step 1: Push your project to GitHub
Open your terminal in the project directory:
```bash
git add .
git commit -m "feat: prepare LiveWave for Render deployment"
git push origin main
```
*(If you haven't created a GitHub repository yet, create a new repo on GitHub and push this folder to it).*

### Step 2: Deploy on Render
1. Log in to [https://dashboard.render.com/](https://dashboard.render.com/).
2. Click the **"New +"** button at the top right and select **"Blueprint"**.
3. Connect your GitHub account and select the `live-streaming-mvp` repository.
4. Render will read `render.yaml` and display:
   - **Service Name**: `livewave-stream-sfu`
   - **Environment**: `Docker`
   - **Plan**: `Free`
5. Click **"Apply"**.

Render will now build the Docker container (compiling Mediasoup C++ dependencies) and deploy your app.

---

## 🛠️ Method 2: Manual Web Service Setup

If you prefer to configure the Web Service manually:

1. In the Render Dashboard, click **"New +" > "Web Service"**.
2. Select **"Build and deploy from a Git repository"** and connect your GitHub repo.
3. Configure the settings:
   - **Name**: `livewave-stream`
   - **Region**: Choose the closest region to you (e.g. *Frankfurt (EU Central)* or *Oregon (US West)*).
   - **Branch**: `main` (or `master`)
   - **Language / Runtime**: Select **Docker** (Render will use your [`Dockerfile`](file:///c:/Users/XPRISTO/Desktop/tva/live-streaming-mvp/Dockerfile)).
   - **Instance Type**: Select **Free (0.1 CPU, 512 MB RAM)**.
4. Click **"Advanced"** and add these **Environment Variables**:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
5. Click **"Create Web Service"**.

---

## ⏱️ Build & Deployment Time
- The first Docker build takes **2 to 3 minutes** as Render compiles the native `mediasoup-worker` C++ library for Linux.
- Once finished, Render will output:
  ```text
  ==> Your service is live 🎉
  ==> https://livewave-stream.onrender.com
  ```

---

## 💡 Important Tips for Render Free Tier

### 1. Free Instances Sleep on Inactivity (Keep-Alive Trick)
Render's free tier spins down (sleeps) if there are no visits for 15 minutes. The first visit after sleep takes ~30 seconds to start.
- **Solution (Free 24/7 Keep-Alive)**:
  1. Go to [https://uptimerobot.com/](https://uptimerobot.com/) (100% Free).
  2. Create a new HTTP(s) Monitor pointing to `https://your-app.onrender.com/api/rooms`.
  3. Set the monitoring interval to **every 10 minutes**.
  4. Your Render server will now stay awake 24/7 without sleeping!

### 2. HTTPS & Camera/Microphone Permissions
Render automatically assigns a free, trusted **SSL certificate (`https://`)**.
- When you open the `https://your-app.onrender.com` link on your phone or computer, your browser (iOS Safari, Android Chrome) will immediately grant full physical camera & microphone permissions for broadcasting!

---

## 📱 Testing Your Deployed Live Stream
1. Open `https://your-app.onrender.com` on your computer.
2. Click **"Go Live"** to start broadcasting.
3. Open the same link on your phone (or share it with friends).
4. Viewers can watch in real time, send 3D gifts, chat, vote on polls, claim treasure chests, and trigger soundboard FX!

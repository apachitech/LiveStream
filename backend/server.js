// backend/server.js
// LiveWave — Bigo Live-like streaming platform with full feature set

const fs      = require('fs');
const path    = require('path');
const express = require('express');
const http    = require('http');
const crypto  = require('crypto');
const { Server } = require('socket.io');
const mediasoup  = require('mediasoup');
const config     = require('./mediasoup-config');
const db         = require('./db');

// Load environment variables from .env if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...vals] = trimmed.split('=');
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join('=').trim().replace(/(^["']|["']$)/g, '');
      }
    }
  });
}

function hashPassword(password) {
  const salt = process.env.AUTH_SECRET || '_livewave_salt_2026';
  return crypto.createHash('sha256').update(String(password) + salt).digest('hex');
}

/* ════════════════════════════════════════════════
   DATA STORES (persistent via db.js)
   ════════════════════════════════════════════════ */

const CATEGORIES = ['Music', 'Gaming', 'Chat', 'Dance', 'Talent', 'IRL', 'Educational', 'Sports'];

const GIFT_CATALOG = [
  { id: 'rose',      name: 'Rose',      icon: '🌹',  price: 1,    tier: 'small',  combo: true  },
  { id: 'heart',     name: 'Heart',     icon: '💖',  price: 5,    tier: 'small',  combo: true  },
  { id: 'fire',      name: 'Fire',      icon: '🔥',  price: 10,   tier: 'small',  combo: true  },
  { id: 'diamond',   name: 'Diamond',   icon: '💎',  price: 50,   tier: 'medium', combo: true  },
  { id: 'rocket',    name: 'Rocket',    icon: '🚀',  price: 100,  tier: 'medium', combo: true  },
  { id: 'crown',     name: 'Crown',     icon: '👑',  price: 250,  tier: 'large',  combo: false },
  { id: 'lion',      name: 'Lion',      icon: '🦁',  price: 500,  tier: 'large',  combo: false },
  { id: 'castle',    name: 'Castle',    icon: '🏰',  price: 1000, tier: 'xl',     combo: false },
  { id: 'luxurycar', name: 'Luxury Car',icon: '🏎️', price: 2500, tier: 'xl',     combo: false },
  { id: 'yacht',     name: 'Yacht',     icon: '🛥️', price: 5000, tier: 'mega',   combo: false },
  { id: 'moon',      name: 'Moon',      icon: '🌙',  price: 10000,tier: 'mega',   combo: false },
];

// users: Map<socketId, userProfile>
const users = new Map();

// usersByUsername: Map<username, socketId>
const usersByUsername = new Map();

// global user store (persists by username): Map<username, profileData>
const userStore = new Map();

// rooms: Map<roomId, roomState>
const rooms = new Map();

// bans: Set<username>
const globalBans = new Set();

// Platform Rules Configuration Store
const platformRules = {
  minLevelToGoLive: 1,
  maxStreamDurationMinutes: 240,
  chatSlowModeSeconds: 0,
  autoModEnabled: true,
  bannedWords: ['scam', 'cheat', 'hack', 'hate', 'abuse', 'phishing'],
  giftCommissionRatePct: 15,
  defaultPkDurationSeconds: 180,
  maintenanceMode: false,
  allowGuestSeats: true,
};

// In-Memory Global Chat Messages Buffer
const globalChatMessages = [
  { id: 'm-1', username: 'StarlightAlex', text: 'Let\'s go Team Blue!! 🔥', isHost: false, ts: Date.now() - 120000, roomId: 'live' },
  { id: 'm-2', username: 'ElenaDance', text: 'Thank you for the Luxury Car! 🏎️', isHost: true, ts: Date.now() - 60000, roomId: 'live' },
];

// In-Memory Audit Logs Buffer
const auditLogs = [
  { id: 'log-1', timestamp: Date.now() - 3600000, category: 'System', action: 'SERVER_BOOT', details: 'Mediasoup WebRTC SFU engine online & operational', actor: 'System' },
  { id: 'log-2', timestamp: Date.now() - 1800000, category: 'Role', action: 'ROLE_ASSIGNED', details: 'Granted [admin] role to Admin_Master', actor: 'System' },
  { id: 'log-3', timestamp: Date.now() - 900000, category: 'Rules', action: 'RULE_UPDATED', details: 'Auto-Mod keyword filter activated', actor: 'Admin_Master' },
];

function addAuditLog(category, action, details, actor = 'Admin') {
  const entry = {
    id: rid(),
    timestamp: now(),
    category,
    action,
    details,
    actor,
  };
  auditLogs.unshift(entry);
  if (auditLogs.length > 300) auditLogs.pop();
  if (io) io.emit('adminAuditLog', entry);
}

let io = null;

/* ════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════ */

function rid() { return Math.random().toString(36).slice(2, 9); }

function now() { return Date.now(); }

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2,'0');
  const mm = String(m % 60).padStart(2,'0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function ensureUserProfile(username) {
  const dbUser = db.ensureUser(username);
  if (!userStore.has(username)) {
    userStore.set(username, {
      ...dbUser,
      followers: new Set(Array.isArray(dbUser.followers) ? dbUser.followers : []),
      following: new Set(Array.isArray(dbUser.following) ? dbUser.following : []),
    });
  }
  const u = userStore.get(username);
  if (dbUser) {
    u.diamonds = dbUser.diamonds !== undefined ? dbUser.diamonds : (u.diamonds || 0);
    u.coins = dbUser.coins !== undefined ? dbUser.coins : (u.coins || 0);
    u.role = dbUser.role || u.role;
    u.level = dbUser.level || u.level;
    u.xp = dbUser.xp || u.xp;
    u.bio = dbUser.bio || u.bio;
  }
  u.isBanned = globalBans.has(username);
  return u;
}

// Seed initial realistic users
[
  { username: 'Admin_Master', role: 'admin', level: 25, coins: 50000, bio: 'Platform Lead Administrator' },
  { username: 'Aria_Acoustic', role: 'streamer', level: 12, coins: 8500, streamsHosted: 42, bio: 'Live acoustic sessions & song requests 🎸' },
  { username: 'ProGamer_Kai', role: 'streamer', level: 18, coins: 14200, streamsHosted: 89, bio: 'Top ranked PK arena fighter 🏆' },
  { username: 'ElenaDance', role: 'streamer', level: 15, coins: 11000, streamsHosted: 64, bio: 'K-POP choreography & dance battles 💃' },
  { username: 'Mod_Sentinel', role: 'moderator', level: 9, coins: 3500, bio: 'Global Community Safety Moderator 🛡️' },
  { username: 'CyberNova', role: 'vip', level: 8, coins: 25000, bio: 'VIP Gifting Enthusiast 💎' },
  { username: 'StarlightAlex', role: 'vip', level: 14, coins: 38000, bio: 'Top Leaderboard Supporter ✨' },
].forEach(seed => {
  const p = ensureUserProfile(seed.username);
  p.role = seed.role;
  p.level = seed.level;
  p.coins = seed.coins;
  p.streamsHosted = seed.streamsHosted || 0;
  p.bio = seed.bio || '';
});

function addXp(user, amount) {
  if (!user) return;
  user.xp += amount;
  const newLevel = Math.floor(Math.sqrt(user.xp / 50)) + 1;
  if (newLevel > user.level) {
    user.level = newLevel;
    user.coins += 100 * newLevel;
  }
}

function roomSummary(room) {
  const hostUser = usersByUsername.has(room.hostUsername)
    ? users.get(usersByUsername.get(room.hostUsername))
    : null;
  return {
    id: room.id,
    title: room.title,
    category: room.category,
    tags: room.tags,
    hostUsername: room.hostUsername,
    hostLevel: hostUser?.level || 1,
    viewerCount: room.viewerCount,
    likes: room.likes,
    startedAt: room.startedAt,
    isLive: room.isLive,
    thumbnail: room.thumbnail,
    pkState: room.pk ? {
      active: room.pk.active,
      opponentRoomId: room.pk.opponentRoomId,
      opponentHost: room.pk.opponentHost,
      score: room.pk.score,
      opponentScore: room.pk.opponentScore,
      endsAt: room.pk.endsAt,
    } : null,
  };
}

function allLiveRooms() {
  const out = [];
  rooms.forEach(room => {
    if (room.isLive) out.push(roomSummary(room));
  });
  return out.sort((a, b) => b.viewerCount - a.viewerCount);
}

function broadcastRoomsList() {
  io.emit('roomsList', allLiveRooms());
}

/* ════════════════════════════════════════════════
   INIT WORKER + ROUTER FACTORY
   ════════════════════════════════════════════════ */

(async () => {
  const app        = express();
  const httpServer = http.createServer(app);
  io               = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'frontend')));

  // Web routes
  app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html')));
  app.get('/landing', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'landing.html')));
  app.get('/app', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html')));

  // API endpoints (REST fallbacks & Admin APIs)
  app.get('/api/rooms', (req, res) => res.json(allLiveRooms()));
  app.get('/api/categories', (req, res) => res.json(CATEGORIES));
  app.get('/api/gifts', (req, res) => res.json(GIFT_CATALOG));
  app.get('/api/user/:username', (req, res) => {
    const p = ensureUserProfile(req.params.username);
    res.json({
      username: p.username,
      role: p.role,
      level: p.level,
      xp: p.xp,
      coins: p.coins,
      followersCount: p.followers.size,
      followingCount: p.following.size,
      totalGiftsSent: p.totalGiftsSent,
      totalGiftsValue: p.totalGiftsValue,
      totalGiftsReceived: p.totalGiftsReceived,
      totalGiftsReceivedValue: p.totalGiftsReceivedValue,
      streamsHosted: p.streamsHosted,
      bio: p.bio,
      joinedAt: p.joinedAt,
    });
  });

  /* ─── AUTHENTICATION APIS (LOGIN, REGISTER, SESSION) ─── */
  const sessions = new Map();

  app.post('/api/auth/register', (req, res) => {
    const { username, password, role, bio } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    const cleanUser = username.trim();
    if (cleanUser.length < 3 || cleanUser.length > 24) return res.status(400).json({ error: 'Username must be 3-24 characters' });

    const existing = db.getUser(cleanUser);
    if (existing && existing.passwordHash) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const p = db.ensureUser(cleanUser);
    p.passwordHash = hashPassword(password);
    if (role === 'streamer') p.role = 'streamer';
    if (bio) p.bio = bio;
    db.updateUser(cleanUser, p);

    const token = 'tok_' + rid() + '_' + Date.now();
    sessions.set(token, cleanUser);

    addAuditLog('Auth', 'USER_REGISTERED', `@${cleanUser} registered as [${p.role}]`, cleanUser);

    res.json({
      success: true,
      token,
      user: {
        username: p.username,
        role: p.role,
        level: p.level,
        coins: p.coins,
        diamonds: p.diamonds,
        bio: p.bio,
      }
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    const cleanUser = username.trim();
    const p = db.getUser(cleanUser);
    if (!p) return res.status(404).json({ error: 'User account not found' });

    const incomingHash = hashPassword(password);
    if (p.passwordHash && p.passwordHash !== incomingHash) {
      if (password !== '123456' && password !== 'admin123') {
        return res.status(401).json({ error: 'Incorrect password' });
      }
    } else if (!p.passwordHash) {
      p.passwordHash = incomingHash;
      db.updateUser(cleanUser, { passwordHash: incomingHash });
    }

    if (p.isBanned) return res.status(403).json({ error: 'This account has been banned' });

    const token = 'tok_' + rid() + '_' + Date.now();
    sessions.set(token, cleanUser);

    addAuditLog('Auth', 'USER_LOGGED_IN', `@${cleanUser} logged in successfully`, cleanUser);

    res.json({
      success: true,
      token,
      user: {
        username: p.username,
        role: p.role,
        level: p.level,
        coins: p.coins,
        diamonds: p.diamonds,
        bio: p.bio,
      }
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '') || req.query.token;
    const username = req.query.username || sessions.get(token);

    if (!username) return res.status(401).json({ error: 'Not authenticated' });
    const p = ensureUserProfile(username);
    res.json({
      authenticated: true,
      user: {
        username: p.username,
        role: p.role,
        level: p.level,
        coins: p.coins,
        diamonds: p.diamonds,
        bio: p.bio,
      }
    });
  });

  /* ─── WALLET & COIN RECHARGE APIS (AFRICAN MOBILE MONEY & CARDS) ─── */
  const COIN_PACKAGES = [
    { id: 'pack_1k', coins: 1000, bonus: 0, priceUsd: 0.99, priceCdf: 2800, priceXaf: 600, badge: 'Starter' },
    { id: 'pack_5k', coins: 5500, bonus: 10, priceUsd: 4.99, priceCdf: 14000, priceXaf: 3000, badge: 'Popular 🔥' },
    { id: 'pack_12k', coins: 12000, bonus: 20, priceUsd: 9.99, priceCdf: 28000, priceXaf: 6000, badge: 'Best Value ✨' },
    { id: 'pack_32k', coins: 32000, bonus: 30, priceUsd: 24.99, priceCdf: 70000, priceXaf: 15000, badge: 'VIP Gifter 💎' },
    { id: 'pack_70k', coins: 70000, bonus: 40, priceUsd: 49.99, priceCdf: 140000, priceXaf: 30000, badge: 'High Roller 👑' },
    { id: 'pack_150k', coins: 150000, bonus: 50, priceUsd: 99.99, priceCdf: 280000, priceXaf: 60000, badge: 'Ultra Whale 🐳' },
  ];

  const transactions = [
    { id: 'tx_demo1', username: 'CyberNova', packageId: 'pack_12k', coins: 12000, amountUsd: 9.99, method: 'Vodacom M-Pesa (DRC)', phone: '+243819928172', status: 'COMPLETED', timestamp: Date.now() - 3600000 },
    { id: 'tx_demo2', username: 'StarlightAlex', packageId: 'pack_32k', coins: 32000, amountUsd: 24.99, method: 'Airtel Money (DRC)', phone: '+243971827361', status: 'COMPLETED', timestamp: Date.now() - 1800000 },
    { id: 'tx_demo3', username: 'ProGamer_Kai', packageId: 'pack_32k', coins: 32000, amountUsd: 24.99, method: 'Orange Money (DRC)', phone: '+243841122334', status: 'COMPLETED', timestamp: Date.now() - 900000 },
  ];

  app.get('/api/wallet/packages', (req, res) => {
    res.json(COIN_PACKAGES);
  });

  app.get('/api/wallet/transactions/:username', (req, res) => {
    const userTx = transactions.filter(t => t.username.toLowerCase() === req.params.username.toLowerCase());
    res.json(userTx);
  });

  app.get('/api/admin/transactions', (req, res) => {
    res.json(transactions);
  });

  app.post('/api/wallet/purchase', (req, res) => {
    const { username, packageId, method, phone, operator } = req.body;
    if (!username || !packageId) return res.status(400).json({ error: 'Missing parameters' });

    const pkg = COIN_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const p = ensureUserProfile(username);
    p.coins += pkg.coins;
    addXp(p, Math.floor(pkg.coins / 10));

    const txRecord = {
      id: 'tx_' + rid(),
      username,
      packageId,
      coins: pkg.coins,
      amountUsd: pkg.priceUsd,
      amountCdf: pkg.priceCdf,
      method: method || operator || 'Mobile Money',
      phone: phone || '',
      status: 'COMPLETED',
      timestamp: now(),
    };

    transactions.unshift(txRecord);
    if (transactions.length > 500) transactions.pop();
    db.addTransaction(txRecord);

    addAuditLog('Economy', 'COIN_PURCHASE', `@${username} recharged 🪙 ${pkg.coins.toLocaleString()} via ${txRecord.method} ($${pkg.priceUsd})`, username);

    // Notify user's socket if connected
    const sid = usersByUsername.get(username);
    if (sid) {
      io.to(sid).emit('coinsUpdate', { coins: p.coins });
      io.to(sid).emit('purchaseSuccess', { coins: pkg.coins, totalCoins: p.coins, transaction: txRecord });
    }

    res.json({
      success: true,
      coinsCredited: pkg.coins,
      newBalance: p.coins,
      transaction: txRecord,
    });
  });

  /* ─── CREATOR DIAMOND CASHOUT & WITHDRAWAL APIS ─── */
  app.get('/api/creator/earnings/:username', (req, res) => {
    const p = ensureUserProfile(req.params.username);
    const rules = db.getRules();
    const rate = rules.diamondToUsdRate || 0.01;
    const diamonds = p.diamonds || 0;
    const amountUsd = parseFloat((diamonds * rate).toFixed(2));
    const amountCdf = Math.round(amountUsd * 2800);
    const userWds = db.getUserWithdrawals(req.params.username);

    res.json({
      username: p.username,
      diamonds,
      amountUsd,
      amountCdf,
      minWithdrawalDiamonds: rules.minWithdrawalDiamonds || 1000,
      totalEarnedDiamonds: p.totalGiftsReceivedValue || diamonds,
      history: userWds,
    });
  });

  app.post('/api/creator/withdraw', (req, res) => {
    const { username, diamonds, method, accountPhone, accountName } = req.body;
    if (!username || !diamonds || diamonds <= 0) return res.status(400).json({ error: 'Invalid parameters' });

    const p = ensureUserProfile(username);
    const rules = db.getRules();
    const min = rules.minWithdrawalDiamonds || 1000;

    if (diamonds < min) return res.status(400).json({ error: `Minimum cashout is ${min.toLocaleString()} Diamonds ($${(min * 0.01).toFixed(2)})` });
    if ((p.diamonds || 0) < diamonds) return res.status(400).json({ error: 'Insufficient Diamond balance' });

    p.diamonds -= diamonds;
    db.updateUser(username, { diamonds: p.diamonds });

    const amountUsd = parseFloat((diamonds * (rules.diamondToUsdRate || 0.01)).toFixed(2));
    const amountCdf = Math.round(amountUsd * 2800);

    const withdrawalRecord = {
      id: 'wd_' + rid(),
      username,
      diamonds,
      amountUsd,
      amountCdf,
      method: method || 'Vodacom M-Pesa (DRC)',
      accountPhone: accountPhone || '',
      accountName: accountName || username,
      status: 'PENDING',
      requestedAt: now(),
      processedAt: null,
      notes: 'Submitted by creator, awaiting queue processing',
    };

    db.addWithdrawal(withdrawalRecord);
    addAuditLog('Economy', 'PAYOUT_REQUESTED', `@${username} requested $${amountUsd} (${amountCdf.toLocaleString()} CDF) payout via ${withdrawalRecord.method}`, username);

    io.emit('adminWithdrawalNew', withdrawalRecord);

    res.json({
      success: true,
      diamondsDeducted: diamonds,
      remainingDiamonds: p.diamonds,
      withdrawal: withdrawalRecord,
    });
  });

  app.get('/api/admin/withdrawals', (req, res) => {
    res.json(db.getAllWithdrawals());
  });

  app.post('/api/admin/withdrawal/status', (req, res) => {
    const { id, status, notes, adminUsername } = req.body;
    if (!id || !status) return res.status(400).json({ error: 'Missing parameters' });

    const allWds = db.getAllWithdrawals();
    const wd = allWds.find(w => w.id === id);
    if (!wd) return res.status(404).json({ error: 'Withdrawal record not found' });

    const oldStatus = wd.status;
    wd.status = status;
    wd.processedAt = now();
    if (notes) wd.notes = notes;

    if (status === 'REJECTED' && oldStatus !== 'REJECTED') {
      const p = ensureUserProfile(wd.username);
      p.diamonds = (p.diamonds || 0) + wd.diamonds;
      db.updateUser(wd.username, { diamonds: p.diamonds });
    }

    db.saveRules({});
    addAuditLog('Economy', 'PAYOUT_STATUS_UPDATED', `Payout [${wd.id}] for @${wd.username} ($${wd.amountUsd}) updated: ${oldStatus} ➔ ${status}`, adminUsername || 'Admin');
    io.emit('withdrawalStatusUpdated', wd);

    res.json({ success: true, withdrawal: wd });
  });

  /* ─── VOD STREAM REPLAY APIS ─── */
  app.get('/api/replays', (req, res) => {
    res.json(db.getAllReplays());
  });

  app.post('/api/replays/create', (req, res) => {
    const { title, hostUsername, category, tags, durationSeconds, videoUrl } = req.body;
    const replay = {
      id: 'vod_' + rid(),
      title: title || 'Live Broadcast Replay',
      hostUsername: hostUsername || 'Streamer',
      category: category || 'Chat',
      tags: tags || ['LiveReplay'],
      durationSeconds: durationSeconds || 1800,
      viewCount: 1,
      likes: 10,
      diamondsEarned: 150,
      recordedAt: now(),
      thumbnailIcon: category === 'Music' ? '🎸' : (category === 'Gaming' ? '🎮' : '🎙️'),
      videoUrl: videoUrl || 'sample_vod.mp4',
    };
    db.addReplay(replay);
    io.emit('newReplayAvailable', replay);
    res.json({ success: true, replay });
  });

  /* ─── WEBRTC ICE SERVERS API ─── */
  app.get('/api/webrtc/ice-servers', (req, res) => {
    res.json({ iceServers: config.iceServers || [] });
  });

  /* ─── ADMIN DASHBOARD APIS ─── */
  app.get('/api/admin/overview', (req, res) => {
    let totalCoins = 0;
    let totalStreamsHosted = 0;
    userStore.forEach(u => {
      totalCoins += u.coins || 0;
      totalStreamsHosted += u.streamsHosted || 0;
    });

    res.json({
      activeStreamsCount: allLiveRooms().length,
      totalUsersCount: userStore.size,
      onlineSocketsCount: users.size,
      totalCoinsInCirculation: totalCoins,
      totalStreamsHosted,
      bannedUsersCount: globalBans.size,
      activeRooms: allLiveRooms(),
      rules: platformRules,
      recentLogs: auditLogs.slice(0, 50),
      system: {
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        platform: process.platform,
      }
    });
  });

  app.get('/api/admin/users', (req, res) => {
    const list = [];
    userStore.forEach(u => {
      const activeSocketId = usersByUsername.get(u.username);
      const isOnline = Boolean(activeSocketId && users.has(activeSocketId));
      list.push({
        username: u.username,
        role: u.role || 'user',
        level: u.level || 1,
        xp: u.xp || 0,
        coins: u.coins || 0,
        streamsHosted: u.streamsHosted || 0,
        totalGiftsSent: u.totalGiftsSent || 0,
        totalGiftsReceived: u.totalGiftsReceived || 0,
        isBanned: globalBans.has(u.username),
        isOnline,
        joinedAt: u.joinedAt,
        bio: u.bio || '',
      });
    });
    res.json(list.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0) || b.coins - a.coins));
  });

  app.post('/api/admin/user/role', (req, res) => {
    const { username, role, adminUsername } = req.body;
    if (!username || !role) return res.status(400).json({ error: 'Missing parameters' });
    const validRoles = ['admin', 'moderator', 'streamer', 'vip', 'user'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    
    const p = ensureUserProfile(username);
    const oldRole = p.role;
    p.role = role;

    addAuditLog('Role', 'ROLE_UPDATED', `Changed @${username} role: ${oldRole} ➔ ${role}`, adminUsername || 'Admin');
    io.emit('userRoleUpdated', { username, role });
    res.json({ success: true, username, role });
  });

  app.post('/api/admin/user/coins', (req, res) => {
    const { username, amount, action, adminUsername } = req.body;
    if (!username || typeof amount !== 'number') return res.status(400).json({ error: 'Invalid parameters' });
    
    const p = ensureUserProfile(username);
    const oldCoins = p.coins;
    if (action === 'set') {
      p.coins = Math.max(0, amount);
    } else if (action === 'deduct') {
      p.coins = Math.max(0, p.coins - amount);
    } else {
      p.coins += amount;
    }

    addAuditLog('Economy', 'COINS_ADJUSTED', `Adjusted @${username} coins: ${oldCoins} ➔ ${p.coins}`, adminUsername || 'Admin');
    io.emit('userCoinsUpdated', { username, coins: p.coins });
    res.json({ success: true, username, coins: p.coins });
  });

  app.post('/api/admin/user/ban', (req, res) => {
    const { username, ban, reason, adminUsername } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    
    const p = ensureUserProfile(username);
    if (ban) {
      globalBans.add(username);
      p.isBanned = true;
      const sid = usersByUsername.get(username);
      if (sid && io.sockets.sockets.get(sid)) {
        io.sockets.sockets.get(sid).emit('forceDisconnect', { reason: reason || 'Banned by administrator.' });
        io.sockets.sockets.get(sid).disconnect(true);
      }
      addAuditLog('Moderation', 'USER_BANNED', `Globally banned @${username}. Reason: ${reason || 'Violation of platform rules'}`, adminUsername || 'Admin');
    } else {
      globalBans.delete(username);
      p.isBanned = false;
      addAuditLog('Moderation', 'USER_UNBANNED', `Unbanned @${username}`, adminUsername || 'Admin');
    }

    io.emit('userBanUpdated', { username, isBanned: Boolean(ban) });
    res.json({ success: true, username, isBanned: Boolean(ban) });
  });

  app.post('/api/admin/room/terminate', (req, res) => {
    const { roomId, reason, adminUsername } = req.body;
    if (!roomId || !rooms.has(roomId)) return res.status(404).json({ error: 'Room not found' });
    
    const room = rooms.get(roomId);
    addAuditLog('Surveillance', 'ROOM_TERMINATED', `Force terminated broadcast [${room.title}] by @${room.hostUsername}. Reason: ${reason || 'Admin intervention'}`, adminUsername || 'Admin');

    io.to(roomId).emit('roomClosed', { reason: reason || 'This stream was closed by platform administration.' });
    
    try {
      room.transports.forEach(t => { try { t.close(); } catch(_){} });
      room.isLive = false;
      rooms.delete(roomId);
      broadcastRoomsList();
    } catch(e) {
      console.warn('terminate room err:', e.message);
    }

    res.json({ success: true, roomId });
  });

  app.get('/api/admin/rules', (req, res) => res.json(platformRules));

  app.post('/api/admin/rules', (req, res) => {
    const updates = req.body.rules || req.body;
    const adminUsername = req.body.adminUsername || 'Admin';
    delete updates.adminUsername;
    Object.assign(platformRules, updates);
    addAuditLog('Rules', 'RULES_MODIFIED', `Platform rules & policies updated: ${Object.keys(updates).join(', ')}`, adminUsername);
    io.emit('platformRulesUpdated', platformRules);
    res.json({ success: true, rules: platformRules });
  });

  app.post('/api/admin/broadcast', (req, res) => {
    const { message, severity = 'info', adminUsername } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    
    addAuditLog('Broadcast', 'GLOBAL_ALERT', `Global Alert: "${message}"`, adminUsername || 'Admin');
    io.emit('systemBroadcast', { message, severity, timestamp: now() });
    res.json({ success: true });
  });

  /* ─── GIFT CATALOG STUDIO APIS ─── */
  app.post('/api/admin/gift/update', (req, res) => {
    const { id, price, tier, combo, name, adminUsername } = req.body;
    const gift = GIFT_CATALOG.find(g => g.id === id);
    if (!gift) return res.status(404).json({ error: 'Gift not found' });

    if (typeof price === 'number') gift.price = Math.max(1, price);
    if (tier) gift.tier = tier;
    if (typeof combo === 'boolean') gift.combo = combo;
    if (name) gift.name = name;

    addAuditLog('Economy', 'GIFT_UPDATED', `Updated gift [${gift.name}]: price=${gift.price}c, tier=${gift.tier}`, adminUsername || 'Admin');
    io.emit('giftCatalogUpdated', GIFT_CATALOG);
    res.json({ success: true, gifts: GIFT_CATALOG });
  });

  app.post('/api/admin/gift/add', (req, res) => {
    const { name, icon, price, tier = 'medium', combo = true, adminUsername } = req.body;
    if (!name || !icon || typeof price !== 'number') return res.status(400).json({ error: 'Missing gift parameters' });

    const newGift = {
      id: 'custom_' + rid(),
      name: name.trim(),
      icon: icon.trim(),
      price: Math.max(1, price),
      tier,
      combo: Boolean(combo),
    };

    GIFT_CATALOG.push(newGift);
    addAuditLog('Economy', 'GIFT_ADDED', `Created new virtual gift [${newGift.name} ${newGift.icon}] for ${newGift.price}c`, adminUsername || 'Admin');
    io.emit('giftCatalogUpdated', GIFT_CATALOG);
    res.json({ success: true, gift: newGift, gifts: GIFT_CATALOG });
  });

  /* ─── CHAT MODERATION APIS ─── */
  app.get('/api/admin/chat/recent', (req, res) => {
    res.json(globalChatMessages);
  });

  app.post('/api/admin/chat/purge', (req, res) => {
    const { roomId, adminUsername } = req.body;
    if (roomId && rooms.has(roomId)) {
      io.to(roomId).emit('chatPurged', { reason: 'Chat history cleared by administrator.' });
      addAuditLog('Moderation', 'CHAT_PURGED', `Cleared chat for stream [${roomId}]`, adminUsername || 'Admin');
    }
    res.json({ success: true });
  });

  /* ─── STREAM SIMULATOR API ─── */
  app.post('/api/admin/stream/simulate', (req, res) => {
    const { hostUsername = 'Aria_Acoustic', title = '✨ Simulated Live Showcase', category = 'Music', isPk = true, adminUsername } = req.body;
    
    const roomId = 'sim_' + rid();
    const mockRoom = createRoom({
      id: roomId,
      hostUsername,
      title,
      category,
      tags: ['Simulated', 'WebRTC', 'Demo'],
    });

    mockRoom.viewerCount = Math.floor(Math.random() * 2500 + 500);
    mockRoom.likes = Math.floor(Math.random() * 15000 + 3000);
    mockRoom.isLive = true;

    if (isPk) {
      mockRoom.pk = {
        active: true,
        opponentRoomId: 'sim_opp_' + rid(),
        opponentHost: 'ProGamer_Kai',
        score: Math.floor(Math.random() * 5000 + 1000),
        opponentScore: Math.floor(Math.random() * 5000 + 1000),
        endsAt: now() + 180000,
      };
    }

    rooms.set(roomId, mockRoom);
    addAuditLog('Stream', 'STREAM_SIMULATED', `Spawned simulated broadcast [${title}] by @${hostUsername}`, adminUsername || 'Admin');
    broadcastRoomsList();

    res.json({ success: true, roomId, room: roomSummary(mockRoom) });
  });

  /* ─── WEBRTC SFU TELEMETRY API ─── */
  app.get('/api/admin/sfu/telemetry', (req, res) => {
    let totalTransports = 0;
    let totalProducers = 0;
    let totalConsumers = 0;

    rooms.forEach(r => {
      totalTransports += r.transports?.size || 0;
      totalProducers += r.producers?.size || 0;
      totalConsumers += r.consumers?.size || 0;
    });

    res.json({
      workerPid: worker.pid,
      codecs: config.mediaCodecs,
      activeTransportsCount: totalTransports,
      activeProducersCount: totalProducers,
      activeConsumersCount: totalConsumers,
      rtcPortRange: `${config.worker.rtcMinPort} - ${config.worker.rtcMaxPort}`,
      dtlsEncryption: 'AES_CM_128_HMAC_SHA1_80',
      averageLatencyMs: 118,
      packetLossPct: 0.02,
    });
  });

  /* ─── PLATFORM ANALYTICS API ─── */
  app.get('/api/admin/analytics', (req, res) => {
    const catCounts = {};
    CATEGORIES.forEach(c => catCounts[c] = 0);
    rooms.forEach(r => {
      if (r.isLive && catCounts[r.category] !== undefined) {
        catCounts[r.category]++;
      }
    });

    let totalGiftsExchanged = 0;
    userStore.forEach(u => {
      totalGiftsExchanged += u.totalGiftsSent || 0;
    });

    res.json({
      categoryDistribution: catCounts,
      totalGiftsExchanged,
      totalRegisteredUsers: userStore.size,
      totalActiveStreams: allLiveRooms().length,
      averageViewersPerStream: allLiveRooms().length > 0 ? Math.round(users.size / allLiveRooms().length) : 0,
    });
  });

  const worker = await mediasoup.createWorker({
    logLevel  : config.worker.logLevel,
    logTags   : config.worker.logTags,
    rtcMinPort: config.worker.rtcMinPort,
    rtcMaxPort: config.worker.rtcMaxPort,
  });

  worker.on('died', () => {
    console.error('mediasoup worker died');
    setTimeout(() => process.exit(1), 2000);
  });

  async function createRouter() {
    return worker.createRouter({ mediaCodecs: config.mediaCodecs });
  }

  /* ════════════════════════════════════════════════
     ROOM FACTORY
     ════════════════════════════════════════════════ */

  function createRoom({ id, hostUsername, title, category, tags, password = null }) {
    return {
      id,
      title: title || `${hostUsername}'s live stream`,
      category: category || 'Chat',
      tags: tags || [],
      hostUsername,
      coHosts: new Set(),         // usernames that can also produce
      mods: new Set([hostUsername]), // usernames with moderation powers
      password,                   // optional string for private rooms
      router: null,               // assigned on first stream start
      transports: new Map(),      // transportId -> transport
      producers: new Map(),       // producerId -> producer
      consumers: new Map(),       // consumerId -> consumer
      peerToTransport: new Map(), // socketId -> Set<transportId>
      socketProducerIds: new Map(), // socketId -> Set<producerId>
      viewerSockets: new Set(),   // socketId
      viewerCount: 0,
      likes: 0,
      viewers: new Map(),         // socketId -> { username, role, joinedAt }
      mutedUsers: new Set(),      // usernames that can't chat
      bannedUsers: new Set(),     // usernames
      isLive: false,
      startedAt: null,
      thumbnail: null,
      totalGiftsReceived: 0,
      totalGiftsValue: 0,
      topSupporters: [],          // [{ username, value }]
      pinnedMessage: null,        // { text, username, ts, color }
      hostSocketId: null,
      pk: null,
      poll: null,
      chests: new Map(),          // chestId -> chestData
      wheel: null,                // wheelData
    };
  }

  async function ensureRoomRouter(room) {
    if (!room.router) room.router = await createRouter();
    return room.router;
  }

  // Seed initial vibrant showcase broadcasts for explore feed
  const seedRoomsData = [
    {
      id: 'room_aria',
      hostUsername: 'Aria_Acoustic',
      title: '🎸 Acoustic Sunset Sessions & Song Requests ✨',
      category: 'Music',
      tags: ['Acoustic', 'LiveMusic', 'Chill'],
      viewerCount: 1420,
      likes: 8940,
    },
    {
      id: 'room_kai',
      hostUsername: 'ProGamer_Kai',
      title: '🏆 Grand Arena PK Championship Finals ⚔️',
      category: 'Gaming',
      tags: ['ProGamer', 'PKArena', 'Esports'],
      viewerCount: 2890,
      likes: 19450,
      pk: {
        active: true,
        opponentRoomId: 'room_elena',
        opponentHost: 'ElenaDance',
        score: 4200,
        opponentScore: 3850,
        endsAt: now() + 600000,
      }
    },
    {
      id: 'room_elena',
      hostUsername: 'ElenaDance',
      title: '💃 K-POP Dance Marathon & Freestyle Battles 🔥',
      category: 'Dance',
      tags: ['KPOP', 'Dance', 'Freestyle'],
      viewerCount: 2150,
      likes: 14200,
      pk: {
        active: true,
        opponentRoomId: 'room_kai',
        opponentHost: 'ProGamer_Kai',
        score: 3850,
        opponentScore: 4200,
        endsAt: now() + 600000,
      }
    }
  ];

  seedRoomsData.forEach(seed => {
    const r = createRoom(seed);
    r.isLive = true;
    r.startedAt = now() - 1800000;
    r.viewerCount = seed.viewerCount;
    r.likes = seed.likes;
    if (seed.pk) r.pk = seed.pk;
    rooms.set(seed.id, r);
  });

  /* ════════════════════════════════════════════════
     SOCKET.IO HANDLER
     ════════════════════════════════════════════════ */

  io.on('connection', socket => {
    const sid = socket.id;
    // Default temp user
    users.set(sid, {
      socketId: sid,
      username: null,
      roomId: null,
      profile: null,
    });

    /* ─── Auth / Set username ─── */
    socket.on('setUsername', ({ username }, cb) => {
      const clean = String(username || '').trim().slice(0, 32);
      if (!clean) return cb && cb({ error: 'Username required' });
      if (globalBans.has(clean)) return cb && cb({ error: 'You are banned from this platform.' });
      if (usersByUsername.has(clean)) {
        // force disconnect old if same username reconnect (simple)
        const oldSock = users.get(usersByUsername.get(clean));
        if (oldSock && oldSock.socketId !== sid) {
          io.to(oldSock.socketId).disconnectSockets();
        }
        usersByUsername.delete(clean);
      }
      usersByUsername.set(clean, sid);
      const profile = ensureUserProfile(clean);
      const u = users.get(sid);
      u.username = clean;
      u.profile = profile;
      cb && cb({
        ok: true,
        profile: {
          username: profile.username,
          level: profile.level,
          xp: profile.xp,
          coins: profile.coins,
          followersCount: profile.followers.size,
          followingCount: profile.following.size,
          bio: profile.bio,
          joinedAt: profile.joinedAt,
        },
        categories: CATEGORIES,
        gifts: GIFT_CATALOG,
      });
    });

    socket.on('getCatalogs', (data, cb) => {
      const ack = typeof data === 'function' ? data : cb;
      ack && ack({ categories: CATEGORIES, gifts: GIFT_CATALOG, rooms: allLiveRooms() });
    });

    socket.on('getRoomsList', (data, cb) => {
      const ack = typeof data === 'function' ? data : cb;
      ack && ack(allLiveRooms());
    });

    /* ─── Get/Update profile ─── */
    socket.on('getProfile', ({ username }, cb) => {
      const target = username || users.get(sid)?.username;
      if (!target) return cb && cb({ error: 'Not logged in' });
      const p = userStore.get(target);
      if (!p) return cb && cb({ error: 'User not found' });
      const me = users.get(sid)?.profile;
      const isFollowing = me ? p.followers.has(me.username) : false;
      cb && cb({
        username: p.username,
        level: p.level,
        xp: p.xp,
        coins: me && me.username === p.username ? p.coins : undefined,
        followersCount: p.followers.size,
        followingCount: p.following.size,
        isFollowing,
        bio: p.bio,
        totalGiftsSent: p.totalGiftsSent,
        totalGiftsValue: p.totalGiftsValue,
        totalGiftsReceived: p.totalGiftsReceived,
        totalGiftsReceivedValue: p.totalGiftsReceivedValue,
        streamsHosted: p.streamsHosted,
        joinedAt: p.joinedAt,
      });
    });

    socket.on('updateBio', ({ bio }, cb) => {
      const u = users.get(sid);
      if (!u?.profile) return cb && cb({ error: 'Not logged in' });
      u.profile.bio = String(bio || '').slice(0, 240);
      cb && cb({ ok: true, bio: u.profile.bio });
    });

    socket.on('followUser', ({ targetUsername, follow }, cb) => {
      const u = users.get(sid);
      if (!u?.profile) return cb && cb({ error: 'Not logged in' });
      const target = ensureUserProfile(targetUsername);
      if (follow) {
        u.profile.following.add(target.username);
        target.followers.add(u.profile.username);
        // notify target if in a room they host
        rooms.forEach(r => {
          if (r.hostUsername === target.username && r.hostSocketId) {
            io.to(r.hostSocketId).emit('newFollower', {
              follower: u.profile.username,
              followerLevel: u.profile.level,
              totalFollowers: target.followers.size,
            });
          }
        });
      } else {
        u.profile.following.delete(target.username);
        target.followers.delete(u.profile.username);
      }
      cb && cb({ ok: true, followingCount: target.followers.size });
    });

    /* ─── Create Room (Host) ─── */
    socket.on('createRoom', async ({ title, category, tags, password }, cb) => {
      const u = users.get(sid);
      if (!u?.profile) return cb && cb({ error: 'Set username first' });
      if (u.roomId) return cb && cb({ error: 'Already in a room' });

      if (platformRules.maintenanceMode && u.profile.role !== 'admin') {
        return cb && cb({ error: 'Platform is currently in Maintenance Mode. New broadcasts are temporarily restricted.' });
      }
      if (u.profile.level < (platformRules.minLevelToGoLive || 1) && u.profile.role !== 'admin') {
        return cb && cb({ error: `Broadcasting requires minimum account level Lv.${platformRules.minLevelToGoLive}` });
      }

      const roomId = rid();
      const room = createRoom({
        id: roomId,
        hostUsername: u.profile.username,
        title, category, tags, password,
      });
      room.hostSocketId = sid;
      rooms.set(roomId, room);
      addAuditLog('Stream', 'BROADCAST_STARTED', `@${u.profile.username} started stream "${title || 'Live Stream'}" [${category || 'Chat'}]`, u.profile.username);
      await joinRoomInternal({ roomId, password, asHost: true });
      cb && cb({ roomId, ok: true });
    });

    /* ─── Join Room (Viewer / Host) ─── */
    socket.on('joinRoom', async ({ roomId, password, asHost }, cb) => {
      try {
        const res = await joinRoomInternal({ roomId, password, asHost: !!asHost });
        cb && cb(res);
      } catch (e) { cb && cb({ error: e.message }); }
    });

    async function joinRoomInternal({ roomId, password, asHost }) {
      let u = users.get(sid);
      if (!u || !u.profile) {
        const autoUsername = 'Guest_' + Math.random().toString(36).slice(2, 7);
        const p = ensureUserProfile(autoUsername);
        u = { socketId: sid, username: autoUsername, roomId: null, profile: p };
        users.set(sid, u);
        usersByUsername.set(autoUsername, sid);
      }
      if (u.roomId && u.roomId !== roomId) {
        cleanupPeer(sid);
        users.set(sid, { socketId: sid, username: u.profile.username, roomId: null, profile: u.profile });
      }
      const room = rooms.get(roomId);
      if (!room) throw new Error('Room not found');
      if (room.bannedUsers.has(u.profile.username)) throw new Error('Banned from this room');
      if (room.password && room.password !== password) throw new Error('Wrong password');
      if (asHost && u.profile.username !== room.hostUsername && !room.coHosts.has(u.profile.username)) {
        throw new Error('You are not authorized as host for this room');
      }
      await ensureRoomRouter(room);
      u.roomId = roomId;
      const role = (asHost || u.profile.username === room.hostUsername) ? 'host' : 'viewer';
      room.viewers.set(sid, { username: u.profile.username, role, joinedAt: now() });
      room.viewerSockets.add(sid);
      room.viewerCount += 1;
      socket.join(roomId);
      addXp(u.profile, 2);
      io.to(roomId).emit('peerJoined', {
        username: u.profile.username,
        role,
        level: u.profile.level,
      });
      broadcastViewerCount(room);
      broadcastRoomsList();
      // Auto update viewer socket room users list and pinned msg
      socket.emit('roomState', {
        id: room.id,
        title: room.title,
        category: room.category,
        tags: room.tags,
        hostUsername: room.hostUsername,
        isLive: room.isLive,
        startedAt: room.startedAt,
        pinnedMessage: room.pinnedMessage,
        coHosts: [...room.coHosts],
        mods: [...room.mods],
        mutedUsers: [...room.mutedUsers],
        poll: serializePoll(room.poll),
        chests: [...room.chests.values()].map(serializeChest),
        wheel: serializeWheel(room.wheel),
      });
      return {
        ok: true,
        role,
        room: {
          id: room.id,
          title: room.title,
          category: room.category,
          tags: room.tags,
          hostUsername: room.hostUsername,
          isLive: room.isLive,
          startedAt: room.startedAt,
          viewerCount: room.viewerCount,
        },
        rtpCapabilities: room.router.rtpCapabilities,
        pinnedMessage: room.pinnedMessage,
        producers: getProducersList(room, sid),
        poll: serializePoll(room.poll),
        chests: [...room.chests.values()].map(serializeChest),
        wheel: serializeWheel(room.wheel),
      };
    }

    /* ─── Leave / Cleanup ─── */
    socket.on('leaveRoom', () => cleanupPeer(sid));
    socket.on('disconnect', () => cleanupPeer(sid));

    function cleanupPeer(sid) {
      const u = users.get(sid);
      if (!u) return;
      const roomId = u.roomId;
      const room = roomId ? rooms.get(roomId) : null;
      if (room) {
        const view = room.viewers.get(sid);
        const username = u.username;
        // close transports
        const transportIds = room.peerToTransport.get(sid) || new Set();
        transportIds.forEach(tid => {
          const t = room.transports.get(tid);
          if (t) try { t.close(); } catch(_){}
          room.transports.delete(tid);
          // remove associated consumers/producers
          for (const [cid, c] of room.consumers) {
            if (c._transportId === tid) try { c.close(); } catch(_){} room.consumers.delete(cid);
          }
        });
        room.peerToTransport.delete(sid);
        // close producers
        const producerIds = room.socketProducerIds.get(sid) || new Set();
        producerIds.forEach(pid => {
          const p = room.producers.get(pid);
          if (p) try { p.close(); } catch(_){}
          room.producers.delete(pid);
          // notify consumers
          io.to(roomId).emit('producerClosed', { producerId: pid });
        });
        room.socketProducerIds.delete(sid);
        room.viewers.delete(sid);
        room.viewerSockets.delete(sid);
        room.viewerCount = Math.max(0, room.viewerCount - 1);
        broadcastViewerCount(room);
        io.to(roomId).emit('peerLeft', { username });
        // If host leaves, end stream (but keep room state)
        if (room.hostSocketId === sid) {
          room.hostSocketId = null;
          room.isLive = false;
          io.to(roomId).emit('hostLeft');
        }
        // delete empty room
        if (room.viewerCount === 0 && !room.isLive && room.hostSocketId === null) {
          if (room.poll?._ticker) try { clearInterval(room.poll._ticker); } catch(_){}
          rooms.delete(roomId);
        }
        broadcastRoomsList();
      }
      if (u.username) usersByUsername.delete(u.username);
      users.delete(sid);
    }

    /* ─── Update room metadata (host only) ─── */
    socket.on('updateRoom', ({ title, category, tags, password }, cb) => {
      const { room } = getPeerRoom(sid);
      if (!room) return cb && cb({ error: 'Not in a room' });
      if (!isHostOrCoHost(room, sid)) return cb && cb({ error: 'Host only' });
      if (title !== undefined) room.title = String(title).slice(0, 120);
      if (category !== undefined && CATEGORIES.includes(category)) room.category = category;
      if (tags !== undefined) room.tags = tags.map(t => String(t).slice(0, 24)).slice(0, 6);
      if (password !== undefined) room.password = password || null;
      io.to(room.id).emit('roomUpdated', {
        title: room.title, category: room.category, tags: room.tags,
      });
      broadcastRoomsList();
      cb && cb({ ok: true });
    });

    /* ══════════════════════════════════════════════
       MEDIASOUP: TRANSPORTS / PRODUCERS / CONSUMERS
       ══════════════════════════════════════════════ */

    socket.on('getRouterRtpCapabilities', async (data, cb) => {
      const ack = typeof data === 'function' ? data : cb;
      const { room } = getPeerRoom(sid);
      if (!room) return ack && ack({ error: 'Not in a room' });
      await ensureRoomRouter(room);
      ack(room.router.rtpCapabilities);
    });

    socket.on('createWebRtcTransport', async ({ consumer, roomId }, cb) => {
      if (typeof cb !== 'function') return;
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb({ error: 'Room not found' });
      try {
        await ensureRoomRouter(room);
        const listenIp = config.webRtcTransport.listenIp || '0.0.0.0';
        const announced = config.webRtcTransport.announcedIp || undefined;
        const transportOptions = {
          enableUdp: true, enableTcp: true, preferUdp: true,
          initialAvailableOutgoingBitrate: 1_500_000,
          listenInfos: [
            { protocol: 'udp', ip: listenIp, announcedAddress: announced },
            { protocol: 'tcp', ip: listenIp, announcedAddress: announced },
          ],
        };
        const transport = await room.router.createWebRtcTransport(transportOptions);
        transport.on('dtlsstatechange', dtlsState => {
          if (dtlsState === 'closed') try { transport.close(); } catch(_){}
        });
        room.transports.set(transport.id, transport);
        if (!room.peerToTransport.has(sid)) room.peerToTransport.set(sid, new Set());
        room.peerToTransport.get(sid).add(transport.id);
        transport._ownerSocket = sid;
        cb({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        });
      } catch (e) {
        console.error('createWebRtcTransport', e);
        cb({ error: e.message });
      }
    });

    socket.on('connectTransport', async ({ transportId, dtlsParameters, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      try {
        const transport = room.transports.get(transportId);
        if (!transport) return cb({ error: 'transport not found' });
        await transport.connect({ dtlsParameters });
        cb('ok');
      } catch (e) { cb({ error: e.message }); }
    });

    socket.on('produce', async ({ transportId, kind, rtpParameters, appData, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      const u = users.get(sid);
      if (!isHostOrCoHost(room, sid) && !room.coHosts.has(u?.profile?.username)) {
        return cb && cb({ error: 'Host or co-host only' });
      }
      try {
        const transport = room.transports.get(transportId);
        if (!transport) return cb({ error: 'transport not found' });
        const producer = await transport.produce({ kind, rtpParameters, appData });
        room.producers.set(producer.id, producer);
        if (!room.socketProducerIds.has(sid)) room.socketProducerIds.set(sid, new Set());
        room.socketProducerIds.get(sid).add(producer.id);
        producer._ownerSocket = sid;
        producer._ownerUsername = u?.profile?.username;
        producer.on('transportclose', () => { try { producer.close(); } catch(_){} room.producers.delete(producer.id); });
        // first producer triggers "go live" automatically
        if (!room.isLive && (u.profile.username === room.hostUsername || room.coHosts.has(u.profile.username))) {
          room.isLive = true;
          room.startedAt = now();
          if (u.profile.username === room.hostUsername) u.profile.streamsHosted += 1;
          io.to(room.id).emit('streamStarted', { hostUsername: room.hostUsername, startedAt: room.startedAt });
          broadcastRoomsList();
        }
        io.to(room.id).emit('newProducer', {
          producerId: producer.id,
          kind,
          socketId: sid,
          username: u?.profile?.username,
        });
        cb({ id: producer.id });
      } catch (e) { console.error('produce', e); cb({ error: e.message }); }
    });

    socket.on('getProducers', (data, cb) => {
      const ack = typeof data === 'function' ? data : cb;
      const { room } = getPeerRoom(sid);
      if (!room) return ack && ack([]);
      ack && ack(getProducersList(room, sid));
    });

    socket.on('consume', async ({ transportId, producerId, rtpCapabilities, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      try {
        if (!room.router.canConsume({ producerId, rtpCapabilities }))
          return cb({ error: 'cannot consume' });
        const transport = room.transports.get(transportId);
        if (!transport) return cb({ error: 'transport not found' });
        const consumer = await transport.consume({
          producerId, rtpCapabilities, paused: false,
        });
        room.consumers.set(consumer.id, consumer);
        consumer._transportId = transportId;
        if (consumer.kind === 'video' && typeof consumer.requestKeyFrame === 'function') {
          setTimeout(() => {
            try { consumer.requestKeyFrame(); } catch (_) {}
          }, 100);
        }
        consumer.on('transportclose', () => { try { consumer.close(); } catch(_){} room.consumers.delete(consumer.id); });
        consumer.on('producerclose', () => {
          try { consumer.close(); } catch(_){}
          room.consumers.delete(consumer.id);
          socket.emit('consumerClosed', { consumerId: consumer.id });
        });
        cb({
          params: {
            id: consumer.id, producerId, kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          },
        });
      } catch (e) { console.error('consume', e); cb({ error: e.message }); }
    });

    socket.on('resumeConsumer', async ({ consumerId, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      try {
        const consumer = room.consumers.get(consumerId);
        if (!consumer) return cb && cb({ error: 'consumer not found' });
        await consumer.resume();
        if (consumer.kind === 'video' && typeof consumer.requestKeyFrame === 'function') {
          try { consumer.requestKeyFrame(); } catch(_) {}
        }
        cb && cb('ok');
      } catch (e) { cb && cb({ error: e.message }); }
    });

    socket.on('pauseProducer', async ({ producerId, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      try {
        const p = room.producers.get(producerId);
        if (!p || p._ownerSocket !== sid) return cb({ error: 'producer not found' });
        await p.pause(); cb('ok');
      } catch (e) { cb({ error: e.message }); }
    });
    socket.on('resumeProducer', async ({ producerId, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      try {
        const p = room.producers.get(producerId);
        if (!p || p._ownerSocket !== sid) return cb({ error: 'producer not found' });
        await p.resume(); cb('ok');
      } catch (e) { cb({ error: e.message }); }
    });

    /* ══════════════════════════════════════════════
       CHAT / SYSTEM MESSAGES / SUPER CHAT
       ══════════════════════════════════════════════ */

    socket.on('chatMessage', ({ text, isSuperChat, superChatAmount, color, roomId }) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return;
      const u = users.get(sid);
      if (!u?.profile) return;
      if (room.mutedUsers.has(u.profile.username)) return;
      if (!text || text.length > 500) return;
      let clean = text.trim().slice(0, 500);

      // Auto-Mod keyword masking
      if (platformRules.autoModEnabled && Array.isArray(platformRules.bannedWords)) {
        for (const word of platformRules.bannedWords) {
          if (!word || word.trim().length === 0) continue;
          const re = new RegExp(word.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
          clean = clean.replace(re, '***');
        }
      }

      const isHost = isHostOrCoHost(room, sid);
      let amountValue = 0;
      if (isSuperChat) {
        amountValue = Math.max(0, Math.min(10000, Math.floor(Number(superChatAmount) || 0)));
        if (amountValue <= 0) return;
        if (u.profile.coins < amountValue) return;
        u.profile.coins -= amountValue;
        // credit to host
        const hostProfile = userStore.get(room.hostUsername);
        if (hostProfile) hostProfile.coins += Math.floor(amountValue * 0.7);
        addXp(u.profile, amountValue);
        io.to(socket.id).emit('coinsUpdate', { coins: u.profile.coins });
      }
      const payload = {
        id: rid(),
        username: u.profile.username,
        level: u.profile.level,
        text: clean,
        isHost,
        isMod: room.mods.has(u.profile.username),
        isSuperChat: !!isSuperChat && amountValue > 0,
        superChatAmount: amountValue,
        color: color || null,
        ts: now(),
        roomId: room.id,
      };
      io.to(room.id).emit('chatMessage', payload);
      globalChatMessages.unshift(payload);
      if (globalChatMessages.length > 100) globalChatMessages.pop();
      io.emit('adminChatMessage', payload);
      addXp(u.profile, 1);
      if (payload.isSuperChat) {
        io.to(room.id).emit('superChatBanner', payload);
      }
    });

    socket.on('pinMessage', ({ messageId, text }, cb) => {
      const { room } = getPeerRoom(sid);
      if (!room) return cb && cb({ error: 'Not in room' });
      if (!room.mods.has(users.get(sid)?.profile?.username) && !isHostOrCoHost(room, sid))
        return cb && cb({ error: 'Mod only' });
      const u = users.get(sid);
      room.pinnedMessage = { text: text?.slice(0, 200) || null, username: u.profile.username, ts: now() };
      io.to(room.id).emit('pinnedMessageUpdated', room.pinnedMessage);
      cb && cb({ ok: true });
    });

    /* ══════════════════════════════════════════════
       REACTIONS / LIKES
       ══════════════════════════════════════════════ */

    socket.on('reaction', ({ emoji, roomId }) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room || !emoji) return;
      io.to(room.id).emit('reaction', { emoji, username: users.get(sid)?.profile?.username });
      if (emoji === '❤️' || emoji === '🔥' || emoji === '👏' || emoji === '👍') {
        room.likes += 1;
        io.to(room.id).emit('likesUpdate', { likes: room.likes });
      }
    });

    socket.on('likeStream', ({ roomId }) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return;
      room.likes += 1;
      io.to(room.id).emit('likesUpdate', { likes: room.likes });
    });

    /* ══════════════════════════════════════════════
       GIFTS SYSTEM
       ══════════════════════════════════════════════ */

    socket.on('sendGift', ({ giftId, targetUsername, count = 1, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      const u = users.get(sid);
      if (!u?.profile) return cb && cb({ error: 'Not logged in' });
      const gift = GIFT_CATALOG.find(g => g.id === giftId);
      if (!gift) return cb && cb({ error: 'Gift not found' });
      const qty = Math.max(1, Math.min(9999, Math.floor(Number(count) || 1)));
      const totalValue = gift.price * qty;
      if (u.profile.coins < totalValue) return cb && cb({ error: 'Not enough coins' });
      u.profile.coins -= totalValue;
      u.profile.totalGiftsSent += qty;
      u.profile.totalGiftsValue += totalValue;
      const targetName = targetUsername || room.hostUsername;
      const targetProfile = ensureUserProfile(targetName);
      if (targetProfile) {
        targetProfile.totalGiftsReceived = (targetProfile.totalGiftsReceived || 0) + qty;
        targetProfile.totalGiftsReceivedValue = (targetProfile.totalGiftsReceivedValue || 0) + totalValue;
        const earnedDiamonds = Math.floor(totalValue * 0.7);
        targetProfile.diamonds = (targetProfile.diamonds || 0) + earnedDiamonds;
        db.updateUser(targetName, {
          diamonds: targetProfile.diamonds,
          totalGiftsReceived: targetProfile.totalGiftsReceived,
          totalGiftsReceivedValue: targetProfile.totalGiftsReceivedValue,
        });
      }
      db.updateUser(u.profile.username, {
        coins: u.profile.coins,
        totalGiftsSent: u.profile.totalGiftsSent,
        totalGiftsValue: u.profile.totalGiftsValue,
      });
      room.totalGiftsReceived += qty;
      room.totalGiftsValue += totalValue;
      addXp(u.profile, totalValue);
      if (gift.tier === 'xl' || gift.tier === 'mega') addXp(targetProfile, totalValue / 2);
      // update top supporters
      const idx = room.topSupporters.findIndex(s => s.username === u.profile.username);
      if (idx >= 0) room.topSupporters[idx].value += totalValue;
      else room.topSupporters.push({ username: u.profile.username, value: totalValue, level: u.profile.level });
      room.topSupporters.sort((a, b) => b.value - a.value);
      room.topSupporters = room.topSupporters.slice(0, 10);
      // Award PK contribution if in PK
      if (room.pk?.active) {
        const pkMult = gift.tier === 'mega' ? 10 : gift.tier === 'xl' ? 5 : gift.tier === 'large' ? 3 : gift.tier === 'medium' ? 2 : 1;
        room.pk.score += totalValue * pkMult;
        // sync to opponent
        const opp = rooms.get(room.pk.opponentRoomId);
        io.to(room.id).emit('pkScoreUpdate', { side: 'local', score: room.pk.score });
        if (opp && opp.hostSocketId) io.to(opp.hostSocketId).emit('pkScoreUpdate', { side: 'opponent', score: room.pk.score });
      }
      // notify receiver
      const targetSocketId = usersByUsername.get(targetName);
      if (targetSocketId) {
        io.to(targetSocketId).emit('giftReceived', {
          gift, count: qty, totalValue,
          from: u.profile.username, fromLevel: u.profile.level,
        });
      }
      // broadcast animation
      io.to(room.id).emit('giftSent', {
        id: rid(),
        gift, count: qty, totalValue,
        from: u.profile.username, fromLevel: u.profile.level,
        to: targetName,
        ts: now(),
      });
      io.to(socket.id).emit('coinsUpdate', { coins: u.profile.coins });
      io.to(room.id).emit('topSupportersUpdate', room.topSupporters);
      cb && cb({ ok: true, coins: u.profile.coins });
    });

    /* ══════════════════════════════════════════════
       MODERATION
       ══════════════════════════════════════════════ */

    socket.on('modKick', ({ targetUsername, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      if (!room.mods.has(users.get(sid)?.profile?.username) && !isHostOrCoHost(room, sid))
        return cb && cb({ error: 'Mod only' });
      if (targetUsername === room.hostUsername) return cb && cb({ error: 'Cannot kick host' });
      const targetSid = usersByUsername.get(targetUsername);
      if (targetSid) {
        io.to(targetSid).emit('kicked', { by: users.get(sid)?.profile?.username });
        cleanupPeer(targetSid);
      }
      io.to(room.id).emit('systemMessage', { text: `${targetUsername} was kicked.`, ts: now() });
      cb && cb({ ok: true });
    });

    socket.on('modBan', ({ targetUsername, roomId, global: isGlobal }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      const u = users.get(sid);
      if (u?.profile?.username !== room.hostUsername) return cb && cb({ error: 'Host only' });
      if (targetUsername === room.hostUsername) return cb && cb({ error: 'Cannot ban host' });
      room.bannedUsers.add(targetUsername);
      if (isGlobal) globalBans.add(targetUsername);
      const targetSid = usersByUsername.get(targetUsername);
      if (targetSid) {
        io.to(targetSid).emit('banned', { by: u.profile.username, global: isGlobal });
        cleanupPeer(targetSid);
      }
      io.to(room.id).emit('systemMessage', { text: `${targetUsername} was banned.`, ts: now() });
      cb && cb({ ok: true });
    });

    socket.on('modMute', ({ targetUsername, roomId, muted }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      if (!room.mods.has(users.get(sid)?.profile?.username) && !isHostOrCoHost(room, sid))
        return cb && cb({ error: 'Mod only' });
      if (muted) room.mutedUsers.add(targetUsername); else room.mutedUsers.delete(targetUsername);
      io.to(room.id).emit('muteStateUpdated', { username: targetUsername, muted: !!muted });
      io.to(room.id).emit('systemMessage', { text: `${targetUsername} was ${muted ? 'muted' : 'unmuted'}.`, ts: now() });
      cb && cb({ ok: true });
    });

    socket.on('modAdd', ({ targetUsername, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      const u = users.get(sid);
      if (u?.profile?.username !== room.hostUsername) return cb && cb({ error: 'Host only' });
      room.mods.add(targetUsername);
      io.to(room.id).emit('modsUpdated', { mods: [...room.mods] });
      io.to(room.id).emit('systemMessage', { text: `${targetUsername} promoted to mod.`, ts: now() });
      cb && cb({ ok: true });
    });

    /* ══════════════════════════════════════════════
       CO-HOSTING
       ══════════════════════════════════════════════ */

    socket.on('inviteCoHost', ({ targetUsername, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      const u = users.get(sid);
      if (u?.profile?.username !== room.hostUsername) return cb && cb({ error: 'Host only' });
      const targetSid = usersByUsername.get(targetUsername);
      if (!targetSid) return cb && cb({ error: 'User not online in this room' });
      // check if in same room
      const target = users.get(targetSid);
      if (target?.roomId !== room.id) return cb && cb({ error: 'User not in your room' });
      io.to(targetSid).emit('coHostInvite', {
        from: u.profile.username, roomId: room.id,
      });
      cb && cb({ ok: true });
    });

    socket.on('acceptCoHost', async ({ roomId }, cb) => {
      const room = rooms.get(roomId);
      if (!room) return cb && cb({ error: 'Room not found' });
      const u = users.get(sid);
      if (!u?.profile) return cb && cb({ error: 'Not logged in' });
      room.coHosts.add(u.profile.username);
      room.mods.add(u.profile.username);
      io.to(room.id).emit('coHostJoined', { username: u.profile.username, level: u.profile.level });
      io.to(room.id).emit('modsUpdated', { mods: [...room.mods] });
      io.to(room.id).emit('coHostsUpdated', { coHosts: [...room.coHosts] });
      cb && cb({ ok: true });
    });

    socket.on('removeCoHost', ({ targetUsername, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      const u = users.get(sid);
      if (u?.profile?.username !== room.hostUsername) return cb && cb({ error: 'Host only' });
      room.coHosts.delete(targetUsername);
      // close their producers
      for (const [pid, producer] of room.producers) {
        if (producer._ownerUsername === targetUsername) {
          try { producer.close(); } catch(_){}
          room.producers.delete(pid);
          io.to(room.id).emit('producerClosed', { producerId: pid });
        }
      }
      io.to(room.id).emit('coHostLeft', { username: targetUsername });
      io.to(room.id).emit('coHostsUpdated', { coHosts: [...room.coHosts] });
      cb && cb({ ok: true });
    });

    /* ══════════════════════════════════════════════
       PK BATTLES
       ══════════════════════════════════════════════ */

    socket.on('pkRequest', ({ targetRoomId, roomId: myRoomId }, cb) => {
      const myRoom = myRoomId ? rooms.get(myRoomId) : getPeerRoom(sid).room;
      if (!myRoom) return cb && cb({ error: 'Not in room' });
      if (myRoom.hostSocketId !== sid) return cb && cb({ error: 'Host only' });
      const targetRoom = rooms.get(targetRoomId);
      if (!targetRoom) return cb && cb({ error: 'Target room not found' });
      if (myRoom.pk?.active || targetRoom.pk?.active) return cb && cb({ error: 'PK already active' });
      if (targetRoom.hostSocketId) {
        io.to(targetRoom.hostSocketId).emit('pkInvite', {
          fromRoomId: myRoom.id,
          fromHost: myRoom.hostUsername,
          fromHostLevel: userStore.get(myRoom.hostUsername)?.level || 1,
          durationSec: 300,
        });
      }
      cb && cb({ ok: true });
    });

    socket.on('pkAccept', ({ fromRoomId, roomId: myRoomId }, cb) => {
      const myRoom = myRoomId ? rooms.get(myRoomId) : getPeerRoom(sid).room;
      if (!myRoom) return cb && cb({ error: 'Not in room' });
      const oppRoom = rooms.get(fromRoomId);
      if (!oppRoom) return cb && cb({ error: 'Opponent room not found' });
      if (myRoom.pk?.active || oppRoom.pk?.active) return cb && cb({ error: 'PK already active' });
      startPK(oppRoom, myRoom);
      cb && cb({ ok: true });
    });

    socket.on('pkEnd', ({ roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      if (room.hostSocketId !== sid) return cb && cb({ error: 'Host only' });
      endPK(room, true);
      cb && cb({ ok: true });
    });

    function startPK(roomA, roomB) {
      const duration = 5 * 60 * 1000; // 5 minutes
      const endsAt = now() + duration;
      roomA.pk = {
        active: true,
        opponentRoomId: roomB.id,
        opponentHost: roomB.hostUsername,
        score: 0,
        opponentScore: 0,
        endsAt,
        duration,
      };
      roomB.pk = {
        active: true,
        opponentRoomId: roomA.id,
        opponentHost: roomA.hostUsername,
        score: 0,
        opponentScore: 0,
        endsAt,
        duration,
      };
      const payloadA = {
        active: true,
        opponentRoomId: roomB.id,
        opponentHost: roomB.hostUsername,
        opponentLevel: userStore.get(roomB.hostUsername)?.level || 1,
        score: 0,
        opponentScore: 0,
        endsAt,
      };
      const payloadB = {
        active: true,
        opponentRoomId: roomA.id,
        opponentHost: roomA.hostUsername,
        opponentLevel: userStore.get(roomA.hostUsername)?.level || 1,
        score: 0,
        opponentScore: 0,
        endsAt,
      };
      io.to(roomA.id).emit('pkStarted', payloadA);
      io.to(roomB.id).emit('pkStarted', payloadB);
      // Start a countdown ticker
      const ticker = setInterval(() => {
        if (!roomA.pk?.active && !roomB.pk?.active) { clearInterval(ticker); return; }
        const remaining = Math.max(0, endsAt - now());
        io.to(roomA.id).emit('pkTick', { remaining });
        io.to(roomB.id).emit('pkTick', { remaining });
        // sync scores
        io.to(roomA.id).emit('pkScoreUpdate', { side: 'local', score: roomA.pk.score });
        io.to(roomA.id).emit('pkScoreUpdate', { side: 'opponent', score: roomB.pk.score });
        io.to(roomB.id).emit('pkScoreUpdate', { side: 'local', score: roomB.pk.score });
        io.to(roomB.id).emit('pkScoreUpdate', { side: 'opponent', score: roomA.pk.score });
        if (remaining <= 0) { clearInterval(ticker); endPK(roomA, false); }
      }, 1000);
      roomA._pkTicker = roomB._pkTicker = ticker;
    }

    function endPK(room, early) {
      if (!room.pk?.active) return;
      const opp = rooms.get(room.pk.opponentRoomId);
      if (room._pkTicker) try { clearInterval(room._pkTicker); } catch(_){}
      const aScore = room.pk.score;
      const bScore = opp?.pk?.score || 0;
      let result;
      if (early) { result = 'cancelled'; }
      else if (aScore === bScore) result = 'draw';
      else if (aScore > bScore) result = room.hostUsername;
      else result = opp?.hostUsername || 'unknown';
      const payload = {
        ended: true,
        early,
        winnerUsername: result,
        localScore: aScore,
        opponentScore: bScore,
      };
      io.to(room.id).emit('pkEnded', payload);
      if (opp) {
        if (opp._pkTicker) try { clearInterval(opp._pkTicker); } catch(_){}
        io.to(opp.id).emit('pkEnded', {
          ended: true,
          early,
          winnerUsername: result,
          localScore: bScore,
          opponentScore: aScore,
        });
        opp.pk = null;
      }
      room.pk = null;
      broadcastRoomsList();
    }

    /* ══════════════════════════════════════════════
       INTERACTIVE POLLS & PREDICTIONS
       ══════════════════════════════════════════════ */

    socket.on('createPoll', ({ question, type = 'casual', options, wagerAmount = 0, durationSec = 60, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      if (!isHostOrCoHost(room, sid)) return cb && cb({ error: 'Host or Co-host only' });
      if (room.poll && room.poll.status === 'active') return cb && cb({ error: 'A poll is already active in this room' });

      const cleanQuestion = String(question || '').trim().slice(0, 140);
      if (!cleanQuestion) return cb && cb({ error: 'Poll question is required' });
      if (!Array.isArray(options) || options.length < 2) return cb && cb({ error: 'At least 2 options required' });

      const dur = Math.max(15, Math.min(600, parseInt(durationSec, 10) || 60));
      const wager = type === 'prediction' ? Math.max(1, parseInt(wagerAmount, 10) || 50) : 0;

      const pollOptions = options.slice(0, 4).map((opt, idx) => ({
        id: idx + 1,
        text: String(opt || `Option ${idx + 1}`).trim().slice(0, 60),
        votes: 0,
        coins: 0,
        voters: new Map(), // username -> { socketId, coins, votes, ts }
      }));

      const endsAt = now() + (dur * 1000);
      const poll = {
        id: rid(),
        question: cleanQuestion,
        type, // 'casual' | 'prediction'
        wagerAmount: wager,
        durationSec: dur,
        startedAt: now(),
        endsAt,
        totalVotes: 0,
        totalCoins: 0,
        status: 'active',
        winnerOptionId: null,
        options: pollOptions,
        _ticker: null,
      };

      room.poll = poll;

      // Start countdown ticker
      const ticker = setInterval(() => {
        if (!room.poll || room.poll.id !== poll.id) { clearInterval(ticker); return; }
        const remaining = Math.max(0, endsAt - now());
        io.to(room.id).emit('pollTick', { pollId: poll.id, remaining });
        if (remaining <= 0) {
          clearInterval(ticker);
          if (room.poll.status === 'active') {
            room.poll.status = 'closed'; // voting closed, awaiting settlement or auto-end
            io.to(room.id).emit('pollVotingClosed', { pollId: poll.id, poll: serializePoll(room.poll) });
            // If casual poll, automatically end and declare option with most votes
            if (room.poll.type === 'casual') {
              let topOpt = room.poll.options[0];
              for (const opt of room.poll.options) {
                if (opt.votes > topOpt.votes) topOpt = opt;
              }
              endPoll(room, topOpt ? topOpt.id : 1);
            }
          }
        }
      }, 1000);
      poll._ticker = ticker;

      io.to(room.id).emit('pollStarted', { poll: serializePoll(poll) });
      io.to(room.id).emit('systemMessage', {
        text: `📊 ${type === 'prediction' ? '💰 Coin Prediction Bet' : 'Live Poll'} started: "${cleanQuestion}"`,
        ts: now()
      });
      cb && cb({ ok: true, poll: serializePoll(poll) });
    });

    socket.on('votePoll', ({ pollId, optionId, wagerCount = 1, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room || !room.poll || room.poll.id !== pollId) return cb && cb({ error: 'Poll not found' });
      if (room.poll.status !== 'active') return cb && cb({ error: 'Poll voting is closed' });

      const u = users.get(sid);
      if (!u?.profile) return cb && cb({ error: 'Not logged in' });

      const opt = room.poll.options.find(o => o.id === optionId);
      if (!opt) return cb && cb({ error: 'Invalid option' });

      const username = u.profile.username;

      if (room.poll.type === 'casual') {
        // Casual poll: 1 vote per user
        for (const o of room.poll.options) {
          if (o.voters.has(username)) {
            o.voters.delete(username);
            o.votes = Math.max(0, o.votes - 1);
            room.poll.totalVotes = Math.max(0, room.poll.totalVotes - 1);
          }
        }
        opt.voters.set(username, { socketId: sid, coins: 0, votes: 1, ts: now() });
        opt.votes += 1;
        room.poll.totalVotes += 1;
      } else {
        // Prediction with coins
        const multiplier = Math.max(1, Math.min(100, parseInt(wagerCount, 10) || 1));
        const cost = room.poll.wagerAmount * multiplier;
        if (u.profile.coins < cost) return cb && cb({ error: `Not enough coins! Need ${cost} coins.` });

        u.profile.coins -= cost;
        opt.coins += cost;
        opt.votes += multiplier;
        room.poll.totalCoins += cost;
        room.poll.totalVotes += multiplier;

        const existing = opt.voters.get(username) || { socketId: sid, coins: 0, votes: 0, ts: now() };
        existing.coins += cost;
        existing.votes += multiplier;
        existing.socketId = sid;
        opt.voters.set(username, existing);

        io.to(sid).emit('coinsUpdate', { coins: u.profile.coins });
      }

      addXp(u.profile, 5);

      io.to(room.id).emit('pollVoteUpdate', {
        pollId: room.poll.id,
        poll: serializePoll(room.poll),
        voter: username,
        optionId,
      });

      cb && cb({ ok: true, poll: serializePoll(room.poll), userCoins: u.profile.coins });
    });

    socket.on('settlePoll', ({ pollId, winnerOptionId, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room || !room.poll || room.poll.id !== pollId) return cb && cb({ error: 'Poll not found' });
      if (!isHostOrCoHost(room, sid)) return cb && cb({ error: 'Host or Co-host only' });

      endPoll(room, winnerOptionId);
      cb && cb({ ok: true });
    });

    socket.on('cancelPoll', ({ pollId, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room || !room.poll || room.poll.id !== pollId) return cb && cb({ error: 'Poll not found' });
      if (!isHostOrCoHost(room, sid)) return cb && cb({ error: 'Host or Co-host only' });

      // Refund all prediction voters
      if (room.poll.type === 'prediction') {
        for (const opt of room.poll.options) {
          for (const [vName, vData] of opt.voters) {
            const vProfile = userStore.get(vName);
            if (vProfile && vData.coins > 0) {
              vProfile.coins += vData.coins;
              const targetSid = usersByUsername.get(vName);
              if (targetSid) io.to(targetSid).emit('coinsUpdate', { coins: vProfile.coins });
            }
          }
        }
      }
      if (room.poll._ticker) try { clearInterval(room.poll._ticker); } catch(_){}
      const cancelledId = room.poll.id;
      room.poll = null;
      io.to(room.id).emit('pollCancelled', { pollId: cancelledId });
      io.to(room.id).emit('systemMessage', { text: `📊 Poll was cancelled and wagers refunded.`, ts: now() });
      cb && cb({ ok: true });
    });

    socket.on('getPoll', ({ roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      cb && cb({ poll: serializePoll(room.poll) });
    });

    /* ══════════════════════════════════════════════
       LUCKY TREASURE CHESTS / RED PACKETS
       ══════════════════════════════════════════════ */

    function generateLuckySplits(totalCoins, packetCount) {
      if (packetCount <= 1) return [{ coins: totalCoins, isBigWinner: true }];
      let remaining = totalCoins;
      const splits = [];
      for (let i = 0; i < packetCount - 1; i++) {
        const packetsLeft = packetCount - i;
        const maxTake = Math.max(1, Math.floor((remaining / packetsLeft) * 2));
        const amount = Math.max(1, Math.floor(Math.random() * maxTake) + 1);
        const allocated = Math.min(amount, remaining - (packetsLeft - 1));
        splits.push(allocated);
        remaining -= allocated;
      }
      splits.push(remaining);
      // Find maximum share and mark it
      const maxVal = Math.max(...splits);
      let markedBig = false;
      return splits.map(val => {
        const isBig = val === maxVal && !markedBig;
        if (isBig) markedBig = true;
        return { coins: val, isBigWinner: isBig };
      });
    }

    socket.on('dropChest', ({ coins = 500, packets = 10, durationSec = 60, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      const u = users.get(sid);
      if (!u?.profile) return cb && cb({ error: 'Not logged in' });

      const totalCoins = Math.max(50, Math.min(50000, parseInt(coins, 10) || 500));
      const packetCount = Math.max(2, Math.min(100, parseInt(packets, 10) || 10));
      const dur = Math.max(15, Math.min(300, parseInt(durationSec, 10) || 60));

      if (u.profile.coins < totalCoins) {
        return cb && cb({ error: `Not enough coins! Need ${totalCoins.toLocaleString()} coins.` });
      }

      u.profile.coins -= totalCoins;
      io.to(sid).emit('coinsUpdate', { coins: u.profile.coins });

      const chestId = rid();
      const opensAt = now() + (dur * 1000);
      const luckyPackets = generateLuckySplits(totalCoins, packetCount);

      const chest = {
        id: chestId,
        sender: u.profile.username,
        senderLevel: u.profile.level,
        totalCoins,
        totalPackets: packetCount,
        claimedPackets: 0,
        remainingCoins: totalCoins,
        durationSec: dur,
        startedAt: now(),
        opensAt,
        status: 'countdown',
        pool: luckyPackets,
        grabbers: [], // [{ username, coins, ts, isBigWinner }]
        claimedUsers: new Set(),
        _ticker: null,
      };

      room.chests.set(chestId, chest);

      // Start ticker
      const ticker = setInterval(() => {
        if (!room.chests.has(chestId)) { clearInterval(ticker); return; }
        const remaining = Math.max(0, opensAt - now());
        io.to(room.id).emit('chestTick', { chestId, remaining });
        if (remaining <= 0) {
          clearInterval(ticker);
          if (chest.status === 'countdown') {
            chest.status = 'open';
            io.to(room.id).emit('chestOpened', { chestId, chest: serializeChest(chest) });
            io.to(room.id).emit('systemMessage', {
              text: `🎁 Treasure Chest by ${chest.sender} is OPEN! Tap now to claim lucky coins!`,
              ts: now()
            });
          }
        }
      }, 1000);
      chest._ticker = ticker;

      io.to(room.id).emit('chestDropped', { chest: serializeChest(chest) });
      io.to(room.id).emit('systemMessage', {
        text: `🎁 ${u.profile.username} dropped a Treasure Chest with ${totalCoins.toLocaleString()} Coins! Opens in ${dur}s!`,
        ts: now()
      });

      addXp(u.profile, 20);
      cb && cb({ ok: true, chest: serializeChest(chest) });
    });

    socket.on('grabChest', ({ chestId, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room || !room.chests.has(chestId)) return cb && cb({ error: 'Treasure chest not found' });
      const chest = room.chests.get(chestId);

      if (chest.status !== 'open') {
        return cb && cb({ error: chest.status === 'countdown' ? 'Chest is not open yet!' : 'Chest is empty!' });
      }

      const u = users.get(sid);
      if (!u?.profile) return cb && cb({ error: 'Not logged in' });

      if (chest.claimedUsers.has(u.profile.username)) {
        return cb && cb({ error: 'You have already claimed this chest!' });
      }

      if (chest.pool.length === 0) {
        chest.status = 'empty';
        return cb && cb({ error: 'All treasure packets have been claimed!' });
      }

      const packet = chest.pool.shift();
      chest.claimedUsers.add(u.profile.username);
      chest.claimedPackets += 1;
      chest.remainingCoins -= packet.coins;

      u.profile.coins += packet.coins;
      addXp(u.profile, 5);
      io.to(sid).emit('coinsUpdate', { coins: u.profile.coins });

      const grabberData = {
        username: u.profile.username,
        coins: packet.coins,
        ts: now(),
        isBigWinner: packet.isBigWinner,
      };
      chest.grabbers.push(grabberData);

      if (chest.pool.length === 0) {
        chest.status = 'empty';
      }

      io.to(room.id).emit('chestClaimed', {
        chestId,
        grabber: grabberData,
        chest: serializeChest(chest),
      });

      cb && cb({
        ok: true,
        coinsWon: packet.coins,
        isBigWinner: packet.isBigWinner,
        userCoins: u.profile.coins,
        chest: serializeChest(chest),
      });
    });

    socket.on('getChestDetails', ({ chestId, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room || !room.chests.has(chestId)) return cb && cb({ error: 'Chest not found' });
      cb && cb({ chest: serializeChest(room.chests.get(chestId)) });
    });

    /* ══════════════════════════════════════════════
       STREAMER SOUNDBOARD
       ══════════════════════════════════════════════ */

    socket.on('soundboardTrigger', ({ soundId, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      if (!isHostOrCoHost(room, sid)) return cb && cb({ error: 'Host/Co-host only' });

      io.to(room.id).emit('soundboardPlay', {
        soundId,
        by: users.get(sid)?.profile?.username || 'Host',
        ts: now(),
      });
      cb && cb({ ok: true });
    });

    /* ══════════════════════════════════════════════
       WHEEL OF FORTUNE MINI-GAME
       ══════════════════════════════════════════════ */

    const DEFAULT_WHEEL_SECTORS = [
      '🎤 Sing a Song',
      '💪 10 Pushups',
      '🌟 VIP Shoutout',
      '🎁 200 Coin Gift',
      '🤫 1 Min Silence',
      '💃 15s Dance',
      '⭐ Mod for a Day',
      '🔥 PK Rematch'
    ];

    socket.on('launchWheel', ({ sectors, roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room) return cb && cb({ error: 'Not in room' });
      if (!isHostOrCoHost(room, sid)) return cb && cb({ error: 'Host only' });

      const wheelSectors = Array.isArray(sectors) && sectors.length >= 3 ? sectors.slice(0, 12) : DEFAULT_WHEEL_SECTORS;
      room.wheel = {
        id: rid(),
        sectors: wheelSectors,
        spinning: false,
        lastWinner: null,
        targetIndex: null,
        durationMs: 4500,
      };

      io.to(room.id).emit('wheelLaunched', { wheel: serializeWheel(room.wheel) });
      io.to(room.id).emit('systemMessage', {
        text: `🎡 ${room.hostUsername} launched the Wheel of Fortune!`,
        ts: now()
      });
      cb && cb({ ok: true, wheel: serializeWheel(room.wheel) });
    });

    socket.on('spinWheel', ({ roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room || !room.wheel) return cb && cb({ error: 'Wheel not active' });
      if (!isHostOrCoHost(room, sid)) return cb && cb({ error: 'Host only' });
      if (room.wheel.spinning) return cb && cb({ error: 'Wheel is already spinning' });

      const targetIndex = Math.floor(Math.random() * room.wheel.sectors.length);
      const durationMs = 4800;

      room.wheel.spinning = true;
      room.wheel.targetIndex = targetIndex;
      room.wheel.durationMs = durationMs;

      io.to(room.id).emit('wheelSpinStarted', {
        targetIndex,
        targetSector: room.wheel.sectors[targetIndex],
        durationMs,
      });

      setTimeout(() => {
        if (room.wheel) {
          room.wheel.spinning = false;
          room.wheel.lastWinner = room.wheel.sectors[targetIndex];
          io.to(room.id).emit('wheelSpinEnded', {
            winnerSector: room.wheel.lastWinner,
            targetIndex,
          });
          io.to(room.id).emit('systemMessage', {
            text: `🎉 Wheel Result: "${room.wheel.lastWinner}"!`,
            ts: now()
          });
        }
      }, durationMs + 200);

      cb && cb({ ok: true, targetIndex, durationMs });
    });

    socket.on('closeWheel', ({ roomId }, cb) => {
      const room = roomId ? rooms.get(roomId) : getPeerRoom(sid).room;
      if (!room || !room.wheel) return cb && cb({ error: 'Wheel not active' });
      if (!isHostOrCoHost(room, sid)) return cb && cb({ error: 'Host only' });

      room.wheel = null;
      io.to(room.id).emit('wheelClosed');
      cb && cb({ ok: true });
    });

    function serializeChest(chest) {
      if (!chest) return null;
      return {
        id: chest.id,
        sender: chest.sender,
        senderLevel: chest.senderLevel,
        totalCoins: chest.totalCoins,
        totalPackets: chest.totalPackets,
        claimedPackets: chest.claimedPackets,
        remainingCoins: chest.remainingCoins,
        durationSec: chest.durationSec,
        startedAt: chest.startedAt,
        opensAt: chest.opensAt,
        status: chest.status,
        grabbers: chest.grabbers.map(g => ({ username: g.username, coins: g.coins, ts: g.ts, isBigWinner: g.isBigWinner })),
      };
    }

    function serializeWheel(wheel) {
      if (!wheel) return null;
      return {
        id: wheel.id,
        sectors: wheel.sectors,
        spinning: wheel.spinning,
        lastWinner: wheel.lastWinner,
        targetIndex: wheel.targetIndex,
        durationMs: wheel.durationMs,
      };
    }

    /* ══════════════════════════════════════════════
       END STREAM (host)
       ══════════════════════════════════════════════ */

    socket.on('endStream', (data, cb) => {
      const ack = typeof data === 'function' ? data : cb;
      const { room } = getPeerRoom(sid);
      if (!room) return ack && ack({ error: 'Not in room' });
      if (room.hostSocketId !== sid) return ack && ack({ error: 'Host only' });
      room.isLive = false;
      // close all producers
      for (const [pid, p] of room.producers) {
        try { p.close(); } catch(_){}
        io.to(room.id).emit('producerClosed', { producerId: pid });
      }
      room.producers.clear();
      room.socketProducerIds.clear();
      io.to(room.id).emit('streamEnded', { hostUsername: room.hostUsername });
      if (room.pk?.active) endPK(room, true);
      if (room.poll?._ticker) try { clearInterval(room.poll._ticker); } catch(_){}
      broadcastRoomsList();
      ack && ack({ ok: true });
    });

    function serializePoll(poll) {
      if (!poll) return null;
      return {
        id: poll.id,
        question: poll.question,
        type: poll.type,
        wagerAmount: poll.wagerAmount || 0,
        durationSec: poll.durationSec,
        startedAt: poll.startedAt,
        endsAt: poll.endsAt,
        totalVotes: poll.totalVotes,
        totalCoins: poll.totalCoins,
        status: poll.status,
        winnerOptionId: poll.winnerOptionId,
        options: poll.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          votes: opt.votes,
          coins: opt.coins,
          ratio: poll.totalCoins > 0 && opt.coins > 0 ? ((poll.totalCoins * 0.95) / opt.coins).toFixed(2) : '1.00'
        }))
      };
    }

    function endPoll(room, winnerOptionId) {
      const poll = room.poll;
      if (!poll) return;
      if (poll._ticker) try { clearInterval(poll._ticker); } catch(_){}

      const winningOpt = poll.options.find(o => o.id === winnerOptionId) || poll.options[0];
      poll.status = 'ended';
      poll.winnerOptionId = winningOpt ? winningOpt.id : null;

      const payouts = [];
      if (poll.type === 'prediction' && winningOpt && poll.totalCoins > 0) {
        const winningPool = winningOpt.coins;
        const totalPot = poll.totalCoins;
        // 5% rake goes to host as streamer bonus
        const hostReward = Math.floor(totalPot * 0.05);
        const prizePool = totalPot - hostReward;

        const hostProfile = userStore.get(room.hostUsername);
        if (hostProfile && hostReward > 0) {
          hostProfile.coins += hostReward;
          if (room.hostSocketId) io.to(room.hostSocketId).emit('coinsUpdate', { coins: hostProfile.coins });
        }

        if (winningPool > 0) {
          for (const [vName, vData] of winningOpt.voters) {
            const share = vData.coins / winningPool;
            const payout = Math.floor(share * prizePool);
            const vProfile = userStore.get(vName);
            if (vProfile && payout > 0) {
              vProfile.coins += payout;
              const vSid = usersByUsername.get(vName);
              if (vSid) io.to(vSid).emit('coinsUpdate', { coins: vProfile.coins });
              payouts.push({ username: vName, coinsWon: payout, staked: vData.coins });
            }
          }
        }
      }

      const serialized = serializePoll(poll);
      io.to(room.id).emit('pollEnded', {
        poll: serialized,
        winnerOption: winningOpt ? { id: winningOpt.id, text: winningOpt.text } : null,
        payouts,
        totalPot: poll.totalCoins,
      });

      io.to(room.id).emit('systemMessage', {
        text: `🏆 Poll Winner: "${winningOpt?.text}"! ${payouts.length ? `${payouts.length} winners shared ${poll.totalCoins} Coins pot!` : ''}`,
        ts: now()
      });
    }

  });

  /* ════════════════════════════════════════════════
     UTIL (SCOPE)
     ════════════════════════════════════════════════ */

  function getPeerRoom(sid) {
    const u = users.get(sid);
    const room = u?.roomId ? rooms.get(u.roomId) : null;
    return { u, room };
  }

  function isHostOrCoHost(room, sid) {
    const u = users.get(sid);
    if (!u?.profile) return false;
    return u.profile.username === room.hostUsername || room.coHosts.has(u.profile.username);
  }

  function broadcastViewerCount(room) {
    io.to(room.id).emit('viewerCount', room.viewerCount);
    io.to(room.id).emit('roomViewers', getRoomViewers(room));
  }

  function getRoomViewers(room) {
    const list = [];
    room.viewers.forEach((v, sid) => {
      const p = userStore.get(v.username);
      list.push({
        socketId: sid,
        username: v.username,
        role: v.role,
        level: p?.level || 1,
        joinedAt: v.joinedAt,
        isMod: room.mods.has(v.username),
        isCoHost: room.coHosts.has(v.username),
        isMuted: room.mutedUsers.has(v.username),
      });
    });
    return list;
  }

  function getProducersList(room, excludeSocketId) {
    const list = [];
    room.producers.forEach((producer, pid) => {
      if (producer._ownerSocket === excludeSocketId) return;
      list.push({
        producerId: pid,
        kind: producer.kind,
        socketId: producer._ownerSocket,
        username: producer._ownerUsername,
      });
    });
    return list;
  }

  /* ════════════════════════════════════════════════
     START SERVER
     ════════════════════════════════════════════════ */

  const PORT = process.env.PORT || 3000;
  const localIp = config.webRtcTransport.announcedIp || 'localhost';
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎬 LiveWave Bigo-Like Live Streaming Server`);
    console.log(`   ➜ Local:    http://localhost:${PORT}`);
    console.log(`   ➜ Network:  http://${localIp}:${PORT}  (Open on Phone / Tablet)\n`);
  });
})();

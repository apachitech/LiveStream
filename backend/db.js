/**
 * LiveWave Production Database Engine
 * Atomic, high-performance file-backed JSON document store.
 * Persists all users, wallets, diamonds, transactions, creator withdrawals,
 * VOD stream replays, rules, and audit logs across server restarts.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_STATE = {
  users: {
    'Admin_Master': {
      username: 'Admin_Master',
      role: 'admin',
      level: 25,
      xp: 31250,
      coins: 50000,
      diamonds: 18500,
      avatarSeed: 'Admin_Master',
      followers: [],
      following: [],
      totalGiftsSent: 120,
      totalGiftsValue: 45000,
      totalGiftsReceived: 350,
      totalGiftsReceivedValue: 98000,
      streamsHosted: 15,
      bio: 'Platform Lead Administrator & WebRTC Engineer 🛡️',
      isBanned: false,
      isVerifiedStreamer: true,
      joinedAt: Date.now() - 30 * 86400000,
    },
    'Aria_Acoustic': {
      username: 'Aria_Acoustic',
      role: 'streamer',
      level: 14,
      xp: 9800,
      coins: 12500,
      diamonds: 34200,
      avatarSeed: 'Aria_Acoustic',
      followers: ['Admin_Master', 'CyberNova', 'StarlightAlex'],
      following: ['Admin_Master'],
      totalGiftsSent: 45,
      totalGiftsValue: 12000,
      totalGiftsReceived: 890,
      totalGiftsReceivedValue: 245000,
      streamsHosted: 48,
      bio: 'Live acoustic guitar sessions, African pop & song requests 🎸',
      isBanned: false,
      isVerifiedStreamer: true,
      joinedAt: Date.now() - 20 * 86400000,
    },
    'ProGamer_Kai': {
      username: 'ProGamer_Kai',
      role: 'streamer',
      level: 18,
      xp: 16200,
      coins: 18400,
      diamonds: 52000,
      avatarSeed: 'ProGamer_Kai',
      followers: ['Aria_Acoustic', 'CyberNova'],
      following: ['Aria_Acoustic'],
      totalGiftsSent: 90,
      totalGiftsValue: 35000,
      totalGiftsReceived: 1420,
      totalGiftsReceivedValue: 380000,
      streamsHosted: 92,
      bio: 'Top ranked mobile esports fighter & PK Arena Champion 🏆',
      isBanned: false,
      isVerifiedStreamer: true,
      joinedAt: Date.now() - 25 * 86400000,
    },
    'ElenaDance': {
      username: 'ElenaDance',
      role: 'streamer',
      level: 16,
      xp: 12800,
      coins: 15200,
      diamonds: 29000,
      avatarSeed: 'ElenaDance',
      followers: ['StarlightAlex'],
      following: [],
      totalGiftsSent: 60,
      totalGiftsValue: 18000,
      totalGiftsReceived: 620,
      totalGiftsReceivedValue: 195000,
      streamsHosted: 64,
      bio: 'Afrobeats choreography, dance battles & studio sessions 💃',
      isBanned: false,
      isVerifiedStreamer: true,
      joinedAt: Date.now() - 15 * 86400000,
    },
    'CyberNova': {
      username: 'CyberNova',
      role: 'vip',
      level: 10,
      xp: 5000,
      coins: 45000,
      diamonds: 4500,
      avatarSeed: 'CyberNova',
      followers: [],
      following: ['Aria_Acoustic', 'ProGamer_Kai'],
      totalGiftsSent: 420,
      totalGiftsValue: 185000,
      totalGiftsReceived: 12,
      totalGiftsReceivedValue: 2400,
      streamsHosted: 2,
      bio: 'VIP Top Gifting Enthusiast & Supporter 💎',
      isBanned: false,
      isVerifiedStreamer: false,
      joinedAt: Date.now() - 10 * 86400000,
    },
    'StarlightAlex': {
      username: 'StarlightAlex',
      role: 'vip',
      level: 12,
      xp: 7200,
      coins: 68000,
      diamonds: 6200,
      avatarSeed: 'StarlightAlex',
      followers: [],
      following: ['Aria_Acoustic', 'ElenaDance'],
      totalGiftsSent: 580,
      totalGiftsValue: 240000,
      totalGiftsReceived: 25,
      totalGiftsReceivedValue: 5000,
      streamsHosted: 4,
      bio: 'Top Leaderboard Gifter ✨ Support creative African talent!',
      isBanned: false,
      isVerifiedStreamer: false,
      joinedAt: Date.now() - 12 * 86400000,
    },
  },
  transactions: [
    { id: 'tx_init1', username: 'CyberNova', packageId: 'pack_32k', coins: 32000, amountUsd: 24.99, amountCdf: 70000, method: 'Vodacom M-Pesa (DRC)', phone: '+243 819928172', status: 'COMPLETED', timestamp: Date.now() - 3600000 },
    { id: 'tx_init2', username: 'StarlightAlex', packageId: 'pack_70k', coins: 70000, amountUsd: 49.99, amountCdf: 140000, method: 'Airtel Money (DRC)', phone: '+243 971827361', status: 'COMPLETED', timestamp: Date.now() - 1800000 },
  ],
  withdrawals: [
    {
      id: 'wd_demo1',
      username: 'Aria_Acoustic',
      diamonds: 10000,
      amountUsd: 100.00,
      amountCdf: 280000,
      method: 'Vodacom M-Pesa (DRC)',
      accountPhone: '+243 81 554 2291',
      accountName: 'Aria Kabamba',
      status: 'APPROVED',
      requestedAt: Date.now() - 7200000,
      processedAt: Date.now() - 3600000,
      notes: 'Approved via automated M-Pesa payout API',
    },
    {
      id: 'wd_demo2',
      username: 'ProGamer_Kai',
      diamonds: 15000,
      amountUsd: 150.00,
      amountCdf: 420000,
      method: 'Airtel Money (DRC)',
      accountPhone: '+243 97 882 1044',
      accountName: 'Kai Mukendi',
      status: 'PENDING',
      requestedAt: Date.now() - 1800000,
      processedAt: null,
      notes: 'Awaiting admin queue review',
    },
  ],
  replays: [
    {
      id: 'vod_1',
      title: '🎸 Midnight Acoustic Live & Kinshasa Rumba',
      hostUsername: 'Aria_Acoustic',
      category: 'Music',
      tags: ['Acoustic', 'Guitar', 'LiveSession'],
      durationSeconds: 3840,
      viewCount: 4280,
      likes: 14500,
      diamondsEarned: 8400,
      recordedAt: Date.now() - 86400000,
      thumbnailIcon: '🎸',
      videoUrl: 'sample_vod_1.mp4',
    },
    {
      id: 'vod_2',
      title: '⚔️ PK Arena Grand Final 5-Round Showdown',
      hostUsername: 'ProGamer_Kai',
      category: 'Gaming',
      tags: ['PKArena', 'Battle', 'Tournament'],
      durationSeconds: 4520,
      viewCount: 6890,
      likes: 28400,
      diamondsEarned: 18200,
      recordedAt: Date.now() - 172800000,
      thumbnailIcon: '🏆',
      videoUrl: 'sample_vod_2.mp4',
    },
    {
      id: 'vod_3',
      title: '💃 Afro-Choreography Masterclass & Live Q&A',
      hostUsername: 'ElenaDance',
      category: 'Dance',
      tags: ['AfroDance', 'Choreography', 'Kinshasa'],
      durationSeconds: 2940,
      viewCount: 3120,
      likes: 9800,
      diamondsEarned: 5600,
      recordedAt: Date.now() - 259200000,
      thumbnailIcon: '💃',
      videoUrl: 'sample_vod_3.mp4',
    },
  ],
  rules: {
    minLevelToGoLive: 1,
    maxStreamDurationMinutes: 240,
    chatSlowModeSeconds: 0,
    autoModEnabled: true,
    bannedWords: ['scam', 'cheat', 'hack', 'hate', 'abuse', 'phishing'],
    giftCommissionRatePct: 15,
    defaultPkDurationSeconds: 180,
    diamondToUsdRate: 0.01, // 100 Diamonds = $1.00
    minWithdrawalDiamonds: 1000, // $10 minimum payout
    maintenanceMode: false,
    allowGuestSeats: true,
  },
  auditLogs: [
    { id: 'log-1', timestamp: Date.now() - 3600000, category: 'System', action: 'SERVER_BOOT', details: 'Persistent Database & WebRTC SFU engine online', actor: 'System' },
    { id: 'log-2', timestamp: Date.now() - 1800000, category: 'Role', action: 'ROLE_ASSIGNED', details: 'Granted [admin] role to Admin_Master', actor: 'System' },
    { id: 'log-3', timestamp: Date.now() - 900000, category: 'Economy', action: 'PAYOUT_APPROVED', details: 'Approved $100.00 M-Pesa payout to @Aria_Acoustic', actor: 'Admin_Master' },
  ],
};

let db = null;

function loadDatabase() {
  if (db) return db;

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(raw);
      // Merge with defaults in case of new schema keys
      db.users = { ...DEFAULT_STATE.users, ...(db.users || {}) };
      db.transactions = db.transactions || DEFAULT_STATE.transactions;
      db.withdrawals = db.withdrawals || DEFAULT_STATE.withdrawals;
      db.replays = db.replays || DEFAULT_STATE.replays;
      db.rules = { ...DEFAULT_STATE.rules, ...(db.rules || {}) };
      db.auditLogs = db.auditLogs || DEFAULT_STATE.auditLogs;
      return db;
    } catch (e) {
      console.warn('DB parse error, recreating from default:', e.message);
    }
  }

  db = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveDatabaseSync();
  return db;
}

let saveTimeout = null;

function saveDatabase() {
  if (!db) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDatabaseSync();
  }, 100);
}

function saveDatabaseSync() {
  if (!db) return;
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (e) {
    console.error('Failed to write database file:', e.message);
  }
}

// Initialize on require
loadDatabase();

module.exports = {
  // Users
  getUser(username) {
    loadDatabase();
    return db.users[username] || null;
  },

  ensureUser(username) {
    loadDatabase();
    if (!db.users[username]) {
      const isDefaultAdmin = username.toLowerCase().includes('admin') || username === 'Admin_Master';
      db.users[username] = {
        username,
        role: isDefaultAdmin ? 'admin' : 'user',
        level: 1,
        xp: 0,
        coins: 1000,
        diamonds: 0,
        avatarSeed: username,
        followers: [],
        following: [],
        totalGiftsSent: 0,
        totalGiftsValue: 0,
        totalGiftsReceived: 0,
        totalGiftsReceivedValue: 0,
        streamsHosted: 0,
        bio: '',
        isBanned: false,
        isVerifiedStreamer: false,
        joinedAt: Date.now(),
      };
      saveDatabase();
    }
    return db.users[username];
  },

  getAllUsers() {
    loadDatabase();
    return Object.values(db.users);
  },

  updateUser(username, updates) {
    loadDatabase();
    const u = this.ensureUser(username);
    Object.assign(u, updates);
    saveDatabase();
    return u;
  },

  // Transactions
  addTransaction(tx) {
    loadDatabase();
    db.transactions.unshift(tx);
    if (db.transactions.length > 500) db.transactions.pop();
    saveDatabase();
    return tx;
  },

  getUserTransactions(username) {
    loadDatabase();
    return db.transactions.filter(t => t.username.toLowerCase() === username.toLowerCase());
  },

  getAllTransactions() {
    loadDatabase();
    return db.transactions;
  },

  // Creator Withdrawals
  addWithdrawal(w) {
    loadDatabase();
    db.withdrawals.unshift(w);
    if (db.withdrawals.length > 500) db.withdrawals.pop();
    saveDatabase();
    return w;
  },

  getUserWithdrawals(username) {
    loadDatabase();
    return db.withdrawals.filter(w => w.username.toLowerCase() === username.toLowerCase());
  },

  getAllWithdrawals() {
    loadDatabase();
    return db.withdrawals;
  },

  updateWithdrawalStatus(id, status, notes = '', adminActor = 'Admin') {
    loadDatabase();
    const w = db.withdrawals.find(item => item.id === id);
    if (!w) return null;

    w.status = status;
    w.processedAt = Date.now();
    if (notes) w.notes = notes;
    saveDatabase();
    return w;
  },

  // VOD Replays
  addReplay(replay) {
    loadDatabase();
    db.replays.unshift(replay);
    if (db.replays.length > 100) db.replays.pop();
    saveDatabase();
    return replay;
  },

  getAllReplays() {
    loadDatabase();
    return db.replays;
  },

  // Rules
  getRules() {
    loadDatabase();
    return db.rules;
  },

  saveRules(rules) {
    loadDatabase();
    Object.assign(db.rules, rules);
    saveDatabase();
    return db.rules;
  },

  // Audit Logs
  addAuditLog(entry) {
    loadDatabase();
    db.auditLogs.unshift(entry);
    if (db.auditLogs.length > 300) db.auditLogs.pop();
    saveDatabase();
    return entry;
  },

  getAuditLogs() {
    loadDatabase();
    return db.auditLogs;
  },
};

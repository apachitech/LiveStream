// frontend/app.js — LiveWave Complete Client Engine
'use strict';

/* ══════════════════════════════════════════════════════
   1. UTILITIES & TOAST
   ══════════════════════════════════════════════════════ */
let _toastTimer;
function showToast(msg, ms = 3200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function $(id) { return document.getElementById(id); }

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const escapeHtml = escHtml;

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 70%, 50%)`;
}

function randomName() {
  const adj  = ['Neon', 'Hyper', 'Swift', 'Solar', 'Epic', 'Cosmic', 'Aura', 'Mystic', 'Vibe'];
  const noun = ['Star', 'Wave', 'Hero', 'Rider', 'Streamer', 'Legend', 'Master', 'Spark'];
  return adj[Math.random() * adj.length | 0] + noun[Math.random() * noun.length | 0] + (Math.random() * 900 + 100 | 0);
}

/* ══════════════════════════════════════════════════════
   2. SYNTHESIZED WEB AUDIO SFX ENGINE
   ══════════════════════════════════════════════════════ */
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSfx(type, opt = {}) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    if (type === 'coin') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'gift') {
      const comboMult = opt.combo ? Math.min(2.0, 1.0 + opt.combo * 0.08) : 1.0;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq * comboMult;
        gain.gain.setValueAtTime(0.18, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.45);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.45);
      });
    } else if (type === 'superchat') {
      // Brass Fanfare Triad
      [440, 554.37, 659.25, 880].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.12, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.7);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.7);
      });
    } else if (type === 'pkStart') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 1.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (type === 'victory') {
      [587.33, 739.99, 880, 1174.66].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.6);
      });
    } else if (type === 'heart') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'pollStart') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.4);
      });
    } else if (type === 'pollVote') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'pollPayout') {
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.7);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.7);
      });
    } else if (type === 'airhorn') {
      const freqs = [466.16, 466.16, 466.16, 622.25, 466.16, 622.25];
      const times = [0, 0.12, 0.24, 0.38, 0.52, 0.66];
      times.forEach((t, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freqs[i], now + t);
        gain.gain.setValueAtTime(0.22, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.18);
      });
    } else if (type === 'applause') {
      for (let i = 0; i < 28; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(Math.random() * 400 + 200, now + Math.random() * 1.1);
        gain.gain.setValueAtTime(0.08, now + Math.random() * 1.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 1.3);
      }
    } else if (type === 'drumroll') {
      for (let i = 0; i < 20; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150 + Math.random() * 40, now + i * 0.05);
        gain.gain.setValueAtTime(0.08 + i * 0.008, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.08);
      }
    } else if (type === 'sadtrombone') {
      const tbPitches = [311.13, 293.66, 277.18, 261.63];
      tbPitches.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.32);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.94, now + idx * 0.32 + 0.28);
        gain.gain.setValueAtTime(0.18, now + idx * 0.32);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.32 + 0.31);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.32);
        osc.stop(now + idx * 0.32 + 0.31);
      });
    } else if (type === 'laughtrack') {
      for (let i = 0; i < 7; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420 + (i % 2) * 90, now + i * 0.11);
        gain.gain.setValueAtTime(0.14, now + i * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.09);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.11);
        osc.stop(now + i * 0.11 + 0.09);
      }
    } else if (type === 'dramaticHit') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(85, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 1.3);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 1.3);
    } else if (type === 'laser') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.22);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'wow') {
      [523.25, 659.25, 783.99, 987.77, 1318.51].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.16, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.45);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.45);
      });
    } else if (type === 'wheelTick') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (type === 'chestOpen') {
      [440, 554.37, 659.25, 880, 1108.73, 1318.51].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.14, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.55);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.55);
      });
    }
  } catch (e) {
    console.warn('Audio SFX error:', e);
  }
}

/* ══════════════════════════════════════════════════════
   3. CLIENT STATE
   ══════════════════════════════════════════════════════ */
const state = {
  user: {
    username: localStorage.getItem('livewave_username') || randomName(),
    level: 1,
    xp: 0,
    coins: 1000,
    bio: '',
    followers: 0,
    following: 0,
    totalGiftsSent: 0,
    streamsHosted: 0,
  },
  currentRoom: null, // room object
  currentRole: null, // 'host' | 'viewer'
  device: null,
  sendTransport: null,
  recvTransport: null,
  producers: {},
  consumers: new Map(),
  localStream: null,
  screenStream: null,
  micOn: true,
  camOn: true,
  sharing: false,
  isLive: false,
  durationTimer: null,
  startedAt: null,
  activeFilter: 'none',
  selectedGift: null,
  giftMultiplier: 1,
  comboCount: 0,
  comboTimeout: null,
  superChatTier: 50,
  allRooms: [],
  activeCategory: 'all',
  searchQuery: '',
  activePoll: null,
  myVotedOptionId: null,
  selectedPollWager: 50,
  selectedPollDuration: 60,
  selectedPollType: 'casual',
  danmakuEnabled: true,
  activeChest: null,
  selectedChestCoins: 500,
  selectedChestPackets: 10,
  selectedChestDuration: 60,
  activeWheel: null,
  mediaRecorder: null,
  recordedChunks: [],
  isRecording: false,
};

/* ══════════════════════════════════════════════════════
   4. SOCKET.IO INITIALIZATION
   ══════════════════════════════════════════════════════ */
const socket = io({ transports: ['websocket', 'polling'] });

function socketEmit(ev, data = {}) {
  return new Promise((res, rej) => {
    socket.emit(ev, data, (reply) => {
      if (reply && reply.error) rej(new Error(reply.error));
      else res(reply);
    });
  });
}

socket.on('connect', async () => {
  showToast('⚡ Connected to LiveWave Network');
  try {
    const res = await socketEmit('setUsername', { username: state.user.username });
    if (res && res.profile) {
      Object.assign(state.user, res.profile);
      updateUserHeader();
    }
  } catch (e) {
    console.warn('setUsername err:', e.message);
  }
  refreshRoomsList();
});

socket.on('disconnect', () => showToast('⚠️ Disconnected from server', 4000));
socket.on('connect_error', (e) => showToast('❌ Connection error: ' + e.message, 4000));

/* ══════════════════════════════════════════════════════
   5. USER PROFILE & HEADER SYNC
   ══════════════════════════════════════════════════════ */
function updateUserHeader() {
  if ($('userCoins')) $('userCoins').textContent = state.user.coins.toLocaleString();
  if ($('drawerCoins')) $('drawerCoins').textContent = state.user.coins.toLocaleString();
  if ($('headerUsername')) $('headerUsername').textContent = state.user.username;
  if ($('headerLevel')) $('headerLevel').textContent = `Lv.${state.user.level}`;
  if ($('headerAvatar')) {
    $('headerAvatar').textContent = state.user.username.charAt(0).toUpperCase();
    $('headerAvatar').style.background = avatarColor(state.user.username);
  }
  localStorage.setItem('livewave_username', state.user.username);
}

socket.on('coinsUpdate', ({ coins }) => {
  state.user.coins = coins;
  updateUserHeader();
});

/* ══════════════════════════════════════════════════════
   6. PAGE NAVIGATION
   ══════════════════════════════════════════════════════ */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = $('page-' + name);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('logoBtn')?.addEventListener('click', () => {
  if (state.currentRoom) {
    if (confirm('Leave current stream to view the Lobby?')) leaveRoom();
  } else {
    showPage('lobby');
  }
});
$('roomBackBtn')?.addEventListener('click', () => {
  if (confirm('Leave stream and return to Lobby?')) leaveRoom();
});
$('heroExploreBtn')?.addEventListener('click', () => {
  $('roomsGrid')?.scrollIntoView({ behavior: 'smooth' });
});

/* Sound FX toggle */
$('soundToggleBtn')?.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  $('soundIcon').textContent = soundEnabled ? '🔊' : '🔇';
  showToast(soundEnabled ? 'Sound FX Enabled' : 'Sound FX Muted');
});

/* ══════════════════════════════════════════════════════
   7. LOBBY: ROOMS DISCOVERY & SEARCH
   ══════════════════════════════════════════════════ */
async function refreshRoomsList() {
  try {
    const list = await socketEmit('getRoomsList');
    state.allRooms = list || [];
    renderRoomsGrid();
    updateLobbyStats();
  } catch (e) {
    console.warn('refreshRoomsList:', e.message);
  }
}

socket.on('roomsList', (list) => {
  state.allRooms = list || [];
  renderRoomsGrid();
  updateLobbyStats();
});

function updateLobbyStats() {
  const liveCount = state.allRooms.length;
  let totalViewers = 0;
  state.allRooms.forEach(r => totalViewers += (r.viewerCount || 0));
  if ($('statLiveCount')) $('statLiveCount').textContent = liveCount;
  if ($('statViewerCount')) $('statViewerCount').textContent = totalViewers;
}

function renderRoomsGrid() {
  const grid = $('roomsGrid');
  const empty = $('emptyRoomsState');
  if (!grid) return;

  const filtered = state.allRooms.filter(r => {
    const matchCat = state.activeCategory === 'all' || (r.category && r.category.toLowerCase() === state.activeCategory.toLowerCase());
    const q = state.searchQuery.toLowerCase();
    const matchSearch = !q || (r.title && r.title.toLowerCase().includes(q)) || (r.hostUsername && r.hostUsername.toLowerCase().includes(q)) || (r.tags && r.tags.some(t => t.toLowerCase().includes(q)));
    return matchCat && matchSearch;
  });

  grid.innerHTML = '';
  if (filtered.length === 0) {
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  filtered.forEach(room => {
    const card = document.createElement('div');
    card.className = 'room-card';
    const hostInit = (room.hostUsername || 'S').charAt(0).toUpperCase();
    const color = avatarColor(room.hostUsername || '');

    card.innerHTML = `
      <div class="room-thumb">
        <div class="thumb-canvas-art" style="background:${color};"></div>
        <div class="room-thumb-icon">${getCategoryIcon(room.category)}</div>
        <div class="thumb-badge-live"><span class="pulse-red-dot"></span> LIVE</div>
        <div class="thumb-badge-viewers">👥 ${room.viewerCount || 0}</div>
        ${room.pkState?.active ? '<div class="thumb-badge-pk">⚔️ PK BATTLE</div>' : ''}
        <div class="room-audio-waves" aria-hidden="true">
          <div class="audio-wave-bar"></div>
          <div class="audio-wave-bar"></div>
          <div class="audio-wave-bar"></div>
          <div class="audio-wave-bar"></div>
        </div>
        <div class="room-card-hover-action" aria-hidden="true">
          <span class="btn-watch-chip">▶ Watch Live</span>
        </div>
      </div>
      <div class="room-meta">
        <div class="room-host-avatar" style="background:${color}">${hostInit}</div>
        <div class="room-details">
          <div class="room-title">${escHtml(room.title || 'Live Stream')}</div>
          <div class="room-host-info">
            <strong>${escHtml(room.hostUsername)}</strong>
            <span class="level-badge">Lv.${room.hostLevel || 1}</span>
          </div>
          <div class="room-tags-row">
            <span class="room-tag">${escHtml(room.category || 'Chat')}</span>
            ${(room.tags || []).slice(0, 2).map(t => `<span class="room-tag">#${escHtml(t)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => joinRoomAsViewer(room.id));
    grid.appendChild(card);
  });
}

function getCategoryIcon(cat) {
  switch (cat) {
    case 'Music': return '🎵';
    case 'Gaming': return '🎮';
    case 'Dance': return '💃';
    case 'Talent': return '🌟';
    case 'Educational': return '📚';
    case 'Sports': return '⚡';
    default: return '🎙️';
  }
}

/* Category pills filter */
document.querySelectorAll('.cat-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategory = btn.dataset.cat || 'all';
    playBeep?.(520, 'sine', 0.08);
    renderRoomsGrid();
  });
});

/* Search filter with keyboard shortcut ('/') */
$('globalSearchInput')?.addEventListener('input', (e) => {
  state.searchQuery = e.target.value.trim();
  renderRoomsGrid();
});

$('refreshRoomsBtn')?.addEventListener('click', () => {
  refreshRoomsList();
  showToast('🔄 Streams refreshed');
});

/* Keyboard shortcut ('/') to focus search */
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== $('globalSearchInput') && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    $('globalSearchInput')?.focus();
    $('globalSearchInput')?.select();
  }
});

/* Instant Interactive Demo Stream Button */
$('heroDemoBtn')?.addEventListener('click', async () => {
  initAudio();
  showToast('⚡ Launching Instant Demo Broadcast…', 3000);
  try {
    const demoTitle = `✨ LiveWave Interactive Studio Demo`;
    const res = await socketEmit('createRoom', { title: demoTitle, category: 'Gaming', tags: ['Demo', 'WebRTC', 'PK'] });
    await startBroadcastingHost(res.roomId, 'hd');
  } catch (e) {
    openCreateRoomModal();
  }
});

/* ══════════════════════════════════════════════════════
   8. CREATE ROOM (GO LIVE)
   ══════════════════════════════════════════════════ */
$('headerGoLiveBtn')?.addEventListener('click', openCreateRoomModal);
$('heroStartLiveBtn')?.addEventListener('click', openCreateRoomModal);
$('emptyStartStreamBtn')?.addEventListener('click', openCreateRoomModal);

function openCreateRoomModal() {
  initAudio();
  $('modalCreateRoom')?.classList.remove('hidden');
}
$('closeCreateRoomBtn')?.addEventListener('click', () => $('modalCreateRoom')?.classList.add('hidden'));
$('cancelCreateRoomBtn')?.addEventListener('click', () => $('modalCreateRoom')?.classList.add('hidden'));

$('submitStartStreamBtn')?.addEventListener('click', async () => {
  const title = $('streamTitleInput')?.value.trim() || `${state.user.username}'s Live Broadcast`;
  const category = $('streamCategorySelect')?.value || 'Chat';
  const tagsRaw = $('streamTagsInput')?.value || '';
  const tags = tagsRaw.split(',').map(s => s.trim()).filter(Boolean);
  const password = $('streamPasswordInput')?.value.trim() || null;
  const quality = $('streamQualitySelect')?.value || 'hd';

  $('submitStartStreamBtn').disabled = true;
  $('submitStartStreamBtn').textContent = '⏳ Initializing…';

  try {
    const res = await socketEmit('createRoom', { title, category, tags, password });
    $('modalCreateRoom')?.classList.add('hidden');
    $('submitStartStreamBtn').disabled = false;
    $('submitStartStreamBtn').textContent = '🔴 Start Broadcasting';

    await startBroadcastingHost(res.roomId, quality);
  } catch (e) {
    showToast('❌ Error creating stream: ' + e.message, 5000);
    $('submitStartStreamBtn').disabled = false;
    $('submitStartStreamBtn').textContent = '🔴 Start Broadcasting';
  }
});

/* ══════════════════════════════════════════════════════
   9. MEDIASOUP & WEBRTC BROADCAST ENGINE
   ══════════════════════════════════════════════════════ */
const qualityMap = {
  sd : { width: 640,  height: 480,  frameRate: 24 },
  hd : { width: 1280, height: 720,  frameRate: 30 },
  fhd: { width: 1920, height: 1080, frameRate: 30 },
};

async function loadDevice() {
  if (state.device) return;
  const rtpCapabilities = await socketEmit('getRouterRtpCapabilities');
  const device = new mediasoupClient.Device();
  await device.load({ routerRtpCapabilities: rtpCapabilities });
  state.device = device;
}

async function createSendTransport() {
  const { params } = await socketEmit('createWebRtcTransport', { consumer: false });
  const t = state.device.createSendTransport(params);

  t.on('connect', ({ dtlsParameters }, cb, eb) => {
    socketEmit('connectTransport', { transportId: t.id, dtlsParameters }).then(cb).catch(eb);
  });
  t.on('produce', ({ kind, rtpParameters, appData }, cb, eb) => {
    socketEmit('produce', { transportId: t.id, kind, rtpParameters, appData })
      .then(({ id }) => cb({ id }))
      .catch(eb);
  });

  state.sendTransport = t;
}

async function createRecvTransport() {
  const { params } = await socketEmit('createWebRtcTransport', { consumer: true });
  const t = state.device.createRecvTransport(params);

  t.on('connect', ({ dtlsParameters }, cb, eb) => {
    socketEmit('connectTransport', { transportId: t.id, dtlsParameters }).then(cb).catch(eb);
  });

  state.recvTransport = t;
}

async function consumeProducer(producerId, isPkOpponent = false) {
  if (!state.recvTransport) await createRecvTransport();

  const { params } = await socketEmit('consume', {
    transportId    : state.recvTransport.id,
    producerId,
    rtpCapabilities: state.device.rtpCapabilities,
  });

  const consumer = await state.recvTransport.consume({
    id           : params.id,
    producerId   : params.producerId,
    kind         : params.kind,
    rtpParameters: params.rtpParameters,
  });
  state.consumers.set(consumer.id, consumer);

  const targetVideo = isPkOpponent ? $('pkOpponentVideo') : $('remoteVideo');
  const targetCard = isPkOpponent ? $('pkVideoCard') : $('remoteVideoCard');

  let stream = targetVideo.srcObject;
  if (!(stream instanceof MediaStream)) {
    stream = new MediaStream();
  }
  stream.addTrack(consumer.track);

  // Assign fresh stream reference so video element detects newly added tracks
  targetVideo.srcObject = new MediaStream(stream.getTracks());
  targetCard?.classList.remove('hidden');
  $('stageOffline')?.classList.add('hidden');

  // Resume consumer on server to trigger RTP delivery & keyframe
  socketEmit('resumeConsumer', { consumerId: consumer.id }).catch(e => console.warn('resumeConsumer err:', e.message));

  // Play stream with muted autoplay fallback
  targetVideo.play().catch(e => {
    console.warn('Unmuted autoplay blocked, retrying with muted:', e);
    targetVideo.muted = true;
    targetVideo.play().catch(err => console.error('Play error:', err));
  });

  return consumer;
}

socket.on('newProducer', async ({ producerId }) => {
  if (state.currentRole !== 'viewer' || !state.device) return;
  try {
    await consumeProducer(producerId);
  } catch (e) {
    console.warn('newProducer error:', e.message);
  }
});

socket.on('producerClosed', ({ producerId }) => {
  for (const [cid, consumer] of state.consumers.entries()) {
    if (consumer.producerId === producerId) {
      try { consumer.close(); } catch(_){}
      state.consumers.delete(cid);
    }
  }
});

/* ══════════════════════════════════════════════════════
   10. HOST: BROADCAST STUDIO
   ══════════════════════════════════════════════════ */
async function startBroadcastingHost(roomId, qualityKey) {
  state.currentRole = 'host';
  state.currentRoom = { id: roomId };
  showPage('room');

  // Setup UI for host
  $('hostHud')?.classList.remove('hidden');
  $('localVideoCard')?.classList.remove('hidden');
  $('remoteVideoCard')?.classList.add('hidden');
  $('roomHostName').textContent = state.user.username;
  $('roomHostLevel').textContent = `Lv.${state.user.level}`;
  $('roomHostAvatar').textContent = state.user.username.charAt(0).toUpperCase();
  $('roomFollowBtn')?.classList.add('hidden'); // host doesn't follow self

  try {
    await loadDevice();
    await createSendTransport();

    const q = qualityMap[qualityKey] || qualityMap.hd;
    try {
      state.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: q.width }, height: { ideal: q.height }, frameRate: { ideal: q.frameRate } },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
      });
    } catch (camErr) {
      console.warn('Physical camera/mic not accessible, using virtual streamer fallback:', camErr);
      state.localStream = createVirtualStreamerStream(state.user.username);
      showToast('✨ Broadcasting with Studio Virtual Camera');
    }

    const localVid = $('localVideo');
    localVid.srcObject = state.localStream;
    localVid.muted = true;
    localVid.play().catch(e => console.log('Local play error:', e));
    $('stageOffline')?.classList.add('hidden');

    const videoTrack = state.localStream.getVideoTracks()[0];
    const audioTrack = state.localStream.getAudioTracks()[0];

    if (videoTrack) state.producers.video = await state.sendTransport.produce({ track: videoTrack });
    if (audioTrack) state.producers.audio = await state.sendTransport.produce({ track: audioTrack });

    setStreamLive(true);
    showToast('🔴 You are now LIVE to the world!');
    addSystemMsg('Stream started. Welcome your audience!');
  } catch (e) {
    console.error('Broadcast host error:', e);
    showToast('❌ Broadcast error: ' + e.message, 5000);
  }
}

function createVirtualStreamerStream(username) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  let frame = 0;

  function render() {
    frame++;
    // Background gradient
    const grad = ctx.createRadialGradient(640, 360, 50, 640, 360, 600);
    grad.addColorStop(0, 'hsl(255, 45%, 20%)');
    grad.addColorStop(1, 'hsl(232, 35%, 8%)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    // Glowing circle behind avatar
    const pulse = Math.sin(frame * 0.05) * 20;
    ctx.save();
    ctx.beginPath();
    ctx.arc(640, 320, 120 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'hsla(335, 90%, 60%, 0.25)';
    ctx.fill();
    ctx.restore();

    // Avatar circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(640, 320, 100, 0, Math.PI * 2);
    ctx.fillStyle = avatarColor(username);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Avatar initial
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 80px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(username.charAt(0).toUpperCase(), 640, 325);
    ctx.restore();

    // Streamer Name & Live Badge
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(username, 640, 480);

    ctx.fillStyle = 'hsla(355, 85%, 60%, 0.9)';
    ctx.roundRect ? ctx.roundRect(580, 515, 120, 36, 18) : ctx.fillRect(580, 515, 120, 36);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText('● LIVE', 640, 538);

    // Sound waves simulation
    for (let i = 0; i < 20; i++) {
      const h = Math.abs(Math.sin(frame * 0.1 + i * 0.4)) * 60 + 10;
      ctx.fillStyle = 'hsla(190, 95%, 55%, 0.7)';
      ctx.fillRect(440 + i * 20, 620 - h / 2, 10, h);
    }

    requestAnimationFrame(render);
  }
  render();

  const videoStream = canvas.captureStream(30);
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const dst = audioCtx.createMediaStreamDestination();
  const gain = audioCtx.createGain();
  gain.gain.value = 0.001; // nearly silent carrier
  osc.connect(gain);
  gain.connect(dst);
  osc.start();

  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dst.stream.getAudioTracks(),
  ]);
  return combinedStream;
}

/* ══════════════════════════════════════════════════════
   11. VIEWER: JOIN STREAM
   ══════════════════════════════════════════════════ */
async function joinRoomAsViewer(roomId, password = null) {
  initAudio();
  state.currentRole = 'viewer';
  state.currentRoom = { id: roomId };
  showPage('room');

  // Setup UI for viewer
  $('hostHud')?.classList.add('hidden');
  $('localVideoCard')?.classList.add('hidden');
  $('remoteVideoCard')?.classList.remove('hidden');
  $('roomFollowBtn')?.classList.remove('hidden');

  try {
    const res = await socketEmit('joinRoom', { roomId, password, asHost: false });
    if (res && res.room) {
      $('roomHostName').textContent = res.room.hostUsername;
      $('roomStreamTitle').textContent = res.room.title;
      $('roomHostAvatar').textContent = res.room.hostUsername.charAt(0).toUpperCase();
      $('infoHostName').textContent = res.room.hostUsername;
      $('infoCategory').textContent = res.room.category;
    }

    await loadDevice();
    await createRecvTransport();

    const producers = await socketEmit('getProducers');
    if (producers && producers.length > 0) {
      for (const { producerId } of producers) {
        await consumeProducer(producerId);
      }
    }

    if (res && res.poll) {
      renderPollWidget(res.poll);
    }

    setStreamLive(true);
    showToast(`📺 Watching ${res?.room?.hostUsername || 'stream'}`);
    addSystemMsg(`You joined ${res?.room?.hostUsername || 'stream'}.`);
  } catch (e) {
    if (e.message && e.message.toLowerCase().includes('password') && !password) {
      const pwd = prompt('This stream is private. Please enter room password:');
      if (pwd) return joinRoomAsViewer(roomId, pwd);
    }
    console.error('Viewer join error:', e);
    showToast('❌ Could not join: ' + e.message, 5000);
    showPage('lobby');
  }
}

/* ══════════════════════════════════════════════════════
   12. STREAM TIMERS & STATE
   ══════════════════════════════════════════════════════ */
function setStreamLive(live) {
  state.isLive = live;
  if (live) {
    state.startedAt = Date.now();
    $('roomDuration').textContent = '⏱️ 00:00';
    state.durationTimer = setInterval(() => {
      const elapsed = Date.now() - state.startedAt;
      $('roomDuration').textContent = '⏱️ ' + formatTime(elapsed);
    }, 1000);
  } else {
    clearInterval(state.durationTimer);
  }
}

function leaveRoom() {
  setStreamLive(false);
  if (state.localStream) state.localStream.getTracks().forEach(t => t.stop());
  if (state.screenStream) state.screenStream.getTracks().forEach(t => t.stop());
  if (state.sendTransport) try { state.sendTransport.close(); } catch(_){}
  if (state.recvTransport) try { state.recvTransport.close(); } catch(_){}
  
  socket.emit('leaveRoom');
  state.currentRoom = null;
  state.currentRole = null;
  state.consumers.clear();
  state.producers = {};
  state.activePoll = null;
  state.myVotedOptionId = null;
  state.activeChest = null;
  state.activeWheel = null;
  $('stagePollWidget')?.classList.add('hidden');
  $('stageTreasureChest')?.classList.add('hidden');
  $('soundboardDrawer')?.classList.add('hidden');
  $('stageWheelOverlay')?.classList.add('hidden');
  
  showPage('lobby');
  refreshRoomsList();
}

$('roomLeaveBtn')?.addEventListener('click', () => {
  if (confirm('Exit stream and return to Lobby?')) leaveRoom();
});

/* ══════════════════════════════════════════════════════
   13. HOST HUD: MIC / CAM / SCREEN / FILTERS / END
   ══════════════════════════════════════════════════ */
$('hudMicBtn')?.addEventListener('click', toggleMic);
$('hudCamBtn')?.addEventListener('click', toggleCam);
$('hudScreenBtn')?.addEventListener('click', toggleScreenShare);
$('hudFilterBtn')?.addEventListener('click', () => $('modalFilters')?.classList.remove('hidden'));
$('hudEndBtn')?.addEventListener('click', endStream);

function toggleMic() {
  state.micOn = !state.micOn;
  if (state.localStream) state.localStream.getAudioTracks().forEach(t => t.enabled = state.micOn);
  if (state.producers.audio) {
    state.micOn ? state.producers.audio.resume() : state.producers.audio.pause();
    socketEmit(state.micOn ? 'resumeProducer' : 'pauseProducer', { producerId: state.producers.audio.id });
  }
  $('hudMicBtn').classList.toggle('muted', !state.micOn);
  showToast(state.micOn ? '🎙️ Mic Unmuted' : '🔇 Mic Muted');
}

function toggleCam() {
  state.camOn = !state.camOn;
  if (state.localStream) state.localStream.getVideoTracks().forEach(t => t.enabled = state.camOn);
  if (state.producers.video) {
    state.camOn ? state.producers.video.resume() : state.producers.video.pause();
    socketEmit(state.camOn ? 'resumeProducer' : 'pauseProducer', { producerId: state.producers.video.id });
  }
  $('hudCamBtn').classList.toggle('muted', !state.camOn);
  showToast(state.camOn ? '📷 Camera Enabled' : '🚫 Camera Disabled');
}

async function toggleScreenShare() {
  if (state.sharing) {
    if (state.screenStream) state.screenStream.getTracks().forEach(t => t.stop());
    const camTrack = state.localStream?.getVideoTracks()[0];
    if (camTrack && state.producers.video) {
      await state.producers.video.replaceTrack({ track: camTrack });
      $('localVideo').srcObject = state.localStream;
    }
    state.sharing = false;
    $('hudScreenBtn')?.classList.remove('active');
    showToast('Screen share ended');
  } else {
    try {
      state.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const screenTrack = state.screenStream.getVideoTracks()[0];
      if (state.producers.video) {
        await state.producers.video.replaceTrack({ track: screenTrack });
      }
      $('localVideo').srcObject = new MediaStream([screenTrack]);
      state.sharing = true;
      $('hudScreenBtn')?.classList.add('active');
      showToast('🖥️ Screen sharing active');
      screenTrack.addEventListener('ended', () => toggleScreenShare());
    } catch (e) {
      if (e.name !== 'NotAllowedError') showToast('Screen share error: ' + e.message);
    }
  }
}

function endStream() {
  if (!confirm('Are you sure you want to end the broadcast?')) return;
  const elapsed = state.startedAt ? Date.now() - state.startedAt : 0;
  
  leaveRoom();

  // Show summary modal
  if ($('sumDuration')) $('sumDuration').textContent = formatTime(elapsed);
  $('modalSummary')?.classList.remove('hidden');
  playSfx('victory');
}
$('closeSummaryBtn')?.addEventListener('click', () => $('modalSummary')?.classList.add('hidden'));

/* Video Filters */
document.querySelectorAll('.filter-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.filter-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    const f = card.dataset.filter;
    applyVideoFilter(f);
    $('modalFilters')?.classList.add('hidden');
    showToast(`Filter applied: ${card.querySelector('strong')?.textContent}`);
  });
});
$('closeFiltersBtn')?.addEventListener('click', () => $('modalFilters')?.classList.add('hidden'));

function applyVideoFilter(filterName) {
  const vid = $('localVideo');
  if (!vid) return;
  switch (filterName) {
    case 'beauty':
      vid.style.filter = 'brightness(1.08) contrast(1.04) saturate(1.15) blur(0.3px)';
      break;
    case 'cyberpunk':
      vid.style.filter = 'contrast(1.3) saturate(1.7) hue-rotate(-20deg)';
      break;
    case 'warm':
      vid.style.filter = 'sepia(0.2) saturate(1.3) brightness(1.05)';
      break;
    case 'cool':
      vid.style.filter = 'saturate(1.2) hue-rotate(180deg) brightness(0.95)';
      break;
    case 'noir':
      vid.style.filter = 'grayscale(1) contrast(1.4) brightness(0.9)';
      break;
    default:
      vid.style.filter = 'none';
  }
}

/* ══════════════════════════════════════════════════════
   14. PK BATTLE ARENA SYSTEM
   ══════════════════════════════════════════════════════ */
$('hudPkBtn')?.addEventListener('click', openPkChallengeModal);
$('closePkModalBtn')?.addEventListener('click', () => $('modalPKChallenge')?.classList.add('hidden'));

async function openPkChallengeModal() {
  const modal = $('modalPKChallenge');
  const list = $('pkStreamersList');
  if (!modal || !list) return;

  modal.classList.remove('hidden');
  list.innerHTML = 'Loading active streamers…';

  try {
    const rooms = await socketEmit('getRoomsList');
    const opponents = (rooms || []).filter(r => r.id !== state.currentRoom?.id);
    list.innerHTML = '';
    if (opponents.length === 0) {
      list.innerHTML = '<p class="modal-hint">No other active streams found. Wait for another creator to go live!</p>';
      return;
    }

    opponents.forEach(opp => {
      const row = document.createElement('div');
      row.className = 'supporter-item';
      row.innerHTML = `
        <div class="user-avatar-small" style="background:${avatarColor(opp.hostUsername)}">${opp.hostUsername.charAt(0).toUpperCase()}</div>
        <div style="flex:1;">
          <strong>${escHtml(opp.hostUsername)}</strong>
          <span style="display:block;font-size:0.75rem;color:var(--text-3);">${escHtml(opp.title)}</span>
        </div>
        <button class="btn btn-primary btn-sm" id="challengeBtn_${opp.id}">⚔️ Challenge</button>
      `;
      row.querySelector(`#challengeBtn_${opp.id}`).addEventListener('click', async () => {
        try {
          await socketEmit('pkRequest', { targetRoomId: opp.id });
          modal.classList.add('hidden');
          showToast(`⚔️ Challenge sent to ${opp.hostUsername}! Waiting for acceptance…`);
        } catch (e) {
          showToast('❌ ' + e.message);
        }
      });
      list.appendChild(row);
    });
  } catch (e) {
    list.innerHTML = '<p class="modal-hint">Error loading streamers.</p>';
  }
}

/* Incoming PK Invitation */
socket.on('pkInvite', ({ fromRoomId, fromHost, durationSec }) => {
  if (state.currentRole !== 'host') return;
  $('pkInviteHost').textContent = `${fromHost} has challenged you to a PK Battle!`;
  $('modalPkInvite')?.classList.remove('hidden');
  playSfx('pkStart');

  $('acceptPkBtn').onclick = async () => {
    try {
      await socketEmit('pkAccept', { fromRoomId });
      $('modalPkInvite')?.classList.add('hidden');
      showToast('🔥 PK Battle Accepted! Fight!');
    } catch (e) {
      showToast('❌ ' + e.message);
    }
  };

  $('declinePkBtn').onclick = () => {
    $('modalPkInvite')?.classList.add('hidden');
  };
});

socket.on('pkStarted', ({ opponentHost, score, opponentScore, endsAt }) => {
  playSfx('pkStart');
  $('pkArenaHeader')?.classList.remove('hidden');
  $('videoGrid')?.classList.remove('single-mode');
  $('videoGrid')?.classList.add('pk-mode');
  $('pkOpponentHostName').textContent = opponentHost;
  $('pkLocalScore').textContent = '0';
  $('pkOpponentScore').textContent = '0';
  $('pkBarBlue').style.width = '50%';
  $('pkBarRed').style.width = '50%';

  // Setup simulated/remote feed for PK opponent card
  const pkCard = $('pkVideoCard');
  const pkVid = $('pkOpponentVideo');
  if (pkCard && pkVid) {
    pkCard.classList.remove('hidden');
    $('pkOpponentTag').textContent = `PK: ${opponentHost}`;
    pkVid.srcObject = createVirtualStreamerStream(opponentHost);
    pkVid.muted = true;
    pkVid.play().catch(() => {});
  }

  showToast(`⚔️ PK BATTLE STARTED against ${opponentHost}! Shower gifts to win!`, 4500);
});

socket.on('pkTick', ({ remaining }) => {
  if ($('pkTimer')) $('pkTimer').textContent = formatTime(remaining);
});

socket.on('pkScoreUpdate', ({ side, score }) => {
  if (side === 'local') {
    if ($('pkLocalScore')) $('pkLocalScore').textContent = score.toLocaleString();
  } else {
    if ($('pkOpponentScore')) $('pkOpponentScore').textContent = score.toLocaleString();
  }

  const s1 = parseInt($('pkLocalScore')?.textContent.replace(/,/g, '') || '0', 10);
  const s2 = parseInt($('pkOpponentScore')?.textContent.replace(/,/g, '') || '0', 10);
  const total = s1 + s2;
  const pct1 = total > 0 ? Math.max(10, Math.min(90, Math.round((s1 / total) * 100))) : 50;
  if ($('pkBarBlue')) $('pkBarBlue').style.width = `${pct1}%`;
  if ($('pkBarRed')) $('pkBarRed').style.width = `${100 - pct1}%`;
});

socket.on('pkEnded', ({ result, winnerUsername, localScore, opponentScore }) => {
  $('pkArenaHeader')?.classList.add('hidden');
  $('videoGrid')?.classList.remove('pk-mode');
  $('videoGrid')?.classList.add('single-mode');
  $('pkVideoCard')?.classList.add('hidden');

  const won = winnerUsername === state.user.username;
  $('pkResultTitle').textContent = won ? '🎉 VICTORY! 🏆' : winnerUsername === 'draw' ? '🤝 TIE BATTLE' : '💥 DEFEAT';
  $('pkResultSub').textContent = `Final Score: Local ${localScore || 0} vs Opponent ${opponentScore || 0}`;
  $('pkResultOverlay')?.classList.remove('hidden');

  if (won) playSfx('victory');
});

$('closePkResultBtn')?.addEventListener('click', () => $('pkResultOverlay')?.classList.add('hidden'));

/* ══════════════════════════════════════════════════════
   14B. INTERACTIVE POLLS & PREDICTIONS SYSTEM
   ══════════════════════════════════════════════════════ */

$('hudPollBtn')?.addEventListener('click', openCreatePollModal);
$('closeCreatePollBtn')?.addEventListener('click', () => $('modalCreatePoll')?.classList.add('hidden'));
$('cancelCreatePollBtn')?.addEventListener('click', () => $('modalCreatePoll')?.classList.add('hidden'));

function openCreatePollModal() {
  initAudio();
  $('modalCreatePoll')?.classList.remove('hidden');
}

/* Poll Type Toggling: Casual vs Prediction */
$('pollTypeCasualBtn')?.addEventListener('click', () => {
  $('pollTypeCasualBtn').classList.add('active');
  $('pollTypePredictionBtn').classList.remove('active');
  $('predictionConfigBox')?.classList.add('hidden');
  state.selectedPollType = 'casual';
});

$('pollTypePredictionBtn')?.addEventListener('click', () => {
  $('pollTypePredictionBtn').classList.add('active');
  $('pollTypeCasualBtn').classList.remove('active');
  $('predictionConfigBox')?.classList.remove('hidden');
  state.selectedPollType = 'prediction';
});

/* Wager & Duration Chip Selectors */
document.querySelectorAll('.wager-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.wager-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.selectedPollWager = parseInt(chip.dataset.wager, 10) || 50;
  });
});

document.querySelectorAll('.duration-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.duration-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.selectedPollDuration = parseInt(chip.dataset.sec, 10) || 60;
  });
});

/* Add / Remove Dynamic Option Inputs */
$('addPollOptionBtn')?.addEventListener('click', () => {
  const list = $('pollInputsList');
  if (!list) return;
  const currentCount = list.querySelectorAll('.poll-option-row').length;
  if (currentCount >= 4) {
    showToast('Maximum 4 choices allowed');
    return;
  }
  const nextNum = currentCount + 1;
  const row = document.createElement('div');
  row.className = 'poll-option-row';
  row.innerHTML = `
    <span class="opt-num-badge color-${nextNum}">${nextNum}</span>
    <input type="text" class="input-field poll-opt-input" placeholder="Choice ${nextNum}" maxlength="50" />
    <button type="button" class="btn-remove-opt" title="Remove choice">✕</button>
  `;
  row.querySelector('.btn-remove-opt').addEventListener('click', () => {
    row.remove();
    // Re-index remaining rows
    list.querySelectorAll('.poll-option-row').forEach((r, idx) => {
      const badge = r.querySelector('.opt-num-badge');
      if (badge) {
        badge.className = `opt-num-badge color-${idx + 1}`;
        badge.textContent = idx + 1;
      }
    });
  });
  list.appendChild(row);
});

/* Launch Live Poll button */
$('submitLaunchPollBtn')?.addEventListener('click', async () => {
  const question = $('pollQuestionInput')?.value.trim();
  if (!question) return showToast('Please enter a poll question');

  const options = [];
  document.querySelectorAll('.poll-opt-input').forEach(inp => {
    const val = inp.value.trim();
    if (val) options.push(val);
  });

  if (options.length < 2) return showToast('Please provide at least 2 voting choices');

  $('submitLaunchPollBtn').disabled = true;
  $('submitLaunchPollBtn').textContent = '⏳ Launching…';

  try {
    const res = await socketEmit('createPoll', {
      question,
      type: state.selectedPollType,
      options,
      wagerAmount: state.selectedPollWager,
      durationSec: state.selectedPollDuration,
      roomId: state.currentRoom?.id,
    });

    $('modalCreatePoll')?.classList.add('hidden');
    $('submitLaunchPollBtn').disabled = false;
    $('submitLaunchPollBtn').textContent = '🚀 Launch Live Poll';

    state.activePoll = res.poll;
    state.myVotedOptionId = null;
    renderPollWidget(res.poll);
    showToast(`📊 Live ${res.poll.type === 'prediction' ? 'Coin Prediction' : 'Poll'} launched!`);
  } catch (e) {
    showToast('❌ Error starting poll: ' + e.message, 4500);
    $('submitLaunchPollBtn').disabled = false;
    $('submitLaunchPollBtn').textContent = '🚀 Launch Live Poll';
  }
});

/* Stage Widget Rendering & Interactive Actions */
function renderPollWidget(poll) {
  const widget = $('stagePollWidget');
  if (!widget || !poll || poll.status === 'cancelled') {
    widget?.classList.add('hidden');
    return;
  }

  state.activePoll = poll;
  widget.classList.remove('hidden');

  // Badge & Type
  const isPrediction = poll.type === 'prediction';
  const typeBadge = $('pollTypeBadge');
  if (typeBadge) {
    typeBadge.textContent = isPrediction ? '💰 COIN PREDICTION' : '🗳️ LIVE POLL';
    typeBadge.classList.toggle('prediction', isPrediction);
  }

  // Question & Stats
  if ($('pollQuestionText')) $('pollQuestionText').textContent = poll.question;
  if ($('pollTotalVotes')) $('pollTotalVotes').textContent = `👥 ${poll.totalVotes || 0} votes`;

  // Pot Amount (Prediction only)
  const potTag = $('pollPotTag');
  if (potTag) {
    if (isPrediction) {
      potTag.classList.remove('hidden');
      $('pollPotAmount').textContent = (poll.totalCoins || 0).toLocaleString();
    } else {
      potTag.classList.add('hidden');
    }
  }

  // Calculate percentages
  const totalWeight = isPrediction ? (poll.totalCoins || 0) : (poll.totalVotes || 0);

  // Render Options Container
  const container = $('pollOptionsContainer');
  if (container) {
    container.innerHTML = '';
    poll.options.forEach((opt, idx) => {
      const weight = isPrediction ? opt.coins : opt.votes;
      const pct = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : Math.round(100 / poll.options.length);

      const card = document.createElement('div');
      card.className = `poll-option-card ${state.myVotedOptionId === opt.id ? 'voted-by-me' : ''} ${poll.winnerOptionId === opt.id ? 'winner' : ''}`;

      const ratioBadge = isPrediction && opt.ratio ? `<span class="poll-opt-ratio">${opt.ratio}x</span>` : '';
      const voteBtnLabel = isPrediction
        ? `Bet ${poll.wagerAmount}🪙`
        : (state.myVotedOptionId === opt.id ? '✓ Voted' : 'Vote');

      card.innerHTML = `
        <div class="poll-opt-bar-fill color-${idx + 1}" style="width: ${pct}%;"></div>
        <div class="poll-opt-content">
          <div class="poll-opt-title-group">
            <span class="opt-bullet-num color-${idx + 1}">${idx + 1}</span>
            <span class="poll-opt-name">${escHtml(opt.text)}</span>
            ${ratioBadge}
          </div>
          <div class="poll-opt-stats">
            <span class="poll-opt-pct">${pct}%</span>
            ${poll.status === 'active' ? `<button class="poll-opt-vote-btn ${isPrediction ? 'bet-btn' : ''}" id="btnVote_${opt.id}">${voteBtnLabel}</button>` : ''}
          </div>
        </div>
      `;

      card.querySelector(`#btnVote_${opt.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        submitPollVote(poll.id, opt.id);
      });

      if (poll.status === 'active') {
        card.addEventListener('click', () => submitPollVote(poll.id, opt.id));
      }

      container.appendChild(card);
    });
  }

  // Host Controls (Declare Winner or Cancel)
  const isHost = state.currentRole === 'host';
  const cancelBtn = $('pollHostCancelBtn');
  const hostActions = $('pollHostActions');
  const settleBtns = $('pollHostSettleBtns');

  if (cancelBtn) cancelBtn.classList.toggle('hidden', !isHost || poll.status === 'ended');

  if (hostActions && settleBtns) {
    if (isHost && (poll.status === 'active' || poll.status === 'closed') && !poll.winnerOptionId) {
      hostActions.classList.remove('hidden');
      settleBtns.innerHTML = '';
      poll.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn-settle-opt';
        btn.textContent = `🏆 ${escHtml(opt.text)}`;
        btn.title = `Declare "${opt.text}" as winner and distribute payouts`;
        btn.addEventListener('click', () => {
          if (confirm(`Declare "${opt.text}" as the winner?`)) {
            settlePoll(poll.id, opt.id);
          }
        });
        settleBtns.appendChild(btn);
      });
    } else {
      hostActions.classList.add('hidden');
    }
  }
}

async function submitPollVote(pollId, optionId) {
  if (!state.activePoll || state.activePoll.status !== 'active') {
    return showToast('Voting for this poll is closed');
  }

  const isPrediction = state.activePoll.type === 'prediction';
  if (isPrediction && state.user.coins < state.activePoll.wagerAmount) {
    showToast(`🪙 Not enough coins! Need ${state.activePoll.wagerAmount} coins.`);
    openProfileModal();
    return;
  }

  try {
    const res = await socketEmit('votePoll', {
      pollId,
      optionId,
      wagerCount: 1,
      roomId: state.currentRoom?.id,
    });

    state.myVotedOptionId = optionId;
    if (res.userCoins !== undefined) {
      state.user.coins = res.userCoins;
      updateUserHeader();
    }

    playSfx('pollVote');
    showToast(isPrediction ? `💰 Staked ${state.activePoll.wagerAmount} Coins!` : '🗳️ Vote recorded!');
    renderPollWidget(res.poll);
  } catch (e) {
    showToast('❌ ' + e.message);
  }
}

async function settlePoll(pollId, winnerOptionId) {
  try {
    await socketEmit('settlePoll', { pollId, winnerOptionId, roomId: state.currentRoom?.id });
  } catch (e) {
    showToast('❌ ' + e.message);
  }
}

$('pollHostCancelBtn')?.addEventListener('click', async () => {
  if (!state.activePoll) return;
  if (!confirm('Cancel this active poll and refund all wagers?')) return;
  try {
    await socketEmit('cancelPoll', { pollId: state.activePoll.id, roomId: state.currentRoom?.id });
  } catch (e) {
    showToast('❌ ' + e.message);
  }
});

$('pollMinimizeBtn')?.addEventListener('click', () => {
  const widget = $('stagePollWidget');
  if (!widget) return;
  widget.classList.toggle('minimized');
  $('pollMinimizeBtn').textContent = widget.classList.contains('minimized') ? '▲' : '▼';
});

/* Socket Listeners for Polls */
socket.on('pollStarted', ({ poll }) => {
  state.activePoll = poll;
  state.myVotedOptionId = null;
  $('pollResultBanner')?.classList.add('hidden');
  playSfx('pollStart');
  renderPollWidget(poll);
  showToast(`📊 New ${poll.type === 'prediction' ? 'Coin Prediction' : 'Poll'}: "${poll.question}"`, 4000);
});

socket.on('pollTick', ({ pollId, remaining }) => {
  const timer = $('pollTimerBadge');
  if (timer) {
    timer.textContent = '⏱️ ' + formatTime(remaining);
    timer.classList.toggle('urgent', remaining <= 15000);
  }
});

socket.on('pollVoteUpdate', ({ poll, voter, optionId }) => {
  state.activePoll = poll;
  renderPollWidget(poll);
  if (voter !== state.user.username) {
    playSfx('coin');
  }
});

socket.on('pollVotingClosed', ({ poll }) => {
  state.activePoll = poll;
  if ($('pollTimerBadge')) {
    $('pollTimerBadge').textContent = '🔒 CLOSED';
    $('pollTimerBadge').classList.remove('urgent');
  }
  showToast('⏱️ Poll voting closed! Awaiting settlement…');
  renderPollWidget(poll);
});

socket.on('pollEnded', ({ poll, winnerOption, payouts, totalPot }) => {
  state.activePoll = poll;
  renderPollWidget(poll);
  playSfx('pollPayout');

  // Check if current user is among winners
  const myPayout = (payouts || []).find(p => p.username === state.user.username);
  const resultBanner = $('pollResultBanner');
  if (resultBanner) {
    resultBanner.classList.remove('hidden');
    $('pollWinnerResultText').textContent = `🏆 "${winnerOption?.text || 'Winner'}" Won!`;
    if (myPayout) {
      $('pollPayoutResultText').textContent = `🎉 You won +${myPayout.coinsWon.toLocaleString()} Coins!`;
      showToast(`🎉 CONGRATULATIONS! You won +${myPayout.coinsWon.toLocaleString()} Coins in prediction!`, 5500);
    } else if (poll.type === 'prediction') {
      $('pollPayoutResultText').textContent = `Total Pot: 🪙 ${(totalPot || 0).toLocaleString()} Coins distributed`;
    } else {
      $('pollPayoutResultText').textContent = `Voting concluded.`;
    }
  }

  // Auto dismiss widget after 9 seconds
  setTimeout(() => {
    if (state.activePoll?.status === 'ended') {
      $('stagePollWidget')?.classList.add('hidden');
      $('pollResultBanner')?.classList.add('hidden');
    }
  }, 9000);
});

socket.on('pollCancelled', () => {
  $('stagePollWidget')?.classList.add('hidden');
  state.activePoll = null;
  state.myVotedOptionId = null;
  showToast('📊 Poll was cancelled and wagers refunded.');
});

/* ══════════════════════════════════════════════════════
   14C. DANMAKU (FLYING BULLET SCREEN CHAT)
   ══════════════════════════════════════════════════════ */
function spawnDanmakuBullet(text, type = 'normal') {
  if (!state.danmakuEnabled) return;
  const container = $('danmakuContainer');
  if (!container) return;

  const span = document.createElement('span');
  span.className = `danmaku-bullet ${type}`;
  span.textContent = text;

  // Distribute over 6 vertical lanes
  const lane = Math.floor(Math.random() * 6);
  span.style.top = `${15 + lane * 13}%`;

  const dur = Math.random() * 2 + 6.5;
  span.style.animationDuration = `${dur}s`;

  container.appendChild(span);
  setTimeout(() => span.remove(), dur * 1000 + 400);
}

$('stageDanmakuBtn')?.addEventListener('click', () => {
  state.danmakuEnabled = !state.danmakuEnabled;
  $('stageDanmakuBtn').classList.toggle('active', state.danmakuEnabled);
  $('danmakuContainer')?.classList.toggle('hidden', !state.danmakuEnabled);
  showToast(state.danmakuEnabled ? '💬 Bullet Screen (Danmaku) Enabled' : '🔇 Bullet Screen Hidden');
});

/* ══════════════════════════════════════════════════════
   14D. STREAMER SOUNDBOARD FX PAD
   ══════════════════════════════════════════════════ */
$('hudSoundboardBtn')?.addEventListener('click', () => {
  initAudio();
  $('soundboardDrawer')?.classList.toggle('hidden');
});
$('closeSoundboardBtn')?.addEventListener('click', () => $('soundboardDrawer')?.classList.add('hidden'));

document.querySelectorAll('.sfx-tile').forEach(tile => {
  tile.addEventListener('click', async () => {
    const sfx = tile.dataset.sfx;
    if (!sfx) return;
    initAudio();
    playSfx(sfx);
    tile.classList.add('playing');
    setTimeout(() => tile.classList.remove('playing'), 300);

    if (state.currentRoom?.id) {
      socket.emit('soundboardTrigger', { soundId: sfx, roomId: state.currentRoom.id });
    }
  });
});

socket.on('soundboardPlay', ({ soundId, by }) => {
  initAudio();
  playSfx(soundId);
  showToast(`🎛️ ${by} played sound FX: ${soundId.toUpperCase()}`);
});

/* ══════════════════════════════════════════════════════
   14E. LUCKY TREASURE CHEST AIR-DROPS
   ══════════════════════════════════════════════════ */
$('hudChestBtn')?.addEventListener('click', () => {
  initAudio();
  $('modalDropChest')?.classList.remove('hidden');
});
$('closeDropChestBtn')?.addEventListener('click', () => $('modalDropChest')?.classList.add('hidden'));
$('cancelDropChestBtn')?.addEventListener('click', () => $('modalDropChest')?.classList.add('hidden'));

document.querySelectorAll('.chest-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chest-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.selectedChestCoins = parseInt(chip.dataset.coins, 10) || 500;
    if ($('dropCostLabel')) $('dropCostLabel').textContent = state.selectedChestCoins.toLocaleString();
  });
});

document.querySelectorAll('.packet-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.packet-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.selectedChestPackets = parseInt(chip.dataset.packets, 10) || 10;
  });
});

document.querySelectorAll('.chest-dur-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chest-dur-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.selectedChestDuration = parseInt(chip.dataset.sec, 10) || 60;
  });
});

$('submitDropChestBtn')?.addEventListener('click', async () => {
  $('submitDropChestBtn').disabled = true;
  $('submitDropChestBtn').textContent = '⏳ Dropping…';

  try {
    const res = await socketEmit('dropChest', {
      coins: state.selectedChestCoins,
      packets: state.selectedChestPackets,
      durationSec: state.selectedChestDuration,
      roomId: state.currentRoom?.id,
    });

    $('modalDropChest')?.classList.add('hidden');
    $('submitDropChestBtn').disabled = false;
    $('submitDropChestBtn').textContent = `🎁 Drop Chest (${state.selectedChestCoins} Coins)`;

    showToast(`🎁 Dropped a Lucky Treasure Chest with ${state.selectedChestCoins} Coins!`);
    playSfx('chestOpen');
  } catch (e) {
    showToast('❌ ' + e.message);
    $('submitDropChestBtn').disabled = false;
    $('submitDropChestBtn').textContent = `🎁 Drop Chest (${state.selectedChestCoins} Coins)`;
  }
});

socket.on('chestDropped', ({ chest }) => {
  state.activeChest = chest;
  renderTreasureChestWidget(chest);
  playSfx('chestOpen');
  spawnDanmakuBullet(`🎁 ${chest.sender} dropped a ${chest.totalCoins} Coin Treasure Chest!`, 'gift');
});

socket.on('chestTick', ({ chestId, remaining }) => {
  if (state.activeChest?.id === chestId) {
    if ($('chestTimerBadge')) $('chestTimerBadge').textContent = '⏱️ ' + formatTime(remaining);
  }
});

socket.on('chestOpened', ({ chestId, chest }) => {
  state.activeChest = chest;
  renderTreasureChestWidget(chest);
  playSfx('superchat');
  showToast('🎁 Treasure Chest is now OPEN! Tap to claim your coins!', 4500);
});

socket.on('chestClaimed', ({ chestId, grabber, chest }) => {
  state.activeChest = chest;
  renderTreasureChestWidget(chest);
  if (grabber.isBigWinner) {
    spawnDanmakuBullet(`👑 ${grabber.username} is BIG WINNER of +${grabber.coins} Coins!`, 'vip');
  }
});

function renderTreasureChestWidget(chest) {
  const el = $('stageTreasureChest');
  if (!el || !chest || chest.status === 'empty' || chest.status === 'expired') {
    el?.classList.add('hidden');
    return;
  }

  el.classList.remove('hidden');
  $('chestSenderLabel').textContent = `Drop by ${chest.sender}`;
  $('chestTotalTag').textContent = `${(chest.remainingCoins || chest.totalCoins).toLocaleString()}`;

  const claimBtn = $('btnClaimChest');
  if (claimBtn) {
    if (chest.status === 'open') {
      claimBtn.classList.remove('hidden');
      $('chestTimerBadge').textContent = '✨ OPEN NOW!';
    } else {
      claimBtn.classList.add('hidden');
    }
  }
}

$('btnClaimChest')?.addEventListener('click', async () => {
  if (!state.activeChest) return;
  try {
    const res = await socketEmit('grabChest', {
      chestId: state.activeChest.id,
      roomId: state.currentRoom?.id,
    });

    state.user.coins = res.userCoins;
    updateUserHeader();

    playSfx(res.isBigWinner ? 'victory' : 'coin');
    showToast(res.isBigWinner ? `👑 BIG WINNER! Claimed +${res.coinsWon} Coins from chest!` : `🎁 Claimed +${res.coinsWon} Coins!`);

    $('btnClaimChest')?.classList.add('hidden');
  } catch (e) {
    showToast('❌ ' + e.message);
  }
});

$('btnViewChestGrabbers')?.addEventListener('click', async () => {
  if (!state.activeChest) return;
  try {
    const res = await socketEmit('getChestDetails', { chestId: state.activeChest.id, roomId: state.currentRoom?.id });
    if (res && res.chest) {
      $('modalChestGrabbers')?.classList.remove('hidden');
      $('grabbersChestTitle').textContent = `Drop by ${res.chest.sender} (${res.chest.totalCoins} Coins)`;
      $('grabbersChestSub').textContent = `${res.chest.grabbers.length} / ${res.chest.totalPackets} packets claimed`;

      const list = $('chestGrabbersList');
      list.innerHTML = '';
      if (res.chest.grabbers.length === 0) {
        list.innerHTML = '<li class="supporter-item">No claims yet! Tap grab when opened.</li>';
      } else {
        res.chest.grabbers.forEach(g => {
          const item = document.createElement('li');
          item.className = 'supporter-item';
          item.innerHTML = `
            <div class="user-avatar-small" style="background:${avatarColor(g.username)}">${g.username.charAt(0).toUpperCase()}</div>
            <div style="flex:1;">
              <strong>${escHtml(g.username)} ${g.isBigWinner ? '<span class="level-badge" style="background:var(--gold);color:#000;">👑 LUCKY KING</span>' : ''}</strong>
              <span style="display:block;font-size:0.75rem;color:var(--text-3);">${new Date(g.ts).toLocaleTimeString()}</span>
            </div>
            <strong style="color:var(--gold);">+${g.coins} 🪙</strong>
          `;
          list.appendChild(item);
        });
      }
    }
  } catch (e) {
    showToast('❌ ' + e.message);
  }
});
$('closeGrabbersModalBtn')?.addEventListener('click', () => $('modalChestGrabbers')?.classList.add('hidden'));

/* ══════════════════════════════════════════════════
   14F. WHEEL OF FORTUNE MINI-GAME
   ══════════════════════════════════════════════════ */
$('hudWheelBtn')?.addEventListener('click', async () => {
  try {
    const res = await socketEmit('launchWheel', { roomId: state.currentRoom?.id });
    $('stageWheelOverlay')?.classList.remove('hidden');
    state.activeWheel = res.wheel;
    drawWheel(0);
  } catch (e) {
    showToast('❌ ' + e.message);
  }
});
$('closeWheelBtn')?.addEventListener('click', async () => {
  $('stageWheelOverlay')?.classList.add('hidden');
  if (state.currentRole === 'host') {
    socket.emit('closeWheel', { roomId: state.currentRoom?.id });
  }
});

socket.on('wheelLaunched', ({ wheel }) => {
  state.activeWheel = wheel;
  $('stageWheelOverlay')?.classList.remove('hidden');
  $('wheelWinnerBanner')?.classList.add('hidden');
  drawWheel(0);
  showToast('🎡 Host launched the Wheel of Fortune!');
});

socket.on('wheelClosed', () => {
  $('stageWheelOverlay')?.classList.add('hidden');
  state.activeWheel = null;
});

const WHEEL_COLORS = [
  '#00c6ff', '#ff2d75', '#ffd200', '#00b09b',
  '#c084fc', '#f97316', '#3b82f6', '#ec4899',
  '#10b981', '#6366f1', '#eab308', '#06b6d4'
];

function drawWheel(angle) {
  const canvas = $('wheelCanvas');
  if (!canvas || !state.activeWheel) return;
  const ctx = canvas.getContext('2d');
  const sectors = state.activeWheel.sectors;
  const numSectors = sectors.length;
  const arc = (Math.PI * 2) / numSectors;
  const radius = canvas.width / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(radius, radius);
  ctx.rotate(angle);

  sectors.forEach((sec, i) => {
    const startAngle = i * arc;
    const endAngle = startAngle + arc;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 4, startAngle, endAngle);
    ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Text Label
    ctx.save();
    ctx.rotate(startAngle + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(sec, radius - 18, 4);
    ctx.restore();
  });

  // Center hub
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#111827';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffd700';
  ctx.stroke();

  ctx.restore();
}

$('spinWheelBtn')?.addEventListener('click', async () => {
  if (state.currentRole !== 'host') return showToast('Host controls the wheel spin');
  try {
    $('spinWheelBtn').disabled = true;
    await socketEmit('spinWheel', { roomId: state.currentRoom?.id });
  } catch (e) {
    showToast('❌ ' + e.message);
    $('spinWheelBtn').disabled = false;
  }
});

socket.on('wheelSpinStarted', ({ targetIndex, durationMs }) => {
  if (!state.activeWheel) return;
  $('wheelWinnerBanner')?.classList.add('hidden');
  const sectors = state.activeWheel.sectors;
  const numSectors = sectors.length;
  const arc = (Math.PI * 2) / numSectors;

  // The pointer is at top (-PI/2)
  // Target center angle = -PI/2 - (targetIndex * arc + arc/2)
  const extraRotations = 6 * Math.PI * 2;
  const targetAngle = extraRotations + (Math.PI * 2 - (targetIndex * arc + arc / 2)) - Math.PI / 2;

  let start = null;
  let lastTickAngle = 0;

  function step(ts) {
    if (!start) start = ts;
    const progress = Math.min(1, (ts - start) / durationMs);
    // Cubic ease out
    const ease = 1 - Math.pow(1 - progress, 3);
    const currentAngle = targetAngle * ease;

    drawWheel(currentAngle);

    if (Math.abs(currentAngle - lastTickAngle) >= arc) {
      playSfx('wheelTick');
      lastTickAngle = currentAngle;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      $('spinWheelBtn').disabled = false;
    }
  }
  requestAnimationFrame(step);
});

socket.on('wheelSpinEnded', ({ winnerSector }) => {
  playSfx('victory');
  $('wheelWinnerSector').textContent = `🎯 Winner: ${winnerSector}`;
  $('wheelWinnerBanner')?.classList.remove('hidden');
  spawnDanmakuBullet(`🎡 Wheel Result: "${winnerSector}"!`, 'vip');
});

/* ══════════════════════════════════════════════════
   14G. IN-BROWSER CLIP HIGHLIGHT RECORDER
   ══════════════════════════════════════════════════ */
$('recordClipBtn')?.addEventListener('click', async () => {
  if (state.isRecording) {
    stopClipRecording();
    return;
  }
  startClipRecording();
});

async function startClipRecording() {
  const targetVideo = state.currentRole === 'host' ? $('localVideo') : $('remoteVideo');
  if (!targetVideo || !targetVideo.srcObject) {
    return showToast('⚠️ No active video stream to record');
  }

  try {
    const stream = targetVideo.srcObject;
    state.recordedChunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) state.recordedChunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const previewVid = $('clipPreviewVideo');
      const dlLink = $('downloadClipLink');
      if (previewVid) previewVid.src = url;
      if (dlLink) {
        dlLink.href = url;
        dlLink.download = `livewave_clip_${Date.now()}.webm`;
      }
      $('modalClipPreview')?.classList.remove('hidden');
      showToast('🎉 Highlight clip captured! Ready for download.');
      state.isRecording = false;
      $('recBadge')?.classList.add('hidden');
      $('recordClipBtn')?.classList.remove('active');
    };

    recorder.start(500);
    state.mediaRecorder = recorder;
    state.isRecording = true;
    $('recBadge')?.classList.remove('hidden');
    $('recordClipBtn')?.classList.add('active');
    showToast('⏺️ Recording highlight clip (15s)…');

    // Auto stop after 15 seconds
    setTimeout(() => {
      if (state.isRecording) stopClipRecording();
    }, 15000);

  } catch (e) {
    showToast('❌ Recording error: ' + e.message);
  }
}

function stopClipRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
  }
}

$('closeClipPreviewBtn')?.addEventListener('click', () => $('modalClipPreview')?.classList.add('hidden'));
$('dismissClipBtn')?.addEventListener('click', () => $('modalClipPreview')?.classList.add('hidden'));

/* ══════════════════════════════════════════════════════
   15. VIRTUAL GIFTS CATALOG & SPECTACULAR 11-GIFT FX
   ══════════════════════════════════════════════════════ */
const GIFT_CATALOG = [
  { id: 'rose',      name: 'Rose',       icon: '🌹', price: 1,     tier: 'small' },
  { id: 'heart',     name: 'Heart',      icon: '💖', price: 5,     tier: 'small' },
  { id: 'fire',      name: 'Fire',       icon: '🔥', price: 10,    tier: 'small' },
  { id: 'diamond',   name: 'Diamond',    icon: '💎', price: 50,    tier: 'medium' },
  { id: 'rocket',    name: 'Rocket',     icon: '🚀', price: 100,   tier: 'medium' },
  { id: 'crown',     name: 'Crown',      icon: '👑', price: 250,   tier: 'large' },
  { id: 'lion',      name: 'Lion',       icon: '🦁', price: 500,   tier: 'large' },
  { id: 'castle',    name: 'Castle',     icon: '🏰', price: 1000,  tier: 'xl' },
  { id: 'luxurycar', name: 'Luxury Car', icon: '🏎️', price: 2500,  tier: 'xl' },
  { id: 'yacht',     name: 'Yacht',      icon: '🛥️', price: 5000,  tier: 'mega' },
  { id: 'moon',      name: 'Moon',       icon: '🌙', price: 10000, tier: 'mega' },
];

function initGiftsDrawer() {
  const grid = $('giftsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  GIFT_CATALOG.forEach((gift, idx) => {
    const card = document.createElement('div');
    card.className = `gift-card ${idx === 0 ? 'selected' : ''}`;
    card.innerHTML = `
      <span class="gift-icon">${gift.icon}</span>
      <span class="gift-name">${gift.name}</span>
      <span class="gift-price">🪙 ${gift.price}</span>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.gift-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedGift = gift;
      $('selGiftIcon').textContent = gift.icon;
      $('selGiftName').textContent = gift.name;
      $('selGiftCost').textContent = `${(gift.price * state.giftMultiplier).toLocaleString()} Coins`;
    });
    grid.appendChild(card);
  });

  state.selectedGift = GIFT_CATALOG[0];
}
initGiftsDrawer();

$('openGiftDrawerBtn')?.addEventListener('click', () => {
  initAudio();
  $('modalGifts')?.classList.remove('hidden');
});
$('closeGiftsBtn')?.addEventListener('click', () => $('modalGifts')?.classList.add('hidden'));

/* Multiplier chips */
document.querySelectorAll('.mult-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.mult-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.giftMultiplier = parseInt(chip.dataset.mult, 10) || 1;
    if (state.selectedGift) {
      $('selGiftCost').textContent = `${(state.selectedGift.price * state.giftMultiplier).toLocaleString()} Coins`;
    }
  });
});

/* Send Gift action */
$('sendGiftBtn')?.addEventListener('click', async () => {
  if (!state.selectedGift) return;
  const gift = state.selectedGift;
  const count = state.giftMultiplier;

  try {
    await socketEmit('sendGift', {
      giftId: gift.id,
      count,
      roomId: state.currentRoom?.id,
    });

    state.comboCount++;
    playSfx('gift', { combo: state.comboCount });

    // Combo Counter Handling
    const comboEl = $('comboCounter');
    if (comboEl) {
      comboEl.textContent = `COMBO x${state.comboCount}! 🔥`;
      comboEl.classList.remove('hidden');
      clearTimeout(state.comboTimeout);
      state.comboTimeout = setTimeout(() => {
        state.comboCount = 0;
        comboEl.classList.add('hidden');
      }, 2500);
    }

  } catch (e) {
    showToast('❌ ' + e.message);
  }
});

/* Real-time Gift Broadcast Received */
socket.on('giftSent', ({ gift, count, from, fromLevel }) => {
  playSfx('gift', { combo: count });
  appendChatGiftBanner(from, fromLevel, gift, count);
  triggerGiftAnimation(gift, count, from);
  showStageGiftMarquee(from, gift, count);
});

function appendChatGiftBanner(from, fromLevel, gift, count) {
  const li = document.createElement('li');
  li.className = 'gift-banner-msg';
  li.innerHTML = `
    <span class="gift-banner-icon">${gift.icon}</span>
    <div class="gift-banner-text">
      <strong>${escHtml(from)} <span class="level-badge">Lv.${fromLevel || 1}</span></strong>
      <span>sent <strong>${count}x ${gift.name}</strong></span>
    </div>
  `;
  $('chatList')?.appendChild(li);
  if ($('chatList')) $('chatList').scrollTop = $('chatList').scrollHeight;
}

let marqueeTimeout = null;
function showStageGiftMarquee(from, gift, count) {
  const marquee = $('stageGiftMarquee');
  if (!marquee) return;
  $('marqueeIcon').textContent = gift.icon;
  $('marqueeUser').textContent = from;
  $('marqueeText').textContent = `sent ${count}x ${gift.name}!`;
  marquee.classList.remove('hidden');
  clearTimeout(marqueeTimeout);
  marqueeTimeout = setTimeout(() => marquee.classList.add('hidden'), 3500);
}

/* Fullscreen Spectacular Gift FX Engine */
function triggerGiftAnimation(gift, count, from) {
  const layer = $('giftFxLayer');
  if (!layer) return;

  if (gift.id === 'rose') {
    for (let i = 0; i < 14; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'gift-fx-rose';
        el.textContent = '🌹';
        el.style.left = `${Math.random() * 85 + 5}%`;
        el.style.top = `${Math.random() * 20}%`;
        el.style.setProperty('--drift-x', `${Math.random() * 160 - 80}px`);
        layer.appendChild(el);
        setTimeout(() => el.remove(), 2600);
      }, i * 100);
    }
  } else if (gift.id === 'heart') {
    const el = document.createElement('div');
    el.className = 'gift-fx-heart-center';
    el.innerHTML = `💖<div style="font-size:1.2rem;font-weight:900;color:#fff;text-shadow:0 0 10px #ff2d75;">${escHtml(from)}</div>`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 2100);
  } else if (gift.id === 'fire') {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'gift-fx-fire-pillar';
        el.textContent = '🔥';
        el.style.setProperty('--fire-x', `${15 + i * 14}%`);
        layer.appendChild(el);
        setTimeout(() => el.remove(), 2300);
      }, i * 120);
    }
  } else if (gift.id === 'diamond') {
    const el = document.createElement('div');
    el.className = 'gift-fx-diamond';
    el.innerHTML = `💎<div style="font-size:1.3rem;font-weight:900;color:#00e5ff;text-shadow:0 0 10px #000;">${escHtml(from)} sent DIAMOND!</div>`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  } else if (gift.id === 'rocket') {
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute; bottom:-100px; left:50%; transform:translateX(-50%);
      font-size:6.5rem; z-index:30; pointer-events:none;
      transition:transform 2s cubic-bezier(0.1, 0.9, 0.2, 1), bottom 2s;
      filter: drop-shadow(0 0 30px #ff3366);
    `;
    el.innerHTML = `🚀 <div style="font-size:1.2rem;font-weight:900;color:#fff;text-shadow:0 0 10px #ff0055;">${escHtml(from)} sent ROCKET!</div>`;
    layer.appendChild(el);
    setTimeout(() => { el.style.bottom = '110%'; }, 50);
    setTimeout(() => el.remove(), 2200);
  } else if (gift.id === 'crown') {
    const el = document.createElement('div');
    el.className = 'gift-fx-crown';
    el.innerHTML = `👑<div style="font-size:1.3rem;font-weight:900;color:#ffb700;text-shadow:0 0 15px #000;">ROYAL CORONATION!</div>`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  } else if (gift.id === 'lion') {
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) scale(0.5);
      font-size:7rem; z-index:30; pointer-events:none; text-align:center;
      transition:transform 0.4s var(--ease), opacity 0.5s ease 1.5s;
      filter: drop-shadow(0 0 40px #ffb700);
    `;
    el.innerHTML = `🦁<br/><span style="font-size:1.3rem;font-weight:900;color:#ffb700;text-shadow:0 0 15px #000;">GOLDEN LION ROAR!</span>`;
    layer.appendChild(el);
    setTimeout(() => { el.style.transform = 'translate(-50%, -50%) scale(1.4)'; }, 50);
    setTimeout(() => { el.style.opacity = '0'; }, 1600);
    setTimeout(() => el.remove(), 2200);
  } else if (gift.id === 'castle') {
    const el = document.createElement('div');
    el.className = 'gift-fx-castle';
    el.innerHTML = `🏰<div style="font-size:1.3rem;font-weight:900;color:#c084fc;text-shadow:0 0 15px #000;">CRYSTAL CASTLE!</div>`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 2900);
  } else if (gift.id === 'luxurycar') {
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute; bottom:15%; left:-250px;
      font-size:5.5rem; z-index:30; pointer-events:none;
      transition:left 2.2s cubic-bezier(0.2, 0.8, 0.2, 1);
      filter: drop-shadow(0 0 25px #00e5ff);
    `;
    el.innerHTML = `🏎️💨 <div style="font-size:1.1rem;font-weight:900;color:#00e5ff;text-shadow:0 0 8px #000;">${escHtml(from)}'s LUXURY CAR!</div>`;
    layer.appendChild(el);
    setTimeout(() => { el.style.left = '110%'; }, 50);
    setTimeout(() => el.remove(), 2400);
  } else if (gift.id === 'yacht') {
    const el = document.createElement('div');
    el.className = 'gift-fx-yacht';
    el.innerHTML = `🛥️🌊 <div style="font-size:1.2rem;font-weight:900;color:#38bdf8;text-shadow:0 0 10px #000;">${escHtml(from)}'s SUPERYACHT!</div>`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 2900);
  } else if (gift.id === 'moon') {
    const el = document.createElement('div');
    el.className = 'gift-fx-moon';
    el.innerHTML = `🌙✨<div style="font-size:1.4rem;font-weight:900;color:#c084fc;text-shadow:0 0 15px #000;">COSMIC MOON ECLIPSE!</div>`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 3100);
  } else {
    // Default Floating Burst
    for (let i = 0; i < Math.min(count, 8); i++) {
      setTimeout(() => spawnReaction(gift.icon), i * 120);
    }
  }
}

/* ══════════════════════════════════════════════════════
   16. SUPER CHAT SYSTEM
   ══════════════════════════════════════════════════════ */
$('openSuperChatBtn')?.addEventListener('click', () => {
  initAudio();
  $('modalSuperChat')?.classList.remove('hidden');
});
$('closeSuperChatBtn')?.addEventListener('click', () => $('modalSuperChat')?.classList.add('hidden'));
$('cancelSuperChatBtn')?.addEventListener('click', () => $('modalSuperChat')?.classList.add('hidden'));

document.querySelectorAll('.tier-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.superChatTier = parseInt(btn.dataset.amount, 10) || 50;
    $('superChatBtnCost').textContent = `${state.superChatTier.toLocaleString()} Coins`;
  });
});

$('submitSuperChatBtn')?.addEventListener('click', async () => {
  const text = $('superChatMsgInput')?.value.trim();
  if (!text) return showToast('Please enter a Super Chat message');

  try {
    socket.emit('chatMessage', {
      text,
      isSuperChat: true,
      superChatAmount: state.superChatTier,
      roomId: state.currentRoom?.id,
    });
    $('modalSuperChat')?.classList.add('hidden');
    $('superChatMsgInput').value = '';
    showToast('✨ Super Chat sent!');
  } catch (e) {
    showToast('❌ ' + e.message);
  }
});

/* ══════════════════════════════════════════════════════
   17. LIVE CHAT & PINNED MESSAGES
   ══════════════════════════════════════════════════ */
$('chatForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('chatInput')?.value.trim();
  if (!text) return;
  socket.emit('chatMessage', {
    text,
    roomId: state.currentRoom?.id,
  });
  $('chatInput').value = '';
});

socket.on('chatMessage', (msg) => {
  renderChatMessage(msg);
  if (msg.isSuperChat) {
    spawnDanmakuBullet(`💬 ${msg.username}: ${msg.text} (🪙 ${msg.superChatAmount})`, 'superchat');
  } else {
    spawnDanmakuBullet(`${msg.username}: ${msg.text}`, msg.level >= 10 ? 'vip' : 'normal');
  }
});

function renderChatMessage(msg) {
  const list = $('chatList');
  if (!list) return;

  const li = document.createElement('li');
  const time = msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  if (msg.isSuperChat) {
    li.className = 'superchat-msg-card';
    const color = msg.superChatAmount >= 1000 ? 'hsl(280, 85%, 65%)' : msg.superChatAmount >= 500 ? 'hsl(332, 80%, 58%)' : msg.superChatAmount >= 250 ? 'hsl(36, 95%, 54%)' : 'hsl(200, 80%, 55%)';
    li.innerHTML = `
      <div class="superchat-header" style="background:${color};color:#000;">
        <span>${escHtml(msg.username)} <span class="level-badge">Lv.${msg.level || 1}</span></span>
        <span class="superchat-amount">🪙 ${msg.superChatAmount}</span>
      </div>
      <div class="superchat-body">${escHtml(msg.text)}</div>
    `;
    playSfx('superchat');
  } else {
    li.className = 'chat-msg';
    li.innerHTML = `
      <div class="chat-msg-header">
        <span class="level-badge">Lv.${msg.level || 1}</span>
        ${msg.isHost ? '<span class="chat-badge host">HOST</span>' : msg.isMod ? '<span class="chat-badge mod">MOD</span>' : ''}
        <span class="chat-user">${escHtml(msg.username)}:</span>
        <span class="chat-time">${time}</span>
      </div>
      <span class="chat-text">${escHtml(msg.text)}</span>
    `;

    // Click username for moderation context menu
    li.querySelector('.chat-user')?.addEventListener('click', (e) => {
      openUserContextMenu(msg.username, e.pageX, e.pageY);
    });
  }

  list.appendChild(li);
  list.scrollTop = list.scrollHeight;
}

function addSystemMsg(text) {
  const list = $('chatList');
  if (!list) return;
  const li = document.createElement('li');
  li.className = 'chat-msg system';
  li.textContent = text;
  list.appendChild(li);
  list.scrollTop = list.scrollHeight;
}

/* Emoji popup */
$('emojiToggleBtn')?.addEventListener('click', () => {
  $('emojiPicker')?.classList.toggle('hidden');
});
document.querySelectorAll('#emojiPicker span').forEach(sp => {
  sp.addEventListener('click', () => {
    if ($('chatInput')) $('chatInput').value += sp.textContent;
    $('emojiPicker')?.classList.add('hidden');
    $('chatInput')?.focus();
  });
});

/* Pinned Announcements */
socket.on('pinnedMessageUpdated', (pin) => {
  if (pin && pin.text) {
    $('pinnedText').textContent = pin.text;
    $('pinnedBanner')?.classList.remove('hidden');
  } else {
    $('pinnedBanner')?.classList.add('hidden');
  }
});
$('unpinBtn')?.addEventListener('click', () => $('pinnedBanner')?.classList.add('hidden'));

/* ══════════════════════════════════════════════════════
   18. REACTIONS, FLOATING HEARTS & DOUBLE-TAP
   ══════════════════════════════════════════════════ */
document.querySelectorAll('.btn-react').forEach(btn => {
  btn.addEventListener('click', () => {
    const emoji = btn.dataset.emoji || '❤️';
    socket.emit('reaction', { emoji, roomId: state.currentRoom?.id });
    spawnReaction(emoji);
    playSfx('heart');
  });
});

$('likeStreamBtn')?.addEventListener('click', () => {
  socket.emit('reaction', { emoji: '❤️', roomId: state.currentRoom?.id });
  spawnReaction('❤️');
  playSfx('heart');
});

/* Double-click or click on video stage triggers floating hearts */
$('videoStage')?.addEventListener('dblclick', (e) => {
  if (e.target.closest('button') || e.target.closest('.host-hud')) return;
  socket.emit('reaction', { emoji: '💖', roomId: state.currentRoom?.id });
  spawnReaction('💖', e.clientX, e.clientY);
  playSfx('heart');
});

/* Stage Fullscreen Toggle */
$('stageFullscreenBtn')?.addEventListener('click', () => {
  const stage = $('videoStage');
  if (!stage) return;
  if (!document.fullscreenElement) {
    stage.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

socket.on('reaction', ({ emoji }) => spawnReaction(emoji));

socket.on('likesUpdate', ({ likes }) => {
  if ($('roomLikesCount')) $('roomLikesCount').textContent = likes.toLocaleString();
});

function spawnReaction(emoji, clientX, clientY) {
  const container = $('reactionBurst');
  if (!container) return;
  const span = document.createElement('span');
  span.className = 'reaction-float';
  span.textContent = emoji;

  if (clientX && clientY) {
    const rect = container.getBoundingClientRect();
    span.style.left = `${clientX - rect.left}px`;
    span.style.bottom = `${rect.bottom - clientY}px`;
  }
  span.style.setProperty('--rand-x', (Math.random() * 160 - 80).toFixed(0));
  span.style.setProperty('--rand-r', (Math.random() * 60 - 30).toFixed(0));
  container.appendChild(span);
  span.addEventListener('animationend', () => span.remove());
}

/* ══════════════════════════════════════════════════════
   19. VIEWERS, SUPPORTERS & LEADERBOARD
   ══════════════════════════════════════════════════ */
socket.on('viewerCount', (count) => {
  if ($('roomViewerCount')) $('roomViewerCount').textContent = count;
  if ($('tabViewerCount')) $('tabViewerCount').textContent = count;
  if ($('viewersListBig')) $('viewersListBig').textContent = count;
});

socket.on('roomViewers', (viewers) => {
  renderViewersList(viewers);
});

function renderViewersList(viewers) {
  const list = $('viewersList');
  if (!list) return;
  list.innerHTML = '';

  (viewers || []).forEach(v => {
    const li = document.createElement('li');
    li.className = 'supporter-item';
    li.innerHTML = `
      <div class="user-avatar-small" style="background:${avatarColor(v.username)}">${v.username.charAt(0).toUpperCase()}</div>
      <div style="flex:1;">
        <strong>${escHtml(v.username)}</strong>
        <span class="level-badge" style="display:inline-block;margin-left:4px;">Lv.${v.level || 1}</span>
        ${v.isCoHost ? '<span class="chat-badge host" style="margin-left:4px;">CO-HOST</span>' : v.isMod ? '<span class="chat-badge mod" style="margin-left:4px;">MOD</span>' : ''}
      </div>
      <button class="btn btn-ghost btn-xs" id="vActions_${v.username}">⚙️</button>
    `;
    li.querySelector(`#vActions_${v.username}`)?.addEventListener('click', (e) => {
      e.stopPropagation();
      openUserContextMenu(v.username, e.pageX, e.pageY);
    });
    list.appendChild(li);
  });
}

socket.on('topSupportersUpdate', (supporters) => {
  renderSupporters(supporters);
});

function renderSupporters(supporters) {
  const list = $('supportersList');
  const bar = $('topSupportersBar');
  if (!list) return;
  list.innerHTML = '';
  if (bar) bar.innerHTML = '';

  (supporters || []).forEach((sup, idx) => {
    // Render top 3 in header
    if (idx < 3 && bar) {
      const b = document.createElement('div');
      b.className = 'supporter-badge-avatar';
      b.textContent = sup.username.charAt(0).toUpperCase();
      b.title = `${sup.username} (${sup.value} coins)`;
      b.style.borderColor = idx === 0 ? 'var(--gold)' : idx === 1 ? '#ccc' : '#cd7f32';
      bar.appendChild(b);
    }

    const item = document.createElement('li');
    item.className = 'supporter-item';
    const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
    item.innerHTML = `
      <span class="supporter-rank ${rankClass}">#${idx + 1}</span>
      <div class="user-avatar-small" style="background:${avatarColor(sup.username)}">${sup.username.charAt(0).toUpperCase()}</div>
      <div style="flex:1;">
        <strong>${escHtml(sup.username)}</strong>
        <span style="display:block;font-size:0.75rem;color:var(--gold);">🪙 ${sup.value.toLocaleString()} gifts</span>
      </div>
    `;
    list.appendChild(item);
  });
}

/* Sidebar Tab switching */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = $('tab-' + btn.dataset.tab);
    if (panel) panel.classList.add('active');
  });
});

/* ══════════════════════════════════════════════════════
   20. USER CONTEXT MENU & MODERATION / CO-HOST
   ══════════════════════════════════════════════════ */
let targetContextUser = null;

function openUserContextMenu(username, x, y) {
  targetContextUser = username;
  const menu = $('userContextMenu');
  if (!menu) return;
  $('contextTargetName').textContent = username;
  menu.style.left = `${Math.min(window.innerWidth - 220, x)}px`;
  menu.style.top = `${Math.min(window.innerHeight - 240, y)}px`;
  menu.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-context-menu') && !e.target.closest('.chat-user') && !e.target.closest('[id^="vActions_"]')) {
    $('userContextMenu')?.classList.add('hidden');
  }
});

/* Co-Host Invite from Host */
$('ctxInviteCoHost')?.addEventListener('click', async () => {
  if (!targetContextUser) return;
  try {
    await socketEmit('inviteCoHost', { targetUsername: targetContextUser, roomId: state.currentRoom?.id });
    $('userContextMenu')?.classList.add('hidden');
    showToast(`🎙️ Co-host invitation sent to ${targetContextUser}!`);
  } catch (e) {
    showToast('❌ ' + e.message);
  }
});

/* Viewer receives Co-Host invite */
socket.on('coHostInvite', ({ from, roomId }) => {
  $('coHostInviteHost').textContent = `${from} has invited you to join as Co-Host!`;
  $('modalCoHostInvite')?.classList.remove('hidden');
  playSfx('superchat');

  $('acceptCoHostBtn').onclick = async () => {
    try {
      await socketEmit('acceptCoHost', { roomId });
      $('modalCoHostInvite')?.classList.add('hidden');
      showToast('🎙️ You are now Co-Hosting! Starting camera…');

      // Start producing co-host video/audio
      await loadDevice();
      if (!state.sendTransport) await createSendTransport();
      state.localStream = createVirtualStreamerStream(state.user.username);
      const videoTrack = state.localStream.getVideoTracks()[0];
      const audioTrack = state.localStream.getAudioTracks()[0];
      if (videoTrack) state.producers.video = await state.sendTransport.produce({ track: videoTrack });
      if (audioTrack) state.producers.audio = await state.sendTransport.produce({ track: audioTrack });

      const guestVid = $('guestVideo');
      if (guestVid) {
        guestVid.srcObject = state.localStream;
        guestVid.muted = true;
        guestVid.play().catch(() => {});
        $('guestVideoCard')?.classList.remove('hidden');
        $('guestLeaveBtn')?.classList.remove('hidden');
      }
    } catch (e) {
      showToast('❌ ' + e.message);
    }
  };

  $('declineCoHostBtn').onclick = () => {
    $('modalCoHostInvite')?.classList.add('hidden');
  };
});

/* Co-Host Events */
socket.on('coHostJoined', ({ username }) => {
  showToast(`🎙️ ${username} joined the stage as Co-Host!`);
  const guestCard = $('guestVideoCard');
  const guestVid = $('guestVideo');
  if (guestCard && guestVid && username !== state.user.username) {
    guestCard.classList.remove('hidden');
    $('guestTag').textContent = `CO-HOST: ${username}`;
    guestVid.srcObject = createVirtualStreamerStream(username);
    guestVid.muted = true;
    guestVid.play().catch(() => {});
  }
});

socket.on('coHostLeft', ({ username }) => {
  showToast(`🎙️ ${username} left co-host seat.`);
  $('guestVideoCard')?.classList.add('hidden');
});

$('guestLeaveBtn')?.addEventListener('click', () => {
  $('guestVideoCard')?.classList.add('hidden');
  $('guestLeaveBtn')?.classList.add('hidden');
  if (state.producers.video) try { state.producers.video.close(); } catch(_){}
  if (state.producers.audio) try { state.producers.audio.close(); } catch(_){}
  showToast('You left the co-host stage.');
});

$('ctxMuteUser')?.addEventListener('click', async () => {
  if (!targetContextUser) return;
  await socketEmit('modMute', { targetUsername: targetContextUser, muted: true, roomId: state.currentRoom?.id });
  $('userContextMenu')?.classList.add('hidden');
  showToast(`🔇 ${targetContextUser} was muted`);
});

$('ctxKickUser')?.addEventListener('click', async () => {
  if (!targetContextUser) return;
  await socketEmit('modKick', { targetUsername: targetContextUser, roomId: state.currentRoom?.id });
  $('userContextMenu')?.classList.add('hidden');
  showToast(`👢 ${targetContextUser} was kicked`);
});

$('ctxBanUser')?.addEventListener('click', async () => {
  if (!targetContextUser) return;
  await socketEmit('modBan', { targetUsername: targetContextUser, roomId: state.currentRoom?.id });
  $('userContextMenu')?.classList.add('hidden');
  showToast(`🚫 ${targetContextUser} was banned`);
});

$('ctxPromoteMod')?.addEventListener('click', async () => {
  if (!targetContextUser) return;
  await socketEmit('modAdd', { targetUsername: targetContextUser, roomId: state.currentRoom?.id });
  $('userContextMenu')?.classList.add('hidden');
  showToast(`⭐ ${targetContextUser} promoted to Moderator`);
});

/* ══════════════════════════════════════════════════════
   21. USER PROFILE & WALLET FAUCET
   ══════════════════════════════════════════════════ */
$('profileChip')?.addEventListener('click', openProfileModal);
$('walletChip')?.addEventListener('click', openProfileModal);
$('openWalletBtn')?.addEventListener('click', (e) => { e.stopPropagation(); openProfileModal(); });
$('drawerAddCoinsBtn')?.addEventListener('click', openProfileModal);
$('closeProfileBtn')?.addEventListener('click', () => $('modalProfile')?.classList.add('hidden'));

async function openProfileModal() {
  initAudio();
  $('modalProfile')?.classList.remove('hidden');
  try {
    const p = await socketEmit('getProfile', { username: state.user.username });
    if (p) {
      $('profileName').textContent = p.username;
      $('profileLevel').textContent = `Level ${p.level} Streamer`;
      $('profileFollowers').textContent = p.followersCount || 0;
      $('profileFollowing').textContent = p.followingCount || 0;
      $('profileGiftsSent').textContent = (p.totalGiftsSent || 0).toLocaleString();
      $('profileStreamsHosted').textContent = p.streamsHosted || 0;
      $('profileBigAvatar').textContent = p.username.charAt(0).toUpperCase();
      $('profileBigAvatar').style.background = avatarColor(p.username);
      if ($('profileBioInput')) $('profileBioInput').value = p.bio || '';
    }
  } catch (e) {
    console.warn('Profile load err:', e.message);
  }
}

$('saveProfileBioBtn')?.addEventListener('click', async () => {
  const bio = $('profileBioInput')?.value.trim();
  try {
    await socketEmit('updateBio', { bio });
    showToast('✅ Bio updated successfully');
    $('modalProfile')?.classList.add('hidden');
  } catch (e) {
    showToast('❌ ' + e.message);
  }
});

/* Free Coins Faucet */
$('claimDailyCoinsBtn')?.addEventListener('click', () => {
  state.user.coins += 500;
  updateUserHeader();
  playSfx('coin');
  showToast('🎁 +500 Free Daily Coins claimed! Enjoy gifting!');
});

/* Quick Coin Packs */
document.querySelectorAll('.coin-pack-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const amt = parseInt(btn.dataset.coins, 10) || 500;
    state.user.coins += amt;
    updateUserHeader();
    playSfx('coin');
    showToast(`🪙 +${amt.toLocaleString()} Virtual Coins added to wallet!`);
  });
});

/* Follow Streamer */
$('roomFollowBtn')?.addEventListener('click', async () => {
  const host = $('roomHostName')?.textContent;
  if (!host) return;
  try {
    await socketEmit('followUser', { targetUsername: host, follow: true });
    $('roomFollowBtn').textContent = '✓ Following';
    showToast(`💖 You are now following ${host}!`);
    playSfx('heart');
  } catch (e) {
    showToast('❌ ' + e.message);
  }
});

/* Share Link */
$('roomShareBtn')?.addEventListener('click', () => {
  const roomId = state.currentRoom?.id;
  const shareLink = roomId ? `${window.location.origin}${window.location.pathname}?room=${roomId}` : window.location.href;
  navigator.clipboard.writeText(shareLink)
    .then(() => showToast('🔗 Stream link copied! Share with friends'))
    .catch(() => showToast('Could not copy link'));
});

/* Check URL query param ?room=<roomId> for auto-join */
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('room');
  if (roomId) {
    setTimeout(() => {
      joinRoomAsViewer(roomId);
    }, 600);
  }
});

/* ══════════════════════════════════════════════════════
   23. MOBILE BOTTOM NAVIGATION HANDLERS
   ══════════════════════════════════════════════════════ */
$('mobNavHome')?.addEventListener('click', () => {
  document.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('active'));
  $('mobNavHome').classList.add('active');
  document.querySelector('.cat-pill[data-cat="all"]')?.click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

$('mobNavTrending')?.addEventListener('click', () => {
  document.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('active'));
  $('mobNavTrending').classList.add('active');
  document.querySelector('.cat-pill[data-cat="Gaming"]')?.click();
  $('roomsGrid')?.scrollIntoView({ behavior: 'smooth' });
});

$('mobNavGoLive')?.addEventListener('click', () => {
  $('headerGoLiveBtn')?.click();
});

$('mobNavMusic')?.addEventListener('click', () => {
  document.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('active'));
  $('mobNavMusic').classList.add('active');
  document.querySelector('.cat-pill[data-cat="Music"]')?.click();
  $('roomsGrid')?.scrollIntoView({ behavior: 'smooth' });
});

$('mobNavProfile')?.addEventListener('click', () => {
  $('profileChip')?.click();
});

/* ══════════════════════════════════════════════════════
   24. AFRICAN & DRC MOBILE MONEY BUY COINS RECHARGE MODULE
   ══════════════════════════════════════════════════════ */
let buyCoinsState = {
  packages: [],
  selectedPackage: null,
  paymentMethod: 'mobile_money',
  operator: 'Vodacom M-Pesa (DRC)',
  phone: '819928172',
  countryCode: '+243',
  ussdTimerInterval: null,
  ussdCountdownSec: 15,
};

async function initBuyCoinsModule() {
  try {
    const res = await fetch('/api/wallet/packages');
    if (!res.ok) throw new Error('Failed to load packages');
    buyCoinsState.packages = await res.json();
    buyCoinsState.selectedPackage = buyCoinsState.packages[1] || buyCoinsState.packages[0];
    renderCoinRechargeGrid();
    updateCheckoutSummary();
  } catch (e) {
    console.warn('Failed to load coin packages:', e.message);
  }

  // Open buttons
  $('openWalletBtn')?.addEventListener('click', (e) => { e.stopPropagation(); openBuyCoinsModal(); });
  $('openBuyCoinsFromProfileBtn')?.addEventListener('click', () => {
    $('modalProfile')?.classList.add('hidden');
    openBuyCoinsModal();
  });
  $('drawerAddCoinsBtn')?.addEventListener('click', () => openBuyCoinsModal());
  $('closeBuyCoinsBtn')?.addEventListener('click', () => $('modalBuyCoins')?.classList.add('hidden'));

  // Payment Tabs
  document.querySelectorAll('.pay-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pay-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const method = btn.dataset.paymethod;
      buyCoinsState.paymentMethod = method;

      $('panelMobileMoney')?.classList.toggle('hidden', method !== 'mobile_money');
      $('panelCard')?.classList.toggle('hidden', method !== 'card');
      $('panelMaxiCash')?.classList.toggle('hidden', method !== 'maxicash');
      $('panelCrypto')?.classList.toggle('hidden', method !== 'crypto');
    });
  });

  // Operator Radio Cards
  document.querySelectorAll('.operator-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.operator-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const op = card.dataset.operator;
      buyCoinsState.operator = op;
      const radio = card.querySelector('input');
      if (radio) radio.checked = true;
    });
  });

  // Carrier Auto-Detection by Phone Prefix
  $('mnoPhoneInput')?.addEventListener('input', (e) => {
    const val = e.target.value.replace(/\s+/g, '');
    const badge = $('detectedOperatorBadge');
    if (!badge) return;

    if (val.startsWith('81') || val.startsWith('82') || val.startsWith('83') || val.startsWith('081') || val.startsWith('082')) {
      badge.textContent = '🟢 Vodacom M-Pesa (DRC)';
      selectOperatorByVal('Vodacom M-Pesa (DRC)');
    } else if (val.startsWith('97') || val.startsWith('98') || val.startsWith('99') || val.startsWith('097') || val.startsWith('099')) {
      badge.textContent = '🔴 Airtel Money (DRC)';
      selectOperatorByVal('Airtel Money (DRC)');
    } else if (val.startsWith('84') || val.startsWith('85') || val.startsWith('89') || val.startsWith('80') || val.startsWith('084') || val.startsWith('085')) {
      badge.textContent = '🟠 Orange Money (DRC)';
      selectOperatorByVal('Orange Money (DRC)');
    } else if (val.startsWith('90') || val.startsWith('91') || val.startsWith('090') || val.startsWith('091')) {
      badge.textContent = '🟣 Afrimoney (Africell DRC)';
      selectOperatorByVal('Afrimoney (Africell DRC)');
    } else if (val.startsWith('06') || val.startsWith('6')) {
      badge.textContent = '🟡 MTN MoMo';
      selectOperatorByVal('MTN MoMo (Congo-Brazzaville)');
    }
  });

  // Pay Button Click
  $('btnPayCoins')?.addEventListener('click', handleStartPayment);

  // USSD PIN Simulation Actions
  $('btnSimulatePinSuccess')?.addEventListener('click', finalizeCoinPurchase);
  $('btnCancelUssd')?.addEventListener('click', cancelUssdPush);
}

function selectOperatorByVal(val) {
  buyCoinsState.operator = val;
  document.querySelectorAll('.operator-card').forEach(card => {
    const isMatch = card.dataset.operator === val;
    card.classList.toggle('active', isMatch);
    const radio = card.querySelector('input');
    if (radio && isMatch) radio.checked = true;
  });
}

function openBuyCoinsModal(packageId) {
  initAudio();
  if (packageId && buyCoinsState.packages.length > 0) {
    const pkg = buyCoinsState.packages.find(p => p.id === packageId);
    if (pkg) buyCoinsState.selectedPackage = pkg;
  }
  renderCoinRechargeGrid();
  updateCheckoutSummary();
  $('modalBuyCoins')?.classList.remove('hidden');
}

function renderCoinRechargeGrid() {
  const grid = $('coinRechargeGrid');
  if (!grid || !buyCoinsState.packages.length) return;

  grid.innerHTML = buyCoinsState.packages.map(pkg => {
    const isSelected = buyCoinsState.selectedPackage?.id === pkg.id;
    return `
      <div class="coin-recharge-card ${isSelected ? 'active' : ''}" data-pkg-id="${pkg.id}">
        ${pkg.badge ? `<span class="coin-pack-badge">${pkg.badge}</span>` : ''}
        <span class="coin-pack-icon">🪙</span>
        <strong class="coin-pack-amount">${pkg.coins.toLocaleString()}</strong>
        <span class="coin-pack-price-usd">$${pkg.priceUsd}</span>
        <span class="coin-pack-price-cdf">~${pkg.priceCdf.toLocaleString()} CDF</span>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.coin-recharge-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.pkgId;
      const pkg = buyCoinsState.packages.find(p => p.id === id);
      if (pkg) {
        buyCoinsState.selectedPackage = pkg;
        grid.querySelectorAll('.coin-recharge-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        updateCheckoutSummary();
      }
    });
  });
}

function updateCheckoutSummary() {
  const pkg = buyCoinsState.selectedPackage;
  if (!pkg) return;
  if ($('checkoutPriceUsd')) $('checkoutPriceUsd').textContent = `$${pkg.priceUsd}`;
  if ($('checkoutPriceCdf')) $('checkoutPriceCdf').textContent = `(~${pkg.priceCdf.toLocaleString()} CDF)`;
}

function handleStartPayment() {
  const pkg = buyCoinsState.selectedPackage;
  if (!pkg) return showToast('Please select a coin package');

  if (buyCoinsState.paymentMethod === 'mobile_money') {
    const phoneVal = $('mnoPhoneInput')?.value.trim() || '819928172';
    const cc = $('countryCodeSelect')?.value || '+243';
    const fullPhone = `${cc} ${phoneVal}`;

    if ($('ussdTargetPhone')) $('ussdTargetPhone').textContent = fullPhone;
    if ($('ussdOperatorName')) $('ussdOperatorName').textContent = buyCoinsState.operator || 'Vodacom M-Pesa';
    if ($('ussdCoinsAmount')) $('ussdCoinsAmount').textContent = `+${pkg.coins.toLocaleString()} Coins`;
    if ($('ussdPriceAmount')) $('ussdPriceAmount').textContent = `${pkg.priceCdf.toLocaleString()} CDF ($${pkg.priceUsd})`;

    $('modalBuyCoins')?.classList.add('hidden');
    $('modalUssdPush')?.classList.remove('hidden');

    startUssdCountdown();
  } else {
    finalizeCoinPurchase();
  }
}

function startUssdCountdown() {
  clearInterval(buyCoinsState.ussdTimerInterval);
  buyCoinsState.ussdCountdownSec = 15;
  if ($('ussdTimer')) $('ussdTimer').textContent = `${buyCoinsState.ussdCountdownSec}s`;
  if ($('ussdProgressFill')) $('ussdProgressFill').style.width = '100%';

  buyCoinsState.ussdTimerInterval = setInterval(() => {
    buyCoinsState.ussdCountdownSec--;
    if ($('ussdTimer')) $('ussdTimer').textContent = `${buyCoinsState.ussdCountdownSec}s`;
    const pct = Math.max(0, (buyCoinsState.ussdCountdownSec / 15) * 100);
    if ($('ussdProgressFill')) $('ussdProgressFill').style.width = `${pct}%`;

    if (buyCoinsState.ussdCountdownSec <= 0) {
      clearInterval(buyCoinsState.ussdTimerInterval);
      finalizeCoinPurchase();
    }
  }, 1000);
}

function cancelUssdPush() {
  clearInterval(buyCoinsState.ussdTimerInterval);
  $('modalUssdPush')?.classList.add('hidden');
  $('modalBuyCoins')?.classList.remove('hidden');
}

async function finalizeCoinPurchase() {
  clearInterval(buyCoinsState.ussdTimerInterval);
  const pkg = buyCoinsState.selectedPackage;
  if (!pkg) return;

  const phoneVal = $('mnoPhoneInput')?.value.trim() || '819928172';
  const cc = $('countryCodeSelect')?.value || '+243';

  try {
    const res = await fetch('/api/wallet/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: state.user.username,
        packageId: pkg.id,
        method: buyCoinsState.paymentMethod === 'mobile_money' ? buyCoinsState.operator : buyCoinsState.paymentMethod,
        phone: `${cc} ${phoneVal}`,
        operator: buyCoinsState.operator,
      })
    });
    const data = await res.json();
    if (data.success) {
      state.user.coins = data.newBalance;
      updateUserHeader();
      $('modalUssdPush')?.classList.add('hidden');
      $('modalBuyCoins')?.classList.add('hidden');

      playSfx('coin');
      triggerConfettiBurst();
      showToast(`🎉 Payment Confirmed! +${pkg.coins.toLocaleString()} Coins added to your wallet!`);
    } else {
      alert('Purchase failed: ' + (data.error || 'Unknown error'));
    }
  } catch (e) {
    showToast('Payment error: ' + e.message);
  }
}

/* ══════════════════════════════════════════════════════
   25. CREATOR DIAMOND CASHOUT & MOBILE MONEY WITHDRAWAL MODULE
   ══════════════════════════════════════════════════════ */
let cashoutState = {
  diamonds: 0,
  amountUsd: 0,
  amountCdf: 0,
  selectedMethod: 'Vodacom M-Pesa (DRC)',
  history: [],
};

async function initCreatorCashoutModule() {
  $('openCashoutFromProfileBtn')?.addEventListener('click', () => {
    $('modalProfile')?.classList.add('hidden');
    openCashoutModal();
  });
  $('closeCashoutBtn')?.addEventListener('click', () => $('modalCashout')?.classList.add('hidden'));
  $('closeCashoutFooterBtn')?.addEventListener('click', () => $('modalCashout')?.classList.add('hidden'));

  // Method selector cards
  document.querySelectorAll('.payout-method-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.payout-method-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const val = card.dataset.payout;
      cashoutState.selectedMethod = val;
      const radio = card.querySelector('input');
      if (radio) radio.checked = true;
    });
  });

  // Dynamic Diamond Calculation
  $('cashoutDiamondsInput')?.addEventListener('input', (e) => {
    const diamonds = Number(e.target.value) || 0;
    const usd = (diamonds * 0.01).toFixed(2);
    const cdf = Math.round(usd * 2800);
    if ($('calcReceiveUsd')) $('calcReceiveUsd').textContent = `$${usd}`;
    if ($('calcReceiveCdf')) $('calcReceiveCdf').textContent = `(~${cdf.toLocaleString()} CDF)`;
  });

  // Withdraw Max button
  $('btnMaxCashout')?.addEventListener('click', () => {
    if ($('cashoutDiamondsInput')) {
      $('cashoutDiamondsInput').value = cashoutState.diamonds;
      $('cashoutDiamondsInput').dispatchEvent(new Event('input'));
    }
  });

  // Submit Withdrawal
  $('btnSubmitWithdrawal')?.addEventListener('click', handleSubmitWithdrawal);
}

async function openCashoutModal() {
  initAudio();
  $('modalCashout')?.classList.remove('hidden');

  try {
    const res = await fetch(`/api/creator/earnings/${encodeURIComponent(state.user.username)}`);
    if (!res.ok) throw new Error('Failed to fetch earnings');
    const data = await res.json();
    cashoutState.diamonds = data.diamonds || 0;
    cashoutState.amountUsd = data.amountUsd || 0;
    cashoutState.amountCdf = data.amountCdf || 0;
    cashoutState.history = data.history || [];

    if ($('cashoutDiamondsVal')) $('cashoutDiamondsVal').textContent = cashoutState.diamonds.toLocaleString();
    if ($('cashoutUsdVal')) $('cashoutUsdVal').textContent = `$${cashoutState.amountUsd.toFixed(2)}`;
    if ($('cashoutCdfVal')) $('cashoutCdfVal').textContent = `(~${cashoutState.amountCdf.toLocaleString()} CDF)`;
    if ($('profileDiamondsVal')) $('profileDiamondsVal').textContent = `${cashoutState.diamonds.toLocaleString()} Diamonds ($${cashoutState.amountUsd.toFixed(2)})`;

    if ($('cashoutDiamondsInput')) {
      $('cashoutDiamondsInput').value = Math.min(cashoutState.diamonds, 10000);
      $('cashoutDiamondsInput').dispatchEvent(new Event('input'));
    }

    renderPayoutHistory(cashoutState.history);
  } catch (e) {
    console.warn('Earnings load error:', e.message);
  }
}

function renderPayoutHistory(history) {
  const container = $('payoutHistoryList');
  if (!container) return;

  if (!history || history.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:10px; color:var(--text-muted); font-size:0.78rem;">No past payouts yet. Start streaming & earning gifts!</div>`;
    return;
  }

  const statusColors = {
    'PENDING': '#fde047',
    'APPROVED': 'var(--cyan)',
    'PAID': '#86efac',
    'REJECTED': '#fca5a5',
  };

  container.innerHTML = history.map(h => `
    <div class="payout-hist-item">
      <div>
        <strong style="color:#fff;">$${(h.amountUsd || 0).toFixed(2)}</strong> <small style="color:var(--text-muted);">(~${(h.amountCdf || 0).toLocaleString()} CDF)</small>
        <div style="font-size:0.72rem; color:var(--text-2);">${escapeHtml(h.method)} · ${escapeHtml(h.accountPhone)}</div>
      </div>
      <div style="text-align:right;">
        <span style="color:${statusColors[h.status] || '#fff'}; font-weight:700; font-size:0.75rem;">${h.status}</span>
        <div style="font-size:0.7rem; color:var(--text-muted);">${new Date(h.requestedAt).toLocaleDateString()}</div>
      </div>
    </div>
  `).join('');
}

async function handleSubmitWithdrawal() {
  const diamonds = Number($('cashoutDiamondsInput')?.value) || 0;
  const phone = $('payoutPhoneInput')?.value.trim();
  const name = $('payoutNameInput')?.value.trim();

  if (diamonds < 1000) return showToast('❌ Minimum withdrawal is 1,000 Diamonds ($10.00)');
  if (diamonds > cashoutState.diamonds) return showToast('❌ Not enough diamonds in balance');
  if (!phone) return showToast('❌ Please enter your mobile money number');

  try {
    const res = await fetch('/api/creator/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: state.user.username,
        diamonds,
        method: cashoutState.selectedMethod,
        accountPhone: phone,
        accountName: name || state.user.username,
      })
    });
    const data = await res.json();
    if (data.success) {
      playSfx('coin');
      showToast(`💸 Cashout request submitted! $${data.withdrawal.amountUsd.toFixed(2)} (${data.withdrawal.amountCdf.toLocaleString()} CDF)`);
      $('modalCashout')?.classList.add('hidden');
    } else {
      showToast('❌ ' + (data.error || 'Withdrawal failed'));
    }
  } catch (e) {
    showToast('❌ Error: ' + e.message);
  }
}

/* ══════════════════════════════════════════════════════
   26. VOD STREAM REPLAYS & HIGHLIGHTS MODULE
   ══════════════════════════════════════════════════ */
async function initReplaysModule() {
  try {
    const res = await fetch('/api/replays');
    if (!res.ok) throw new Error('Failed to load replays');
    const replays = await res.json();
    renderReplaysGrid(replays);
  } catch (e) {
    console.warn('Replays load error:', e.message);
  }
}

function renderReplaysGrid(replays) {
  const grid = $('replaysGrid');
  const countBadge = $('replaysCountBadge');
  if (!grid) return;

  if (countBadge) countBadge.textContent = `${replays.length} Replays Available`;

  if (!replays || replays.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted);">No recorded stream replays available.</div>`;
    return;
  }

  grid.innerHTML = replays.map(r => {
    const durationMin = Math.floor((r.durationSeconds || 1800) / 60);
    return `
      <div class="replay-card" data-replay-id="${r.id}" onclick="playReplay('${r.id}')">
        <div class="replay-thumb-wrap">
          <span>${r.thumbnailIcon || '🎙️'}</span>
          <span class="replay-tag-badge">${escapeHtml(r.category || 'Stream')}</span>
          <span class="replay-duration-badge">⏱️ ${durationMin}m</span>
          <div class="replay-play-overlay">
            <div class="replay-play-icon">▶</div>
          </div>
        </div>
        <div class="replay-info">
          <div class="replay-title" title="${escapeHtml(r.title)}">${escapeHtml(r.title)}</div>
          <div class="replay-meta-row">
            <div class="replay-host-badge">
              <span>🎙️</span>
              <strong style="color:#fff;">@${escapeHtml(r.hostUsername)}</strong>
            </div>
            <span>👁️ ${(r.viewCount || 0).toLocaleString()} views</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.playReplay = function(replayId) {
  playSfx('click');
  showToast('🎬 Loading High-Definition VOD Stream Replay…');
};

/* ══════════════════════════════════════════════════════
   27. PROGRESSIVE WEB APP (PWA), PICTURE-IN-PICTURE & PUSH ALERTS
   ══════════════════════════════════════════════════ */
let deferredPwaPrompt = null;

function initPwaAndPipModule() {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('🛡️ LiveWave ServiceWorker Registered:', reg.scope))
      .catch((err) => console.warn('ServiceWorker registration error:', err));
  }

  // PWA Install Prompt Listener
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const btn = $('btnInstallPwa');
    if (btn) btn.classList.remove('hidden');
  });

  $('btnInstallPwa')?.addEventListener('click', async () => {
    if (!deferredPwaPrompt) return;
    deferredPwaPrompt.prompt();
    const { outcome } = await deferredPwaPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('🎉 LiveWave installed to your home screen!');
      $('btnInstallPwa')?.classList.add('hidden');
    }
    deferredPwaPrompt = null;
  });

  // Picture-in-Picture Floating Player
  $('stagePipBtn')?.addEventListener('click', async () => {
    const video = document.querySelector('.main-video-feed') || document.querySelector('video');
    if (!video) return showToast('No active video stream to float');

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        $('stagePipBtn')?.classList.remove('active');
        showToast('PiP mode closed');
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        $('stagePipBtn')?.classList.add('active');
        showToast('📺 Picture-in-Picture mini-player activated');
      }
    } catch (e) {
      showToast('PiP Error: ' + e.message);
    }
  });
}

/* ══════════════════════════════════════════════════════
   28. USER AUTHENTICATION & QUICK ACCOUNT SWITCHER MODULE
   ══════════════════════════════════════════════════════ */
function initAuthModule() {
  $('headerAuthBtn')?.addEventListener('click', openAuthModal);
  $('openSwitchAccountBtn')?.addEventListener('click', () => {
    $('modalProfile')?.classList.add('hidden');
    openAuthModal();
  });
  $('closeAuthBtn')?.addEventListener('click', () => $('modalAuth')?.classList.add('hidden'));

  // Auth Tabs
  document.querySelectorAll('.auth-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.authtab;
      $('authLoginPanel')?.classList.toggle('hidden', tab !== 'login');
      $('authRegisterPanel')?.classList.toggle('hidden', tab !== 'register');
      $('authDemosPanel')?.classList.toggle('hidden', tab !== 'demos');
    });
  });

  // Role cards in register
  document.querySelectorAll('.auth-role-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.auth-role-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input');
      if (radio) radio.checked = true;
    });
  });

  // Submit Login
  $('btnSubmitLogin')?.addEventListener('click', async () => {
    const username = $('loginUsername')?.value.trim();
    const password = $('loginPassword')?.value;
    if (!username || !password) return showToast('❌ Please enter username and password');

    await executeLogin(username, password);
  });

  // Submit Register
  $('btnSubmitRegister')?.addEventListener('click', async () => {
    const username = $('regUsername')?.value.trim();
    const password = $('regPassword')?.value;
    const role = document.querySelector('input[name="regRole"]:checked')?.value || 'user';
    if (!username || !password) return showToast('❌ Please fill in all registration fields');
    if (username.length < 3) return showToast('❌ Username must be at least 3 characters');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('livewave_token', data.token);
        localStorage.setItem('livewave_username', data.user.username);
        state.user.username = data.user.username;
        state.user.role = data.user.role;
        state.user.coins = data.user.coins;
        state.user.level = data.user.level;

        updateUserHeader();
        $('modalAuth')?.classList.add('hidden');
        playSfx('coin');
        showToast(`🎉 Welcome to LiveWave, @${data.user.username}! +1,000 Starter Coins added.`);
        socket.emit('authenticate', { username: data.user.username, token: data.token });
      } else {
        showToast('❌ ' + (data.error || 'Registration failed'));
      }
    } catch (e) {
      showToast('❌ Error: ' + e.message);
    }
  });

  // Quick Login Global Helper
  window.quickLogin = async (username, password) => {
    await executeLogin(username, password);
  };
}

function openAuthModal() {
  initAudio();
  $('modalAuth')?.classList.remove('hidden');
}

async function executeLogin(username, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('livewave_token', data.token);
      localStorage.setItem('livewave_username', data.user.username);
      state.user.username = data.user.username;
      state.user.role = data.user.role;
      state.user.coins = data.user.coins;
      state.user.level = data.user.level;

      updateUserHeader();
      $('modalAuth')?.classList.add('hidden');
      playSfx('click');
      showToast(`✅ Logged in as @${data.user.username} [${data.user.role.toUpperCase()}]`);
      socket.emit('authenticate', { username: data.user.username, token: data.token });
    } else {
      showToast('❌ ' + (data.error || 'Login failed'));
    }
  } catch (e) {
    showToast('❌ Error: ' + e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAuthModule();
  initBuyCoinsModule();
  initCreatorCashoutModule();
  initReplaysModule();
  initPwaAndPipModule();
});

console.log('🚀 LiveWave Production Client Loaded Successfully');



/**
 * LiveWave Enterprise Admin Command Center Controller
 * Comprehensive management suite covering 7 modules:
 * 1. Overview & Analytics
 * 2. Live Surveillance Matrix & Stream Simulator
 * 3. User Directory & Role Distribution
 * 4. Global Live Chat Monitor & Interceptor
 * 5. Gift Catalog & Virtual Economy Studio
 * 6. WebRTC SFU Telemetry Inspector
 * 7. Platform Rules & Automated Policy Engine
 */

(function () {
  'use strict';

  // Application State
  let adminData = {
    overview: null,
    users: [],
    rules: {},
    logs: [],
    gifts: [],
    chatMessages: [],
    sfuTelemetry: null,
    activeTab: 'overview',
    searchQuery: '',
    roleFilter: 'all',
  };

  const socket = io();

  /* ══════════════════════════════════════════════════
     1. TOAST NOTIFICATIONS
     ══════════════════════════════════════════════════ */
  function showAdminToast(msg, duration = 3500) {
    const container = document.getElementById('adminToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'admin-toast';
    toast.innerHTML = `<span>🛡️</span> <span>${escapeHtml(msg)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ══════════════════════════════════════════════════
     2. DATA FETCHING (OVERVIEW, USERS, GIFTS, SFU, CHAT)
     ══════════════════════════════════════════════════ */
  async function fetchOverview() {
    try {
      const res = await fetch('/api/admin/overview');
      if (!res.ok) throw new Error('Failed to load overview');
      const data = await res.json();
      adminData.overview = data;
      adminData.rules = data.rules || {};
      adminData.logs = data.recentLogs || [];

      renderKPIs(data);
      renderSurveillanceGrid(data.activeRooms || []);
      renderAuditLogs(adminData.logs);
      populateRulesForm(data.rules || {});
      fetchAnalytics();
    } catch (e) {
      console.warn('Overview fetch error:', e.message);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      const list = await res.json();
      adminData.users = list;
      renderUsersTable();
    } catch (e) {
      console.warn('Users fetch error:', e.message);
    }
  }

  async function fetchGifts() {
    try {
      const res = await fetch('/api/gifts');
      if (!res.ok) throw new Error('Failed to load gifts');
      const list = await res.json();
      adminData.gifts = list;
      renderGiftStudio();
    } catch (e) {
      console.warn('Gifts fetch error:', e.message);
    }
  }

  async function fetchChatMessages() {
    try {
      const res = await fetch('/api/admin/chat/recent');
      if (!res.ok) throw new Error('Failed to load chat');
      const list = await res.json();
      adminData.chatMessages = list;
      renderChatMonitor();
    } catch (e) {
      console.warn('Chat fetch error:', e.message);
    }
  }

  async function fetchSfuTelemetry() {
    try {
      const res = await fetch('/api/admin/sfu/telemetry');
      if (!res.ok) throw new Error('Failed to load SFU telemetry');
      const data = await res.json();
      adminData.sfuTelemetry = data;
      renderSfuDiagnostics();
    } catch (e) {
      console.warn('SFU fetch error:', e.message);
    }
  }

  async function fetchAnalytics() {
    try {
      const res = await fetch('/api/admin/analytics');
      if (!res.ok) return;
      const data = await res.json();
      renderCategoryBars(data.categoryDistribution || {});
    } catch (e) {
      console.warn('Analytics fetch error:', e.message);
    }
  }

  /* ══════════════════════════════════════════════════
     3. RENDERING FUNCTIONS
     ══════════════════════════════════════════════════ */
  function renderKPIs(data) {
    if (!data) return;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('kpiActiveStreams', data.activeStreamsCount || 0);
    setVal('kpiOnlineUsers', data.onlineSocketsCount || 0);
    setVal('kpiTotalCoins', (data.totalCoinsInCirculation || 0).toLocaleString());

    if (data.system) {
      const sysInfoEl = document.getElementById('kpiSysUptime');
      if (sysInfoEl) {
        const mins = Math.floor(data.system.uptimeSeconds / 60);
        sysInfoEl.textContent = `${mins}m (${data.system.memoryUsageMb} MB RSS)`;
      }
    }
  }

  function renderCategoryBars(dist) {
    const container = document.getElementById('analyticsCategoryBars');
    if (!container) return;

    const cats = Object.keys(dist);
    const maxVal = Math.max(...Object.values(dist), 1);

    const colors = ['var(--primary)', 'var(--cyan)', 'var(--accent)', 'var(--gold)', 'var(--success)', '#f43f5e', '#a855f7'];

    container.innerHTML = cats.map((cat, idx) => {
      const count = dist[cat] || 0;
      const pct = Math.round((count / maxVal) * 100);
      const color = colors[idx % colors.length];

      return `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:4px;">
            <span>${escapeHtml(cat)}</span>
            <span style="color:${color};">${count} Active Broadcasts</span>
          </div>
          <div style="width:100%; height:8px; background:rgba(255,255,255,0.06); border-radius:9999px; overflow:hidden;">
            <div style="width:${Math.max(pct, 5)}%; height:100%; background:${color}; border-radius:9999px; transition:width 0.5s ease;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderSurveillanceGrid(rooms) {
    const grid = document.getElementById('surveillanceGrid');
    const emptyState = document.getElementById('surveillanceEmptyState');
    if (!grid) return;

    if (!rooms || rooms.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const catIcons = { 'Music': '🎵', 'Gaming': '🎮', 'Chat': '💬', 'Dance': '💃', 'Talent': '🌟', 'Educational': '📚', 'Sports': '⚡' };

    grid.innerHTML = rooms.map(room => {
      const icon = catIcons[room.category] || '🎙️';
      return `
        <div class="surveillance-card">
          <div class="surveillance-thumb-box">
            <span>${icon}</span>
            <div style="position:absolute; top:10px; left:10px; background:var(--danger); font-size:0.75rem; font-weight:800; padding:3px 8px; border-radius:9999px; color:#fff;">
              LIVE
            </div>
            <div style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:9999px; color:#fff;">
              👥 ${room.viewerCount || 0}
            </div>
          </div>
          <div style="padding:16px;">
            <strong style="font-size:1.05rem; display:block; margin-bottom:4px;">${escapeHtml(room.title)}</strong>
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-muted);">
              <span>Host: <strong>@${escapeHtml(room.hostUsername)}</strong></span>
              <span>Category: <strong>${escapeHtml(room.category)}</strong></span>
            </div>
            ${room.pkState?.active ? `
              <div style="margin-top:8px; padding:6px 10px; border-radius:6px; background:rgba(244,63,142,0.15); border:1px solid rgba(244,63,142,0.3); font-size:0.8rem; color:#f472b6;">
                ⚔️ PK Battle active vs @${escapeHtml(room.pkState.opponentHost)} (${room.pkState.score} vs ${room.pkState.opponentScore})
              </div>
            ` : ''}
          </div>
          <div class="surveillance-actions">
            <a href="/index.html#room=${encodeURIComponent(room.id)}" target="_blank" class="btn-admin btn-admin-ghost">Inspect ↗</a>
            <button class="btn-admin btn-admin-danger" onclick="window.adminCtrl.openTerminateModal('${escapeHtml(room.id)}', '${escapeHtml(room.title)}')">Terminate ✕</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    const filtered = adminData.users.filter(u => {
      const matchRole = adminData.roleFilter === 'all' || u.role === adminData.roleFilter || (adminData.roleFilter === 'banned' && u.isBanned);
      const q = adminData.searchQuery.toLowerCase();
      const matchQuery = !q || u.username.toLowerCase().includes(q) || (u.bio && u.bio.toLowerCase().includes(q));
      return matchRole && matchQuery;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No matching users found</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      const statusClass = u.isBanned ? 'status-banned' : (u.isOnline ? 'status-online' : 'status-offline');
      const statusText = u.isBanned ? 'Banned' : (u.isOnline ? 'Online' : 'Offline');

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="user-status-dot ${statusClass}" title="${statusText}"></span>
              <strong>@${escapeHtml(u.username)}</strong>
            </div>
          </td>
          <td>
            <span class="role-badge role-${escapeHtml(u.role || 'user')}">${escapeHtml(u.role || 'user')}</span>
          </td>
          <td><strong style="color:#fff;">Lv.${u.level || 1}</strong></td>
          <td><span style="color:var(--gold); font-weight:700;">🪙 ${(u.coins || 0).toLocaleString()}</span></td>
          <td>${u.streamsHosted || 0}</td>
          <td>
            <span style="font-size:0.8rem; color:${u.isBanned ? 'var(--danger)' : 'var(--success)'}; font-weight:700;">
              ${u.isBanned ? '⛔ BANNED' : '✓ Active'}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn-admin btn-admin-ghost" style="padding:4px 10px; font-size:0.78rem;" onclick="window.adminCtrl.openRoleModal('${escapeHtml(u.username)}', '${escapeHtml(u.role || 'user')}')">Role</button>
              <button class="btn-admin btn-admin-ghost" style="padding:4px 10px; font-size:0.78rem;" onclick="window.adminCtrl.openCoinModal('${escapeHtml(u.username)}', ${u.coins || 0})">Coins</button>
              <button class="btn-admin ${u.isBanned ? 'btn-admin-primary' : 'btn-admin-danger'}" style="padding:4px 10px; font-size:0.78rem;" onclick="window.adminCtrl.toggleBanUser('${escapeHtml(u.username)}', ${!u.isBanned})">
                ${u.isBanned ? 'Unban' : 'Ban'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderChatMonitor() {
    const list = document.getElementById('chatMonitorList');
    if (!list) return;

    if (!adminData.chatMessages || adminData.chatMessages.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">No chat activity observed yet</div>`;
      return;
    }

    list.innerHTML = adminData.chatMessages.map(msg => {
      const timeStr = new Date(msg.ts).toLocaleTimeString();
      return `
        <div class="chat-monitor-item">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="color:var(--cyan); font-weight:700;">@${escapeHtml(msg.username)}</span>
            <span style="font-size:0.75rem; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px;">Lv.${msg.level || 1}</span>
            <span style="color:#fff;">${escapeHtml(msg.text)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; font-size:0.8rem; color:var(--text-muted);">
            <span>Room: ${escapeHtml(msg.roomId || 'Live')}</span>
            <span>⏱️ ${timeStr}</span>
            <button class="btn-admin btn-admin-danger" style="padding:2px 8px; font-size:0.72rem;" onclick="window.adminCtrl.toggleBanUser('${escapeHtml(msg.username)}', true)">Ban User</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderGiftStudio() {
    const grid = document.getElementById('giftStudioGrid');
    if (!grid) return;

    grid.innerHTML = adminData.gifts.map(gift => {
      return `
        <div class="gift-studio-card">
          <div class="gift-studio-icon">${escapeHtml(gift.icon || '🎁')}</div>
          <strong style="font-size:1.05rem; margin-bottom:4px;">${escapeHtml(gift.name)}</strong>
          <span style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:12px;">Tier: ${escapeHtml(gift.tier || 'medium')}</span>

          <div style="display:flex; align-items:center; gap:6px; margin-bottom:14px;">
            <span style="color:var(--gold); font-weight:700;">🪙</span>
            <input type="number" class="gift-studio-price-input" id="giftPrice_${escapeHtml(gift.id)}" value="${gift.price}" />
          </div>

          <button class="btn-admin btn-admin-ghost" style="width:100%; font-size:0.8rem;" onclick="window.adminCtrl.updateGiftPrice('${escapeHtml(gift.id)}')">
            Save Price
          </button>
        </div>
      `;
    }).join('');
  }

  function renderSfuDiagnostics() {
    const grid = document.getElementById('sfuDiagnosticsGrid');
    if (!grid || !adminData.sfuTelemetry) return;

    const data = adminData.sfuTelemetry;

    grid.innerHTML = `
      <div class="sfu-stat-box">
        <span style="color:var(--text-muted); font-weight:600;">Mediasoup C++ Worker PID</span>
        <strong style="color:var(--cyan); font-family:monospace;">${data.workerPid || 'N/A'}</strong>
      </div>
      <div class="sfu-stat-box">
        <span style="color:var(--text-muted); font-weight:600;">DTLS / SRTP Encryption</span>
        <strong style="color:var(--success);">${data.dtlsEncryption}</strong>
      </div>
      <div class="sfu-stat-box">
        <span style="color:var(--text-muted); font-weight:600;">Active WebRTC Transports</span>
        <strong style="color:#fff; font-size:1.2rem;">${data.activeTransportsCount || 0}</strong>
      </div>
      <div class="sfu-stat-box">
        <span style="color:var(--text-muted); font-weight:600;">Active Media Producers (Audio/Video)</span>
        <strong style="color:var(--primary); font-size:1.2rem;">${data.activeProducersCount || 0}</strong>
      </div>
      <div class="sfu-stat-box">
        <span style="color:var(--text-muted); font-weight:600;">RTC Port Range</span>
        <strong style="color:var(--text-muted); font-family:monospace;">${data.rtcPortRange}</strong>
      </div>
      <div class="sfu-stat-box">
        <span style="color:var(--text-muted); font-weight:600;">Target Glass-to-Glass Latency</span>
        <strong style="color:#86efac;">⚡ &lt; ${data.averageLatencyMs} ms (Sub-Second)</strong>
      </div>
    `;
  }

  function renderAuditLogs(logs) {
    const list = document.getElementById('auditLogList');
    const overviewList = document.getElementById('overviewLogsList');
    if (!list) return;

    if (!logs || logs.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-muted);">No audit logs recorded yet</div>`;
      if (overviewList) overviewList.innerHTML = list.innerHTML;
      return;
    }

    const html = logs.map(log => {
      const catClass = `log-cat-${(log.category || 'system').toLowerCase()}`;
      const timeStr = new Date(log.timestamp).toLocaleTimeString();

      return `
        <div class="log-item">
          <div style="display:flex; align-items:center; gap:12px;">
            <span class="log-category-tag ${catClass}">${escapeHtml(log.category || 'System')}</span>
            <strong>${escapeHtml(log.action)}</strong>
            <span style="color:var(--text-muted);">${escapeHtml(log.details)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px; font-size:0.8rem; color:var(--text-subtle); flex-shrink:0;">
            <span>by @${escapeHtml(log.actor || 'System')}</span>
            <span>⏱️ ${timeStr}</span>
          </div>
        </div>
      `;
    }).join('');

    list.innerHTML = html;
    if (overviewList) overviewList.innerHTML = html;
  }

  function populateRulesForm(rules) {
    if (!rules) return;
    const setCheck = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(val);
    };
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    setVal('ruleMinLevel', rules.minLevelToGoLive ?? 1);
    setVal('ruleMaxDuration', rules.maxStreamDurationMinutes ?? 240);
    setVal('ruleChatSlowMode', rules.chatSlowModeSeconds ?? 0);
    setVal('ruleGiftTax', rules.giftCommissionRatePct ?? 15);
    setVal('rulePkDuration', rules.defaultPkDurationSeconds ?? 180);

    setCheck('ruleAutoMod', rules.autoModEnabled);
    setCheck('ruleMaintenance', rules.maintenanceMode);
    setCheck('ruleGuestSeats', rules.allowGuestSeats);

    if (Array.isArray(rules.bannedWords)) {
      setVal('ruleBannedWords', rules.bannedWords.join(', '));
    }
  }

  /* ══════════════════════════════════════════════════
     4. ADMIN CONTROLLER ACTIONS
     ══════════════════════════════════════════════════ */
  window.adminCtrl = {
    async spawnSimulatedStream() {
      try {
        const titles = [
          '🎸 Acoustic Jam & Guitar Covers',
          '🔥 Top Ranked PK Battle Arena',
          '💃 K-POP Dance Studio Live',
          '🎮 Pro League Finals Watchparty',
        ];
        const hosts = ['Aria_Acoustic', 'ProGamer_Kai', 'ElenaDance', 'CyberNova'];
        const cats = ['Music', 'Gaming', 'Dance', 'Chat'];

        const pick = Math.floor(Math.random() * titles.length);

        const res = await fetch('/api/admin/stream/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: titles[pick],
            hostUsername: hosts[pick],
            category: cats[pick],
            isPk: true,
            adminUsername: 'Admin_Master',
          })
        });
        const data = await res.json();
        if (data.success) {
          showAdminToast(`⚡ Spawned simulated live stream [${titles[pick]}]!`);
          fetchOverview();
        }
      } catch (e) {
        alert('Simulation failed: ' + e.message);
      }
    },

    openRoleModal(username, currentRole) {
      const modal = document.getElementById('modalAdminRole');
      const targetUser = document.getElementById('roleModalUsername');
      const select = document.getElementById('roleModalSelect');
      if (!modal || !targetUser || !select) return;

      targetUser.textContent = username;
      select.value = currentRole || 'user';
      modal.classList.remove('hidden');
    },

    async submitRoleChange() {
      const username = document.getElementById('roleModalUsername')?.textContent;
      const role = document.getElementById('roleModalSelect')?.value;
      if (!username || !role) return;

      try {
        const res = await fetch('/api/admin/user/role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, role, adminUsername: 'Admin_Master' })
        });
        const data = await res.json();
        if (data.success) {
          showAdminToast(`Updated @${username} role to [${role}]`);
          document.getElementById('modalAdminRole')?.classList.add('hidden');
          fetchUsers();
        } else {
          alert('Error: ' + (data.error || 'Failed to update role'));
        }
      } catch (e) {
        alert('Request failed: ' + e.message);
      }
    },

    openCoinModal(username, currentCoins) {
      const modal = document.getElementById('modalAdminCoins');
      const targetUser = document.getElementById('coinModalUsername');
      const curCoins = document.getElementById('coinModalCurrent');
      const input = document.getElementById('coinModalAmount');
      if (!modal) return;

      if (targetUser) targetUser.textContent = username;
      if (curCoins) curCoins.textContent = currentCoins.toLocaleString();
      if (input) input.value = '500';
      modal.classList.remove('hidden');
    },

    async submitCoinAdjustment() {
      const username = document.getElementById('coinModalUsername')?.textContent;
      const action = document.getElementById('coinModalAction')?.value || 'add';
      const amount = Number(document.getElementById('coinModalAmount')?.value) || 0;
      if (!username) return;

      try {
        const res = await fetch('/api/admin/user/coins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, amount, action, adminUsername: 'Admin_Master' })
        });
        const data = await res.json();
        if (data.success) {
          showAdminToast(`Updated @${username} balance to 🪙 ${data.coins.toLocaleString()}`);
          document.getElementById('modalAdminCoins')?.classList.add('hidden');
          fetchUsers();
          fetchOverview();
        } else {
          alert('Error: ' + (data.error || 'Failed to update coins'));
        }
      } catch (e) {
        alert('Request failed: ' + e.message);
      }
    },

    async toggleBanUser(username, shouldBan) {
      const actionStr = shouldBan ? 'ban' : 'unban';
      if (!confirm(`Are you sure you want to ${actionStr} @${username}?`)) return;

      try {
        const res = await fetch('/api/admin/user/ban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, ban: shouldBan, reason: 'Administrator moderation action', adminUsername: 'Admin_Master' })
        });
        const data = await res.json();
        if (data.success) {
          showAdminToast(`User @${username} is now ${shouldBan ? 'BANNED' : 'UNBANNED'}`);
          fetchUsers();
          fetchOverview();
        }
      } catch (e) {
        alert('Ban request failed: ' + e.message);
      }
    },

    async updateGiftPrice(giftId) {
      const input = document.getElementById(`giftPrice_${giftId}`);
      if (!input) return;
      const price = Number(input.value) || 1;

      try {
        const res = await fetch('/api/admin/gift/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: giftId, price, adminUsername: 'Admin_Master' })
        });
        const data = await res.json();
        if (data.success) {
          showAdminToast(`Updated gift price to 🪙 ${price}`);
          fetchGifts();
        }
      } catch (e) {
        alert('Price update failed: ' + e.message);
      }
    },

    openAddGiftModal() {
      document.getElementById('modalAdminAddGift')?.classList.remove('hidden');
    },

    async submitAddGift() {
      const name = document.getElementById('newGiftName')?.value.trim();
      const icon = document.getElementById('newGiftIcon')?.value.trim();
      const price = Number(document.getElementById('newGiftPrice')?.value) || 100;
      const tier = document.getElementById('newGiftTier')?.value || 'medium';

      if (!name || !icon) return alert('Please provide a name and icon');

      try {
        const res = await fetch('/api/admin/gift/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, icon, price, tier, combo: true, adminUsername: 'Admin_Master' })
        });
        const data = await res.json();
        if (data.success) {
          showAdminToast(`Created custom gift: ${name} ${icon}`);
          document.getElementById('modalAdminAddGift')?.classList.add('hidden');
          fetchGifts();
        }
      } catch (e) {
        alert('Add gift failed: ' + e.message);
      }
    },

    openTerminateModal(roomId, title) {
      const modal = document.getElementById('modalAdminTerminate');
      const targetTitle = document.getElementById('terminateModalTitle');
      const inputId = document.getElementById('terminateModalRoomId');
      if (!modal) return;

      if (targetTitle) targetTitle.textContent = title;
      if (inputId) inputId.value = roomId;
      modal.classList.remove('hidden');
    },

    async submitTerminateStream() {
      const roomId = document.getElementById('terminateModalRoomId')?.value;
      const reason = document.getElementById('terminateModalReason')?.value || 'Terminated by administrator';
      if (!roomId) return;

      try {
        const res = await fetch('/api/admin/room/terminate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, reason, adminUsername: 'Admin_Master' })
        });
        const data = await res.json();
        if (data.success) {
          showAdminToast(`Stream [${roomId}] successfully terminated`);
          document.getElementById('modalAdminTerminate')?.classList.add('hidden');
          fetchOverview();
        } else {
          alert('Error: ' + (data.error || 'Failed to terminate stream'));
        }
      } catch (e) {
        alert('Request failed: ' + e.message);
      }
    },

    async saveRules() {
      const getVal = (id) => document.getElementById(id)?.value;
      const getCheck = (id) => document.getElementById(id)?.checked;

      const wordsRaw = getVal('ruleBannedWords') || '';
      const bannedWords = wordsRaw.split(',').map(w => w.trim()).filter(Boolean);

      const rulesPayload = {
        minLevelToGoLive: Number(getVal('ruleMinLevel')) || 1,
        maxStreamDurationMinutes: Number(getVal('ruleMaxDuration')) || 240,
        chatSlowModeSeconds: Number(getVal('ruleChatSlowMode')) || 0,
        giftCommissionRatePct: Number(getVal('ruleGiftTax')) || 15,
        defaultPkDurationSeconds: Number(getVal('rulePkDuration')) || 180,
        autoModEnabled: getCheck('ruleAutoMod'),
        maintenanceMode: getCheck('ruleMaintenance'),
        allowGuestSeats: getCheck('ruleGuestSeats'),
        bannedWords,
      };

      try {
        const res = await fetch('/api/admin/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rules: rulesPayload, adminUsername: 'Admin_Master' })
        });
        const data = await res.json();
        if (data.success) {
          showAdminToast('✓ Platform rules & policies saved successfully');
          fetchOverview();
        } else {
          alert('Failed to save rules');
        }
      } catch (e) {
        alert('Save rules failed: ' + e.message);
      }
    },

    openBroadcastModal() {
      document.getElementById('modalAdminBroadcast')?.classList.remove('hidden');
    },

    async fetchWithdrawals() {
      try {
        const res = await fetch('/api/admin/withdrawals');
        if (!res.ok) throw new Error('Failed to load payouts');
        const list = await res.json();
        renderWithdrawalsTable(list);
      } catch (e) {
        console.warn('Payouts load error:', e.message);
      }
    },

    async updateWithdrawal(id, status) {
      if (!confirm(`Are you sure you want to mark payout ${id} as [${status}]?`)) return;
      try {
        const res = await fetch('/api/admin/withdrawal/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status, adminUsername: 'Admin_Master' })
        });
        const data = await res.json();
        if (data.success) {
          showAdminToast(`Payout ${id} marked as ${status}`);
          window.adminCtrl.fetchWithdrawals();
        } else {
          alert('Error: ' + (data.error || 'Failed to update payout'));
        }
      } catch (e) {
        alert('Request failed: ' + e.message);
      }
    },

    async submitBroadcast() {
      const message = document.getElementById('broadcastMessageInput')?.value.trim();
      const severity = document.getElementById('broadcastSeveritySelect')?.value || 'info';
      if (!message) return;

      try {
        const res = await fetch('/api/admin/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, severity, adminUsername: 'Admin_Master' })
        });
        const data = await res.json();
        if (data.success) {
          showAdminToast('📢 Global Alert dispatched to all users!');
          document.getElementById('modalAdminBroadcast')?.classList.add('hidden');
          document.getElementById('broadcastMessageInput').value = '';
        }
      } catch (e) {
        alert('Broadcast failed: ' + e.message);
      }
    }
  };

  function renderWithdrawalsTable(list) {
    const tbody = document.getElementById('payoutsTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:var(--text-muted);">No creator payout requests currently in queue.</td></tr>`;
      return;
    }

    const statusBadges = {
      'PENDING': '<span style="background:rgba(245,158,11,0.2); color:#fde047; padding:3px 8px; border-radius:9999px; font-weight:700; font-size:0.75rem;">⏳ PENDING</span>',
      'APPROVED': '<span style="background:rgba(6,214,230,0.2); color:var(--cyan); padding:3px 8px; border-radius:9999px; font-weight:700; font-size:0.75rem;">✓ APPROVED</span>',
      'PAID': '<span style="background:rgba(34,197,94,0.2); color:#86efac; padding:3px 8px; border-radius:9999px; font-weight:700; font-size:0.75rem;">💎 PAID</span>',
      'REJECTED': '<span style="background:rgba(239,68,68,0.2); color:#fca5a5; padding:3px 8px; border-radius:9999px; font-weight:700; font-size:0.75rem;">✕ REJECTED</span>',
    };

    tbody.innerHTML = list.map(w => `
      <tr>
        <td style="font-family:monospace; color:var(--text-muted); font-size:0.8rem;">${w.id}</td>
        <td><strong>@${escapeHtml(w.username)}</strong><br><small style="color:var(--text-muted);">${escapeHtml(w.accountName || '')}</small></td>
        <td style="color:#38bdf8; font-weight:700;">💎 ${(w.diamonds || 0).toLocaleString()}</td>
        <td style="color:var(--gold); font-weight:800;">$${(w.amountUsd || 0).toFixed(2)}</td>
        <td style="color:#fff; font-weight:600;">~${(w.amountCdf || 0).toLocaleString()} CDF</td>
        <td><span style="font-size:0.82rem;">${escapeHtml(w.method || 'Mobile Money')}</span></td>
        <td><strong style="color:var(--cyan); font-size:0.85rem;">${escapeHtml(w.accountPhone || '—')}</strong></td>
        <td>${statusBadges[w.status] || w.status}</td>
        <td style="font-size:0.75rem; color:var(--text-muted);">${new Date(w.requestedAt).toLocaleTimeString()}</td>
        <td>
          <div style="display:flex; gap:4px;">
            ${w.status === 'PENDING' ? `
              <button class="btn-action-small" style="background:var(--cyan); color:#000; font-weight:700;" onclick="window.adminCtrl.updateWithdrawal('${w.id}', 'APPROVED')">Approve</button>
              <button class="btn-action-small btn-action-danger" onclick="window.adminCtrl.updateWithdrawal('${w.id}', 'REJECTED')">Reject</button>
            ` : ''}
            ${w.status === 'APPROVED' ? `
              <button class="btn-action-small" style="background:var(--success); color:#fff; font-weight:700;" onclick="window.adminCtrl.updateWithdrawal('${w.id}', 'PAID')">Mark Paid</button>
            ` : ''}
            ${w.status === 'PAID' ? `<span style="font-size:0.75rem; color:var(--text-muted);">Completed</span>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  }

  /* ══════════════════════════════════════════════════
     5. NAVIGATION & EVENT HANDLERS
     ══════════════════════════════════════════════════ */
  function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-item-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const headerTitle = document.getElementById('adminViewTitle');

    const titles = {
      'overview': '📊 Platform Overview & Real-Time Analytics',
      'surveillance': '📡 Live Stream Surveillance Matrix',
      'users': '👥 User Accounts & Role Distribution',
      'chat': '💬 Global Live Chat Monitor & Interceptor',
      'gifts': '🎁 Virtual Gift Catalog & Economy Studio',
      'sfu': '⚡ Mediasoup WebRTC SFU Telemetry Inspector',
      'payouts': '💸 Creator Diamond Payout & Withdrawal Queue',
      'rules': '⚙️ Platform Rules & Automated Policy Engine',
      'logs': '📜 Real-Time Audit & Event Logs',
    };

    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        tabPanels.forEach(p => p.classList.remove('active'));
        const activePanel = document.getElementById(`tab-${tab}`);
        if (activePanel) activePanel.classList.add('active');

        if (headerTitle && titles[tab]) {
          headerTitle.textContent = titles[tab];
        }

        if (tab === 'users') fetchUsers();
        if (tab === 'gifts') fetchGifts();
        if (tab === 'chat') fetchChatMessages();
        if (tab === 'sfu') fetchSfuTelemetry();
        if (tab === 'payouts') window.adminCtrl.fetchWithdrawals();
        if (tab === 'overview' || tab === 'surveillance') fetchOverview();
      });
    });

    // User Search & Role Filters
    document.getElementById('userSearchInput')?.addEventListener('input', (e) => {
      adminData.searchQuery = e.target.value.trim();
      renderUsersTable();
    });

    document.getElementById('userRoleFilter')?.addEventListener('change', (e) => {
      adminData.roleFilter = e.target.value;
      renderUsersTable();
    });

    // Save Rules Button
    document.getElementById('btnSaveRules')?.addEventListener('click', () => window.adminCtrl.saveRules());

    // Live Clock
    setInterval(() => {
      const clock = document.getElementById('adminClock');
      if (clock) {
        clock.textContent = new Date().toLocaleTimeString();
      }
    }, 1000);
  }

  /* ══════════════════════════════════════════════════
     6. REAL-TIME SOCKET.IO INTEGRATION
     ══════════════════════════════════════════════════ */
  function setupSocketListeners() {
    socket.on('adminAuditLog', (log) => {
      adminData.logs.unshift(log);
      if (adminData.logs.length > 200) adminData.logs.pop();
      renderAuditLogs(adminData.logs);
      showAdminToast(`[${log.category}] ${log.action}: ${log.details}`);
    });

    socket.on('adminChatMessage', (msg) => {
      adminData.chatMessages.unshift(msg);
      if (adminData.chatMessages.length > 100) adminData.chatMessages.pop();
      renderChatMonitor();
    });

    socket.on('roomsList', (rooms) => {
      renderSurveillanceGrid(rooms);
      const counter = document.getElementById('kpiActiveStreams');
      if (counter) counter.textContent = rooms.length;
    });

    socket.on('userRoleUpdated', () => fetchUsers());
    socket.on('userCoinsUpdated', () => fetchUsers());
    socket.on('userBanUpdated', () => fetchUsers());
    socket.on('giftCatalogUpdated', (gifts) => {
      adminData.gifts = gifts;
      renderGiftStudio();
    });
    socket.on('adminWithdrawalNew', (w) => {
      showAdminToast(`💸 New Payout Request: @${w.username} ($${w.amountUsd})`);
      window.adminCtrl.fetchWithdrawals();
    });
    socket.on('withdrawalStatusUpdated', () => {
      window.adminCtrl.fetchWithdrawals();
    });
  }

  /* ══════════════════════════════════════════════════
     INIT ON LOAD
     ══════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupSocketListeners();
    fetchOverview();
    fetchUsers();
    fetchGifts();
    fetchChatMessages();
    fetchSfuTelemetry();
    window.adminCtrl.fetchWithdrawals();
  });

})();

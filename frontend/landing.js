/**
 * LiveWave Landing Page Interactive Logic
 * Features:
 * - Interactive PK Battle Simulator
 * - Dynamic Canvas Gift Particle FX System
 * - Web Audio Sound Synthesizer (Zero external audio files required)
 * - Live Rooms API Fetcher
 * - Interactive FAQ Accordion
 * - Header Scroll Effects & Smooth Navigation
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════
     1. WEB AUDIO SYNTHESIZER & SOUND FX
     ══════════════════════════════════════════════════ */
  let audioCtx = null;
  let soundEnabled = true;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  }

  function playGiftSound(tier = 'small') {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    if (tier === 'small') {
      playTone(587.33, 'triangle', 0.12, 0.1); // D5
      setTimeout(() => playTone(880, 'sine', 0.18, 0.1), 80); // A5
    } else if (tier === 'medium') {
      playTone(523.25, 'triangle', 0.15, 0.12); // C5
      setTimeout(() => playTone(659.25, 'triangle', 0.15, 0.12), 90); // E5
      setTimeout(() => playTone(1046.50, 'sine', 0.25, 0.15), 180); // C6
    } else {
      // Large / VIP fanfare
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
        setTimeout(() => playTone(freq, 'sawtooth', 0.22, 0.08), idx * 75);
      });
    }
  }

  function setupSoundToggle() {
    const btn = document.getElementById('landingSoundToggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      btn.textContent = soundEnabled ? '🔊' : '🔇';
      btn.title = soundEnabled ? 'Sound FX Enabled' : 'Sound FX Muted';
      if (soundEnabled) {
        initAudio();
        playTone(660, 'sine', 0.1, 0.08);
      }
    });
  }

  /* ══════════════════════════════════════════════════
     2. CANVAS PARTICLE FX (GIFTS & CELEBRATIONS)
     ══════════════════════════════════════════════════ */
  const canvas = document.getElementById('landingParticleCanvas');
  let ctx = null;
  let particles = [];
  let animFrameId = null;

  function initCanvas() {
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  class Particle {
    constructor(x, y, char = null) {
      this.x = x;
      this.y = y;
      this.char = char;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 2;
      this.gravity = 0.18;
      this.alpha = 1;
      this.decay = Math.random() * 0.02 + 0.015;
      this.size = char ? (Math.random() * 12 + 20) : (Math.random() * 6 + 4);
      this.color = `hsl(${Math.floor(Math.random() * 60 + 260)}, 100%, 70%)`;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.alpha -= this.decay;
      this.rotation += this.rotSpeed;
    }

    draw(ctx) {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      if (this.char) {
        ctx.font = `${this.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.char, 0, 0);
      } else {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function spawnBurst(x, y, char = null, count = 28) {
    if (!canvas) return;
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, Math.random() > 0.6 ? char : null));
    }
    if (!animFrameId) {
      animateParticles();
    }
  }

  function animateParticles() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.alpha <= 0 || p.y > canvas.height + 50) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0) {
      animFrameId = requestAnimationFrame(animateParticles);
    } else {
      animFrameId = null;
    }
  }

  /* ══════════════════════════════════════════════════
     3. INTERACTIVE PK BATTLE ARENA SIMULATOR
     ══════════════════════════════════════════════════ */
  let blueScore = 1250;
  let redScore = 980;
  let pkSecondsLeft = 180;

  function setupPkSimulator() {
    const blueScoreEl = document.getElementById('simBlueScore');
    const redScoreEl = document.getElementById('simRedScore');
    const barBlue = document.getElementById('simBarBlue');
    const barRed = document.getElementById('simBarRed');
    const timerEl = document.getElementById('simTimerText');

    function updateScores() {
      if (blueScoreEl) blueScoreEl.textContent = blueScore.toLocaleString();
      if (redScoreEl) redScoreEl.textContent = redScore.toLocaleString();

      const total = Math.max(blueScore + redScore, 1);
      const bluePct = Math.min(Math.max((blueScore / total) * 100, 10), 90);
      const redPct = 100 - bluePct;

      if (barBlue) barBlue.style.width = `${bluePct}%`;
      if (barRed) barRed.style.width = `${redPct}%`;
    }

    // Attach click listeners to all simulated gift buttons
    document.querySelectorAll('.btn-sim-gift').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const team = btn.dataset.team;
        const amount = parseInt(btn.dataset.amount, 10) || 10;
        const rect = btn.getBoundingClientRect();
        const icon = btn.textContent.trim().split(' ')[0] || '✨';

        if (team === 'blue') {
          blueScore += amount;
          spawnBurst(rect.left + rect.width / 2, rect.top, icon, 16);
          playGiftSound(amount >= 250 ? 'large' : amount >= 50 ? 'medium' : 'small');
        } else if (team === 'red') {
          redScore += amount;
          spawnBurst(rect.left + rect.width / 2, rect.top, icon, 16);
          playGiftSound(amount >= 250 ? 'large' : amount >= 50 ? 'medium' : 'small');
        }

        updateScores();
      });
    });

    // PK Timer countdown interval
    setInterval(() => {
      if (pkSecondsLeft > 0) {
        pkSecondsLeft--;
        const m = Math.floor(pkSecondsLeft / 60);
        const s = pkSecondsLeft % 60;
        if (timerEl) {
          timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
      } else {
        pkSecondsLeft = 180; // reset
      }
    }, 1000);

    updateScores();
  }

  /* ══════════════════════════════════════════════════
     4. INTERACTIVE GIFT SHOWCASE GALLERY
     ══════════════════════════════════════════════════ */
  function setupGiftGallery() {
    const giftCards = document.querySelectorAll('.gift-card');
    const marqueeUser = document.getElementById('demoMarqueeUser');
    const marqueeText = document.getElementById('demoMarqueeText');
    const marqueeIcon = document.getElementById('demoMarqueeIcon');

    const usernames = ['StarlightAlex', 'CyberNova', 'MoonWalker99', 'NeonQueen', 'ValkyrieLive', 'GoldDragon'];

    giftCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const name = card.dataset.name || 'Gift';
        const icon = card.dataset.icon || '🎁';
        const tier = card.dataset.tier || 'small';
        const rect = card.getBoundingClientRect();

        const randomUser = usernames[Math.floor(Math.random() * usernames.length)];

        if (marqueeUser) marqueeUser.textContent = randomUser;
        if (marqueeText) marqueeText.textContent = `sent a ${name}!`;
        if (marqueeIcon) marqueeIcon.textContent = icon;

        spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, icon, tier === 'large' ? 36 : 20);
        playGiftSound(tier);
      });
    });
  }

  /* ══════════════════════════════════════════════════
     5. LIVE SERVER DATA INTEGRATION (/api/rooms)
     ══════════════════════════════════════════════════ */
  async function fetchLiveStreams() {
    const grid = document.getElementById('landingLiveRoomsGrid');
    const emptyState = document.getElementById('landingEmptyState');
    if (!grid) return;

    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('API offline');
      const rooms = await res.json();

      if (rooms && rooms.length > 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'none';

        rooms.forEach(room => {
          const card = document.createElement('a');
          card.className = 'landing-room-card';
          card.href = `/index.html#room=${encodeURIComponent(room.id)}`;

          const catIcons = {
            'Music': '🎵',
            'Gaming': '🎮',
            'Chat': '💬',
            'Dance': '💃',
            'Talent': '🌟',
            'Educational': '📚',
            'Sports': '⚡'
          };
          const icon = catIcons[room.category] || '🎙️';

          card.innerHTML = `
            <div class="room-thumb-wrap">
              <span>${icon}</span>
              <span class="live-tag"><span class="pulse-dot"></span> LIVE</span>
              <span class="viewer-count-tag">👥 ${room.viewerCount || 1}</span>
            </div>
            <div class="room-details-body">
              <div class="room-title-text">${escapeHtml(room.title || 'Live Stream')}</div>
              <div class="room-host-meta">
                <span>👤 ${escapeHtml(room.hostUsername)}</span>
                <span class="bento-tag">${escapeHtml(room.category || 'Live')}</span>
              </div>
            </div>
          `;
          grid.appendChild(card);
        });
      } else {
        // Show featured fallback cards if no active stream is running right now
        renderFeaturedFallbackStreams(grid);
      }
    } catch (e) {
      renderFeaturedFallbackStreams(grid);
    }
  }

  function renderFeaturedFallbackStreams(grid) {
    if (!grid) return;
    const featured = [
      { id: 'featured-1', host: 'Aria_Acoustic', title: 'Late Night Chill & Acoustic Hits 🎸', cat: 'Music', icon: '🎵', viewers: 1420 },
      { id: 'featured-2', host: 'ProGamer_Kai', title: 'Road to Grandmaster Ranked PK Arena 🏆', cat: 'Gaming', icon: '🎮', viewers: 2850 },
      { id: 'featured-3', host: 'ElenaDance', title: 'K-POP Dance Showcase & Song Requests ✨', cat: 'Dance', icon: '💃', viewers: 3100 }
    ];

    grid.innerHTML = featured.map(f => `
      <a class="landing-room-card" href="/index.html">
        <div class="room-thumb-wrap">
          <span>${f.icon}</span>
          <span class="live-tag"><span class="pulse-dot"></span> LIVE</span>
          <span class="viewer-count-tag">👥 ${f.viewers.toLocaleString()}</span>
        </div>
        <div class="room-details-body">
          <div class="room-title-text">${escapeHtml(f.title)}</div>
          <div class="room-host-meta">
            <span>👤 ${escapeHtml(f.host)}</span>
            <span class="bento-tag">${f.cat}</span>
          </div>
        </div>
      </a>
    `).join('');
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
     6. FAQ ACCORDION INTERACTION
     ══════════════════════════════════════════════════ */
  function setupFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
      const q = item.querySelector('.faq-question');
      if (!q) return;

      q.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close all others
        faqItems.forEach(other => {
          if (other !== item) other.classList.remove('active');
        });

        // Toggle current
        item.classList.toggle('active', !isActive);
        playTone(440, 'sine', 0.08, 0.05);
      });
    });
  }

  /* ══════════════════════════════════════════════════
     7. HEADER SCROLL & NAVIGATION
     ══════════════════════════════════════════════════ */
  function setupHeaderScroll() {
    const header = document.getElementById('landingHeader');
    if (!header) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  /* ══════════════════════════════════════════════════
     DOM CONTENT LOADED INITIALIZATION
     ══════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    setupSoundToggle();
    setupPkSimulator();
    setupGiftGallery();
    fetchLiveStreams();
    setupFaqAccordion();
    setupHeaderScroll();
  });

})();

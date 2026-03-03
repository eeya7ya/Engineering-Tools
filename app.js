'use strict';
/* =====================================================
   eSpark Engineering Tools — App JS
   Single-page controller: canvas · cursor · auth · dashboard
   ===================================================== */

// ════════════════════════════════════════════════════
//  CANVAS BACKGROUND
// ════════════════════════════════════════════════════
const canvas  = document.getElementById('bgCanvas');
const ctx     = canvas.getContext('2d');
const mouse   = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const COLORS  = ['#FF6B35', '#FFD93D', '#4D96FF', '#6BCB77', '#C77DFF'];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

class BgNode {
  constructor() { this.reset(true); }
  reset(init = false) {
    this.x    = Math.random() * canvas.width;
    this.y    = init ? Math.random() * canvas.height : canvas.height + 20;
    this.r    = 2 + Math.random() * 2.5;
    this.vx   = (Math.random() - 0.5) * 0.25;
    this.vy   = -(0.15 + Math.random() * 0.4);
    this.alpha       = 0;
    this.targetAlpha = 0.06 + Math.random() * 0.12;
    this.color       = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.pulse       = Math.random() * Math.PI * 2;
    this.pulseSpeed  = 0.02 + Math.random() * 0.02;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.pulse += this.pulseSpeed;
    if (this.alpha < this.targetAlpha) this.alpha += 0.003;
    if (this.y < -20) this.reset();
  }
  draw() {
    const p = 0.7 + 0.3 * Math.sin(this.pulse);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * p, 0, Math.PI * 2);
    ctx.fillStyle = this.color + Math.round(this.alpha * 255).toString(16).padStart(2, '0');
    ctx.fill();
  }
}

const bgNodes = Array.from({ length: 60 }, () => new BgNode());

function renderCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw connection lines
  for (let i = 0; i < bgNodes.length; i++) {
    for (let j = i + 1; j < bgNodes.length; j++) {
      const dx = bgNodes[i].x - bgNodes[j].x;
      const dy = bgNodes[i].y - bgNodes[j].y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < 120) {
        ctx.beginPath();
        ctx.moveTo(bgNodes[i].x, bgNodes[i].y);
        ctx.lineTo(bgNodes[j].x, bgNodes[j].y);
        ctx.strokeStyle = `rgba(77,150,255,${(1 - d / 120) * 0.07})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
  bgNodes.forEach(n => { n.update(); n.draw(); });
  requestAnimationFrame(renderCanvas);
}
renderCanvas();

// ════════════════════════════════════════════════════
//  CUSTOM CURSOR
// ════════════════════════════════════════════════════
const cursorDot   = document.getElementById('cursorDot');
const cursorSpark = document.getElementById('cursorSpark');
let sparkX = mouse.x, sparkY = mouse.y;

function updateCursor() {
  cursorDot.style.left = mouse.x + 'px';
  cursorDot.style.top  = mouse.y + 'px';
  sparkX += (mouse.x - sparkX) * 0.14;
  sparkY += (mouse.y - sparkY) * 0.14;
  cursorSpark.style.left = sparkX + 'px';
  cursorSpark.style.top  = sparkY + 'px';
  requestAnimationFrame(updateCursor);
}
updateCursor();

function attachCursorHover(el) {
  el.addEventListener('mouseenter', () => {
    cursorSpark.style.width  = '52px';
    cursorSpark.style.height = '52px';
    cursorSpark.style.borderColor = 'var(--accent2)';
    cursorDot.style.background    = 'var(--accent2)';
  });
  el.addEventListener('mouseleave', () => {
    cursorSpark.style.width  = '32px';
    cursorSpark.style.height = '32px';
    cursorSpark.style.borderColor = 'var(--accent1)';
    cursorDot.style.background    = 'var(--accent1)';
  });
}

// Spark trail particles
let lastParticleMs = 0;
document.addEventListener('mousemove', e => {
  const now = Date.now();
  if (now - lastParticleMs < 45) return;
  lastParticleMs = now;
  const p = document.createElement('div');
  p.className = 'spark-particle';
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size  = 4 + Math.random() * 5;
  p.style.cssText = [
    `left:${e.clientX}px`,
    `top:${e.clientY}px`,
    `background:${color}`,
    `width:${size}px`,
    `height:${size}px`,
  ].join(';');
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 620);
});

// ════════════════════════════════════════════════════
//  VIEW MANAGER
// ════════════════════════════════════════════════════
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ════════════════════════════════════════════════════
//  AUTH STATE
// ════════════════════════════════════════════════════
function saveSession(token, user) {
  localStorage.setItem('espark_token', token);
  localStorage.setItem('espark_user',  JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('espark_token');
  localStorage.removeItem('espark_user');
}
function getToken()  { return localStorage.getItem('espark_token'); }
function getSavedUser() {
  try { return JSON.parse(localStorage.getItem('espark_user')); } catch { return null; }
}

// ════════════════════════════════════════════════════
//  API HELPERS
// ════════════════════════════════════════════════════
async function api(path, opts = {}) {
  const token = getToken();
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  return res.json();
}

// ════════════════════════════════════════════════════
//  GOOGLE IDENTITY SERVICES
// ════════════════════════════════════════════════════
async function initGoogle(googleClientId) {
  if (!googleClientId || !window.google) return;

  google.accounts.id.initialize({
    client_id:            googleClientId,
    callback:             handleGoogleCredential,
    auto_select:          false,
    cancel_on_tap_outside: true,
  });

  // Render Google's official button in both auth views
  const btnCfg = { theme: 'outline', size: 'large', text: 'continue_with', width: 340, shape: 'rectangular' };
  const loginEl  = document.getElementById('googleLoginBtn');
  const regEl    = document.getElementById('googleRegisterBtn');
  if (loginEl)  google.accounts.id.renderButton(loginEl,  btnCfg);
  if (regEl)    google.accounts.id.renderButton(regEl,    btnCfg);
}

async function handleGoogleCredential(response) {
  showAuthError('loginError', '');
  const data = await api('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential: response.credential }),
  });
  if (data.error) { showAuthError('loginError', data.error); return; }
  saveSession(data.token, data.user);
  loadDashboard(data.user);
}

// ════════════════════════════════════════════════════
//  AUTH FORMS
// ════════════════════════════════════════════════════
function showAuthError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.textContent = msg;
}

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  showAuthError('loginError', '');
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { showAuthError('loginError', 'Please fill in all fields'); return; }

  const data = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.error) { showAuthError('loginError', data.error); return; }
  saveSession(data.token, data.user);
  loadDashboard(data.user);
});

document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  showAuthError('registerError', '');
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!name || !email || !password) { showAuthError('registerError', 'Please fill in all fields'); return; }

  const data = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  if (data.error) { showAuthError('registerError', data.error); return; }
  saveSession(data.token, data.user);
  loadDashboard(data.user);
});

// Toggle between login ↔ register
document.getElementById('toRegisterBtn').addEventListener('click', () => showView('registerView'));
document.getElementById('toLoginBtn').addEventListener('click',    () => showView('loginView'));

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  clearSession();
  google.accounts?.id?.disableAutoSelect?.();
  showView('loginView');
});

// ════════════════════════════════════════════════════
//  TOOLS DATA
// ════════════════════════════════════════════════════
const TOOLS = [
  { id: 'ohm',         icon: '⚡',  name: "Ohm's Law Calculator",   desc: 'Solve V, I, R relationships instantly',   tag: 'Basic',     cat: 'basic',     color: '#FFD93D' },
  { id: 'power',       icon: '🔋',  name: 'Power Calculator',        desc: 'Compute power in AC/DC circuits',          tag: 'Power',     cat: 'power',     color: '#6BCB77' },
  { id: 'impedance',   icon: '〰️', name: 'Impedance Calculator',    desc: 'RLC series & parallel impedance',          tag: 'AC',        cat: 'ac',        color: '#4D96FF' },
  { id: 'transformer', icon: '📡',  name: 'Transformer Calculator',  desc: 'Turns ratio, voltage & current',           tag: 'Magnetics', cat: 'magnetics', color: '#FF6B6B' },
  { id: 'filter',      icon: '🌊',  name: 'Filter Designer',         desc: 'Low-pass, high-pass, band-pass filters',   tag: 'Signal',    cat: 'signal',    color: '#C77DFF' },
  { id: 'converter',   icon: '🔢',  name: 'Unit Converter',          desc: 'Convert electrical units instantly',        tag: 'Utility',   cat: 'utility',   color: '#FF9F43' },
];

// ════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════
function buildToolsGrid(tools) {
  const grid = document.getElementById('toolsGrid');
  grid.innerHTML = tools.map(t => `
    <div class="tool-card" data-cat="${t.cat}" data-id="${t.id}" style="--card-color:${t.color}">
      <span class="tool-icon">${t.icon}</span>
      <h3>${t.name}</h3>
      <p>${t.desc}</p>
      <span class="tool-tag">${t.tag}</span>
    </div>
  `).join('');

  // Attach cursor hover to new cards
  grid.querySelectorAll('.tool-card').forEach(attachCursorHover);
}

function filterTools(cat) {
  const query = document.getElementById('toolSearch').value.toLowerCase();
  document.querySelectorAll('.tool-card').forEach(card => {
    const matchCat  = cat === 'all' || card.dataset.cat === cat;
    const matchSearch = !query || card.querySelector('h3').textContent.toLowerCase().includes(query)
                                || card.querySelector('p').textContent.toLowerCase().includes(query);
    card.classList.toggle('hidden-card', !(matchCat && matchSearch));
  });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function loadDashboard(user) {
  // Populate user info
  const nameLabel = document.getElementById('userNameLabel');
  const avatar    = document.getElementById('userAvatar');
  const welcome   = document.getElementById('welcomeMsg');

  nameLabel.textContent = user.name || user.email;
  welcome.textContent   = `${getGreeting()}, ${user.name?.split(' ')[0] || 'Engineer'}! 👋`;

  if (user.avatar) {
    avatar.src   = user.avatar;
    avatar.style.display = 'block';
  }

  // Build tools
  buildToolsGrid(TOOLS);

  // Sidebar filter
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterTools(btn.dataset.cat);
    });
    attachCursorHover(btn);
  });

  // Search
  document.getElementById('toolSearch').addEventListener('input', () => {
    const activeCat = document.querySelector('.nav-item.active')?.dataset.cat || 'all';
    filterTools(activeCat);
  });

  // Cursor on interactive elements
  document.querySelectorAll('button, .btn-signout').forEach(attachCursorHover);

  showView('dashView');
}

// ════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════
async function init() {
  // Attach cursor hover to initial auth elements
  document.querySelectorAll('button, a, .form-input').forEach(attachCursorHover);

  // Fetch public config (Google client ID)
  let googleClientId = null;
  try {
    const cfg = await api('/api/config');
    googleClientId = cfg.googleClientId;
  } catch {
    // Running without backend — skip Google OAuth
  }

  // Wait for Google SDK to load (it's async)
  if (googleClientId) {
    const waitForGoogle = new Promise(resolve => {
      if (window.google) { resolve(); return; }
      const check = setInterval(() => {
        if (window.google) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(); }, 5000);
    });
    await waitForGoogle;
    initGoogle(googleClientId);
  }

  // Check existing session
  const token = getToken();
  const user  = getSavedUser();
  if (token && user) {
    // Verify token is still valid
    try {
      const data = await api('/api/auth/me');
      if (data.user) {
        loadDashboard(data.user);
        return;
      }
    } catch { /* invalid token, fall through to login */ }
    clearSession();
  }

  showView('loginView');
}

window.addEventListener('DOMContentLoaded', init);

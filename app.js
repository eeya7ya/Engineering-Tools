'use strict';
/* =====================================================
   eSpark Engineering Tools — App JS
   canvas · cursor · geo-char interaction · auth · dashboard
   ===================================================== */

// ════════════════════════════════════════════════════
//  CANVAS BACKGROUND
// ════════════════════════════════════════════════════
const canvas = document.getElementById('bgCanvas');
const ctx    = canvas.getContext('2d');
const mouse  = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const COLORS = ['#FF6B35', '#FFD93D', '#4D96FF', '#6BCB77', '#C77DFF'];

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
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
    this.alpha      = 0;
    this.targetAlpha = 0.06 + Math.random() * 0.12;
    this.color      = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.pulse      = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.02 + Math.random() * 0.02;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
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
  p.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;background:${color};width:${size}px;height:${size}px;`;
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 620);
});

// ════════════════════════════════════════════════════
//  GEO-CHARACTER INTERACTION
// ════════════════════════════════════════════════════
const geoChars = [...document.querySelectorAll('.geo-char')];
const surprisedCooldown = new Map();

// Wander state: each shape gets independent drift velocity
geoChars.forEach(shape => {
  shape._wx  = 0;
  shape._wy  = 0;
  shape._wvx = (Math.random() - 0.5) * 1.1;
  shape._wvy = (Math.random() - 0.5) * 0.8;
});

function center(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
}

function animateGeoChars() {
  const loginCard = document.getElementById('loginCard');
  if (!loginCard) { requestAnimationFrame(animateGeoChars); return; }

  const card     = center(loginCard);
  const cardRect = card.rect;

  const nearCard =
    mouse.x > cardRect.left  - 220 && mouse.x < cardRect.right  + 60 &&
    mouse.y > cardRect.top   - 80  && mouse.y < cardRect.bottom + 80;

  geoChars.forEach(shape => {
    const si = center(shape);
    const dx = mouse.x - si.x;
    const dy = mouse.y - si.y;
    const distToMouse = Math.sqrt(dx * dx + dy * dy);

    // Pupils follow mouse or card
    const lookX = nearCard ? card.x : mouse.x;
    const lookY = nearCard ? card.y : mouse.y;

    shape.querySelectorAll('.geo-pupil').forEach(pupil => {
      const eyeEl = pupil.closest('.geo-eye');
      const er    = eyeEl.getBoundingClientRect();
      const ex    = er.left + er.width  / 2;
      const ey    = er.top  + er.height / 2;
      const angle = Math.atan2(lookY - ey, lookX - ex);
      pupil.style.transform = `translate(${Math.cos(angle) * 3}px, ${Math.sin(angle) * 3}px)`;
    });

    // Expression state machine
    if (distToMouse < 88 && !nearCard) {
      if (!shape.classList.contains('surprised')) {
        shape.classList.add('surprised');
        shape.classList.remove('excited');
        const prev = surprisedCooldown.get(shape);
        if (prev) clearTimeout(prev);
        surprisedCooldown.set(shape, setTimeout(() => shape.classList.remove('surprised'), 480));
      }
    } else if (nearCard) {
      if (!shape.classList.contains('surprised')) shape.classList.add('excited');
    } else {
      shape.classList.remove('excited');
    }

    // Wander effect: shapes drift freely when cursor is near the login card
    if (nearCard) {
      shape.style.animationPlayState = 'paused';
      shape._wx += shape._wvx;
      shape._wy += shape._wvy;
      // Bounce within wander bounds and nudge velocity randomly for organic motion
      if (Math.abs(shape._wx) > 32) { shape._wvx *= -1; shape._wx += shape._wvx; }
      if (Math.abs(shape._wy) > 24) { shape._wvy *= -1; shape._wy += shape._wvy; }
      shape._wvx += (Math.random() - 0.5) * 0.12;
      shape._wvy += (Math.random() - 0.5) * 0.09;
      shape._wvx = Math.max(-1.8, Math.min(1.8, shape._wvx));
      shape._wvy = Math.max(-1.4, Math.min(1.4, shape._wvy));
      shape.style.transform = `translate(${shape._wx}px, ${shape._wy}px)`;
    } else {
      // Ease back to resting position then restore CSS float animation
      shape._wx *= 0.88;
      shape._wy *= 0.88;
      if (Math.abs(shape._wx) < 0.5 && Math.abs(shape._wy) < 0.5) {
        shape._wx = 0;
        shape._wy = 0;
        shape.style.transform = '';
        shape.style.animationPlayState = '';
      } else {
        shape.style.transform = `translate(${shape._wx}px, ${shape._wy}px)`;
      }
    }
  });

  requestAnimationFrame(animateGeoChars);
}

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
function getToken()    { return localStorage.getItem('espark_token'); }
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
function initGoogle(googleClientId) {
  if (!googleClientId || !window.google) return;
  google.accounts.id.initialize({
    client_id: googleClientId,
    callback:  handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  const btnCfg = { theme: 'outline', size: 'large', text: 'continue_with', width: 340 };
  const loginEl  = document.getElementById('googleLoginBtn');
  const regEl    = document.getElementById('googleRegisterBtn');
  if (loginEl)  {
    const fb = document.getElementById('googleLoginFallback');
    if (fb) fb.classList.add('hidden');
    google.accounts.id.renderButton(loginEl,  btnCfg);
  }
  if (regEl) {
    const fb = document.getElementById('googleRegisterFallback');
    if (fb) fb.classList.add('hidden');
    google.accounts.id.renderButton(regEl,    btnCfg);
  }
}

async function handleGoogleCredential(response) {
  setError('loginError', '');
  const data = await api('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential: response.credential }),
  });
  if (data.error) { setError('loginError', data.error); return; }
  saveSession(data.token, data.user);
  loadDashboard(data.user);
}

// ════════════════════════════════════════════════════
//  AUTH FORMS
// ════════════════════════════════════════════════════
function setError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.textContent = msg;
}

// Shock animation: Sign In button click triggers cute electric shake + shapes react
document.querySelector('.btn-login').addEventListener('click', () => {
  const btn = document.querySelector('.btn-login');
  btn.classList.remove('btn-shock');
  void btn.offsetWidth; // reflow to restart animation
  btn.classList.add('btn-shock');
  btn.addEventListener('animationend', () => btn.classList.remove('btn-shock'), { once: true });

  // All shapes react with "surprised" expression simultaneously
  geoChars.forEach(shape => {
    shape.classList.remove('surprised', 'excited');
    void shape.offsetWidth;
    shape.classList.add('surprised');
    const prev = surprisedCooldown.get(shape);
    if (prev) clearTimeout(prev);
    surprisedCooldown.set(shape, setTimeout(() => shape.classList.remove('surprised'), 480));
  });
});

// Google fallback button: show feedback when backend/OAuth is not configured
document.getElementById('googleLoginFallback')?.addEventListener('click', () => {
  setError('loginError', 'Google Sign In requires backend configuration — use email & password for now.');
});
document.getElementById('googleRegisterFallback')?.addEventListener('click', () => {
  setError('registerError', 'Google Sign Up requires backend configuration — use email & password for now.');
});

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  setError('loginError', '');
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { setError('loginError', 'Please fill in all fields'); return; }
  const data = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.error) { setError('loginError', data.error); return; }
  saveSession(data.token, data.user);
  loadDashboard(data.user);
});

document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  setError('registerError', '');
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!name || !email || !password) { setError('registerError', 'Please fill in all fields'); return; }
  const data = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  if (data.error) { setError('registerError', data.error); return; }
  saveSession(data.token, data.user);
  loadDashboard(data.user);
});

document.getElementById('toRegisterBtn')?.addEventListener('click', () => showView('registerView'));
document.getElementById('toLoginBtn').addEventListener('click',    () => showView('loginView'));
document.getElementById('logoutBtn').addEventListener('click', () => {
  clearSession();
  window.google?.accounts?.id?.disableAutoSelect?.();
  showView('loginView');
});

// ════════════════════════════════════════════════════
//  TOOLS DATA
// ════════════════════════════════════════════════════
const TOOLS = [
  { id: 'ohm',         icon: '⚡',  name: "Ohm's Law Calculator",  desc: 'Solve V, I, R relationships instantly',  tag: 'Basic',     cat: 'basic',     color: '#FFD93D' },
  { id: 'power',       icon: '🔋',  name: 'Power Calculator',       desc: 'Compute power in AC/DC circuits',         tag: 'Power',     cat: 'power',     color: '#6BCB77' },
  { id: 'impedance',   icon: '〰️', name: 'Impedance Calculator',   desc: 'RLC series & parallel impedance',         tag: 'AC',        cat: 'ac',        color: '#4D96FF' },
  { id: 'transformer', icon: '📡',  name: 'Transformer Calculator', desc: 'Turns ratio, voltage & current',          tag: 'Magnetics', cat: 'magnetics', color: '#FF6B6B' },
  { id: 'filter',      icon: '🌊',  name: 'Filter Designer',        desc: 'Low-pass, high-pass, band-pass filters',  tag: 'Signal',    cat: 'signal',    color: '#C77DFF' },
  { id: 'converter',   icon: '🔢',  name: 'Unit Converter',         desc: 'Convert electrical units instantly',       tag: 'Utility',   cat: 'utility',   color: '#FF9F43' },
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
  grid.querySelectorAll('.tool-card').forEach(attachCursorHover);
}

function filterTools(cat) {
  const query = document.getElementById('toolSearch').value.toLowerCase();
  document.querySelectorAll('.tool-card').forEach(card => {
    const matchCat    = cat === 'all' || card.dataset.cat === cat;
    const matchSearch = !query
      || card.querySelector('h3').textContent.toLowerCase().includes(query)
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
  document.getElementById('userNameLabel').textContent = user.name || user.email;
  document.getElementById('welcomeMsg').textContent =
    `${getGreeting()}, ${user.name?.split(' ')[0] || 'Engineer'}! 👋`;

  if (user.avatar) {
    const av = document.getElementById('userAvatar');
    av.src = user.avatar;
    av.style.display = 'block';
  }

  buildToolsGrid(TOOLS);

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterTools(btn.dataset.cat);
    });
    attachCursorHover(btn);
  });

  document.getElementById('toolSearch').addEventListener('input', () => {
    const cat = document.querySelector('.nav-item.active')?.dataset.cat || 'all';
    filterTools(cat);
  });

  document.querySelectorAll('#dashView button').forEach(attachCursorHover);
  showView('dashView');
}

// ════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════
async function init() {
  // Attach cursor hover to all interactive elements
  document.querySelectorAll('button, a, .form-input, .geo-char').forEach(attachCursorHover);

  // Start geo-char animation loop
  animateGeoChars();

  // Card entrance animation
  const card = document.querySelector('.login-card');
  if (card) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(28px)';
    card.style.transition = 'opacity .75s ease, transform .75s ease';
    requestAnimationFrame(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
  }

  // Fetch config (Google client ID from backend)
  let googleClientId = null;
  try {
    const cfg = await api('/api/config');
    googleClientId = cfg.googleClientId;
  } catch { /* no backend running — skip Google OAuth */ }

  // Wait for Google SDK
  if (googleClientId) {
    await new Promise(resolve => {
      if (window.google) { resolve(); return; }
      const t = setInterval(() => { if (window.google) { clearInterval(t); resolve(); } }, 100);
      setTimeout(() => { clearInterval(t); resolve(); }, 5000);
    });
    try { initGoogle(googleClientId); } catch (e) { console.warn('[google]', e.message); }
  }

  // Restore existing session
  const token = getToken();
  const user  = getSavedUser();
  if (token && user) {
    try {
      const data = await api('/api/auth/me');
      if (data.user) { loadDashboard(data.user); return; }
    } catch { /* fall through */ }
    clearSession();
  }

  showView('loginView');
}

window.addEventListener('DOMContentLoaded', init);

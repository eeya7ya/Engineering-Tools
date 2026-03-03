'use strict';

/* =====================================================
   eSpark Login — Interactive JS
   Geometric shape characters track the mouse and
   react when the cursor moves near the login card.
   ===================================================== */


// ── Mouse tracking ────────────────────────────────
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
document.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});


// ── Custom cursor ─────────────────────────────────
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

// Cursor enlarges on interactive elements
document.querySelectorAll('button, a, .form-input, .geo-char').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursorSpark.style.width       = '52px';
    cursorSpark.style.height      = '52px';
    cursorSpark.style.borderColor = 'var(--accent2)';
    cursorDot.style.background    = 'var(--accent2)';
  });
  el.addEventListener('mouseleave', () => {
    cursorSpark.style.width       = '32px';
    cursorSpark.style.height      = '32px';
    cursorSpark.style.borderColor = 'var(--accent1)';
    cursorDot.style.background    = 'var(--accent1)';
  });
});


// ── Spark trail ────────────────────────────────────
const sparkColors     = ['#FF6B35', '#FFD93D', '#4D96FF', '#6BCB77', '#C77DFF'];
let   lastParticleMs  = 0;

document.addEventListener('mousemove', e => {
  const now = Date.now();
  if (now - lastParticleMs < 40) return;
  lastParticleMs = now;

  const p = document.createElement('div');
  p.className = 'spark-particle';
  const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
  const size  = 4 + Math.random() * 5;
  p.style.cssText = [
    `left:${e.clientX}px`,
    `top:${e.clientY}px`,
    `background:${color}`,
    `width:${size}px`,
    `height:${size}px`,
    `transform:translate(-50%,-50%) translate(` +
      `${(Math.random() - 0.5) * 18}px,` +
      `${(Math.random() - 0.5) * 18}px)`
  ].join(';');
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 620);
});


// ── Background canvas: floating circuit nodes ─────
const canvas = document.getElementById('bgCanvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class BgNode {
  constructor() { this.reset(true); }

  reset(init = false) {
    this.x    = Math.random() * canvas.width;
    this.y    = init ? Math.random() * canvas.height : canvas.height + 20;
    this.r    = 2 + Math.random() * 2;
    this.vx   = (Math.random() - 0.5) * 0.2;
    this.vy   = -(0.15 + Math.random() * 0.35);
    this.alpha       = 0;
    this.targetAlpha = 0.08 + Math.random() * 0.14;
    this.color       = sparkColors[Math.floor(Math.random() * sparkColors.length)];
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
    ctx.fillStyle =
      this.color + Math.round(this.alpha * 255).toString(16).padStart(2, '0');
    ctx.fill();
  }
}

const bgNodes = Array.from({ length: 50 }, () => new BgNode());

function renderCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  bgNodes.forEach(n => { n.update(); n.draw(); });
  requestAnimationFrame(renderCanvas);
}
renderCanvas();


// ══════════════════════════════════════════════════
//   GEO CHARACTER INTERACTION
// ══════════════════════════════════════════════════

const geoChars  = [...document.querySelectorAll('.geo-char')];
const loginCard = document.getElementById('loginCard');
const loginBtn  = document.querySelector('.btn-login');

// Per-shape cooldown so "surprised" doesn't flicker
const surprisedCooldown = new Map();

// Track login-hover state to trigger burst once per entry
let wasLoginHover = false;

/**
 * Returns the bounding rect center of an element.
 */
function center(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
}

/**
 * Burst a ring of sparks from a shape's center when it enters login-hover.
 */
function burstLoginSparks(shapeEl) {
  const r      = shapeEl.getBoundingClientRect();
  const cx     = r.left + r.width  / 2;
  const cy     = r.top  + r.height / 2;
  const count  = 8;
  for (let i = 0; i < count; i++) {
    const angle  = (i / count) * Math.PI * 2;
    const dist   = 28 + Math.random() * 20;
    const color  = sparkColors[Math.floor(Math.random() * sparkColors.length)];
    const size   = 5 + Math.random() * 4;
    const p      = document.createElement('div');
    p.className  = 'spark-particle';
    p.style.cssText = [
      `left:${cx}px`,
      `top:${cy}px`,
      `background:${color}`,
      `width:${size}px`,
      `height:${size}px`,
      `transform:translate(-50%,-50%) translate(${Math.cos(angle) * dist}px,${Math.sin(angle) * dist}px)`
    ].join(';');
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 680);
  }
}

function animateGeoChars() {
  const card     = center(loginCard);
  const cardRect = card.rect;

  // Distance from mouse to the Sign In button center
  let nearLoginBtn = false;
  if (loginBtn) {
    const br  = loginBtn.getBoundingClientRect();
    const bcx = br.left + br.width  / 2;
    const bcy = br.top  + br.height / 2;
    const d   = Math.sqrt((mouse.x - bcx) ** 2 + (mouse.y - bcy) ** 2);
    nearLoginBtn = d < 190;
  }

  // General "near card" zone — a wide buffer so shapes start reacting
  // as the cursor approaches the right-panel login form.
  const nearCard =
    mouse.x > cardRect.left  - 220 && mouse.x < cardRect.right  + 60 &&
    mouse.y > cardRect.top   - 80  && mouse.y < cardRect.bottom + 80;

  // Fire a burst once when the cursor enters the login-hover zone
  if (nearLoginBtn && !wasLoginHover) {
    geoChars.forEach(s => burstLoginSparks(s));
  }
  wasLoginHover = nearLoginBtn;

  geoChars.forEach(shape => {
    const si = center(shape);
    const dx = mouse.x - si.x;
    const dy = mouse.y - si.y;
    const distToMouse = Math.sqrt(dx * dx + dy * dy);

    // ── Pupils follow the right target ──────────────
    const lookX = nearCard ? card.x : mouse.x;
    const lookY = nearCard ? card.y : mouse.y;

    shape.querySelectorAll('.geo-pupil').forEach(pupil => {
      const eyeEl = pupil.closest('.geo-eye');
      const er    = eyeEl.getBoundingClientRect();
      const ex    = er.left + er.width  / 2;
      const ey    = er.top  + er.height / 2;
      const angle = Math.atan2(lookY - ey, lookX - ex);
      pupil.style.transform =
        `translate(${Math.cos(angle) * 3}px, ${Math.sin(angle) * 3}px)`;
    });

    // ── Expression state machine ─────────────────────
    // Priority: surprised > login-hover > excited > default
    if (distToMouse < 88 && !nearCard) {
      // Mouse right on this shape → SURPRISED
      if (!shape.classList.contains('surprised')) {
        shape.classList.add('surprised');
        shape.classList.remove('excited', 'login-hover');

        const prev = surprisedCooldown.get(shape);
        if (prev) clearTimeout(prev);
        surprisedCooldown.set(shape, setTimeout(() => {
          shape.classList.remove('surprised');
        }, 480));
      }

    } else if (nearLoginBtn) {
      // Near Sign In button → strongest excitement state
      if (!shape.classList.contains('surprised')) {
        shape.classList.add('login-hover');
        shape.classList.remove('excited');
      }

    } else if (nearCard) {
      // Near card generally → EXCITED
      if (!shape.classList.contains('surprised')) {
        shape.classList.add('excited');
        shape.classList.remove('login-hover');
      }

    } else {
      // Default — floating
      shape.classList.remove('excited', 'login-hover');
    }
  });

  requestAnimationFrame(animateGeoChars);
}
animateGeoChars();


// ── Login card entrance animation ─────────────────
window.addEventListener('load', () => {
  const card = document.querySelector('.login-card');
  if (!card) return;
  card.style.opacity   = '0';
  card.style.transform = 'translateY(28px)';
  card.style.transition = 'opacity 0.75s ease, transform 0.75s ease';
  requestAnimationFrame(() => {
    card.style.opacity   = '1';
    card.style.transform = 'translateY(0)';
  });
});

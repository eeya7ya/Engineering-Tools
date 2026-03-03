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

// Per-shape cooldown so "surprised" doesn't flicker
const surprisedCooldown = new Map();

/**
 * Returns the bounding rect center of an element.
 */
function center(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
}

function animateGeoChars() {
  const card     = center(loginCard);
  const cardRect = card.rect;

  // "Near card" zone: 200px left buffer so shapes on the left react
  // as the cursor moves toward the right-panel login form.
  const nearCard =
    mouse.x > cardRect.left  - 220 && mouse.x < cardRect.right  + 60 &&
    mouse.y > cardRect.top   - 80  && mouse.y < cardRect.bottom + 80;

  geoChars.forEach(shape => {
    const si = center(shape);
    const dx = mouse.x - si.x;
    const dy = mouse.y - si.y;
    const distToMouse = Math.sqrt(dx * dx + dy * dy);

    // ── Pupils follow the right target ──────────
    const lookX = nearCard ? card.x : mouse.x;
    const lookY = nearCard ? card.y : mouse.y;

    shape.querySelectorAll('.geo-pupil').forEach(pupil => {
      const eyeEl = pupil.closest('.geo-eye');
      const er    = eyeEl.getBoundingClientRect();
      const ex    = er.left + er.width  / 2;
      const ey    = er.top  + er.height / 2;
      const angle = Math.atan2(lookY - ey, lookX - ex);
      const dist  = 3;
      pupil.style.transform =
        `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
    });

    // ── Expression state machine ─────────────────
    // Priority: surprised > excited > default
    if (distToMouse < 88 && !nearCard) {
      // Mouse is right on top of this shape → SURPRISED
      if (!shape.classList.contains('surprised')) {
        shape.classList.add('surprised');
        shape.classList.remove('excited');

        // After the surprised animation plays out, clear the class
        const prev = surprisedCooldown.get(shape);
        if (prev) clearTimeout(prev);
        surprisedCooldown.set(shape, setTimeout(() => {
          shape.classList.remove('surprised');
        }, 480));
      }

    } else if (nearCard) {
      // Cursor heading toward login card → all shapes get EXCITED
      if (!shape.classList.contains('surprised')) {
        shape.classList.add('excited');
      }

    } else {
      // Back to default floating
      shape.classList.remove('excited');
      // Don't remove 'surprised' here — let the timeout handle it
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

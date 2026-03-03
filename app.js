'use strict';

/* =====================================================
   eSpark Engineering Tools — Interactive JS
   ===================================================== */

// ── Mouse tracking ──────────────────────────────────
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const smoothMouse = { x: mouse.x, y: mouse.y };

document.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

// ── Custom cursor ────────────────────────────────────
const cursorDot   = document.getElementById('cursorDot');
const cursorSpark = document.getElementById('cursorSpark');
let sparkX = mouse.x, sparkY = mouse.y;

function updateCursor() {
  // Dot follows instantly
  cursorDot.style.left = mouse.x + 'px';
  cursorDot.style.top  = mouse.y + 'px';

  // Outer ring lags behind (lerp)
  sparkX += (mouse.x - sparkX) * 0.14;
  sparkY += (mouse.y - sparkY) * 0.14;
  cursorSpark.style.left = sparkX + 'px';
  cursorSpark.style.top  = sparkY + 'px';

  requestAnimationFrame(updateCursor);
}
updateCursor();

// Cursor grows on hoverable elements
document.querySelectorAll('button, a, .tool-card').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursorSpark.style.width  = '52px';
    cursorSpark.style.height = '52px';
    cursorSpark.style.borderColor = 'var(--accent2)';
    cursorDot.style.background = 'var(--accent2)';
  });
  el.addEventListener('mouseleave', () => {
    cursorSpark.style.width  = '32px';
    cursorSpark.style.height = '32px';
    cursorSpark.style.borderColor = 'var(--accent1)';
    cursorDot.style.background = 'var(--accent1)';
  });
});

// ── Spark trail particles ────────────────────────────
const sparkColors = ['#FF6B35', '#FFD93D', '#4D96FF', '#6BCB77', '#C77DFF'];
let lastParticleTime = 0;

document.addEventListener('mousemove', e => {
  const now = Date.now();
  if (now - lastParticleTime < 40) return;  // throttle: ~25 particles/sec
  lastParticleTime = now;

  const p = document.createElement('div');
  p.className = 'spark-particle';
  const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
  p.style.cssText = `
    left: ${e.clientX}px;
    top:  ${e.clientY}px;
    background: ${color};
    width:  ${4 + Math.random() * 6}px;
    height: ${4 + Math.random() * 6}px;
    transform: translate(-50%, -50%) translate(${(Math.random()-0.5)*20}px, ${(Math.random()-0.5)*20}px);
  `;
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 620);
});

// ── Character mouse parallax ─────────────────────────
const characters = document.querySelectorAll('.character');

// Set initial CSS translate based on data attributes
characters.forEach(ch => {
  const ox = parseFloat(ch.dataset.offsetX) || 0;
  const oy = parseFloat(ch.dataset.offsetY) || 0;
  ch.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
  ch._ox = ox;
  ch._oy = oy;
  ch._cx = ox;  // current animated x
  ch._cy = oy;
});

function animateCharacters() {
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  const dx = (mouse.x - cx) / cx;  // -1 … +1
  const dy = (mouse.y - cy) / cy;

  characters.forEach(ch => {
    const speed  = parseFloat(ch.dataset.speed) || 0.05;
    const targetX = ch._ox + dx * 60;
    const targetY = ch._oy + dy * 40;

    // lerp toward target
    ch._cx += (targetX - ch._cx) * speed * 2.5;
    ch._cy += (targetY - ch._cy) * speed * 2.5;

    ch.style.transform =
      `translate(calc(-50% + ${ch._cx}px), calc(-50% + ${ch._cy}px))`;

    // Eye pupils look toward mouse
    const eyes = ch.querySelectorAll('.pupil');
    eyes.forEach(pupil => {
      const rect   = pupil.closest('.eye').getBoundingClientRect();
      const ex     = rect.left + rect.width / 2;
      const ey     = rect.top  + rect.height / 2;
      const angle  = Math.atan2(mouse.y - ey, mouse.x - ex);
      const dist   = 3;
      pupil.style.transform =
        `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`;
    });
  });

  requestAnimationFrame(animateCharacters);
}
animateCharacters();

// ── Background canvas: floating circuit nodes ────────
const canvas  = document.getElementById('bgCanvas');
const ctx     = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Node class
class Node {
  constructor() { this.reset(true); }

  reset(init = false) {
    this.x  = Math.random() * canvas.width;
    this.y  = init ? Math.random() * canvas.height : canvas.height + 20;
    this.r  = 2 + Math.random() * 3;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = -(0.2 + Math.random() * 0.5);
    this.alpha  = 0;
    this.targetAlpha = 0.15 + Math.random() * 0.25;
    this.color  = sparkColors[Math.floor(Math.random() * sparkColors.length)];
    this.pulse  = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.02 + Math.random() * 0.03;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.pulse += this.pulseSpeed;

    // Mouse repulsion — nodes shy away
    const mdx = this.x - mouse.x;
    const mdy = this.y - mouse.y;
    const md  = Math.sqrt(mdx*mdx + mdy*mdy);
    if (md < 120) {
      const force = (120 - md) / 120 * 0.8;
      this.x += (mdx / md) * force;
      this.y += (mdy / md) * force;
    }

    if (this.alpha < this.targetAlpha) this.alpha += 0.005;
    if (this.y < -20) this.reset();
  }

  draw() {
    const pulse = 0.7 + 0.3 * Math.sin(this.pulse);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = this.color + Math.round(this.alpha * 255).toString(16).padStart(2,'0');
    ctx.fill();
  }
}

// Connections between close nodes
function drawConnections(nodes) {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (d < 130) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        const alpha = (1 - d / 130) * 0.08;
        ctx.strokeStyle = `rgba(100,130,180,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}

const NODES = Array.from({ length: 80 }, () => new Node());

function renderCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  NODES.forEach(n => n.update());
  drawConnections(NODES);
  NODES.forEach(n => n.draw());
  requestAnimationFrame(renderCanvas);
}
renderCanvas();

// ── Tool cards: set CSS var for top-border color ─────
document.querySelectorAll('.tool-card').forEach(card => {
  const color = card.dataset.color;
  if (color) card.style.setProperty('--card-color', color);
});

// ── Entrance animation: hero content fades up ────────
window.addEventListener('load', () => {
  const content = document.querySelector('.hero-content');
  if (!content) return;
  content.style.opacity = '0';
  content.style.transform = 'translateY(30px)';
  content.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
  requestAnimationFrame(() => {
    content.style.opacity  = '1';
    content.style.transform = 'translateY(0)';
  });
});

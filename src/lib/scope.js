import { reduced, stepSpring } from './motion.js';

const PRESETS = { sine: { amp: 60, frq: 4, pha: 0 }, pulse: { amp: 90, frq: 2, pha: 90 }, burst: { amp: 45, frq: 10, pha: 180 } };

export function initScope(root = document) {
  const cv = root.getElementById ? root.getElementById('scope-canvas') : root.querySelector('#scope-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const col = { line: css.getPropertyValue('--wl-signal').trim(), grid: css.getPropertyValue('--wl-grid').trim(), bg: css.getPropertyValue('--wl-screen').trim() };
  const ui = { amp: root.getElementById('r-amp'), frq: root.getElementById('r-frq'), pha: root.getElementById('r-pha') };
  const out = { amp: root.getElementById('o-amp'), frq: root.getElementById('o-frq'), pha: root.getElementById('o-pha') };
  const fig = root.getElementById('scope-fig'), st = root.getElementById('scope-state');
  const sp = { amp: { x: 60, v: 0, to: 60 }, frq: { x: 4, v: 0, to: 4 }, pha: { x: 0, v: 0, to: 0 } };
  let w = 0, h = 0, dpr = 1, t = 0, visible = true, running = false, shape = 'sine', last = performance.now();

  function resize() { dpr = Math.min(devicePixelRatio || 1, 2); const r = cv.getBoundingClientRect(); w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height)); cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); }
  const fn = (x) => {
    const a = sp.amp.x / 100, f = sp.frq.x, p = (sp.pha.x * Math.PI) / 180, ph = x * f * Math.PI * 2 + p - t * 2.2;
    if (shape === 'pulse') return a * Math.sign(Math.sin(ph)) * Math.pow(Math.abs(Math.sin(ph)), 0.35);
    if (shape === 'burst') return a * Math.sin(ph) * Math.exp(-Math.pow((x - 0.5) * 3.2, 2));
    return a * Math.sin(ph);
  };
  function draw() {
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = col.grid; ctx.lineWidth = 1; ctx.globalAlpha = 0.55; ctx.beginPath();
    for (let i = 1; i < 10; i++) { const x = Math.round((w / 10) * i) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let j = 1; j < 6; j++) { const y = Math.round((h / 6) * j) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke(); ctx.globalAlpha = 1;
    const mid = h / 2, scale = h * 0.42;
    const path = () => { ctx.beginPath(); for (let i = 0; i <= w; i += 2) { const y = mid - fn(i / w) * scale; i ? ctx.lineTo(i, y) : ctx.moveTo(i, y); } };
    ctx.lineJoin = 'round'; ctx.strokeStyle = col.line;
    ctx.shadowColor = col.line; ctx.shadowBlur = 18; ctx.globalAlpha = 0.5; ctx.lineWidth = 6; path(); ctx.stroke();
    ctx.shadowBlur = 8; ctx.globalAlpha = 1; ctx.lineWidth = 2.2; path(); ctx.stroke(); ctx.shadowBlur = 0;
    if (fig) fig.textContent = `A ${Math.round(sp.amp.x)}  f ${sp.frq.x.toFixed(1)}  φ ${Math.round(((sp.pha.x % 360) + 360) % 360)}°`;
  }
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    let settled = true;
    for (const k of ['amp', 'frq', 'pha']) { const d = stepSpring(sp[k], dt, 90, 14); if (!d) settled = false; }
    st.textContent = settled ? 'LOCKED' : 'SETTLING';
    if (!reduced()) t += dt;
    draw();
    if (visible && !reduced()) requestAnimationFrame(frame); else running = false;
  }
  const kick = () => { last = performance.now(); if (reduced()) { for (const k of ['amp', 'frq', 'pha']) { sp[k].x = sp[k].to; sp[k].v = 0; } st.textContent = 'LOCKED'; draw(); } else if (!running) { running = true; requestAnimationFrame(frame); } };
  function set(k, v) { sp[k].to = +v; out[k].textContent = Math.round(+v); ui[k].value = v; kick(); }
  for (const k of Object.keys(ui)) ui[k].addEventListener('input', () => set(k, ui[k].value));
  root.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    shape = b.dataset.preset; const p = PRESETS[shape];
    root.querySelectorAll('[data-preset]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    for (const k of Object.keys(p)) set(k, p[k]);
  }));
  new ResizeObserver(resize).observe(cv);
  new IntersectionObserver((en) => { const was = visible; visible = en[0].isIntersecting; if (visible && !was) kick(); }).observe(cv);
  resize(); kick();
}

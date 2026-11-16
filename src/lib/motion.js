import { FORMATS } from './format.js';

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- damped spring solver (semi-implicit Euler, fixed substeps) ----
export function stepSpring(s, dt, k = 170, c = 22, m = 1) {
  const h = 1 / 240; let t = Math.min(dt, 0.05);
  while (t > 0) { const d = Math.min(h, t); const a = (-k * (s.x - s.to) - c * s.v) / m; s.v += a * d; s.x += s.v * d; t -= d; }
  return Math.abs(s.x - s.to) < 0.0008 && Math.abs(s.v) < 0.008;
}
const springs = new Set(); let raf = 0, last = 0;
function loop(now) {
  const dt = (now - last) / 1000; last = now;
  for (const s of [...springs]) { const done = stepSpring(s, dt, s.k, s.c); if (done) { s.x = s.to; springs.delete(s); } s.apply(s.x); }
  raf = springs.size ? requestAnimationFrame(loop) : 0;
}
export function animateSpring(from, to, apply, opts = {}) {
  if (reduced()) { apply(to); return; }
  const s = { x: from, v: 0, to, apply, k: opts.k || 170, c: opts.c || 22 };
  const go = () => { springs.add(s); if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  opts.delay ? setTimeout(go, opts.delay) : go();
}

// ---- scroll reveal with stagger (spring) ----
export function initReveal(root = document) {
  const els = [...root.querySelectorAll('[data-reveal]')];
  if (reduced() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('revealed')); return; }
  document.documentElement.classList.add('reveal-on');
  let batch = 0, timer = 0;
  const io = new IntersectionObserver((entries) => {
    const vis = entries.filter((e) => e.isIntersecting);
    vis.forEach((en) => {
      const el = en.target; io.unobserve(el);
      const idx = batch++;
      el.classList.add('revealing'); el.style.opacity = '0';
      animateSpring(0, 1, (p) => {
        if (p === 1) { el.classList.add('revealed'); el.classList.remove('revealing'); el.style.opacity = el.style.transform = ''; return; }
        el.style.opacity = String(Math.max(0, Math.min(1, p))); el.style.transform = `translateY(${(1 - p) * 26}px) scale(${0.985 + 0.015 * p})`;
      }, { delay: idx * 70, k: 150, c: 17 });
    });
    clearTimeout(timer); timer = setTimeout(() => { batch = 0; }, 200);
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
  els.forEach((e) => io.observe(e));
}

// ---- count-up with flash ----
export function setNum(el, raw, { first = false } = {}) {
  const fmt = FORMATS[el.dataset.kind] || String;
  const to = raw === '' || raw == null ? null : Number(raw);
  const from = el._v;
  el.dataset.v = to == null ? '' : String(to);
  if (to == null || !isFinite(to)) { el.textContent = fmt(null); el._v = null; return; }
  if (reduced() || from === to) { el.textContent = fmt(to); el._v = to; return; }
  if (from != null) { el.classList.remove('flash-up', 'flash-down'); void el.offsetWidth; el.classList.add(to > from ? 'flash-up' : 'flash-down'); }
  const start = from ?? 0, t0 = performance.now(), dur = 650;
  cancelAnimationFrame(el._raf);
  const tick = (n) => { const p = Math.min(1, (n - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(start + (to - start) * e); if (p < 1) el._raf = requestAnimationFrame(tick); else el.textContent = fmt(to); };
  el._raf = requestAnimationFrame(tick); el._v = to;
}
export function hydrateNums(root, opts) { root.querySelectorAll('.num').forEach((el) => setNum(el, el.dataset.v, opts)); }

// ---- spotlight hover ----
export function initSpotlight() {
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest && e.target.closest('.spot, .row:not(.head):not(.is-skel)');
    if (!t) return; const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', e.clientX - r.left + 'px'); t.style.setProperty('--my', e.clientY - r.top + 'px');
  }, { passive: true });
}

// ---- scroll progress ----
export function initProgress(bar) {
  const upd = () => { const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; bar.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`; };
  addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
}

// ---- hero parallax (pointer + scroll), eased by spring-like lerp ----
export function initParallax(root) {
  if (reduced()) return;
  const layers = [...root.querySelectorAll('[data-depth]')]; if (!layers.length) return;
  let px = 0, py = 0, cx = 0, cy = 0, sy = 0, csy = 0, on = false;
  root.addEventListener('pointermove', (e) => { const r = root.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5; });
  root.addEventListener('pointerleave', () => { px = py = 0; });
  addEventListener('scroll', () => { sy = Math.min(scrollY, 900); }, { passive: true });
  new IntersectionObserver((en) => { on = en[0].isIntersecting; if (on) frame(); }).observe(root);
  function frame() {
    if (!on) return;
    cx += (px - cx) * 0.08; cy += (py - cy) * 0.08; csy += (sy - csy) * 0.1;
    for (const l of layers) { const d = parseFloat(l.dataset.depth); l.style.transform = `translate3d(${-cx * d * 700}px, ${-cy * d * 500 + csy * d * 1.6}px, 0)`; }
    requestAnimationFrame(frame);
  }
}

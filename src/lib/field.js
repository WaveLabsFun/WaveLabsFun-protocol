// Pixel-snapped wave field behind the bench sections.
// Behaviour mirrors the reference pattern: ~65 ms frame gate, 3px snap grid, DPR capped at 2, pointer-aware,
// colours read from CSS tokens, one static frame under reduced motion (redrawn when the preference changes).
export function initFields(root = document) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.querySelectorAll('canvas.wave-field').forEach((cv) => {
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const cs = getComputedStyle(cv);
    const a = cs.getPropertyValue('--signal').trim(), b = cs.getPropertyValue('--field-secondary').trim();
    const ptr = { x: -1e3, y: -1e3 };
    let w = 0, h = 0, raf = 0, last = 0, visible = true;
    const size = () => { const r = cv.getBoundingClientRect(); w = r.width; h = r.height; const d = Math.min(devicePixelRatio || 1, 2); cv.width = Math.max(1, w * d); cv.height = Math.max(1, h * d); ctx.setTransform(d, 0, 0, d, 0, 0); };
    const snap = (v) => Math.round(v / 3) * 3;
    function draw(ts) {
      const t = mq.matches ? 0 : ts * 0.00018;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = a; ctx.globalAlpha = 0.9;
      for (let k = 0; k < 5; k++) {
        const base = h * (0.2 + k * 0.16), amp = h * (0.05 + k * 0.012), f = 2 + k * 0.7;
        for (let x = 0; x < w; x += 6) {
          const y = base + Math.sin((x / w) * f * Math.PI * 2 + t * (1 + k * 0.3) + k) * amp;
          const near = Math.hypot(x - ptr.x, y - ptr.y) < 70;
          ctx.fillRect(snap(x), snap(y + (near ? Math.sin(x + t * 8) * 4 : 0)), 2, 2);
        }
      }
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 90; i++) {
        const x = w * ((i * 0.618) % 1), y = h * ((i * 0.381 + Math.sin(t * 2 + i) * 0.008) % 1);
        ctx.fillRect(snap(x), snap(y), 2, 2);
      }
      ctx.globalAlpha = 1; ctx.fillStyle = b;
      if (ptr.x > -500) ctx.fillRect(snap(ptr.x) - 3, snap(ptr.y) - 3, 6, 6);
    }
    function frame(ts) {
      if (ts - last > 65) { last = ts; draw(ts); }
      raf = !mq.matches && visible ? requestAnimationFrame(frame) : 0;
    }
    const kick = () => { cancelAnimationFrame(raf); size(); if (mq.matches || !visible) draw(performance.now()); if (!mq.matches && visible) raf = requestAnimationFrame(frame); };
    const host = cv.parentElement;
    host.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; }, { passive: true });
    host.addEventListener('pointerleave', () => { ptr.x = ptr.y = -1e3; });
    new ResizeObserver(() => { size(); draw(performance.now()); }).observe(cv);
    new IntersectionObserver((en) => { const was = visible; visible = en[0].isIntersecting; if (visible && !was) kick(); }).observe(cv);
    mq.addEventListener('change', kick);
    kick();
  });
}

import { registers } from './registers.js';
import { renderPage, renderRow, renderOwnPlaceholder, skeletonRow, tickerItem, pill, LOGO_SM } from './render.js';
import { resolveCA, scanAddresses } from './lib/gate.js';
import { loadTrending, loadOwn, createPoller } from './lib/market.js';
import { initReveal, initSpotlight, initProgress, initParallax, setNum, hydrateNums, reduced } from './lib/motion.js';
import { initScope } from './lib/scope.js';
import { initFields } from './lib/field.js';
import { fmtPct, DASH } from './lib/format.js';

const $ = (id) => document.getElementById(id);
const app = $('app');
if (!app.querySelector('.main')) app.innerHTML = renderPage(registers); // prerendered by the build; fallback for dev
document.documentElement.classList.add('js');

/* ---------- nav drawer ---------- */
const side = $('sidebar'), overlay = $('overlay'), toggle = $('nav-toggle');
function nav(open) { side.classList.toggle('open', open); overlay.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); }
toggle.addEventListener('click', () => nav(true));
$('nav-close').addEventListener('click', () => nav(false));
overlay.addEventListener('click', () => nav(false));
addEventListener('keydown', (e) => { if (e.key === 'Escape') nav(false); });
side.querySelectorAll('.side-link').forEach((a) => a.addEventListener('click', () => nav(false)));

/* ---------- CA copy (inert unless stated) ---------- */
const slot = $('ca-slot');
if (slot && slot.dataset.caState === 'stated') {
  let to;
  slot.addEventListener('click', async () => {
    const v = slot.dataset.copy;
    let ok = false;
    try { await navigator.clipboard.writeText(v); ok = true; } catch {
      const ta = document.createElement('textarea'); ta.value = v; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove();
    }
    const fb = slot.querySelector('.ca-fb');
    slot.classList.toggle('copied', ok); slot.classList.toggle('failed', !ok);
    fb.textContent = ok ? 'Copied' : 'Press Ctrl+C';
    slot.querySelector('[data-ico=copy]').hidden = ok; slot.querySelector('[data-ico=check]').hidden = !ok;
    clearTimeout(to); to = setTimeout(() => { slot.classList.remove('copied', 'failed'); fb.textContent = 'Copy'; slot.querySelector('[data-ico=copy]').hidden = false; slot.querySelector('[data-ico=check]').hidden = true; }, 1800);
  });
}

/* ---------- visuals ---------- */
initReveal(); initSpotlight(); initProgress($('progress')); initParallax(document.querySelector('.banner')); initScope(document); initFields(document);
const links = [...document.querySelectorAll('.side-link')];
const secs = links.map((l) => $(l.dataset.nav));
const navIO = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.dataset.nav === e.target.id)); }), { rootMargin: '-35% 0px -55% 0px' });
secs.forEach((x) => x && navIO.observe(x));

/* ---------- logo / tile fallback chain (error does not bubble -> capture) ---------- */
document.addEventListener('error', (e) => {
  const img = e.target; if (!(img instanceof HTMLImageElement) || !img.closest('.tile[data-sym]')) return;
  let rest = []; try { rest = JSON.parse(img.dataset.rest || '[]'); } catch { /* ignore */ }
  if (rest.length) { img.dataset.rest = JSON.stringify(rest.slice(1)); img.src = rest[0]; return; }
  const tile = img.closest('.tile'); tile.classList.add('letter'); tile.textContent = tile.dataset.sym;
}, true);

/* ---------- status pills / stats ---------- */
function setStatus(kind, text) {
  for (const id of ['top-pill', 'board-pill']) { const el = $(id); if (el) el.innerHTML = pill(kind, text); }
}
const trendBox = $('trend-rows'), ownSlot = $('own-slot'), msg = $('board-msg');
let trendRows = null;         // last good trending data
let firstPaint = true;
let ownRow = null;

function putNum(id, value, kind) { const el = $(id); if (!el) return; el.classList.add('num'); el.dataset.kind = kind; setNum(el, value); }

function paintTicker(rows) {
  const a = $('tk-a'), b = $('tk-b');
  if (a.querySelector('[data-tk]')) {
    for (const r of rows) document.querySelectorAll(`[data-tk="${CSS.escape(r.address)}"] .num`).forEach((n) => setNum(n, r.h24 ?? ''));
    return;
  }
  const html = rows.map(tickerItem).join('');
  a.innerHTML = html; b.innerHTML = html; hydrateNums(a); hydrateNums(b);
  $('ticker-track').classList.add('ready');
}

function paintTrending(rows) {
  const ownKey = ownRow && ownRow.address;
  const list = rows.filter((r) => r.address !== ownKey); // dedupe: own token is pinned above
  const startRank = 2;
  const kids = [...trendBox.children];
  list.forEach((r, i) => {
    let el = kids[i];
    if (!el || el.dataset.key !== r.address) {
      const tmp = document.createElement('div'); tmp.innerHTML = renderRow(r, i + startRank);
      const nw = tmp.firstElementChild; nw.classList.add('enter'); nw.style.animationDelay = (reduced() ? 0 : i * 55) + 'ms';
      if (el) el.replaceWith(nw); else trendBox.appendChild(nw);
      hydrateNums(nw);
    } else {
      el.querySelector('.c-rank').textContent = String(i + startRank).padStart(2, '0');
      const vals = [r.priceUsd, r.h24, r.vol, r.liq];
      el.querySelectorAll('.num').forEach((n, k) => setNum(n, vals[k] ?? ''));
    }
  });
  while (trendBox.children.length > list.length) trendBox.lastElementChild.remove();
}
function paintTrendError() {
  [...trendBox.children].forEach((el) => {
    if (!el.dataset.skel) return;
    el.classList.remove('is-skel'); el.classList.add('is-err'); el.removeAttribute('data-skel');
    el.querySelectorAll('.sk').forEach((s) => { s.replaceWith(Object.assign(document.createElement('span'), { className: 'dash', textContent: DASH })); });
  });
}
function paintOwn(r) {
  const tmp = document.createElement('div'); tmp.innerHTML = renderRow(r, 1, true);
  const nw = tmp.firstElementChild; const cur = ownSlot.firstElementChild;
  if (cur && cur.dataset.key === r.address) { const vals = [r.priceUsd, r.h24, r.vol, r.liq]; cur.querySelectorAll('.num').forEach((n, k) => setNum(n, vals[k] ?? '')); return; }
  nw.classList.add('enter'); ownSlot.replaceChildren(nw); hydrateNums(nw);
}
function paintOwnError() {
  const cur = ownSlot.firstElementChild;
  if (cur && cur.classList.contains('is-skel')) { cur.classList.remove('is-skel'); cur.classList.add('is-err'); cur.querySelectorAll('.sk').forEach((s) => s.replaceWith(Object.assign(document.createElement('span'), { className: 'dash', textContent: DASH }))); }
}

function paintStats() {
  const n = trendRows ? trendRows.length : null;
  putNum('st-count', n, 'int');
  putNum('st-rows', n == null ? null : n + 1, 'int');
  const top = trendRows && trendRows.filter((r) => r.h24 != null).sort((a, b) => Math.abs(b.h24) - Math.abs(a.h24))[0];
  const t = $('st-top'); if (t) { t.textContent = top ? fmtPct(top.h24) : DASH; t.classList.toggle('c-signal', !!top && top.h24 > 0); t.classList.toggle('c-red', !!top && top.h24 < 0); }
}

/* ---------- market tasks (trending and own run independently) ---------- */
let trendFailed = false;
async function trendingTask() {
  try {
    const rows = await loadTrending(registers);
    if (!rows.length) throw new Error('empty');
    trendRows = rows.map((r) => { const old = trendRows && trendRows.find((o) => o.address === r.address); return r.failed && old ? old : r; });
    trendFailed = false; paintTrending(trendRows); paintTicker(trendRows); paintStats();
    $('st-feed').textContent = 'OK'; $('st-feed').className = 'receipt-value c-signal';
    return true;
  } catch {
    trendFailed = true;
    if (!trendRows) paintTrendError();               // nothing good yet: dashes
    $('st-feed').textContent = DASH; $('st-feed').className = 'receipt-value c-red';
    return false;                                     // else: keep last good data on screen
  }
}
let ownFailed = false;
async function ownTask() {
  if (resolveCA(registers).state !== 'stated') return true;
  try { ownRow = await loadOwn(registers, LOGO_SM); ownFailed = false; paintOwn(ownRow); if (trendRows) paintTrending(trendRows); return true; }
  catch { ownFailed = true; if (!ownRow) paintOwnError(); return false; }
}
function summarise() {
  if (!trendFailed && trendRows) { setStatus('is-ok', 'Live'); msg.textContent = ''; }
  else if (trendFailed) { setStatus('is-err', 'Signal lost'); msg.textContent = trendRows ? 'Feed unreachable. Showing the last good reading.' : 'Feed unreachable. Dashes mean no reading yet.'; }
}
async function tick() {
  $('refresh-btn').classList.add('spin');
  const [a] = await Promise.all([trendingTask(), ownTask()]); // neither awaits the other
  summarise(); firstPaint = false; $('refresh-btn').classList.remove('spin');
  return a;
}
const poller = createPoller(tick, registers.marketSource.pollMs);
$('refresh-btn').addEventListener('click', () => { setStatus('is-sync', 'Tuning'); poller.now(); });
poller.start();

/* ---------- gate warning (never blanket-rejects 0x; matches against stated registry) ---------- */
const stray = scanAddresses(document.body.innerText.replace($('ca-slot')?.innerText || '', ''), registers);
if (stray.length) { document.documentElement.dataset.gate = 'warn'; console.warn('[gate] address-shaped strings not in the register:', stray); }

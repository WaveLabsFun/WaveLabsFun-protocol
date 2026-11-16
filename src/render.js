// Pure renderers: (registers) -> HTML string. No DOM access, so build + tests can run them in Node.
import { esc, letterOf, DASH } from './lib/format.js';
import { isStated, handleOf } from './registers.js';
import { resolveCA } from './lib/gate.js';

export const LOGO = 'assets/wave-logo-512.png';
export const LOGO_SM = 'assets/wave-logo-192.png';

const X_PATH = 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';
const GH_PATH = 'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z';
const ic = (d, vb) => `<svg class="ico" viewBox="0 0 ${vb} ${vb}" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
const stroke = (inner) => `<svg class="ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
export const ICONS = {
  copy: stroke('<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'),
  check: stroke('<path d="M20 6 9 17l-5-5"/>'),
  refresh: stroke('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'),
  menu: stroke('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  close: stroke('<path d="M18 6 6 18M6 6l12 12"/>'),
  arrow: stroke('<path d="M5 12h14M12 5l7 7-7 7"/>')
};

export function renderSocials(reg) {
  const x = reg.x;
  const xl = isStated(x) && x.url
    ? `<a class="social" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" aria-label="X (${esc(handleOf(x) || 'profile')})" title="X">${ic(X_PATH, 24)}</a>`
    : `<span class="social is-inert" role="img" aria-label="X (not available)" aria-disabled="true">${ic(X_PATH, 24)}</span>`;
  const g = reg.github;
  const gl = isStated(g) && g.url
    ? `<a class="social" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub">${ic(GH_PATH, 16)}</a>`
    : `<span class="social is-inert" role="img" aria-label="GitHub (not available)" aria-disabled="true">${ic(GH_PATH, 16)}</span>`;
  return `<div class="socials" aria-label="Social links">${xl}${gl}</div>`;
}

export function renderCA(reg) {
  const ca = resolveCA(reg);
  if (ca.state === 'stated') {
    return `<button type="button" class="ca-slot" id="ca-slot" data-ca-state="stated" data-copy="${esc(ca.value)}" aria-label="Copy contract address ${esc(ca.value)}">
      <span class="ca-label">CA</span><span class="ca-value">${esc(ca.value)}</span>
      <span class="ca-act"><span class="ca-icon" data-ico="copy">${ICONS.copy}</span><span class="ca-icon" data-ico="check" hidden>${ICONS.check}</span><span class="ca-fb" aria-live="polite">Copy</span></span></button>`;
  }
  return `<div class="ca-slot is-inert" id="ca-slot" data-ca-state="${ca.state}" aria-disabled="true">
      <span class="ca-label">CA</span><span class="ca-value">· · · · · · · · · · · ·</span>
      <span class="ca-act"><span class="ca-fb">Awaiting announcement</span></span></div>`;
}

export const pill = (cls, text) => `<span class="status-pill ${cls}" role="status"><i class="live-dot"></i><span>${text}</span></span>`;

export function renderHeader(reg) {
  return `<header class="topbar" id="top">
    <button type="button" class="icon-btn nav-toggle" id="nav-toggle" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${ICONS.menu}</button>
    <a class="brand brand-top" href="#top"><img src="${LOGO_SM}" alt="" width="32" height="32"><span>WaveLabs<i>.</i></span></a>
    <div class="ca-wrap">${renderCA(reg)}</div>
    <div class="top-pill" id="top-pill">${pill('is-sync', 'Tuning')}</div>
    ${renderSocials(reg)}
  </header>`;
}

const NAV = [
  ['Explore', [['#board', 'Market board'], ['#chain', 'Signal chain']]],
  ['Lab', [['#scope', 'Scope bench'], ['#roadmap', 'Roadmap']]]
];
export function renderSidebar() {
  return `<aside class="sidebar" id="sidebar" aria-label="Site navigation">
    <div class="side-head"><a class="brand" href="#top"><span class="logo-chip"><img src="${LOGO_SM}" alt="WaveLabs logo" width="40" height="40"></span><span class="brand-name">WaveLabs<i>.</i></span></a>
    <button type="button" class="icon-btn side-close" id="nav-close" aria-label="Close navigation">${ICONS.close}</button></div>
    <div class="side-body">
      <div class="side-chip"><span class="dot-sq"></span><span>Signal desk</span></div>
      ${NAV.map(([g, items]) => `<p class="side-group">${g}</p>${items.map(([h, t], i) => `<a class="side-link" href="${h}" data-nav="${h.slice(1)}"><span>${t}</span><span class="side-idx">0${i + 1}</span></a>`).join('')}`).join('')}
    </div>
    <p class="side-foot">wavelabs.fun</p>
  </aside>`;
}

export function renderHero() {
  return `<section class="banner" aria-label="WaveLabs intro">
    <div class="banner-fx" aria-hidden="true">
      <img class="banner-art" data-depth="0.03" src="assets/banner.jpg" alt="" width="1500" height="500" fetchpriority="high">
      <div class="mesh"><i class="blob b1" data-depth="0.05"></i><i class="blob b2" data-depth="0.08"></i><i class="blob b3" data-depth="0.04"></i></div>
      <div class="scan"></div>
      <div class="banner-scrim"></div>
      <img class="hero-logo" data-depth="0.11" src="${LOGO}" alt="" width="512" height="512">
    </div>
    <div class="banner-content">
      <div class="tag-row"><span class="logo-chip lg"><img src="${LOGO_SM}" alt="WaveLabs logo" width="56" height="56"></span>
        <p class="mono tag">Analog soul,<br><span class="c-signal">onchain pulse.</span></p></div>
      <h1 class="lab-title" data-reveal>WaveLabs<span class="c-red">.</span></h1>
      <p class="lede" data-reveal>A glowing little screen that watches Solana breathe. Tune in, read the swell, ride the crest.</p>
      <div class="btn-row" data-reveal>
        <a class="btn btn-primary" href="#board">Open the board ${ICONS.arrow}</a>
        <a class="btn" href="#roadmap">Chart the course</a>
      </div>
      <p class="mono formula" data-reveal>swing × sine(rate × time + offset) <span class="c-red">/</span> listen. adjust. amplify.</p>
    </div>
  </section>`;
}

export function renderTicker() {
  const sk = Array.from({ length: 10 }, () => `<span class="tk-item"><i class="sk sk-tk"></i></span>`).join('');
  return `<div class="ticker" aria-hidden="true"><div class="ticker-track mono" id="ticker-track"><span id="tk-a">${sk}</span><span id="tk-b">${sk}</span></div></div>`;
}

const stat = (label, value, cls = '', extra = '') => `<div class="hero-stat"><span class="receipt-value ${cls}" ${extra}>${value}</span><span class="receipt-label">${label}</span></div>`;
export function renderReceipts(reg) {
  const ca = resolveCA(reg);
  return `<div class="receipt cols-4 mono" aria-label="Board statistics" data-reveal>
      ${stat('tokens on the board', DASH, 'c-signal', 'id="st-count"')}
      ${stat('refresh seconds', String(reg.marketSource.pollMs / 1000), '', 'id="st-poll"')}
      ${stat('network', esc(reg.chain.value === 'solana' ? 'SOL' : DASH), 'c-red')}
      ${stat('feed state', DASH, '', 'id="st-feed"')}
    </div>
    <div class="receipt cols-3 mono" aria-label="Pinned row summary" data-reveal>
      ${stat('rows on screen', DASH, '', 'id="st-rows"')}
      ${stat('strongest 24h swing', DASH, '', 'id="st-top"')}
      ${stat('pinned row', ca.state === 'stated' ? 'LIVE' : 'PENDING', ca.state === 'stated' ? 'c-signal' : 'c-red', 'id="st-pin"')}
    </div>`;
}

export function skeletonRow(n) {
  return `<div class="row is-skel" data-skel="1"><span class="c-rank">${String(n).padStart(2, '0')}</span><span class="c-tok"><i class="sk sk-logo"></i><span class="tok-t"><i class="sk sk-l1"></i><i class="sk sk-l2"></i></span></span><span class="c-price"><i class="sk sk-n"></i></span><span class="c-h24"><i class="sk sk-n"></i></span><span class="c-vol"><i class="sk sk-n"></i></span><span class="c-liq"><i class="sk sk-n"></i></span></div>`;
}
const dots = '<span class="dots">· · · · ·</span>';
export function renderOwnPlaceholder() {
  return `<div class="row own is-placeholder" data-own="absent" aria-label="Pinned token row, awaiting announcement"><span class="c-rank">01</span><span class="c-tok"><span class="tile"><img src="${LOGO_SM}" alt="WaveLabs" width="36" height="36"></span><span class="tok-t"><b>WaveLabs</b><small>${dots}</small></span></span><span class="c-price">${dots}</span><span class="c-h24">${dots}</span><span class="c-vol">${dots}</span><span class="c-liq">${dots}</span></div>`;
}
export function renderOwnLoading() {
  return `<div class="row own is-skel" data-own="loading"><span class="c-rank">01</span><span class="c-tok"><span class="tile"><img src="${LOGO_SM}" alt="WaveLabs" width="36" height="36"></span><span class="tok-t"><b>WaveLabs</b><i class="sk sk-l2"></i></span></span><span class="c-price"><i class="sk sk-n"></i></span><span class="c-h24"><i class="sk sk-n"></i></span><span class="c-vol"><i class="sk sk-n"></i></span><span class="c-liq"><i class="sk sk-n"></i></span></div>`;
}

export function renderBoard(reg) {
  const ca = resolveCA(reg);
  const own = ca.state === 'stated' ? renderOwnLoading() : renderOwnPlaceholder();
  return `<section class="bench" id="board" aria-label="Market board" data-reveal>
    <canvas class="wave-field" aria-hidden="true"></canvas>
    <div class="bench-layout">
      <div class="bench-side">
        <div class="bench-head"><h2 class="mono sec-title">01 / Market board</h2>
          <button type="button" class="icon-btn" id="refresh-btn" aria-label="Refresh board" title="Refresh board">${ICONS.refresh}</button></div>
        <p class="copy">Ten Solana names ranked by how much boost they bought. Every row below is pulled straight from public order books and re-read while this tab is awake.</p>
        <div id="board-pill">${pill('is-sync', 'Tuning')}</div>
        <p class="copy small" id="board-msg" role="status"></p>
        <ul class="legend mono"><li><i class="lg up"></i>rising over 24h</li><li><i class="lg down"></i>falling over 24h</li><li><i class="lg own"></i>pinned token</li></ul>
      </div>
      <div class="board" role="table" aria-label="Trending Solana tokens">
        <div class="row head mono" role="row"><span class="c-rank">#</span><span class="c-tok">Token</span><span class="c-price">Price</span><span class="c-h24">24h</span><span class="c-vol">Volume</span><span class="c-liq">Liquidity</span></div>
        <div id="own-slot">${own}</div>
        <div id="trend-rows">${Array.from({ length: reg.marketSource.count }, (_, i) => skeletonRow(i + 2)).join('')}</div>
      </div>
    </div>
  </section>`;
}

export function renderChain() {
  const cards = [
    ['Open-air board', 'Ten Solana names, ordered by boost spend, redrawn every minute with no login and no clicks.'],
    ['Pinned frequency', 'Our own token claims row one the instant its address is announced. Until then a placeholder keeps the seat warm.'],
    ['Quiet when blind', 'Should a feed drop, the last good figures stay put and dashes tell you something is off.'],
    ['Twin receivers', 'Price data and launchpad details are requested side by side, so one slow line never stalls the other.'],
    ['Reads like a scope', 'Figures count up and flash when they move. Motion is something you notice, not something you hunt for.'],
    ['Built for thumbs', 'No control is smaller than forty-four pixels square, at any screen width, and motion switches off on request.']
  ];
  return `<section class="block" id="chain" aria-label="Signal chain"><div class="block-head" data-reveal><h2 class="mono sec-title">02 / Signal chain</h2><p class="copy">What the screen does when your eyes are elsewhere.</p></div>
    <div class="cards">${cards.map(([t, b], i) => `<article class="card spot" data-reveal><span class="mono card-n">${String(i + 1).padStart(2, '0')}</span><h3>${t}</h3><p>${b}</p></article>`).join('')}</div></section>`;
}

export function renderScope() {
  return `<section class="bench scope" id="scope" aria-label="Scope bench" data-reveal>
    <canvas class="wave-field" aria-hidden="true"></canvas>
    <div class="bench-layout">
      <div class="bench-side">
        <div class="bench-head"><h2 class="mono sec-title">03 / Scope bench</h2></div>
        <p class="copy">A toy oscilloscope straight from the logo. Shape the trace, then see it settle through damped springs.</p>
        <div class="presets" role="group" aria-label="Trace presets">
          <button type="button" class="btn chip" data-preset="sine" aria-pressed="true">Sine</button>
          <button type="button" class="btn chip" data-preset="pulse" aria-pressed="false">Pulse</button>
          <button type="button" class="btn chip" data-preset="burst" aria-pressed="false">Burst</button>
        </div>
        <label class="ctl mono"><span>Amplitude</span><output id="o-amp">60</output><input type="range" id="r-amp" min="10" max="100" value="60"></label>
        <label class="ctl mono"><span>Frequency</span><output id="o-frq">4</output><input type="range" id="r-frq" min="1" max="12" value="4"></label>
        <label class="ctl mono"><span>Offset</span><output id="o-pha">0</output><input type="range" id="r-pha" min="0" max="360" value="0"></label>
      </div>
      <div class="scope-screen spot"><canvas id="scope-canvas" aria-label="Animated oscilloscope trace" role="img"></canvas>
        <div class="scope-read mono"><span>CH1 / TRACE</span><span class="c-red" id="scope-state">LOCKED</span></div>
        <p class="scope-fig mono" id="scope-fig"></p></div>
    </div></section>`;
}

export function renderRoadmap() {
  const ph = [
    ['Carrier', 'Site, brand and a live board go out the door. The pinned row waits behind a placeholder.', 'now'],
    ['Broadcast', 'Contract address is published, our pinned row lights up and its pulse starts working.', ''],
    ['Amplify', 'Watchlists, deeper per-token views and alert hooks land on the desk.', ''],
    ['Resonance', 'Community tools and shared dashboards, shaped by whoever tunes in.', '']
  ];
  return `<section class="block" id="roadmap" aria-label="Roadmap"><div class="block-head" data-reveal><h2 class="mono sec-title">04 / Roadmap</h2><p class="copy">Four stages, no calendar. Each opens when the one before it feels solid.</p></div>
    <ol class="steps">${ph.map(([t, b, c], i) => `<li class="step spot ${c}" data-reveal><span class="mono step-n">Stage ${String(i + 1).padStart(2, '0')}</span><h3>${t}</h3><p>${b}</p>${c ? '<span class="mono step-now">ON AIR</span>' : ''}</li>`).join('')}</ol></section>`;
}

export function renderFooter() {
  return `<footer class="foot"><div class="foot-row"><span class="brand-name">WaveLabs<i>.</i></span><span class="mono">wavelabs.fun</span></div>
    <p class="copy small">Numbers arrive via public feeds and can lag or misfire. Nothing on this page is advice of any kind.</p></footer>`;
}

export function renderPage(reg) {
  return `${renderSidebar()}<div class="overlay" id="overlay" hidden></div>
  <div class="main"><div class="progress" id="progress" aria-hidden="true"></div>${renderHeader(reg)}
  <main class="content">${renderHero()}${renderTicker()}${renderReceipts(reg)}${renderBoard(reg)}${renderChain()}${renderScope()}${renderRoadmap()}</main>${renderFooter()}</div>`;
}

// ---- market rows ----
export function logoHtml(cands, symbol) {
  const list = (cands || []).filter(Boolean);
  if (!list.length) return `<span class="tile letter" aria-hidden="true">${esc(letterOf(symbol))}</span>`;
  return `<span class="tile" data-sym="${esc(letterOf(symbol))}"><img src="${esc(list[0])}" data-rest="${esc(JSON.stringify(list.slice(1)))}" alt="" width="36" height="36" loading="lazy" referrerpolicy="no-referrer"></span>`;
}
const num = (kind, v) => `<span class="num" data-kind="${kind}" data-v="${v == null ? '' : v}"></span>`;
export function renderRow(r, rank, own = false) {
  const body = `<span class="c-rank">${String(rank).padStart(2, '0')}</span><span class="c-tok">${logoHtml(r.logos, r.symbol)}<span class="tok-t"><b>${esc(r.symbol || DASH)}</b><small>${esc(r.name || DASH)}</small></span></span>
    <span class="c-price">${num('price', r.priceUsd)}</span><span class="c-h24">${num('pct', r.h24)}</span><span class="c-vol">${num('usd', r.vol)}</span><span class="c-liq">${num('usd', r.liq)}</span>`;
  const cls = `row${own ? ' own' : ''}`;
  return r.url
    ? `<a class="${cls}" data-key="${esc(r.address)}" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${body}</a>`
    : `<div class="${cls}" data-key="${esc(r.address)}">${body}</div>`;
}
export const tickerItem = (r) => `<span class="tk-item" data-tk="${esc(r.address)}"><b>${esc(r.symbol || DASH)}</b><em class="num" data-kind="pct" data-v="${r.h24 == null ? '' : r.h24}"></em><i class="tk-sep">·</i></span>`;

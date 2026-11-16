// Data layer. Trending follows ONLY the marketSource register. Own token follows ONLY the CA record.
// The two never read each other's state, and pump.fun never blocks DexScreener (or vice versa).
import { toNum, safeImg } from './format.js';
import { resolveCA } from './gate.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchJSON(url, { retries = 3, base = 800, timeout = 10000 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json' } });
      clearTimeout(t);
      if (res.ok) return await res.json();
      lastErr = new Error('HTTP ' + res.status);
      if (res.status < 500 && res.status !== 429) break; // not retryable
    } catch (e) { clearTimeout(t); lastErr = e; }
    if (i < retries) await sleep(base * 2 ** i + Math.random() * 250); // exponential backoff + jitter
  }
  throw lastErr;
}

const byVolume = (a, b) => (toNum(b?.volume?.h24) ?? 0) - (toNum(a?.volume?.h24) ?? 0);

export function pairToRow(address, pair, extra = {}) {
  const p = pair || {};
  return {
    address,
    symbol: p.baseToken?.symbol || extra.symbol || null,
    name: p.baseToken?.name || extra.name || null,
    priceUsd: toNum(p.priceUsd),
    h24: toNum(p.priceChange?.h24),
    vol: toNum(p.volume?.h24),
    liq: toNum(p.liquidity?.usd),
    logos: [safeImg(p.info?.imageUrl), safeImg(extra.icon)].filter(Boolean),
    url: 'https://dexscreener.com/solana/' + encodeURIComponent(address)
  };
}

export async function loadTrending(reg) {
  const src = reg.marketSource;
  const boosts = await fetchJSON(src.boostsUrl);
  const seen = new Map();
  for (const b of Array.isArray(boosts) ? boosts : []) {
    if (b?.chainId !== 'solana' || !b.tokenAddress) continue;
    const prev = seen.get(b.tokenAddress);
    if (!prev || (toNum(b.totalAmount) ?? 0) > (toNum(prev.totalAmount) ?? 0)) seen.set(b.tokenAddress, b);
  }
  const top = [...seen.values()].sort((a, b) => (toNum(b.totalAmount) ?? 0) - (toNum(a.totalAmount) ?? 0)).slice(0, src.count);
  const rows = await Promise.all(top.map(async (b) => {
    try {
      const pairs = await fetchJSON(src.pairsUrl + encodeURIComponent(b.tokenAddress), { retries: 2 });
      const list = (Array.isArray(pairs) ? pairs : []).slice().sort(byVolume);
      return pairToRow(b.tokenAddress, list[0], { icon: b.icon });
    } catch {
      return { ...pairToRow(b.tokenAddress, null, { icon: b.icon }), failed: true };
    }
  }));
  return rows;
}

// Own token: DexScreener + pump.fun in parallel, neither awaited before the other starts.
export async function loadOwn(reg, brandLogo) {
  const ca = resolveCA(reg);
  if (ca.state !== 'stated') return null;
  const addr = ca.value;
  const [dex, pump] = await Promise.allSettled([
    fetchJSON(reg.ownSource.dexUrl + encodeURIComponent(addr), { retries: 2 }),
    fetchJSON(reg.ownSource.pumpUrl + encodeURIComponent(addr), { retries: 1 })
  ]);
  const pairs = dex.status === 'fulfilled' && Array.isArray(dex.value?.pairs) ? dex.value.pairs.slice().sort(byVolume) : [];
  const pair = pairs[0] || null;
  const pc = pump.status === 'fulfilled' ? pump.value : null;
  if (!pair && !pc) throw new Error('own token sources unavailable');
  const row = pairToRow(addr, pair, { symbol: pc?.symbol, name: pc?.name });
  row.symbol = row.symbol || pc?.symbol || null;
  row.name = row.name || pc?.name || null;
  // logo chain: pump.fun -> DexScreener -> brand folder -> (letter tile)
  row.logos = [safeImg(pc?.image_uri), safeImg(pair?.info?.imageUrl), brandLogo].filter(Boolean);
  return row;
}

// Scheduler: 60s poll, pauses while hidden, fetches immediately on visible, backs off after failures.
export function createPoller(task, pollMs) {
  let timer = null, fails = 0, running = false, stopped = false;
  const delay = () => (fails ? Math.min(pollMs * 2 ** fails, 300000) : pollMs);
  const schedule = () => { clearTimeout(timer); if (!stopped && !document.hidden) timer = setTimeout(run, delay()); };
  async function run() {
    if (running) return;
    running = true;
    try { const ok = await task(); fails = ok === false ? fails + 1 : 0; } catch { fails++; }
    running = false; schedule();
  }
  const onVis = () => { if (document.hidden) clearTimeout(timer); else { clearTimeout(timer); run(); } };
  document.addEventListener('visibilitychange', onVis);
  return { start: run, now: () => { clearTimeout(timer); return run(); }, stop() { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); } };
}

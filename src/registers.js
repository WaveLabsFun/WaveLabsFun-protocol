// Register pattern: every external fact is ONE record with a state.
// state: 'stated' | 'absent' | 'unconfirmed'. Anything not 'stated' renders inert.
const base = {
  site: { state: 'stated', url: 'https://wavelabs.fun' },
  chain: { state: 'stated', value: 'solana', rpc: 'https://solana-rpc.publicnode.com' },
  ca: { state: 'absent', value: null },
  x: { state: 'stated', url: 'https://x.com/UseWave' },
  github: { state: 'absent', url: null },
  marketSource: {
    state: 'stated',
    boostsUrl: 'https://api.dexscreener.com/token-boosts/top/v1',
    pairsUrl: 'https://api.dexscreener.com/tokens/v1/solana/',
    count: 10,
    pollMs: 60000
  },
  ownSource: {
    state: 'stated',
    dexUrl: 'https://api.dexscreener.com/latest/dex/tokens/',
    pumpUrl: 'https://frontend-api.pump.fun/coins/'
  }
};
// Build-time test override (esbuild define). Null in production.
/* global __REG_OVERRIDE__ */
const override = typeof __REG_OVERRIDE__ !== 'undefined' ? __REG_OVERRIDE__ : null;
export const registers = override ? { ...base, ...override } : base;
export const baseRegisters = base;

export const isStated = (rec) => !!rec && rec.state === 'stated' && !!(rec.value || rec.url || rec.boostsUrl || rec.dexUrl);
// Link rule: store the URL, derive the handle. No URL -> no handle, no href.
export const handleOf = (rec) => {
  if (!isStated(rec) || !rec.url) return null;
  try { const p = new URL(rec.url).pathname.split('/').filter(Boolean); return p[0] ? '@' + p[0] : null; } catch { return null; }
};

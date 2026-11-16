export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const safeImg = (u) => { try { const x = new URL(u); return x.protocol === 'https:' ? x.href : null; } catch { return null; } };
export const DASH = '\u2014';
export function fmtPrice(v) {
  if (v == null || !isFinite(v)) return DASH;
  if (v >= 1000) return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (v >= 1) return '$' + v.toFixed(2);
  if (v >= 0.01) return '$' + v.toFixed(4);
  if (v === 0) return '$0';
  const d = Math.min(14, Math.max(4, Math.ceil(-Math.log10(v)) + 2));
  return '$' + v.toFixed(d);
}
export function fmtPct(v) {
  if (v == null || !isFinite(v)) return DASH;
  return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
}
export function fmtUsd(v) {
  if (v == null || !isFinite(v)) return DASH;
  return '$' + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(v);
}
export const fmtInt = (v) => (v == null || !isFinite(v) ? DASH : String(Math.round(v)));
export const FORMATS = { price: fmtPrice, pct: fmtPct, usd: fmtUsd, int: fmtInt };
export const toNum = (v) => { const n = typeof v === 'string' ? parseFloat(v) : v; return typeof n === 'number' && isFinite(n) ? n : null; };
export const letterOf = (s) => (String(s || '?').replace(/[^A-Za-z0-9]/g, '')[0] || '?').toUpperCase();

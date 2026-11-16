// Gate: address-shaped strings are matched against the stated registry, never blanket-rejected by prefix.
export const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const SHAPES = [/\b0x[0-9a-fA-F]{40}\b/g, /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g];

export function shapeOk(chain, value) {
  if (typeof value !== 'string') return false;
  if (chain === 'solana') return BASE58.test(value);
  return false;
}
// Normalise the CA record: stated only if the value fits the stated chain, else unconfirmed (inert).
export function resolveCA(reg) {
  const ca = reg.ca;
  if (!ca || ca.state !== 'stated' || !ca.value) return { state: ca && ca.state === 'unconfirmed' ? 'unconfirmed' : 'absent', value: null };
  return shapeOk(reg.chain.value, ca.value) ? { state: 'stated', value: ca.value } : { state: 'unconfirmed', value: null };
}
export function statedAddresses(reg) {
  const out = new Set(); const ca = resolveCA(reg);
  if (ca.state === 'stated') out.add(ca.value);
  return out;
}
// Scan text for address-shaped strings that are not in the stated registry. CA is exempt.
export function scanAddresses(text, reg) {
  const known = statedAddresses(reg); const found = [];
  for (const re of SHAPES) {
    re.lastIndex = 0; let m;
    while ((m = re.exec(text))) {
      // long all-letter words are not addresses: require a digit or mixed case run
      const s = m[0];
      if (s.startsWith('0x') || /\d/.test(s)) { if (!known.has(s)) found.push(s); }
    }
  }
  return [...new Set(found)];
}

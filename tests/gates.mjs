// Gate harness. Runs after the build. Exit code 0 only if every gate passes.
// Mutation anchors are state-independent: each reads the CURRENT register record at runtime and asserts the
// outcome that record demands, then flips the record and asserts the opposite outcome.
import { readFile, readdir, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEST_CA = 'So11111111111111111111111111111111111111112'; // test value, only ever built into a temp dir
let total = 0, failed = 0;
const gate = (name, ok, info = '') => { total++; if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  G${String(total).padStart(2, '0')}  ${name}${ok ? '' : '  <- ' + info}`); };

const { baseRegisters } = await import(pathToFileURL(resolve(root, 'src/registers.js')).href);
const { resolveCA, scanAddresses } = await import(pathToFileURL(resolve(root, 'src/lib/gate.js')).href);
const R = await import(pathToFileURL(resolve(root, 'src/render.js')).href);
const { isStated, handleOf } = await import(pathToFileURL(resolve(root, 'src/registers.js')).href);

async function walk(dir, skip = []) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (skip.includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p, skip)); else out.push(p);
  }
  return out;
}
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');

/* ================= static source gates ================= */
const srcFiles = (await walk(resolve(root, 'src'), ['assets'])).filter((f) => /\.(css|js|html)$/.test(f));
const hexRe = /#[0-9a-fA-F]{3,8}\b/g;
const offenders = [];
for (const f of srcFiles) {
  if (f.endsWith('tokens.css')) continue;
  const t = await readFile(f, 'utf8');
  // SVG path data and numeric entities never look like #hex; strip url fragments/ids like href="#board"
  const m = (t.match(hexRe) || []).filter((h) => !/^#(board|chain|scope|roadmap|top|app)$/.test(h) && !/^#[0-9]+$/.test(h));
  if (m.length) offenders.push(f.replace(root, '') + ':' + [...new Set(m)].join(','));
}
gate('palette rule: hex literals live only in tokens.css', offenders.length === 0, offenders.join(' | '));
const tokens = await readFile(resolve(root, 'src/tokens.css'), 'utf8');
const wl = tokens.match(/--wl-[a-z-]+:\s*#[0-9a-f]{6}/g) || [];
gate('palette provenance: every --wl hex has a provenance line', wl.every((d) => { const n = d.match(/--wl-([a-z-]+)/)[1]; return new RegExp('--wl-' + n + '\\s+#[0-9a-f]{6}\\s+\\S').test(tokens); }), 'missing provenance');
const css = await readFile(resolve(root, 'src/styles.css'), 'utf8');
gate('measurement: no ch units in CSS', !/\d\s*ch\b/.test(css));
gate('motion: prefers-reduced-motion block kills animation + own pulse', /prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none/.test(css) && /\.row\.own\{animation:none\}/.test(css));
gate('own row: 2px accent left edge + ownPulse keyframes on mint token', /\.row\.own\{border-left:2px solid var\(--color-accent\)/.test(css) && /@keyframes ownPulse/.test(css) && /--color-accent:\s*var\(--wl-mint\)/.test(tokens) && /--wl-mint:\s*#00ffcc/.test(tokens));

// animation audit: every @keyframes is used by an animation declaration; blanket reduced-motion kill exists; JS paths honour it
const kfNames = [...css.matchAll(/@keyframes ([\w-]+)/g)].map((m) => m[1]);
const unused = kfNames.filter((n) => !new RegExp('animation:([^;}]*[ ,])?' + n + '[ ,;}]').test(css));
gate(`animation audit: all ${kfNames.length} @keyframes are applied to an element`, unused.length === 0, unused.join(','));
gate('animation audit: reduced-motion blanket kills every CSS animation/transition', /prefers-reduced-motion:reduce\)\{\s*\*,\*::before,\*::after\{animation:none!important;transition:none!important/.test(css));
const jsAll = (await Promise.all(['motion', 'scope', 'field'].map((n) => readFile(resolve(root, `src/lib/${n}.js`), 'utf8')))).join(' ');
gate('animation audit: JS springs, count-up, scope and field honour prefers-reduced-motion', (jsAll.match(/prefers-reduced-motion: reduce/g) || []).length >= 2 && /reduced\(\)/.test(jsAll));
gate('animation audit: reference timings (ticker 32s linear, arrive .42s ease-out, state .28s, route .32s, orbit .75s, retro .65s, pulse 2s, spin 1s)', /lab-ticker-scroll 32s linear infinite|animation:lab-ticker-scroll 32s linear infinite/.test(css) && /\.42s ease-out both notebook-arrive/.test(css) && /\.28s ease-out backwards notebook-state/.test(css) && /\.32s cubic-bezier\(\.2,\.7,\.2,1\) backwards page-enter/.test(css) && /\.75s cubic-bezier\(\.2,\.7,\.2,1\) backwards orbit-arrive/.test(css) && /\.65s ease-out backwards state-enter/.test(css) && /pulse 2s cubic-bezier\(\.4,0,\.6,1\) infinite/.test(css) && /spin 1s linear infinite/.test(css));

const reg = await readFile(resolve(root, 'src/registers.js'), 'utf8');
gate('market register: stated URLs match brief', reg.includes("'https://api.dexscreener.com/token-boosts/top/v1'") && reg.includes("'https://api.dexscreener.com/tokens/v1/solana/'") && reg.includes('pollMs: 60000') && reg.includes('https://solana-rpc.publicnode.com'));
gate('own source register: dexscreener + pump.fun urls', reg.includes('https://api.dexscreener.com/latest/dex/tokens/') && reg.includes('https://frontend-api.pump.fun/coins/'));
const mk = await readFile(resolve(root, 'src/lib/market.js'), 'utf8');
const trendFn = mk.slice(mk.indexOf('export async function loadTrending'), mk.indexOf('// Own token'));
gate('market independent of CA: loadTrending never touches CA/own state', !/\bca\b|resolveCA|ownSource/.test(trendFn));
gate('pump.fun parallel: both own fetches inside one Promise.allSettled', /Promise\.allSettled\(\[\s*fetchJSON\(reg\.ownSource\.dexUrl[\s\S]*fetchJSON\(reg\.ownSource\.pumpUrl/.test(mk));
gate('market: solana filter + top-N by totalAmount', /chainId !== 'solana'/.test(mk) && /totalAmount/.test(mk) && /\.slice\(0, src\.count\)/.test(mk));
gate('market: exponential backoff + hidden-tab pause + immediate visible fetch', /2 \*\* i/.test(mk) && /document\.hidden/.test(mk) && /visibilitychange/.test(mk));

const files = (await walk(root, ['node_modules', 'dist', '.tmp-build'])).filter((f) => !/\.(png|jpe?g|jpeg)$/i.test(f));
const bad = [];
for (const f of files) { if (/package-lock\.json$/.test(f) || /gates\.mjs$/.test(f)) continue; const t = await readFile(f, 'utf8').catch(() => ''); if (/anthropic|claude|co-authored-by|generated (by|with) ai/i.test(t)) bad.push(f.replace(root, '')); }
gate('repo hygiene: no AI attribution strings in repo', bad.length === 0, bad.join(','));
gate('repo hygiene: no CLAUDE.md, no .claude/', !existsSync(resolve(root, 'CLAUDE.md')) && !existsSync(resolve(root, '.claude')));
gate('repo content: README, whitepaper, MIT LICENSE present', existsSync(resolve(root, 'README.md')) && existsSync(resolve(root, 'docs/whitepaper.md')) && /MIT License[\s\S]*Copyright[^\n]*WAVELABS, 2026/.test(await readFile(resolve(root, 'LICENSE'), 'utf8').catch(() => '')));

/* ================= register unit gates ================= */
gate('gate: Solana base58 CA accepted -> stated', resolveCA({ ...baseRegisters, ca: { state: 'stated', value: TEST_CA } }).state === 'stated');
gate('gate: 0x hex is not blanket-rejected by prefix, it is judged against chain+registry (unconfirmed, inert)', resolveCA({ ...baseRegisters, ca: { state: 'stated', value: '0x' + 'ab'.repeat(20) } }).state === 'unconfirmed');
gate('gate: scanner flags address-shaped strings absent from registry, CA exempt', scanAddresses('see 0x' + 'cd'.repeat(20) + ' and ' + TEST_CA, { ...baseRegisters, ca: { state: 'stated', value: TEST_CA } }).length === 1);
gate('link rule: handle derived from stored URL', handleOf(baseRegisters.x) === (baseRegisters.x.url ? '@' + new URL(baseRegisters.x.url).pathname.split('/')[1] : null) && handleOf({ state: 'absent', url: null }) === null);

/* ================= per-build gates (run for BOTH branches) ================= */
async function checkBuild(label, dir, registers) {
  console.log(`\n--- ${label}: ${dir.replace(root, '.')} ---`);
  const html = await readFile(resolve(dir, 'index.html'), 'utf8');
  const text = visible(html);
  const ca = resolveCA(registers);

  // logo
  const logoPath = resolve(dir, R.LOGO);
  const png = existsSync(logoPath) ? await readFile(logoPath) : Buffer.alloc(0);
  gate(`${label}: logo copied into dist and is RGBA PNG (IHDR colortype 6)`, png.length > 1000 && png.readUInt8(25) === 6 && png.readUInt32BE(16) === 512);
  gate(`${label}: index.html references logo by relative path`, html.includes(`src="${R.LOGO}"`) && !/src="\/assets/.test(html));
  const refs = [...html.matchAll(/(?:src|href)="((?!https?:|#|mailto:)[^"]+)"/g)].map((m) => m[1]);
  gate(`${label}: every local src/href in index.html resolves inside dist`, refs.every((r) => existsSync(resolve(dir, r))), refs.filter((r) => !existsSync(resolve(dir, r))).join(','));
  const fav = await readFile(resolve(dir, 'assets/favicon.svg'), 'utf8');
  gate(`${label}: favicon is 32x32 SVG traced from pixel grid, linked`, /width="32" height="32" viewBox="0 0 32 32"/.test(fav) && (fav.match(/<rect /g) || []).length > 100 && html.includes('href="assets/favicon.svg"'));

  // no dates
  gate(`${label}: no dates/timestamps/"as of" in visible text`, !/\b(19|20)\d{2}\b|\b\d{1,2}:\d{2}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d|as of|last checked|updated/i.test(text), 'date-like string found');

  // address scanner on shipped text (CA exempt)
  gate(`${label}: address scanner finds nothing outside the stated registry`, scanAddresses(text.split(ca.value || '\u0000').join(' '), registers).length === 0);

  // social: read each record at runtime; assert the outcome it demands
  const head = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  const xHref = head.match(/<a class="social" href="([^"]+)"[^>]*aria-label="X/);
  const ghHref = head.match(/<a class="social" href="([^"]+)"[^>]*aria-label="GitHub/);
  gate(`${label}: X icon follows its record (stated->href=url, else inert)`, isStated(registers.x) ? xHref && xHref[1] === registers.x.url : !xHref && /is-inert[^>]*aria-label="X/.test(head));
  gate(`${label}: GitHub icon follows its record (stated->href=url, else inert)`, isStated(registers.github) ? ghHref && ghHref[1] === registers.github.url : !ghHref && /is-inert[^>]*aria-label="GitHub/.test(head));
  gate(`${label}: both social icons present, icon-only (no text nodes)`, /<svg[\s\S]*<svg/.test(head.slice(head.indexOf('class="socials"'))) && !/class="socials"[^>]*>[^<]*[A-Za-z]/.test(head.slice(head.indexOf('class="socials"'), head.indexOf('class="socials"') + 400).replace(/<[^>]+>/g, '\u0001').replace(/\u0001/g, '')) );
  gate(`${label}: exactly one X icon on the page`, (html.match(/aria-label="X \(/g) || []).length === 1);
  gate(`${label}: no github href without a stated record`, isStated(registers.github) || !/href="[^"]*github\.com/.test(html));

  // CA slot: top of page (inside header), state from runtime record
  const slotHtml = head.slice(head.indexOf('id="ca-slot"') - 40);
  if (ca.state === 'stated') {
    gate(`${label}: CA slot is a copy button holding the FULL address`, /<button[^>]*id="ca-slot"[^>]*data-copy="/.test(head) && head.includes(`data-copy="${ca.value}"`) && head.includes(`<span class="ca-value">${ca.value}</span>`));
  } else {
    gate(`${label}: CA slot is inert (no button, no data-copy, no href)`, /<div class="ca-slot is-inert" id="ca-slot"/.test(head) && !/data-copy/.test(head) && !/<a[^>]*ca-slot/.test(head));
  }
  gate(`${label}: CA slot sits inside the top header`, head.includes('id="ca-slot"') && slotHtml.length > 0);

  // own token row follows the CA record; market block identical regardless
  const own = html.slice(html.indexOf('id="own-slot"'), html.indexOf('id="trend-rows"'));
  if (ca.state === 'stated') gate(`${label}: row #1 is the pinned own-token row (loading state, links on data)`, /class="row own is-skel" data-own="loading"/.test(own));
  else gate(`${label}: row #1 is brand-logo placeholder, non-clickable, dots`, /class="row own is-placeholder"/.test(own) && own.includes(R.LOGO_SM) && !/class="tile letter"/.test(own) && !/<a /.test(own) && own.includes('· · · · ·'));
  const trend = html.slice(html.indexOf('id="trend-rows"'), html.indexOf('</section>', html.indexOf('id="trend-rows"')));
  gate(`${label}: ${registers.marketSource.count} skeleton rows render in trending slot regardless of CA`, (trend.match(/is-skel/g) || []).length === registers.marketSource.count);
  gate(`${label}: scroll progress bar + live status pill + ticker present`, html.includes('id="progress"') && html.includes('live-dot') && html.includes('id="ticker-track"'));
}

// branch A: current register (as shipped)
await checkBuild('shipped', resolve(root, 'dist'), baseRegisters);

// branch B: mutate the CURRENT ca record to its opposite, build into a temp dir, re-run the same anchors
const flipped = baseRegisters.ca.state === 'stated'
  ? { ca: { state: 'absent', value: null } }
  : { ca: { state: 'stated', value: TEST_CA } };
const tmp = '.tmp-build';
const b = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, env: { ...process.env, WAVE_OUT: tmp, WAVE_OVERRIDE: JSON.stringify(flipped) }, encoding: 'utf8' });
gate('mutation build exits 0', b.status === 0, b.stderr);
await checkBuild('mutated', resolve(root, tmp), { ...baseRegisters, ...flipped });
const a1 = await readFile(resolve(root, 'dist/index.html'), 'utf8'), a2 = await readFile(resolve(root, tmp, 'index.html'), 'utf8');
const section = (h) => h.slice(h.indexOf('id="trend-rows"'), h.indexOf('</section>', h.indexOf('id="trend-rows"')));
gate('market block byte-identical across both CA branches', section(a1) === section(a2));
await rm(resolve(root, tmp), { recursive: true, force: true });

console.log(`\ngates: ${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);

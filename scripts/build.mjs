// Build: bundle JS/CSS with esbuild, prerender the shell from the registers, copy assets explicitly into dist/.
import { build } from 'esbuild';
import { mkdir, rm, cp, readFile, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, process.env.WAVE_OUT || 'dist');
const override = process.env.WAVE_OVERRIDE ? JSON.parse(process.env.WAVE_OVERRIDE) : null;
if (override) globalThis.__REG_OVERRIDE__ = override; // so the prerender sees the same registers as the bundle

await rm(out, { recursive: true, force: true });
await mkdir(resolve(out, 'assets'), { recursive: true });

await build({
  entryPoints: { app: resolve(root, 'src/main.js'), 'app-css': resolve(root, 'src/styles.css') },
  outdir: resolve(out, 'assets'), bundle: true, minify: true, format: 'esm', target: 'es2020', logLevel: 'warning',
  define: { __REG_OVERRIDE__: JSON.stringify(override) }
});
await cp(resolve(out, 'assets/app-css.css'), resolve(out, 'assets/app.css'));
await rm(resolve(out, 'assets/app-css.css'));

// explicit asset copies (logo MUST land in dist/)
for (const f of ['wave-logo-512.png', 'wave-logo-192.png', 'favicon.svg', 'banner.jpg']) {
  await cp(resolve(root, 'src/assets', f), resolve(out, 'assets', f));
}

const { registers } = await import(pathToFileURL(resolve(root, 'src/registers.js')).href + '?b=' + Date.now());
const { renderPage, LOGO } = await import(pathToFileURL(resolve(root, 'src/render.js')).href);
const tpl = await readFile(resolve(root, 'src/index.html'), 'utf8');
const bg = (await readFile(resolve(root, 'src/tokens.css'), 'utf8')).match(/--wl-bg:\s*(#[0-9a-f]{6})/i)[1]; // theme-color comes from the tokens file
const html = tpl.replace('<!--APP-->', renderPage(registers)).replace('%THEME%', bg);
await writeFile(resolve(out, 'index.html'), html);

await access(resolve(out, LOGO));
if (!html.includes(`src="${LOGO}"`)) throw new Error('index.html does not reference ' + LOGO);
console.log(`built -> ${out}  (CA state: ${registers.ca.state})`);

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', process.argv[2] || 'dist');
const port = Number(process.argv[3] || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname; const f = resolve(root, '.' + (p === '/' ? '/index.html' : p));
  if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
  try { const b = await readFile(f); res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }).end(b); } catch { res.writeHead(404).end('not found'); }
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));

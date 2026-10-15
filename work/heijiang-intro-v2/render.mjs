// node render.mjs still t1,t2,...     → out/still-<t>.png
// node render.mjs test name           → out/test-<name>.png
// node render.mjs video out.mp4 [from] [to] [fps]
import { chromium } from '/tmp/claude-0/-home-claude/fd477d40-969c-533f-957f-cd163ab26b15/scratchpad/node_modules/playwright/index.mjs';
import { createServer } from 'http';
import { readFile, writeFile } from 'fs/promises';
import { spawn } from 'child_process';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';
const ROOT = dirname(fileURLToPath(import.meta.url));
const FONTS = '/tmp/claude-0/-home-claude/fd477d40-969c-533f-957f-cd163ab26b15/scratchpad/node_modules/@fontsource/lxgw-wenkai-tc';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  const p = u.startsWith('/fonts/') ? join(FONTS, u.slice(7)) : join(ROOT, u === '/' ? 'render.html' : u);
  try { const b = await readFile(p); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--disable-gpu', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => console.log('pageerror:', e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' || m.text().startsWith('[film]')) console.log('console:', m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/render.html`);
await page.evaluate(() => window.filmReady());
const [mode, arg, a3, a4, a5] = process.argv.slice(2);
const grab = async (expr) => Buffer.from((await page.evaluate(expr)).split(',')[1], 'base64');
if (mode === 'test') {
  for (const name of arg.split(',')) await writeFile(join(ROOT, 'out', `test-${name}.png`), await grab(`window.drawTest(${JSON.stringify(name)})`));
} else if (mode === 'clean') {
  await page.evaluate(() => { window.NO_CAPTIONS = true; });
  for (const t of arg.split(',').map(Number)) await writeFile(join(ROOT, 'out', `clean-${t.toFixed(2)}.png`), await grab(`window.frameAt(${t})`));
} else if (mode === 'still') {
  for (const t of arg.split(',').map(Number)) await writeFile(join(ROOT, 'out', `still-${t.toFixed(2)}.png`), await grab(`window.frameAt(${t})`));
} else if (mode === 'video') {
  const fps = Number(a5 || 24), from = Number(a3 || 0), to = Number(a4 || await page.evaluate(() => window.FILM_LENGTH));
  const out = join(ROOT, arg);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '12', '-pix_fmt', 'yuv420p', '-tune', 'animation', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((to - from) * fps); const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await grab(`window.frameAt(${from + i / fps}, 'image/png')`);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 48 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log('video done', out);
}
await browser.close(); server.close();

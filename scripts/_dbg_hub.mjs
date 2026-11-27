import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4189;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise(resolve => setTimeout(resolve, 1500));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.route('**/gstatic.com/**', route => route.abort());
await page.goto(`${BASE}/index.html`);
await page.waitForSelector('#hub-search-input');
await page.fill('#hub-search-input', 'defense');
await page.waitForTimeout(400);
const state = await page.evaluate(() => {
  const out = { counter: document.getElementById('hub-search-count').textContent, sections: [], entries: 0, visible: [] };
  document.querySelectorAll('[data-hub-section]').forEach(section => out.sections.push({ id: section.id, hidden: section.hidden, attr: section.getAttribute('hidden') }));
  document.querySelectorAll('[data-hub-module]').forEach(module => { out.entries++; if (!module.hidden) out.visible.push(module.getAttribute('data-hub-module')); });
  return out;
});
console.log(JSON.stringify(state, null, 1));
await browser.close();
server.kill();

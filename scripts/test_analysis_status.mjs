import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const html = await readFile(new URL('../CHESS_COACH.html', import.meta.url), 'utf8');
const style = html.match(/<style>([\\s\\S]*?)<\\/style>/i)?.[1];
assert.ok(style, 'Chess Coach stylesheet exists');
assert.match(style, /\.analysis-status-running\\s*\\{/);
assert.match(style, /stockfish-analysis-rainbow/);
assert.match(style, /stockfish-analysis-glow/);
assert.match(style, /prefers-reduced-motion:\\s*reduce/);
assert.match(html, /statusEl\\.classList\\.add\\('analysis-status-running'\\)/);
assert.match(html, /statusElDone\\.classList\\.remove\\('analysis-status-running'\\)/);
assert.match(html, /statusEl\\.textContent = '⏹ Analyse annulée'/);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<style>' + style + '</style><span id="analysis-status" role="status">en attente</span>');
  const before = await page.locator('#analysis-status').evaluate((el) => getComputedStyle(el).animationName);
  assert.equal(before, 'none');

  await page.locator('#analysis-status').evaluate((el) => {
    el.textContent = '🌈 Analyse Stockfish en cours…';
    el.classList.add('analysis-status-running');
  });
  const running = await page.locator('#analysis-status').evaluate((el) => {
    const css = getComputedStyle(el);
    return { text: el.textContent, weight: css.fontWeight, animation: css.animationName, background: css.backgroundImage, filter: css.filter };
  });
  assert.equal(running.text, '🌈 Analyse Stockfish en cours…');
  assert.equal(running.weight, '900');
  assert.match(running.animation, /stockfish-analysis-rainbow/);
  assert.match(running.animation, /stockfish-analysis-glow/);
  assert.match(running.background, /linear-gradient/);
  assert.match(running.filter, /drop-shadow/);

  await page.locator('#analysis-status').evaluate((el) => el.classList.remove('analysis-status-running'));
  assert.equal(await page.locator('#analysis-status').evaluate((el) => getComputedStyle(el).animationName), 'none');
  console.log('Playwright Stockfish analysis status animation test passed');
} finally {
  await browser.close();
}

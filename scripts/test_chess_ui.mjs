import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.Worker = class { postMessage() {} };
    window.game = {
      moves: () => [],
      fen: () => 'start',
      turn: () => 'w',
      history: () => [],
      get: () => null
    };
    window.board = { position() {}, orientation: () => 'white' };
  });
  await page.setContent('<main id="board">' +
    Array.from({ length: 64 }, (_, i) => '<div data-square="' + i + '"></div>').join('') +
    '</main>');
  await page.addScriptTag({ path: 'supa-dots-widget.js' });
  await page.waitForSelector('#supa-dots-btn', { timeout: 3000 });
  assert.equal(await page.locator('#supa-dots-lbl').textContent(), 'ON');

  await page.addScriptTag({ path: 'supa-move-bubbles.js' });
  await page.waitForSelector('#supa-bubbles-btn', { timeout: 3000 });
  assert.equal(await page.locator('#supa-bubbles-lbl').textContent(), 'ON');

  await page.locator('#supa-dots-btn').click();
  assert.equal(await page.locator('#supa-dots-lbl').textContent(), 'OFF');
  await page.locator('#supa-dots-btn').click();
  assert.equal(await page.locator('#supa-dots-lbl').textContent(), 'ON');
  console.log('Playwright chess widget smoke test passed');
} finally {
  await browser.close();
}

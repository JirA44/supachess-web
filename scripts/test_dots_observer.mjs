import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const script = readFileSync('supa-dots-widget.js', 'utf8');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 500, height: 500 } });
  await page.setContent('<div id="board" style="position:relative;width:320px;height:320px"></div>');
  await page.evaluate(() => {
    const board = document.querySelector('#board');
    for (let rank = 8; rank >= 1; rank--) {
      for (let file = 0; file < 8; file++) {
        const square = document.createElement('div');
        square.dataset.square = String.fromCharCode(97 + file) + rank;
        square.style.cssText = 'display:inline-block;width:40px;height:40px';
        board.appendChild(square);
      }
    }

    let currentFen = 'start';
    window.game = {
      fen: () => currentFen,
      turn: () => 'w',
      history: () => [],
      get: square => square === 'e2' ? { color: 'w', type: 'p' } : null,
      moves: () => [
        { from: 'e2', to: 'e3', flags: 'n' },
        { from: 'e2', to: 'e4', flags: 'n' },
      ],
    };
    window.__setTestFen = fen => { currentFen = fen; };
    window.board = { orientation: () => 'white' };
    window.Chess = class {
      move() { return {}; }
      in_check() { return false; }
    };
    window.Worker = class { postMessage() {} };
  });

  await page.addScriptTag({ content: script });
  await page.waitForTimeout(700);
  assert.match(await page.locator('#supa-dots-btn').innerText(), /ON/);

  await page.locator('[data-square="e2"]').click({ force: true });
  const dots = page.locator('#supa-dots-overlay > div');
  assert.equal(await dots.count(), 2, 'selecting a piece shows its two legal-move dots');

  await page.evaluate(() => {
    const cosmeticNode = document.createElement('span');
    document.querySelector('[data-square="e2"]').appendChild(cosmeticNode);
  });
  await page.waitForTimeout(50);
  assert.equal(await dots.count(), 2, 'cosmetic board DOM changes do not clear dots');

  await page.evaluate(() => {
    window.__setTestFen('after-move');
    const changedNode = document.createElement('span');
    document.querySelector('[data-square="e3"]').appendChild(changedNode);
  });
  await page.waitForTimeout(50);
  assert.equal(await dots.count(), 0, 'a real position change clears stale dots');

  console.log('Dots remain visible through cosmetic board changes and clear after a position change.');
} finally {
  await browser.close();
}

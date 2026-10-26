import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const script = readFileSync('supa-move-bubbles.js', 'utf8');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent('<div class="board-b72b1"><div data-square="e4" style="width:80px;height:80px"></div></div>');
  await page.evaluate(() => {
    const board = document.querySelector('.board-b72b1');
    const game = { fen: () => 'test', history: () => [] };
    window.supaDots = {
      getGame: () => game,
      getBoardEl: () => board,
      isReady: () => false,
      onAnalysis: () => () => {},
    };
  });
  await page.addScriptTag({ content: script });
  await page.waitForTimeout(1000);

  const first = await page.evaluate(() => window.supaBubbles.showRatedMove({
    to: 'e4', rating: 7.5, quality: '👍 Bon coup', eval: -3, san: 'e4', movePly: 1,
  }));
  assert.equal(first, true, 'rated player move is shown even while the dots engine is unavailable');
  const firstBubble = page.locator('[data-supa-bubble]');
  assert.equal(await firstBubble.count(), 1);
  assert.deepEqual(await firstBubble.first().locator('div').allInnerTexts(), ['✓', '7.5', '-0.03']);

  await page.evaluate(() => window.supaBubbles.showRatedMove({
    to: 'e4', rating: 9, quality: '★ MEILLEUR COUP', eval: 25, san: 'Nf3', movePly: 2,
  }));
  assert.equal(await page.locator('[data-supa-bubble]').count(), 2, 'same-square move bubbles stay visible together');
  const boxes = await page.locator('[data-supa-bubble]').evaluateAll(elements => elements.map(el => {
    const rect = el.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  }));
  assert.ok(boxes[0].right <= boxes[1].left || boxes[1].right <= boxes[0].left || boxes[0].bottom <= boxes[1].top || boxes[1].bottom <= boxes[0].top,
    'two bubbles on the same square do not overlap');

  await page.evaluate(() => window.supaBubbles.showRatedMove({
    to: 'e4', rating: 9, quality: '★ MEILLEUR COUP', eval: 25, san: 'e4', movePly: 1,
  }));
  assert.equal(await page.locator('[data-supa-bubble]').count(), 2, 'a later evaluation updates rather than duplicates the same half-move');
  assert.ok((await page.locator('[data-supa-bubble]').allInnerTexts()).some(text => text.includes('★') && text.includes('9.0') && text.includes('+0.25')));
  console.log('Rated half-move bubbles render without the dots engine, update cleanly, and do not overlap on the same square.');
} finally {
  await browser.close();
}


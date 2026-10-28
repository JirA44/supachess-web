import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const html = await readFile(new URL('../CHESS_COACH.html', import.meta.url), 'utf8');
const panelMarkup = await chromium.launch({ headless: true }).then(async (browser) => {
  try {
    const page = await browser.newPage();
    const structure = await page.evaluate((source) => {
      const doc = new DOMParser().parseFromString(source, 'text/html');
      const analysis = doc.querySelector('#panel-analysis .main-layout');
      const rightColumn = analysis?.children[1];
      const cards = Array.from(rightColumn?.children || []);
      const recentCard = doc.querySelector('#recent-games-list')?.closest('.card');
      return {
        title: recentCard?.querySelector('.card-title')?.textContent.trim(),
        isAtTopOfRightColumn: cards[0] === recentCard,
        remainsInImportPanel: !!doc.querySelector('#panel-import #recent-games-list'),
        listIsScrollable: /max-height:\s*280px/.test(doc.querySelector('#recent-games-list')?.getAttribute('style') || ''),
      };
    }, html);
    assert.equal(structure.title, '📁 Parties analysées');
    assert.equal(structure.isAtTopOfRightColumn, true);
    assert.equal(structure.remainsInImportPanel, false);
    assert.equal(structure.listIsScrollable, true);
    return structure;
  } finally {
    await browser.close();
  }
});
assert.ok(panelMarkup.isAtTopOfRightColumn);

const saveStart = html.indexOf('function saveRecentGame()');
const loadStart = html.indexOf('function loadRecentGames()', saveStart);
const loadEnd = html.indexOf('function loadRecentGame(', loadStart);
assert.ok(saveStart >= 0 && loadStart > saveStart && loadEnd > loadStart, 'recent game save/render functions exist');
const functions = html.slice(saveStart, loadEnd);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<div id="recent-games-list"></div>');
  await page.evaluate((source) => {
    const progress = { recentGames: [{ white: 'Older White', black: 'Older Black', result: '0-1', date: '2026-10-20T10:00:00.000Z', moves: 20, pgn: 'old', gameHash: 'old' }] };
    const game = {
      header: () => ({ White: 'New White', Black: 'New Black', Result: '1-0' }),
      pgn: () => '[White "New White"]\n[Black "New Black"]\n\n1. e4 e5',
    };
    const runSave = new Function('progress', 'game', 'analyzedMoves', 'analysisCache', 'getGameHash', 'saveProgress', 'document', source + '; saveRecentGame(); return progress;');
    runSave(progress, game, [{ san: 'e4' }, { san: 'e5' }], {}, () => 'new-game', () => {}, document);
  }, functions);
  const rows = page.locator('#recent-games-list > div');
  assert.equal(await rows.count(), 2);
  assert.match(await rows.nth(0).textContent(), /New White\s+vs\s+New Black/);
  assert.match(await rows.nth(0).textContent(), /2 coups/);
  assert.match(await rows.nth(1).textContent(), /Older White\s+vs\s+Older Black/);
  console.log('Playwright analyzed games sidebar test passed');
} finally {
  await browser.close();
}

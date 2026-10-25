import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const html = readFileSync('CHESSNOVA.html', 'utf8');
const start = html.indexOf('        function updateLiveMoveTally() {');
const end = html.indexOf('\n        function resignGame()', start);
assert.ok(start >= 0 && end > start, 'live move renderer exists');
const renderer = html.slice(start, end);
assert.match(
  html,
  /window\.gameHistory\.push\(\{[\s\S]*?\}\);\s*updateLiveMoveTally\(\);/,
  'a rated player half-move refreshes the right-side report immediately after it is recorded'
);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<div id="live-move-tally" aria-live="polite"></div>');
  await page.addScriptTag({ content: "window.ChessNovaI18n = { getLang: () => 'en' };\n" + renderer + "\nwindow.renderLiveMoves = updateLiveMoveTally;" });

  await page.evaluate(() => {
    window.gameHistory = [];
    window.renderLiveMoves();
    window.gameHistory.push({ moveNum: 1, san: 'e4', rating: 10, quality: 'BRILLANT!!', isOpponent: false });
    window.renderLiveMoves();
  });
  assert.equal(await page.locator('[data-live-category="brilliant"] [data-live-move="1. e4"]').count(), 1);
  assert.equal(await page.locator('[data-live-count="brilliant"]').innerText(), '!! Brilliant\n+1');

  await page.evaluate(() => {
    window.gameHistory.push(
      { moveNum: 1, san: 'e5', rating: null, quality: '🤖 IA', isOpponent: true },
      { moveNum: 2, san: 'Nf3', rating: 10, quality: '★ MEILLEUR COUP', isOpponent: false },
      { moveNum: 2, san: 'Nc6', rating: 9, quality: 'Excellent', isOpponent: false },
      { moveNum: 3, san: 'Bb5', rating: 7, quality: 'Bon coup', isOpponent: false },
      { moveNum: 3, san: 'a6', rating: 6, quality: 'Acceptable', isOpponent: false },
      { moveNum: 4, san: 'Ba4', rating: 4, quality: 'Imprécision', isOpponent: false },
      { moveNum: 4, san: 'Nf6', rating: 3, quality: 'Erreur', isOpponent: false },
      { moveNum: 5, san: 'O-O', rating: 1, quality: 'GAFFE', isOpponent: false },
      { moveNum: 5, san: 'c4', rating: 10, quality: '🌟 BRILLANT', isOpponent: false }
    );
    window.renderLiveMoves();
  });

  for (const category of ['brilliant', 'best', 'very-good', 'good', 'ok', 'inaccuracy', 'mistake', 'blunder']) {
    assert.equal(await page.locator('[data-live-category="' + category + '"]').count(), 1, category + ' group is shown');
    const expectedCount = category === 'brilliant' ? '+2' : '+1';
    assert.ok((await page.locator('[data-live-count="' + category + '"]').innerText()).endsWith(expectedCount), category + ' type total increments');
  }
  assert.equal(await page.locator('[data-live-move]').count(), 9, 'all rated player half-moves remain visible');
  assert.equal(await page.locator('[data-live-move="1. e5"]').count(), 0, 'opponent moves are not counted as player moves');
  assert.match(await page.locator('#live-move-tally').innerText(), /Moves played · grouped by type \(9\)/);
  console.log('Each analyzed half-move increments its type column immediately.');
} finally {
  await browser.close();
}

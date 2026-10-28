import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const html = readFileSync('TACTICAL_PUZZLES_GENERATOR.html', 'utf8');
const chessSource = readFileSync('node_modules/chess.js/chess.js', 'utf8');
const appScript = html.match(/<script>\s*([\s\S]*?)<\/script>/i)?.[1];
assert.ok(appScript, 'puzzle page application script exists');

const server = createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end('<!doctype html><html><body></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const appHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  await page.setContent(appHtml);
  await page.addScriptTag({ content: chessSource });
  await page.addScriptTag({ content: `window.Chessboard = function (id) {
    const element = document.getElementById(id);
    for (let rank = 8; rank >= 1; rank--) {
      for (const file of 'abcdefgh') {
        const square = document.createElement('div');
        square.dataset.square = file + rank;
        element.appendChild(square);
      }
    }
    return { position() {}, orientation() {} };
  };` });
  await page.addScriptTag({ content: appScript });
  await page.evaluate(() => window.onload());

  async function playSolutionMove(continuation = false) {
    const move = await page.evaluate(continuation => {
      const puzzle = PUZZLES[currentPuzzleIndex];
      const position = new Chess(continuation ? game.fen() : puzzle.fen);
      const san = continuation ? puzzle.continuation[0] : puzzle.solution[0];
      const next = position.move(san, { sloppy: true });
      return { from: next.from, to: next.to };
    }, continuation);
    await page.evaluate(async ({ from, to }) => {
      for (const square of [from, to]) {
        const piece = game.get(square);
        if (piece) onDragStart(square, piece.color + piece.type.toUpperCase());
        onDrop(square, square);
        document.querySelector(`[data-square="${square}"]`).dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }, move);
  }

  const modes = page.locator('#exercise-mode-select option');
  assert.equal(await modes.count(), 4, 'one-move, hidden-brilliant, and both two-half-move modes are offered');
  assert.deepEqual(await modes.evaluateAll(options => options.map(option => option.value)), ['one', 'hidden-brilliant', 'two-auto', 'two-manual']);

  await page.locator('#exercise-mode-select').selectOption('hidden-brilliant');
  const brilliantIds = await page.evaluate(() => puzzleOrder.map(index => index + 1).sort((a, b) => a - b));
  assert.deepEqual(brilliantIds, [23, 32, 39], 'the hidden-brilliant mode contains only the three curated non-obvious positions');
  await page.evaluate(() => loadPuzzle(38)); // Exercise the curated capture on b5 through the board UI.
  const captureMove = await page.evaluate(() => {
    const puzzle = PUZZLES[currentPuzzleIndex];
    const move = new Chess(puzzle.fen).move(puzzle.solution[0], { sloppy: true });
    return { from: move.from, to: move.to, isCapture: !!game.get(move.to) };
  });
  assert.equal(captureMove.isCapture, true, 'the hidden-brilliant UI regression uses a capture');
  await playSolutionMove();
  const hiddenBrilliant = await page.evaluate(() => ({
    feedback: document.getElementById('feedback').textContent,
    solved: puzzleSolved,
    moveCount: movesHistory.length
  }));
  assert.match(hiddenBrilliant.feedback, /coup brillant caché/i);
  assert.equal(hiddenBrilliant.solved, true, 'the curated hidden brilliant move solves in one half-move');
  assert.equal(hiddenBrilliant.moveCount, 1, 'the hidden-brilliant mode does not autoplay the continuation');

  await page.locator('#exercise-mode-select').selectOption('two-manual');
  await playSolutionMove();
  const firstManual = await page.evaluate(() => ({ feedback: document.getElementById('feedback').textContent, solved: puzzleSolved }));
  assert.match(firstManual.feedback, /Premier demi-coup correct/i);
  assert.equal(firstManual.solved, false, 'manual mode waits for the second half-move');
  await playSolutionMove(true);
  assert.equal(await page.evaluate(() => puzzleSolved), true, 'manual mode completes after the expected reply');
  assert.equal(await page.evaluate(() => movesHistory.length), 2, 'manual mode records both half-moves');

  await page.locator('#exercise-mode-select').selectOption('two-auto');
  await playSolutionMove();
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => puzzleSolved), true, 'automatic mode completes after the first move');
  assert.equal(await page.evaluate(() => movesHistory.length), 2, 'automatic mode plays exactly one opponent reply');

  await page.locator('#exercise-mode-select').selectOption('one');
  await playSolutionMove();
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => puzzleSolved), true, 'one-half-move mode completes on the best move');
  assert.equal(await page.evaluate(() => movesHistory.length), 1, 'one-half-move mode does not autoplay a continuation');
  console.log('Playwright puzzle exercise modes passed');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

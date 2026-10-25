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
  await page.addScriptTag({ content: `window.Chessboard = function () { return { position() {}, orientation() {} }; };` });
  await page.addScriptTag({ content: appScript });
  await page.evaluate(() => window.onload());

  const modes = page.locator('#exercise-mode-select option');
  assert.equal(await modes.count(), 4, 'one-move, hidden-brilliant, and both two-half-move modes are offered');
  assert.deepEqual(await modes.evaluateAll(options => options.map(option => option.value)), ['one', 'hidden-brilliant', 'two-auto', 'two-manual']);

  await page.locator('#exercise-mode-select').selectOption('hidden-brilliant');
  const brilliantIds = await page.evaluate(() => puzzleOrder.map(index => index + 1).sort((a, b) => a - b));
  assert.deepEqual(brilliantIds, [23, 32, 39], 'the hidden-brilliant mode contains only the three curated non-obvious positions');
  const hiddenBrilliant = await page.evaluate(() => {
    const puzzle = PUZZLES[currentPuzzleIndex];
    const probe = new Chess(puzzle.fen);
    const move = probe.move(puzzle.solution[0], { sloppy: true });
    onDrop(move.from, move.to);
    return { feedback: document.getElementById('feedback').textContent, solved: puzzleSolved, moveCount: movesHistory.length };
  });
  assert.match(hiddenBrilliant.feedback, /coup brillant caché/i);
  assert.equal(hiddenBrilliant.solved, true, 'the curated hidden brilliant move solves in one half-move');
  assert.equal(hiddenBrilliant.moveCount, 1, 'the hidden-brilliant mode does not autoplay the continuation');

  await page.locator('#exercise-mode-select').selectOption('two-manual');
  const firstManual = await page.evaluate(() => {
    const puzzle = PUZZLES[currentPuzzleIndex];
    const probe = new Chess(puzzle.fen);
    const move = probe.move(puzzle.solution[0], { sloppy: true });
    onDrop(move.from, move.to);
    return { feedback: document.getElementById('feedback').textContent, solved: puzzleSolved, reply: puzzle.continuation[0] };
  });
  assert.match(firstManual.feedback, /Premier demi-coup correct/i);
  assert.equal(firstManual.solved, false, 'manual mode waits for the second half-move');
  await page.evaluate(() => {
    const puzzle = PUZZLES[currentPuzzleIndex];
    const probe = new Chess(puzzle.fen);
    probe.move(puzzle.solution[0], { sloppy: true });
    const reply = probe.move(puzzle.continuation[0], { sloppy: true });
    onDrop(reply.from, reply.to);
  });
  assert.equal(await page.evaluate(() => puzzleSolved), true, 'manual mode completes after the expected reply');
  assert.equal(await page.evaluate(() => movesHistory.length), 2, 'manual mode records both half-moves');

  await page.locator('#exercise-mode-select').selectOption('two-auto');
  await page.evaluate(() => {
    const puzzle = PUZZLES[currentPuzzleIndex];
    const probe = new Chess(puzzle.fen);
    const move = probe.move(puzzle.solution[0], { sloppy: true });
    onDrop(move.from, move.to);
  });
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => puzzleSolved), true, 'automatic mode completes after the first move');
  assert.equal(await page.evaluate(() => movesHistory.length), 2, 'automatic mode plays exactly one opponent reply');

  await page.locator('#exercise-mode-select').selectOption('one');
  await page.evaluate(() => {
    const puzzle = PUZZLES[currentPuzzleIndex];
    const probe = new Chess(puzzle.fen);
    const move = probe.move(puzzle.solution[0], { sloppy: true });
    onDrop(move.from, move.to);
  });
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => puzzleSolved), true, 'one-half-move mode completes on the best move');
  assert.equal(await page.evaluate(() => movesHistory.length), 1, 'one-half-move mode does not autoplay a continuation');
  console.log('Playwright puzzle exercise modes passed');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

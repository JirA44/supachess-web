import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const chessSource = await readFile(new URL('../node_modules/chess.js/chess.js', import.meta.url), 'utf8');
const chessSandbox = { window: {} };
vm.runInNewContext(chessSource + '\nwindow.Chess = Chess;', chessSandbox, { filename: 'chess.js' });
const Chess = chessSandbox.window.Chess;
assert.equal(typeof Chess, 'function');

const helperSource = await readFile(new URL('../shared/player-analysis-data.js', import.meta.url), 'utf8');
const helperSandbox = { Chess };
vm.runInNewContext(helperSource, helperSandbox, { filename: 'shared/player-analysis-data.js' });
const data = helperSandbox.SupaPlayerAnalysisData;

const pgn = [
  '[Event "Radar phase test"]',
  '[White "Player"]',
  '[Black "Opponent"]',
  '[Result "*"]',
  '',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+',
  '7. Nc3 Nxe4 8. O-O Nxc3 9. bxc3 Bxc3 10. Qb3 Bxa1 11. Bxf7+ Kf8',
  '12. Ba3+ d6 13. Rxa1 *',
].join('\n');
const analyzed = data.normalizePlayedGame({ id: 'phase-test', userColor: 'w', pgn }, 0, Chess);
assert.ok(analyzed, 'valid PGN should produce a game record');
assert.equal(analyzed.history.find(move => move.ply === 1).phase, 'opening');
assert.equal(analyzed.history.find(move => move.ply === 24).phase, 'opening');
assert.equal(analyzed.history.find(move => move.ply === 25).phase, 'middle');

const endgamePgn = [
  '[Event "Endgame phase test"]',
  '[White "Player"]',
  '[Black "Opponent"]',
  '[Result "*"]',
  '[SetUp "1"]',
  '[FEN "4k3/8/8/8/8/8/8/4K2R w - - 0 40"]',
  '',
  '40. Rh8+ Kf7 *',
].join('\n');
const endgame = data.normalizePlayedGame({ id: 'endgame-test', userColor: 'w', pgn: endgamePgn }, 0, Chess);
assert.equal(endgame.history[0].phase, 'endgame', 'endgame phase should use board material from the PGN');

const storedOnly = data.normalizePlayedGame({
  id: 'stored-only',
  userColor: 'w',
  pgn: 'unreadable pgn',
  moveGrades: [{ ply: 1, color: 'w', san: 'e4', category: 'best' }],
}, 0, Chess);
assert.equal(storedOnly.history[0].phase, null, 'phase must remain unknown when no position is available');

const page = await readFile(new URL('../PLAYER_ANALYSIS.html', import.meta.url), 'utf8');
assert.match(page, /const phase = m\.phase;/);
assert.match(page, /gamePhaseCounts\.opening\+\+/);
assert.match(page, /const bestOrBrilliant = countForRadar\('brilliant'\) \+ countForRadar\('best'\)/);
assert.match(page, /radar-data-summary/);
assert.doesNotMatch(page, /moveIdx < 8/);
assert.doesNotMatch(page, /Ensure minimum scores/);

console.log('Player analysis radar phase and data-scope tests passed');

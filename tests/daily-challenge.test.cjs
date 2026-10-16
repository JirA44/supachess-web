const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const Chess = require('chess.js').Chess;

const html = fs.readFileSync(path.join(__dirname, '..', 'DAILY_CHALLENGE.html'), 'utf8');
const data = html.match(/const PUZZLES = \\[([\\s\\S]*?)\\n\\];/);
assert.ok(data, 'daily puzzle database exists');

function property(block, name) {
  const match = block.match(new RegExp('\\\\b' + name + ':\\\\s*"([^"]*)"'));
  assert.ok(match, 'missing ' + name + ' in puzzle: ' + block.slice(0, 80));
  return match[1];
}
function boardToFen(encoded) {
  const ranks = encoded.split('/').map((rank) => {
    let empty = 0;
    let result = '';
    for (const cell of rank) {
      if (cell === '.') empty += 1;
      else {
        if (empty) result += empty;
        empty = 0;
        result += cell;
      }
    }
    if (empty) result += empty;
    return result;
  });
  assert.equal(ranks.length, 8);
  return ranks.join('/');
}

const puzzles = data[1].match(/\\{[^{}]*\\}/g) || [];
test('the daily rotation contains eight playable puzzles with legal solutions', () => {
  assert.equal(puzzles.length, 8);
  for (const [index, puzzle] of puzzles.entries()) {
    const turn = property(puzzle, 'turn');
    const board = property(puzzle, 'board');
    const uciMatch = puzzle.match(/\\bsolutionUci:\\s*\\["([^"]+)"/);
    const sanMatch = puzzle.match(/\\bsolution:\\s*\\["([^"]+)"/);
    assert.ok(uciMatch && sanMatch, 'puzzle ' + index + ' includes its solution move and notation');
    const uci = uciMatch[1];
    const san = sanMatch[1];
    assert.match(uci, /^[a-h][1-8][a-h][1-8]$/, 'puzzle ' + index + ' has a UCI solution');
    const fen = boardToFen(board) + ' ' + (turn === 'white' ? 'w' : 'b') + ' - - 0 1';
    const game = new Chess(fen);
    const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: 'q' });
    assert.ok(move, 'puzzle ' + index + ' solution is legal');
    const normalize = (value) => value.replace(/[!?+#]/g, '');
    assert.equal(normalize(move.san), normalize(san), 'puzzle ' + index + ' SAN matches its board');
    if (san.includes('#')) assert.equal(game.in_checkmate(), true, 'puzzle ' + index + ' is actually checkmate');
  }
});

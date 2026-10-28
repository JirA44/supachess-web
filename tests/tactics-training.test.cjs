'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { Chess } = require('chess.js');

const html = fs.readFileSync(path.join(__dirname, '../TRAINING_TACTICS.html'), 'utf8');
const match = html.match(/const PUZZLES = (\[[\s\S]*?\n\]);?/);
assert.ok(match, 'the tactical catalog is a JSON-like data array');
const puzzles = JSON.parse(match[1]);

function boardToFen(board) {
  return board.split('/').map(rank => rank.replace(/\.{1,8}/g, run => String(run.length))).join('/');
}

test('catalog contains 40 unique, complete tactical exercises', () => {
  assert.equal(puzzles.length, 40);
  assert.equal(new Set(puzzles.map(puzzle => puzzle.id)).size, 40);
  for (const puzzle of puzzles) {
    assert.equal(puzzle.board.split('/').length, 8, puzzle.id);
    assert.ok(puzzle.board.split('/').every(rank => rank.length === 8), puzzle.id);
    assert.ok(puzzle.answer && /^[a-h][1-8][a-h][1-8]$/.test(puzzle.answer), puzzle.id);
    assert.equal(puzzle.choices.filter(choice => choice.correct).length, 1, puzzle.id);
    assert.ok(puzzle.question && puzzle.explain && puzzle.desc, puzzle.id);
  }
});

test('every prescribed move is legal and matches its tactical result', () => {
  for (const puzzle of puzzles) {
    const game = new Chess(boardToFen(puzzle.board) + ' ' + puzzle.turn + ' - - 0 1');
    const move = game.moves({ verbose: true }).find(candidate => candidate.from + candidate.to === puzzle.answer);
    assert.ok(move, puzzle.id + ': prescribed move must be legal');
    game.move(move.san);
    if (['backrank', 'smothered'].includes(puzzle.theme)) {
      assert.equal(game.in_checkmate(), true, puzzle.id + ': must be checkmate');
    } else if (['skewer', 'discovered', 'doublecheck', 'xray'].includes(puzzle.theme) || puzzle.id.startsWith('knight-fork') || puzzle.id.startsWith('bishop-fork')) {
      assert.equal(game.in_check(), true, puzzle.id + ': move must give check');
    }
  }
});

test('puzzle stays hidden until the learner plays the move and explains it', () => {
  const dom = new JSDOM(html, { url: 'https://supachess.test/TRAINING_TACTICS.html', runScripts: 'dangerously' });
  const { window } = dom;
  assert.equal(window.document.getElementById('stat-total').textContent, '40');

  window.openPuzzle('knight-fork-A');
  const modal = window.document.getElementById('modal-inner');
  assert.doesNotMatch(modal.textContent, /Le cavalier donne échec tout en attaquant la tour/);
  assert.equal(window.document.getElementById('tactic-knowledge').hidden, true);
  assert.equal(window.document.getElementById('btn-done').disabled, true);

  window.document.querySelector('[data-square="b5"]').click();
  window.document.querySelector('[data-square="c7"]').click();
  assert.equal(window.document.getElementById('tactic-knowledge').hidden, false);
  assert.doesNotMatch(modal.textContent, /Le cavalier donne échec tout en attaquant la tour/);

  window.answerConcept(1);
  assert.equal(window.document.getElementById('btn-done').disabled, true);
  window.answerConcept(0);
  assert.equal(window.document.getElementById('btn-done').disabled, false);
  assert.match(modal.textContent, /Le cavalier donne échec tout en attaquant la tour/);
  window.document.getElementById('btn-done').click();
  assert.deepEqual(JSON.parse(window.localStorage.getItem('supachess_tactics_v2')), ['knight-fork-A']);
  assert.equal(window.document.getElementById('stat-solved').textContent, '1');
  dom.window.close();
});

test('black-to-move puzzles orient the board and accept the correct side', () => {
  const dom = new JSDOM(html, { url: 'https://supachess.test/TRAINING_TACTICS.html', runScripts: 'dangerously' });
  const { window } = dom;
  window.openPuzzle('knight-fork-C');
  window.document.querySelector('[data-square="b4"]').click();
  window.document.querySelector('[data-square="c2"]').click();
  assert.equal(window.document.getElementById('tactic-knowledge').hidden, false);
  dom.window.close();
});

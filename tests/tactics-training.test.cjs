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

test('catalog contains 158 unique, complete tactical exercises', () => {
  assert.equal(puzzles.length, 158);
  assert.equal(new Set(puzzles.map(puzzle => puzzle.id)).size, 158);
  for (const puzzle of puzzles) {
    assert.equal(puzzle.board.split('/').length, 8, puzzle.id);
    assert.ok(puzzle.board.split('/').every(rank => rank.replace(/[1-8]/g, digit => '.'.repeat(Number(digit))).length === 8), puzzle.id);
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

test('puzzle stays hidden until the learner plays the move and explains it, then advances quickly', async () => {
  const dom = new JSDOM(html, { url: 'https://supachess.test/TRAINING_TACTICS.html', runScripts: 'dangerously', beforeParse(window) { window.Chess = Chess; } });
  const { window } = dom;
  assert.equal(window.document.getElementById('stat-total').textContent, '158');

  window.openPuzzle('knight-fork-A');
  const modal = window.document.getElementById('modal-inner');
  assert.doesNotMatch(modal.textContent, /Le cavalier donne échec tout en attaquant la tour/);
  assert.equal(window.document.getElementById('tactic-knowledge').hidden, true);
  assert.equal(window.document.getElementById('btn-done').disabled, true);

  window.document.querySelector('[data-square="b5"]').click();
  window.document.querySelector('[data-square="c7"]').click();
  assert.equal(window.document.getElementById('tactic-knowledge').hidden, false);
  assert.doesNotMatch(modal.textContent, /Le cavalier donne échec tout en attaquant la tour/);

  const choices = [...window.document.querySelectorAll('.tactic-choice')];
  const wrongChoice = choices.find(button => button.textContent.includes('Le roi et la dame'));
  const correctChoice = choices.find(button => button.textContent.includes('Le roi et la tour'));
  wrongChoice.click();
  assert.equal(window.document.getElementById('btn-done').disabled, true);
  assert.match(window.document.getElementById('tactic-feedback').textContent, /Indice 1/);
  correctChoice.click();
  assert.equal(window.document.getElementById('btn-done').disabled, false);
  assert.equal(window.document.getElementById('btn-done').style.display, 'inline-flex');
  assert.match(modal.textContent, /Le cavalier donne échec tout en attaquant la tour/);
  window.document.getElementById('btn-done').click();
  assert.deepEqual(JSON.parse(window.localStorage.getItem('supachess_tactics_v2')), ['knight-fork-A']);
  assert.equal(window.document.getElementById('stat-solved').textContent, '1');
  assert.deepEqual(JSON.parse(window.localStorage.getItem('chessnova_training_tactics')).completedCategories, []);
  await new Promise(resolve => setTimeout(resolve, 330));
  assert.match(window.document.getElementById('modal-inner').textContent, /Fourchette de cavalier · B/);
  dom.window.close();
});

test('black-to-move puzzles orient the board and accept the correct side', () => {
  const dom = new JSDOM(html, { url: 'https://supachess.test/TRAINING_TACTICS.html', runScripts: 'dangerously', beforeParse(window) { window.Chess = Chess; } });
  const { window } = dom;
  window.openPuzzle('knight-fork-C');
  window.document.querySelector('[data-square="b4"]').click();
  window.document.querySelector('[data-square="c2"]').click();
  assert.equal(window.document.getElementById('tactic-knowledge').hidden, false);
  dom.window.close();
});

test('wrong legal moves give a progressive hint, and replay keeps the original position', () => {
  const dom = new JSDOM(html, { url: 'https://supachess.test/TRAINING_TACTICS.html', runScripts: 'dangerously', beforeParse(window) { window.Chess = Chess; } });
  const { window } = dom;
  window.openPuzzle('knight-fork-A');
  const initialKnight = window.document.querySelector('[data-square="b5"]').textContent;
  window.document.querySelector('[data-square="b5"]').click();
  window.document.querySelector('[data-square="a7"]').click();
  assert.match(window.document.getElementById('tactic-feedback').textContent, /Indice 1/);
  assert.equal(window.document.querySelector('[data-square="b5"]').textContent, initialKnight);
  window.openPuzzle('knight-fork-A');
  assert.equal(window.document.querySelector('[data-square="b5"]').textContent, initialKnight);
  dom.window.close();
});

test('existing solved tactical themes synchronize to profile progress without replay rewards', () => {
  const existing = ['xray-A', 'xray-B', 'xray-C', 'xray-D'];
  const dom = new JSDOM(html, {
    url: 'https://supachess.test/TRAINING_TACTICS.html',
    runScripts: 'dangerously',
    beforeParse(window) {
      window.Chess = Chess;
      window.localStorage.setItem('supachess_tactics_v2', JSON.stringify(existing));
    }
  });
  const { window } = dom;
  const progress = JSON.parse(window.localStorage.getItem('chessnova_training_tactics'));
  assert.deepEqual(progress.completedCategories, ['xray']);
  assert.deepEqual(progress.solvedPuzzleIds, existing);
  assert.equal(progress.totalPuzzles, 158);
  assert.equal(window.document.getElementById('stat-solved').textContent, '4');
  dom.window.close();
});

test('closing the puzzle modal cancels a pending automatic advance', async () => {
  const dom = new JSDOM(html, { url: 'https://supachess.test/TRAINING_TACTICS.html', runScripts: 'dangerously', beforeParse(window) { window.Chess = Chess; } });
  const { window } = dom;
  window.openPuzzle('knight-fork-A');
  window.document.querySelector('[data-square="b5"]').click();
  window.document.querySelector('[data-square="c7"]').click();
  const correctChoice = [...window.document.querySelectorAll('.tactic-choice')].find(button => button.textContent.includes('Le roi et la tour'));
  correctChoice.click();
  window.document.getElementById('btn-done').click();
  window.closeModal();
  await new Promise(resolve => setTimeout(resolve, 330));
  assert.equal(window.document.getElementById('modal-bg').classList.contains('open'), false);
  dom.window.close();
});


test('puzzle discovery rankings sort solved puzzles by rating and players by highest rated puzzle', () => {
  const solvedIds = [puzzles[0].id, puzzles[1].id, puzzles[2].id];
  const dom = new JSDOM(html, {
    url: 'https://supachess.test/TRAINING_TACTICS.html',
    runScripts: 'dangerously',
    beforeParse(window) {
      window.Chess = Chess;
      window.localStorage.setItem('supachess_tactics_v2', JSON.stringify(solvedIds));
    }
  });
  const { window } = dom;
  const stats = window.getSupaPuzzleRankStats();
  const expectedSolved = puzzles.filter(puzzle => solvedIds.includes(puzzle.id));
  assert.equal(stats.puzzlesSolved, expectedSolved.length);
  assert.equal(stats.puzzleElo, Math.max(...expectedSolved.filter(puzzle => !puzzle.generated).map(puzzle => Number(puzzle.rating))));
  assert.match(html, /Top ranking · puzzles découverts par Elo/);
  assert.match(html, /Cette cote mesure la difficulté du puzzle, pas l’Elo FIDE du joueur/);
  assert.ok(window.document.getElementById('puzzle-discovered-ranking'));
  assert.ok(window.document.getElementById('puzzle-player-ranking'));

  const rankingSource = fs.readFileSync(path.join(__dirname, '../shared/puzzle-elo-ranking.js'), 'utf8');
  window.eval(rankingSource);
  window.SupaChessPuzzleEloRanking.renderPlayers([
    { displayName: 'B', puzzleElo: 2000, puzzlesSolved: 6 },
    { displayName: 'A & S', puzzleElo: 2200, puzzlesSolved: 3 },
    { displayName: 'C', puzzleElo: 2200, puzzlesSolved: 8 }
  ]);
  const rankingHtml = window.document.getElementById('puzzle-player-ranking').innerHTML;
  assert.ok(rankingHtml.indexOf('<strong>C</strong>') < rankingHtml.indexOf('<strong>A &amp; S</strong>'));
  assert.ok(rankingHtml.indexOf('<strong>A &amp; S</strong>') < rankingHtml.indexOf('<strong>B</strong>'));
  dom.window.close();
});


test('community puzzle records are scoped to the signed-in account and deduplicate solved puzzles', () => {
  const dom = new JSDOM('<div id="puzzle-elo-ranking"><div id="puzzle-discovered-ranking"></div><div id="puzzle-player-ranking"></div></div>', {
    url: 'https://supachess.test/TRAINING_TACTICS.html',
    runScripts: 'dangerously'
  });
  const { window } = dom;
  const rankingSource = fs.readFileSync(path.join(__dirname, '../shared/puzzle-elo-ranking.js'), 'utf8');
  window.eval(rankingSource);
  const ranking = window.SupaChessPuzzleEloRanking;

  ranking.recordAccountPuzzle('account-a', { id: 'puzzle-1', rating: 1800, estimated: false });
  ranking.recordAccountPuzzle('account-a', { id: 'puzzle-1', rating: 1800, estimated: false });
  ranking.recordAccountPuzzle('account-a', { id: 'generated-1', rating: 2500, estimated: true });
  assert.deepEqual(ranking.getAccountStats('account-a').puzzleIds, ['puzzle-1', 'generated-1']);
  assert.equal(ranking.getAccountStats('account-a').puzzlesSolved, 2);
  assert.equal(ranking.getAccountStats('account-a').puzzleElo, 1800);
  assert.deepEqual(ranking.getAccountStats('account-b').puzzleIds, []);
  assert.equal(ranking.getAccountStats('account-b').puzzleElo, 0);
  dom.window.close();
});

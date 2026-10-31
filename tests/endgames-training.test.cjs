'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { Chess } = require('chess.js');

const html = fs.readFileSync(path.join(__dirname, '../TRAINING_ENDGAMES.html'), 'utf8');
const endgamesMatch = html.match(/var ENDGAMES = (\[[\s\S]*?\n\s*\]);/);
const quizzesMatch = html.match(/var ENDGAME_QUIZZES = (\{[\s\S]*?\n\s*\});/);
assert.ok(endgamesMatch, 'endgame positions must be data-driven');
assert.ok(quizzesMatch, 'each endgame must have a knowledge check');
const endgames = new Function('return ' + endgamesMatch[1])();
const quizzes = new Function('return ' + quizzesMatch[1])();

test('the ten endgame positions and every accepted root move are legal', () => {
  assert.equal(endgames.length, 10);
  assert.deepEqual(Object.keys(quizzes).sort(), endgames.map(item => item.id).sort());
  for (const item of endgames) {
    const game = new Chess(item.fen);
    const legalSan = new Set(game.moves().map(san => san.replace(/[+#]/g, '')));
    assert.ok(item.keyMoves.length, item.id + ': at least one reference move');
    for (const san of item.keyMoves) assert.ok(legalSan.has(san.replace(/[+#]/g, '')), item.id + ': illegal reference move ' + san);
    assert.equal(quizzes[item.id].choices.filter(choice => choice.correct).length, 1, item.id);
  }
});

test('Philidor lesson is a black-to-move defensive setup with legal Rd6', () => {
  const philidor = endgames.find(item => item.id === 'philidor');
  const game = new Chess(philidor.fen);
  assert.equal(game.turn(), 'b');
  assert.equal(game.move('Rd6')?.san, 'Rd6');
  assert.match(philidor.description, /nulle/);
  assert.match(philidor.concept, /échecs par l’arrière/);
});

test('a reference move is not mastered until the endgame principle is explained', async () => {
  let lastBoardConfig;
  const dom = new JSDOM(html, {
    url: 'https://supachess.test/TRAINING_ENDGAMES.html',
    runScripts: 'dangerously',
    beforeParse(window) {
      window.Chess = Chess;
      window.$ = window.jQuery = function(selector) {
        return { on() { return this; }, resize() { return this; }, ready(fn) { fn(); return this; } };
      };
      window.Chessboard = function(id, config) {
        lastBoardConfig = config;
        return { destroy() {}, position() {}, orientation() {}, resize() {} };
      };
    }
  });
  const { window } = dom;
  window.selectEndgame(endgames.findIndex(item => item.id === 'philidor'));
  assert.equal(lastBoardConfig.orientation, 'black');
  assert.equal(lastBoardConfig.onDragStart('g6', 'bR'), true);
  assert.equal(lastBoardConfig.onDragStart('h1', 'wR'), false);
  lastBoardConfig.onDrop('g6', 'g7');
  assert.match(window.document.getElementById('feedback-area').textContent, /Indice 1/);
  await new Promise(resolve => setTimeout(resolve, 650));
  lastBoardConfig.onDrop('g6', 'd6');
  assert.equal(window.document.getElementById('endgame-quiz').hidden, false);
  assert.deepEqual(JSON.parse(window.localStorage.getItem('chessnova_training_endgames')).completed, []);
  const answer = quizzes.philidor.choices.find(choice => choice.correct).text;
  const buttons = [...window.document.querySelectorAll('#endgame-quiz button')];
  const correctButton = buttons.find(button => button.textContent === answer);
  assert.ok(correctButton);
  const wrongButton = buttons.find(button => button !== correctButton);
  wrongButton.click();
  assert.deepEqual(JSON.parse(window.localStorage.getItem('chessnova_training_endgames')).completed, []);
  assert.match(window.document.getElementById('endgame-quiz-feedback').textContent, /Indice/);
  correctButton.click();
  assert.deepEqual(JSON.parse(window.localStorage.getItem('chessnova_training_endgames')).completed, ['philidor']);
  assert.equal(window.document.getElementById('explanation-box').classList.contains('visible'), true);
  dom.window.close();
});

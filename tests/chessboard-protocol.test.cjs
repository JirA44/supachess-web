'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { Chess } = require('chess.js');

const source = fs.readFileSync(path.join(__dirname, '../shared/chessboard-protocol.js'), 'utf8');
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://example.test/', runScripts: 'outside-only' });
dom.window.Chess = Chess;
dom.window.eval(source);
const protocol = dom.window.SupaChessBoardProtocol;
const initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

test('position validator accepts a legal initial board and a verified study position', () => {
  assert.equal(protocol.validateFen(initial).valid, true);
  assert.equal(protocol.validateFen('b2r3r/k4p1p/p2q1np1/NppP4/3p1Q2/P4PPB/1PP4P/1K1RR3 w - - 1 24').valid, true);
});

test('position validator rejects malformed or impossible positions', () => {
  const rejected = [
    '8/8/8/8/8/8/8/8 w - - 0 1',
    '4k3/8/8/8/8/8/8/P3K3 w - - 0 1',
    '4k3/8/8/8/8/8/8/4K3 w K - 0 1',
    '8/8/8/8/8/8/4k3/4K3 w - - 0 1',
    '4k3/8/8/8/8/8/4R3/4K3 w - - 0 1'
  ];
  for (const fen of rejected) assert.equal(protocol.validateFen(fen).valid, false, fen);
});

test('variant validator accepts legal UCI and rejects illegal or incomplete lines', () => {
  const legal = protocol.validateLine(initial, ['e2e4', 'e7e5', 'g1f3']);
  assert.equal(legal.valid, true);
  assert.equal(legal.plies, 3);
  assert.equal(protocol.validateLine(initial, ['e2e5']).valid, false);
  assert.equal(protocol.validateLine(initial, []).valid, false);
});

test('common constructor publishes exactly 64 accessible squares only after validation', () => {
  const board = protocol.create(initial, { orientation: 'b', line: ['e2e4', 'e7e5'] });
  const squares = [...board.querySelectorAll('[data-square]')];
  assert.equal(squares.length, 64);
  assert.equal(new Set(squares.map(square => square.dataset.square)).size, 64);
  assert.ok(squares.every(square => square.tagName === 'BUTTON' && square.hasAttribute('aria-label')));
  assert.equal(board.dataset.supaBoardStatus, 'ready');
  assert.equal(board.dataset.supaBoardPhase, 'prêt');
  assert.equal(board.querySelector('[data-square="a1"]').style.gridColumn, '8');
  assert.throws(() => protocol.create('8/8/8/8/8/8/8/8 w - - 0 1'));
  assert.throws(() => protocol.create(initial, { line: ['e2e5'] }));
});

test('existing-board inspection rejects repeated square coordinates and broken piece assets', () => {
  const board = protocol.create(initial);
  board.getBoundingClientRect = () => ({ width: 512, height: 512 });
  const squares = [...board.querySelectorAll('[data-square]')];
  const originalSecondName = squares[1].dataset.square;
  squares[1].dataset.square = squares[0].dataset.square;
  assert.match(protocol.inspect(board, { allowUnmeasured: true }).errors.join(' '), /dupliquées/);
  squares[1].dataset.square = originalSecondName;
  const broken = dom.window.document.createElement('img');
  Object.defineProperty(broken, 'complete', { value: true });
  Object.defineProperty(broken, 'naturalWidth', { value: 0 });
  squares[0].appendChild(broken);
  assert.match(protocol.inspect(board, { allowUnmeasured: true }).errors.join(' '), /images de pièces/);
});

test.after(() => dom.window.close());

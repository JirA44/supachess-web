const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Chess } = require('chess.js');

const html = fs.readFileSync(path.join(__dirname, 'kasparov_immortal_1999.html'), 'utf8');
const inlineScript = [...html.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .find((script) => script.includes('const gameMoves'));
assert.ok(inlineScript, 'inline replay script exists');

function makeElement() {
  return {
    children: [], dataset: {}, className: '', hidden: false, textContent: '',
    classList: { add() {}, remove() {} },
    appendChild(child) { this.children.push(child); return child; },
    scrollIntoView() {},
    set innerHTML(value) { this._innerHTML = value; if (value === '') this.children = []; },
    get innerHTML() { return this._innerHTML || ''; },
  };
}

function loadReplay(script) {
  const ids = new Map(['chessboard', 'movesList', 'moveInfo', 'moveError'].map((id) => [id, makeElement()]));
  const document = {
    getElementById(id) { return ids.get(id); },
    createElement() { return makeElement(); },
    querySelectorAll(selector) { return selector === '.move-item' ? ids.get('movesList').children : []; },
    addEventListener() {},
  };
  const context = vm.createContext({ Chess, document, console });
  vm.runInContext(script, context, { timeout: 1000 });
  return { context, ids };
}

const moves = [...html.matchAll(/\{\s*move:\s*'([^']+)'/g)].map((match) => match[1]);
const chess = new Chess();
for (let index = 0; index < moves.length; index += 1) {
  const applied = chess.move(moves[index], { sloppy: true });
  assert.ok(applied, `legal move ${Math.floor(index / 2) + 1}${index % 2 ? '...' : '.'}${moves[index]}`);
}
assert.equal(moves.length, 59, 'the replay contains 59 plies');
assert.equal(moves.at(-1), 'Rxb7');
assert.match(html, /Nombre de coups<\/div>\s*<div class="stat-value">30<\/div>/);

const replay = loadReplay(inlineScript);
vm.runInContext('goToEnd()', replay.context, { timeout: 1000 });
assert.equal(vm.runInContext('currentMoveIndex', replay.context), 58);
vm.runInContext('previousMove()', replay.context, { timeout: 1000 });
assert.equal(vm.runInContext('currentMoveIndex', replay.context), 57);
vm.runInContext('goToStart(); nextMove(); nextMove(); goToMove(20)', replay.context, { timeout: 1000 });
assert.equal(vm.runInContext('currentMoveIndex', replay.context), 20);

const corrupted = inlineScript.replace("move: 'd6', comment:", "move: 'illegal', comment:");
assert.notEqual(corrupted, inlineScript, 'corruption fixture changed a move');
const brokenReplay = loadReplay(corrupted);
vm.runInContext('nextMove(); nextMove()', brokenReplay.context, { timeout: 1000 });
assert.equal(vm.runInContext('currentMoveIndex', brokenReplay.context), 0, 'illegal move does not advance the ply');
assert.match(brokenReplay.ids.get('moveError').textContent, /coup illégal 1 \(Noirs\).*illegal/);
vm.runInContext('goToEnd()', brokenReplay.context, { timeout: 1000 });
assert.equal(vm.runInContext('currentMoveIndex', brokenReplay.context), 0, 'end navigation stops at the first illegal move');

console.log('PASS: 59 legal plies; counter=30; end/previous/start/next/jump navigation; illegal SAN stops without desynchronizing or looping.');

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const bubbles = readFileSync('supa-move-bubbles.js', 'utf8');
const dots = readFileSync('supa-dots-widget.js', 'utf8');
const chessnova = readFileSync('CHESSNOVA.html', 'utf8');

assert.match(bubbles, /\.toFixed\(1\);/, 'bubble ratings keep one decimal');
assert.match(bubbles, /textContent = payload\.eval/, 'bubble renders the position evaluation');
assert.match(bubbles, /if \(payload\.eval\) el\.appendChild\(evalLine\)/, 'evaluation is placed below the rating');
assert.doesNotMatch(bubbles, /payload\.score\s*\+\s*['"]\/10/, 'bubble label does not append /10');
assert.match(dots, /attachClickHandler\(\);\s*setActive\(true\);\s*initSF\(\);/, 'dots are enabled when the board widget starts');
assert.match(chessnova, /frame-src 'self' https:\/\/chessnova\.firebaseapp\.com https:\/\/accounts\.google\.com/, 'Firebase auth frames are allowed by the page CSP');
assert.match(chessnova, /\$\{Number\(rating\)\.toFixed\(1\)\}/, 'move grades show one decimal and omit /10');
assert.match(chessnova, /Évaluation : \$\{\(afterEval \/ 100\)\.toFixed\(2\)\}/, 'move analysis shows a two-decimal evaluation');
assert.match(chessnova, /auth\/unauthorized-domain/, 'Google auth gives actionable domain guidance');
assert.match(chessnova, /supa-move-bubbles\.js\?v=20261026a/, 'bubble script URL is cache-busted');
assert.match(chessnova, /window\.gameHistory\.push\(/, 'analyzed game history remains stored');
assert.match(chessnova, /<strong id="eval-value" aria-live="polite"[^>]*>\+0\.0<\/strong>/, 'evaluation starts visible beside the bar title');
assert.match(chessnova, /const signedEvalDisplay = \(evaluation >= 0 \? '\+' : ''\) \+ \(evaluation \/ 100\)\.toFixed\(1\);/, 'the visible bar score updates continuously with a sign and one decimal');
assert.match(chessnova, /evalValue\.textContent = signedEvalDisplay;/, 'each evaluation refresh updates the persistent bar score');

console.log('Chess display checks passed');

function collectHtmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(filePath);
    return entry.isFile() && entry.name.endsWith('.html') ? [filePath] : [];
  });
}

const boardMarkers = /(?:chess-piece|white-piece|black-piece|piece-token|data-square|class=["'][^"']*(?:board|square|chessboard))/i;
const boardPages = collectHtmlFiles('.').filter(file => boardMarkers.test(readFileSync(file, 'utf8')));
for (const file of boardPages) {
  assert.match(readFileSync(file, 'utf8'), /shared\/site-global\.js/, `${file} loads the shared piece-contrast and board audit`);
}
assert.ok(boardPages.length > 0, 'site-wide board audit finds chessboard pages');
assert.match(readFileSync('shared/site-global.js', 'utf8'), /normalizeChessGlyphs\(document\);\s*ensureBoardRanks\(document\)/, 'initially rendered pieces receive contrast styles');
assert.match(readFileSync('shared/site-global.js', 'utf8'), /replace\(\/\[\\uFE0E\\uFE0F\]\/g, ''\)/, 'piece normalizer strips Unicode variation selectors before applying filled glyphs');
console.log(`Site-wide chessboard contrast audit passed (${boardPages.length} board pages)`);

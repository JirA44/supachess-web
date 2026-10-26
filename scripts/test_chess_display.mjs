import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

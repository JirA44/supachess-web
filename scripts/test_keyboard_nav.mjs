import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const community = readFileSync(join(root, 'shared', 'community.js'), 'utf8');

let pass = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) pass++;
  else failures.push(`${name}: ${detail}`);
}

/** Loads community.js in a page that exposes the given move functions. */
function harness(defs) {
  const dom = new JSDOM('<!DOCTYPE html><body></body>', { runScripts: 'outside-only' });
  const { window } = dom;
  window.firebase = undefined;
  // community.js logs a Firebase error when the SDK is absent; that is fine.
  for (const [name, impl] of Object.entries(defs)) {
    window[name] = impl;
  }
  window.eval(community);
  // community.js defers init() to DOMContentLoaded when the document is
  // still parsing, which is the case for a freshly built jsdom document.
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return window;
}

function press(window, key, targetTag) {
  const target = targetTag
    ? window.document.createElement(targetTag)
    : window.document.body;
  if (targetTag) window.document.body.appendChild(target);
  const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

console.log('--- community.js keyboard navigation ---');

// 1. Canonical nextMove/previousMove naming
{
  let cur = 0;
  const w = harness({
    nextMove: () => { cur++; },
    previousMove: () => { cur--; },
    goToStart: () => { cur = 0; },
    goToEnd: () => { cur = 99; }
  });

  press(w, 'ArrowRight'); check('ArrowRight advances', cur === 1, `cur=${cur}`);
  press(w, 'ArrowRight'); check('ArrowRight advances twice', cur === 2, `cur=${cur}`);
  press(w, 'ArrowLeft'); check('ArrowLeft rewinds', cur === 1, `cur=${cur}`);
  press(w, 'End'); check('End jumps to last move', cur === 99, `cur=${cur}`);
  press(w, 'Home'); check('Home jumps to start', cur === 0, `cur=${cur}`);
}

// 2. goBack/goForward alias, used by CHESS_COACH.html
{
  let cur = 0;
  const w = harness({ goForward: () => { cur++; }, goBack: () => { cur--; } });
  press(w, 'ArrowRight'); check('goForward alias', cur === 1, `cur=${cur}`);
  press(w, 'ArrowLeft'); check('goBack alias', cur === 0, `cur=${cur}`);
}

// 3. prevMove alias, used by TRAINING_OPENINGS.html
{
  let cur = 5;
  const w = harness({ nextMove: () => { cur++; }, prevMove: () => { cur--; } });
  press(w, 'ArrowLeft'); check('prevMove alias', cur === 4, `cur=${cur}`);
}

// 4. Does not hijack typing
{
  let calls = 0;
  const w = harness({ nextMove: () => { calls++; }, previousMove: () => { calls++; } });
  press(w, 'ArrowRight', 'INPUT');
  press(w, 'ArrowRight', 'TEXTAREA');
  press(w, 'ArrowRight', 'SELECT');
  check('typing targets ignored', calls === 0, `calls=${calls}`);
}

// 5. Does not fire with modifier keys held
{
  let calls = 0;
  const w = harness({ nextMove: () => { calls++; } });
  for (const mod of ['ctrlKey', 'altKey', 'metaKey']) {
    const ev = new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(ev, mod, { value: true });
    w.document.body.dispatchEvent(ev);
  }
  check('modifier combos ignored', calls === 0, `calls=${calls}`);
}

// 6. preventDefault only when a handler actually ran
{
  const w = harness({ nextMove: () => {} });
  const handled = press(w, 'ArrowRight');
  check('preventDefault on handled key', handled.defaultPrevented === true);

  const w2 = harness({ nextMove: () => {} });
  const unhandled = press(w2, 'q');
  check('no preventDefault on other keys', unhandled.defaultPrevented === false);
}

// 7. No handler at all -> page untouched, no error
{
  const w = harness({});
  let threw = false;
  try {
    press(w, 'ArrowRight');
    press(w, 'ArrowLeft');
  } catch (e) {
    threw = true;
  }
  check('page without nav functions does not throw', !threw, 'threw');
}

// 8. Not bound twice if community.js somehow runs again
{
  let calls = 0;
  const w = harness({ nextMove: () => { calls++; } });
  w.eval(community);
  press(w, 'ArrowRight');
  check('single binding per page', calls === 1, `calls=${calls}`);
}

console.log('--- TRAINING_OPENINGS.html inline handler ---');
{
  // Its nav lives in the page itself and guards on an open opening.
  const html = readFileSync(join(root, 'TRAINING_OPENINGS.html'), 'utf8');
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  const code = blocks[blocks.length - 1][1];
  check('has ArrowLeft handler', code.includes("'ArrowLeft'"), 'missing');
  check('has ArrowRight handler', code.includes("'ArrowRight'"), 'missing');
  check('guards on currentOpening', code.includes('if (!currentOpening) return'), 'missing guard');
  check('handles Escape', code.includes("'Escape'"), 'missing');
}

console.log('--- coverage across game pages ---');
{
  const files = readdirSync(root).filter(f => f.endsWith('.html'));
  const missing = [];
  for (const f of files) {
    const src = readFileSync(join(root, f), 'utf8');
    const hasNavFn = /function (nextMove|prevMove|previousMove)\s*\(/.test(src);
    if (!hasNavFn) continue;
    const loadsCommunity = src.includes('shared/community.js');
    const hasInline = src.includes('ArrowLeft');
    if (!loadsCommunity && !hasInline) missing.push(f);
  }
  check(
    'every page with move functions has keyboard nav',
    missing.length === 0,
    `missing: ${missing.join(', ')}`
  );
}

console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log('  FAIL ' + f);
  process.exit(1);
}


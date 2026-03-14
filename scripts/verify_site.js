#!/usr/bin/env node
/**
 * verify_site.js — SupaChess HTML static analysis tool
 *
 * Checks all *.html files at the root of chessnova/ (non-recursive) for:
 *   1. Undefined function calls (onclick="foo()" where foo is not defined)
 *   2. Missing DOM elements (getElementById('x') where id="x" not present)
 *   3. PGN validity (pgn: `...` template literals must have blank line between headers and moves)
 *   4. Null reference risks (.position(, .flip(, .resize(, evalChart. without null check)
 *   5. load_pgn without result check
 *
 * Usage:
 *   node scripts/verify_site.js            — checks all HTML files at root
 *   node scripts/verify_site.js --focus    — only CHESS_COACH.html + HUMAN_TRAINING_STANDALONE.html
 *   node scripts/verify_site.js <file.html> — check a specific file
 *
 * No npm installs needed — uses only fs, path.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

const PRIORITY_FILES = [
  'CHESS_COACH.html',
  'HUMAN_TRAINING_STANDALONE.html',
];

// Patterns that indicate a preceding null guard on nearby lines
const NULL_GUARD_PATTERNS = [
  /if\s*\(\s*!?\s*\w+\s*\)/,        // if (x) or if (!x)
  /if\s*\(\s*!?\s*\w+\s*&&/,        // if (!x && ...)
  /&&\s*\w+\./,
  /\?\./,                            // optional chaining
  /!==?\s*null/,
  /!==?\s*undefined/,
  /typeof\s+\w+\s*!==?\s*['"]undefined['"]/,
  /if\s*\(\s*!?\w+\s*(&&|\|\|)/,    // if (!x || ...) / if (!x && ...)
];

// DOM accessor calls we consider "risky" if the object might be null
const RISKY_METHOD_PATTERNS = [
  /\.\s*position\s*\(/,
  /\.\s*flip\s*\(/,
  /\.\s*resize\s*\(/,
  /evalChart\s*\./,
  // NOTE: stockfish.postMessage inside onmessage callback is always safe (faux positif connu)
  // /stockfish\s*\.\s*postMessage/,
  /board\s*\.\s*position/,
  /board\s*\.\s*flip/,
];

// Lines matching these patterns are safe to skip (false positives)
const RISKY_LINE_SKIP = [
  /['"`]https?:\/\//,   // URL string — contains .js but not a call
  /\/\//,               // comment line (checked earlier but belt+suspenders)
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function readLines(filePath) {
  return fs.readFileSync(filePath, 'utf8').split('\n');
}

/** Return all lines as a single string (for multi-line regex) */
function readFull(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/** Collect all function definitions in the file (function name(...) and var/const/let name = function/arrow) */
function extractDefinedFunctions(content) {
  const defined = new Set();
  const patterns = [
    /function\s+(\w+)\s*\(/g,
    /(?:var|let|const)\s+(\w+)\s*=\s*(?:function|\()/g,
    /(\w+)\s*:\s*function\s*\(/g,         // object method shorthand
    /(\w+)\s*=\s*\(.*?\)\s*=>/g,          // arrow assigned to name
    /(\w+)\s*=\s*async\s+(?:function|\()/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content)) !== null) {
      defined.add(m[1]);
    }
  }
  return defined;
}

/** Collect all onclick / onchange / oninput / onkeydown handler calls */
function extractOnHandlerCalls(content) {
  const calls = [];
  // onclick="foo()", onchange="bar(arg)", etc.
  const re = /\bon\w+\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    // extract function names from the handler string
    const handler = m[1];
    const fnRe = /(\w+)\s*\(/g;
    let fm;
    while ((fm = fnRe.exec(handler)) !== null) {
      // skip built-ins / JS keywords
      const name = fm[1];
      if (!isJSBuiltin(name)) {
        calls.push({ name, context: m[0] });
      }
    }
  }
  // also <button ... onclick> style already captured above
  // JS-side: addEventListener not checked (too hard without a full parser)
  return calls;
}

/** Also find direct JS calls like: someFunction() that aren't preceded by a dot (not method calls) */
function extractDirectJSCalls(lines) {
  const calls = [];
  lines.forEach((line, i) => {
    // skip comment lines
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    // match bare function calls: word( — not preceded by . or new keyword or function def
    const re = /(?<![.\w])(\b[a-zA-Z_]\w+)\s*\(/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const name = m[1];
      if (!isJSBuiltin(name) && !isCommonKeyword(name)) {
        calls.push({ name, line: i + 1, context: line.trim() });
      }
    }
  });
  return calls;
}

function isJSBuiltin(name) {
  const builtins = new Set([
    'function','if','for','while','switch','catch','return','typeof','instanceof',
    'new','delete','void','throw','try','else','do','in','of','async','await',
    'console','Math','JSON','Object','Array','String','Number','Boolean','Date',
    'Promise','Set','Map','Error','setTimeout','setInterval','clearTimeout',
    'clearInterval','fetch','parseInt','parseFloat','isNaN','isFinite','encodeURI',
    'decodeURI','encodeURIComponent','decodeURIComponent','eval','alert','confirm',
    'prompt','document','window','navigator','location','history','localStorage',
    'sessionStorage','XMLHttpRequest','WebSocket','Worker','Proxy','Reflect',
    'Symbol','BigInt','WeakMap','WeakSet','RegExp','Blob','File','FileReader',
    'URL','URLSearchParams','FormData','Headers','Request','Response','Event',
    'CustomEvent','MouseEvent','KeyboardEvent','TouchEvent','MutationObserver',
    'IntersectionObserver','ResizeObserver','performance','crypto','require',
    'module','exports','process','Buffer','__dirname','__filename',
    // chess-specific common globals
    'Chess','Chessboard','Stockfish','ChessBoard',
    // common lib functions
    'jQuery','$','_','Swal','Chart','marked','hljs','Prism',
    // array / string methods that look like function calls
    'push','pop','shift','unshift','splice','slice','concat','join','map',
    'filter','reduce','forEach','find','findIndex','some','every','includes',
    'indexOf','lastIndexOf','keys','values','entries','assign','freeze',
    'create','defineProperty','getOwnPropertyNames','hasOwnProperty',
    'toString','valueOf','call','apply','bind','then','catch','finally',
    'resolve','reject','all','race','allSettled','any',
    // DOM
    'getElementById','getElementsByClassName','getElementsByTagName',
    'querySelector','querySelectorAll','addEventListener','removeEventListener',
    'dispatchEvent','getAttribute','setAttribute','removeAttribute',
    'appendChild','removeChild','insertBefore','replaceChild','cloneNode',
    'contains','closest','matches','scrollIntoView','focus','blur','click',
    'preventDefault','stopPropagation','getBoundingClientRect',
    'requestAnimationFrame','cancelAnimationFrame','getComputedStyle',
    'postMessage','importScripts','terminate',
    // misc
    // browser clipboard / print / DOM built-in methods
    'writeText','readText','write','print','open','close','focus','blur','remove',
    'append','prepend','before','after','replaceWith','insertAdjacentHTML',
    'log','warn','error','info','debug','dir','table','group','groupEnd',
    'time','timeEnd','assert','trace','clear','count',
    'abs','ceil','floor','round','max','min','pow','sqrt','random',
    'parse','stringify','now','getTime','toISOString','toLocaleDateString',
    'split','trim','replace','replaceAll','match','search','startsWith',
    'endsWith','padStart','padEnd','repeat','charAt','charCodeAt','fromCharCode',
    'toUpperCase','toLowerCase','substring','substr',
    // constructor-like (usually called with new, but can appear bare)
    'Array','Object','Map','Set','WeakMap','WeakSet','Promise','Error',
    'TypeError','RangeError','ReferenceError','SyntaxError',
    'Int8Array','Uint8Array','Float32Array','Float64Array',
  ]);
  return builtins.has(name);
}

function isCommonKeyword(name) {
  // very short identifiers likely to be loop vars / params
  return name.length <= 2;
}

/** Extract all id="..." values from the HTML */
function extractDefinedIds(content) {
  const ids = new Set();
  const re = /\bid\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    ids.add(m[1]);
  }
  return ids;
}

/** Extract all getElementById / querySelector('#...') calls */
function extractIdLookups(lines) {
  const lookups = [];
  lines.forEach((line, i) => {
    // getElementById('foo') or getElementById("foo")
    const re1 = /getElementById\s*\(\s*["']([^"']+)["']\s*\)/g;
    let m;
    while ((m = re1.exec(line)) !== null) {
      lookups.push({ id: m[1], line: i + 1, method: 'getElementById' });
    }
    // querySelector('#foo')
    const re2 = /querySelector\s*\(\s*["']#([^"']+)["']\s*\)/g;
    while ((m = re2.exec(line)) !== null) {
      lookups.push({ id: m[1], line: i + 1, method: 'querySelector' });
    }
  });
  return lookups;
}

/**
 * PGN check: find all pgn: `...` template literal blocks
 * Each must have a blank line between the last header (e.g. [Result "*"]) and the first move (1. e4 ...)
 */
function checkPGNBlocks(content, filePath) {
  const issues = [];
  // match pgn: `...` (possibly multiline)
  const re = /pgn\s*:\s*`([\s\S]*?)`/g;
  let m;
  let blockIndex = 0;
  while ((m = re.exec(content)) !== null) {
    blockIndex++;
    const pgn = m[1];
    const lines = pgn.split('\n');

    // Find the last header line index
    let lastHeaderIdx = -1;
    let firstMoveIdx  = -1;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l.startsWith('[') && l.endsWith(']')) {
        lastHeaderIdx = i;
      } else if (l.match(/^\d+\./)) {
        if (firstMoveIdx === -1) firstMoveIdx = i;
      }
    }

    if (lastHeaderIdx === -1 && firstMoveIdx === -1) continue; // empty / not a real PGN

    if (lastHeaderIdx !== -1 && firstMoveIdx !== -1) {
      // There should be at least one blank line between lastHeaderIdx and firstMoveIdx
      const between = lines.slice(lastHeaderIdx + 1, firstMoveIdx);
      const hasBlank = between.some(l => l.trim() === '');
      if (!hasBlank) {
        // find approximate line number in the original file
        const approxLine = content.substring(0, m.index).split('\n').length;
        issues.push({
          line: approxLine,
          msg: `PGN block #${blockIndex}: missing blank line between headers and moves (last header idx=${lastHeaderIdx}, first move idx=${firstMoveIdx})`
        });
      }
    }
  }
  return issues;
}

/** Check for risky method calls without preceding null guard within a window of N lines */
function checkNullRefRisks(lines) {
  const issues = [];
  const WINDOW = 15; // look back this many lines for a guard

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    // Skip lines that are clearly false positives (URL strings, etc.)
    if (RISKY_LINE_SKIP.some(p => p.test(line))) return;

    for (const pattern of RISKY_METHOD_PATTERNS) {
      if (pattern.test(line)) {
        // Check preceding WINDOW lines + same line for any null guard
        const start  = Math.max(0, i - WINDOW);
        const ctx = lines.slice(start, i + 1).join('\n');
        const hasGuard = NULL_GUARD_PATTERNS.some(gp => gp.test(ctx));
        // optional chaining on the same line is its own guard
        const hasOptionalChain = /\?\.\s*(position|flip|resize|postMessage)/.test(line);
        if (!hasGuard && !hasOptionalChain) {
          issues.push({
            line: i + 1,
            msg: `Potential null-ref: "${line.trim().substring(0, 80)}" — no null check in preceding ${WINDOW} lines`
          });
        }
        break; // one issue per line is enough
      }
    }
  });
  return issues;
}

/** Check for game.load_pgn( not followed by a result check */
function checkLoadPGN(lines) {
  const issues = [];
  lines.forEach((line, i) => {
    if (/game\s*\.\s*load_pgn\s*\(/.test(line) || /\.load_pgn\s*\(/.test(line)) {
      // Look at this line and next 6 lines for an if/check
      const next = lines.slice(i, Math.min(lines.length, i + 6)).join(' ');
      const hasCheck = /if\s*\(|===?\s*false|===?\s*true|!\s*\w+|result\s*=|success\s*[=!]|ok\s*[=!]|load/.test(next);
      if (!hasCheck) {
        issues.push({
          line: i + 1,
          msg: `load_pgn() called without result check near line ${i + 1}: "${line.trim().substring(0, 80)}"`
        });
      }
    }
  });
  return issues;
}

// ─── Main analysis ─────────────────────────────────────────────────────────

function analyzeFile(filePath) {
  const filename = path.basename(filePath);
  const issues   = [];

  let content, lines;
  try {
    content = readFull(filePath);
    lines   = content.split('\n');
  } catch (e) {
    return { filename, error: e.message, issues: [] };
  }

  // ── 1. Undefined function calls ─────────────────────────────────────────
  const defined   = extractDefinedFunctions(content);
  const onCalls   = extractOnHandlerCalls(content);

  for (const call of onCalls) {
    if (!defined.has(call.name)) {
      // Try to find the line number
      const lineIdx = lines.findIndex(l => l.includes(call.context.substring(0, 30)));
      issues.push({
        category: 'UNDEFINED_FUNCTION',
        line: lineIdx + 1,
        msg: `onclick/handler calls "${call.name}()" but function not defined in file`,
      });
    }
  }

  // ── 2. Missing DOM elements ──────────────────────────────────────────────
  const definedIds = extractDefinedIds(content);
  const idLookups  = extractIdLookups(lines);

  for (const lookup of idLookups) {
    if (!definedIds.has(lookup.id)) {
      issues.push({
        category: 'MISSING_DOM_ID',
        line: lookup.line,
        msg: `${lookup.method}("${lookup.id}") — id="${lookup.id}" not found in HTML`,
      });
    }
  }

  // ── 3. PGN validity ──────────────────────────────────────────────────────
  const pgnIssues = checkPGNBlocks(content, filePath);
  for (const p of pgnIssues) {
    issues.push({ category: 'PGN_INVALID', line: p.line, msg: p.msg });
  }

  // ── 4. Null ref risks ────────────────────────────────────────────────────
  const nullIssues = checkNullRefRisks(lines);
  for (const n of nullIssues) {
    issues.push({ category: 'NULL_REF_RISK', line: n.line, msg: n.msg });
  }

  // ── 5. load_pgn without check ────────────────────────────────────────────
  const loadPgnIssues = checkLoadPGN(lines);
  for (const l of loadPgnIssues) {
    issues.push({ category: 'LOAD_PGN_NO_CHECK', line: l.line, msg: l.msg });
  }

  return { filename, filePath, issues };
}

// ─── Report ────────────────────────────────────────────────────────────────

function printReport(results) {
  const RESET  = '\x1b[0m';
  const GREEN  = '\x1b[32m';
  const RED    = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const CYAN   = '\x1b[36m';
  const BOLD   = '\x1b[1m';
  const DIM    = '\x1b[2m';

  const categoryColors = {
    UNDEFINED_FUNCTION: RED,
    MISSING_DOM_ID:     RED,
    PGN_INVALID:        YELLOW,
    NULL_REF_RISK:      YELLOW,
    LOAD_PGN_NO_CHECK:  YELLOW,
  };

  let totalIssues = 0;
  let filesWithIssues = 0;

  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║        SupaChess — Static HTML Analysis Report           ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${RESET}\n`);
  console.log(`${DIM}Checked ${results.length} file(s) — ${new Date().toISOString()}${RESET}\n`);

  for (const r of results) {
    if (r.error) {
      console.log(`${RED}✗ ${r.filename}${RESET} — ERROR: ${r.error}`);
      continue;
    }

    if (r.issues.length === 0) {
      console.log(`${GREEN}✅ ${r.filename}${RESET} — PASS (no issues found)`);
    } else {
      filesWithIssues++;
      totalIssues += r.issues.length;
      console.log(`${RED}❌ ${r.filename}${RESET} — ${r.issues.length} issue(s):`);

      // Group by category
      const byCategory = {};
      for (const issue of r.issues) {
        if (!byCategory[issue.category]) byCategory[issue.category] = [];
        byCategory[issue.category].push(issue);
      }

      for (const [cat, catIssues] of Object.entries(byCategory)) {
        const color = categoryColors[cat] || YELLOW;
        console.log(`  ${color}[${cat}]${RESET} (${catIssues.length})`);
        for (const issue of catIssues) {
          const lineStr = issue.line ? `L${issue.line}` : '   ';
          console.log(`    ${DIM}${lineStr.padEnd(6)}${RESET} ${issue.msg}`);
        }
      }
      console.log();
    }
  }

  console.log(`\n${BOLD}────────────────────────────────────────────────────────────${RESET}`);
  if (totalIssues === 0) {
    console.log(`${GREEN}${BOLD}All files PASSED — 0 issues found.${RESET}`);
  } else {
    console.log(`${RED}${BOLD}${totalIssues} issue(s) across ${filesWithIssues}/${results.length} file(s).${RESET}`);
  }
  console.log();
}

// ─── Entry point ───────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  let targetFiles = [];

  if (args.includes('--focus')) {
    // Only the two priority files
    targetFiles = PRIORITY_FILES.map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f));
    if (targetFiles.length === 0) {
      console.error('Priority files not found in', ROOT);
      process.exit(1);
    }
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    // Specific file(s) provided
    targetFiles = args.map(f => path.isAbsolute(f) ? f : path.join(ROOT, f));
  } else {
    // All *.html at root level (non-recursive)
    targetFiles = fs.readdirSync(ROOT)
      .filter(f => f.endsWith('.html'))
      .map(f => path.join(ROOT, f))
      .sort();
  }

  console.log(`Scanning ${targetFiles.length} HTML file(s)...`);

  const results = targetFiles.map(fp => analyzeFile(fp));

  printReport(results);

  // Exit with non-zero if any errors found (useful for CI)
  const hasErrors = results.some(r => r.issues && r.issues.some(i =>
    i.category === 'UNDEFINED_FUNCTION' || i.category === 'MISSING_DOM_ID'
  ));
  process.exit(hasErrors ? 1 : 0);
}

main();

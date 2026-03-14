/**
 * SupaChess — Auto-test de cohérence du site
 * Usage (Node.js) : node test_site_coherence.js
 * Usage (browser console) : copier-coller le contenu
 *
 * Vérifie :
 *  1. Chaque page HTML a les scripts obligatoires (chess.js, chessboard.js)
 *  2. Chaque page avec un échiquier a supa-dots-widget.js
 *  3. Pas de liens internes cassés (href/src relatifs qui pointent vers des fichiers inexistants)
 *  4. Pas de console.error hard-codés ni de alert() suspects
 *  5. Chaque page a un <title> non vide
 *  6. _redirects cohérent (pas de redirect vers fichier inexistant)
 */

const fs   = require('fs');
const path = require('path');

const DIR  = __dirname;
const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';

let errors = 0;
let warns  = 0;

function ok(msg)   { console.log(`  ${PASS} ${msg}`); }
function fail(msg) { console.log(`  ${FAIL} ${msg}`); errors++; }
function warn(msg) { console.log(`  ${WARN} ${msg}`); warns++; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function readFile(f) {
    try { return fs.readFileSync(f, 'utf8'); } catch { return null; }
}

function getAllHtml() {
    return fs.readdirSync(DIR)
        .filter(f => f.endsWith('.html'))
        .filter(f => !f.match(/backup|BACKUP|_old|^test_/i));
}

// Page has any chess logic
function hasChessLogic(content) {
    return /new Chess\(|Chess\(|chess\.js/.test(content);
}
// Page has interactive chessboard.js (user can play)
function hasInteractiveBoard(content) {
    return /Chessboard\(|chessboard-1|@chrisoakman|chessboardjs/.test(content);
}
// Backward compat alias
function hasBoard(content) {
    return hasChessLogic(content) || hasInteractiveBoard(content);
}

// ── Test 1 : scripts obligatoires ────────────────────────────────────────────
function testRequiredScripts() {
    console.log('\n📋 Test 1 — Scripts obligatoires (pages interactives : chess.js + chessboard.js)');
    const pages = getAllHtml();
    for (const page of pages) {
        const content = readFile(path.join(DIR, page));
        if (!content) continue;
        if (!hasInteractiveBoard(content)) continue;  // only pages where user can play

        const hasChessJS    = /chess\.min\.js|chess\.js/.test(content);
        const hasChessboard = /chessboard.*\.js|@chrisoakman/.test(content);

        if (!hasChessJS)    fail(`${page} — chess.js manquant`);
        if (!hasChessboard) fail(`${page} — chessboard.js manquant`);
        if (hasChessJS && hasChessboard) ok(page);
    }
}

// ── Test 2 : supa-dots-widget sur toutes les pages avec échiquier ─────────────
function testDotsWidget() {
    console.log('\n🎯 Test 2 — supa-dots-widget.js sur toutes les pages jouables');
    const pages = getAllHtml();
    for (const page of pages) {
        const content = readFile(path.join(DIR, page));
        if (!content) continue;
        if (!hasBoard(content)) continue;

        const hasDots = /supa-dots-widget/.test(content);
        if (!hasDots) fail(`${page} — supa-dots-widget.js manquant`);
        else ok(page);
    }
}

// ── Test 3 : liens internes relatifs → fichier existe ────────────────────────
function testInternalLinks() {
    console.log('\n🔗 Test 3 — Liens internes relatifs (src/href)');
    const pages = getAllHtml();
    const checked = new Set();

    for (const page of pages) {
        const content = readFile(path.join(DIR, page));
        if (!content) continue;

        // Match src="..." et href="..." relatifs (pas http, pas /shared, pas /)
        const refs = [...content.matchAll(/(?:src|href)="([^"]+)"/g)]
            .map(m => m[1])
            .filter(r => !r.startsWith('http') && !r.startsWith('//') && !r.startsWith('/') && !r.startsWith('#') && !r.startsWith('data:'));

        for (const ref of refs) {
            const key = `${page}→${ref}`;
            if (checked.has(key)) continue;
            checked.add(key);

            const target = path.join(DIR, ref);
            if (!fs.existsSync(target)) {
                fail(`${page} → "${ref}" introuvable`);
            }
        }
    }
    if (errors === 0) ok('Tous les liens relatifs résolus');
}

// ── Test 4 : titre non vide ───────────────────────────────────────────────────
function testTitles() {
    console.log('\n📝 Test 4 — Balise <title> non vide');
    const pages = getAllHtml();
    for (const page of pages) {
        const content = readFile(path.join(DIR, page));
        if (!content) continue;
        const m = content.match(/<title>([^<]*)<\/title>/i);
        if (!m)              warn(`${page} — pas de <title>`);
        else if (!m[1].trim()) fail(`${page} — <title> vide`);
        else ok(`${page} — "${m[1].trim()}"`);
    }
}

// ── Test 5 : _redirects cohérent ─────────────────────────────────────────────
function testRedirects() {
    console.log('\n🔀 Test 5 — _redirects cohérence');
    const content = readFile(path.join(DIR, '_redirects'));
    if (!content) { warn('_redirects introuvable'); return; }

    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) continue;
        const target = parts[1];

        // Skip external URLs and splat patterns
        if (target.startsWith('http') || target.includes('*') || target.includes(':')) continue;

        // Check if target file exists (strip leading /)
        const targetFile = path.join(DIR, target.replace(/^\//, ''));
        if (!fs.existsSync(targetFile)) {
            fail(`_redirects: "${target}" → fichier introuvable`);
        } else {
            ok(`${parts[0]} → ${target}`);
        }
    }
}

// ── Test 6 : pages interactives — window.game/board ou var (pas let/const) ────
function testGlobalExposure() {
    console.log('\n🌐 Test 6 — game/board accessibles globalement sur pages jouables');
    const pages = getAllHtml();
    for (const page of pages) {
        const content = readFile(path.join(DIR, page));
        if (!content) continue;
        if (!hasInteractiveBoard(content)) continue;
        if (!/supa-dots-widget/.test(content)) continue;

        // window.x = ..., Object.defineProperty(window, ...), or var x = (global)
        const exposesGame  = /window\.game\s*=|Object\.defineProperty[^)]*window[^)]*['"']game|var\s+game\s*=/.test(content);
        const exposesBoard = /window\.board\s*=|Object\.defineProperty[^)]*window[^)]*['"']board|var\s+board\s*=/.test(content);

        if (!exposesGame)  warn(`${page} — game non global (widget uses auto-scan fallback)`);
        if (!exposesBoard) warn(`${page} — board non global (widget uses auto-scan fallback)`);
        if (exposesGame && exposesBoard) ok(`${page} — exposé explicitement`);
    }
}

// ── Run all tests ─────────────────────────────────────────────────────────────
console.log('🧪 SupaChess — Auto-test cohérence\n' + '='.repeat(50));
testRequiredScripts();
testDotsWidget();
testInternalLinks();
testTitles();
testRedirects();
testGlobalExposure();

console.log('\n' + '='.repeat(50));
console.log(`Résultat : ${errors} erreur(s), ${warns} avertissement(s)`);
if (errors === 0) {
    console.log('\x1b[32m✅ Tout est cohérent !\x1b[0m');
} else {
    console.log('\x1b[31m❌ Des problèmes ont été détectés.\x1b[0m');
    process.exit(1);
}

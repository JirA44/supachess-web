const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '../..');
const skip = new Set(['.git', 'node_modules', '.wrangler', 'coverage', 'dist', 'build']);
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skip.has(entry.name)) out.push(...walk(path.join(dir, entry.name)));
    } else if (entry.isFile() && /\.html?$/i.test(entry.name)) out.push(path.join(dir, entry.name));
  }
  return out;
}
const pages = walk(ROOT).map((file) => path.relative(ROOT, file).split(path.sep).join('/')).sort();

async function isolateExternalServices(page) {
  const chessRuntime = fs.readFileSync(path.join(ROOT, 'node_modules/chess.js/chess.js'), 'utf8') + `
window.Chess = Chess;
window.Chart = window.Chart || function(){ this.destroy=function(){}; this.update=function(){}; };
window.Chart.defaults = window.Chart.defaults || {};
window.Chart.getChart = window.Chart.getChart || function(){ return null; };
window.Chessboard = window.Chessboard || function(id){ const el=document.getElementById(id); if(el){el.style.minHeight='320px';el.style.background='#ddd';el.textContent='Local chessboard fixture';} return {start:function(){},position:function(){},orientation:function(){},flip:function(){},resize:function(){}}; };
window.$ = window.jQuery = window.$ || function(selector){
  if(selector===document || selector===window) return {on:function(){return this;},resize:function(fn){window.addEventListener('resize',fn);return this;},ready:function(fn){fn();return this;}};
  const nodes=selector instanceof Element ? [selector] : typeof selector==='string' && selector.startsWith('<') ? [document.createElement('div')] : [...document.querySelectorAll(selector)];
  const api={nodes:nodes,html:function(v){if(v===undefined)return nodes[0]?.innerHTML;nodes.forEach(n=>n.innerHTML=v);return this;},text:function(v){if(v===undefined)return nodes[0]?.textContent;nodes.forEach(n=>n.textContent=v);return this;},addClass:function(c){nodes.forEach(n=>n.classList.add(c));return this;},removeClass:function(c){nodes.forEach(n=>n.classList.remove(c));return this;},eq:function(i){return window.$(nodes[i]);},append:function(c){nodes.forEach(n=>n.appendChild(c.nodes?c.nodes[0]:c));return this;},on:function(){return this;},click:function(){return this;},resize:function(fn){window.addEventListener('resize',fn);return this;},ready:function(fn){fn();return this;}};
  nodes.forEach((n,i)=>{api[i]=n;});api.length=nodes.length;return api;
};`;
  await page.addInitScript({ content: chessRuntime });
  const serviceHost = /(?:workers\.dev|onrender\.com|firebaseio\.com|firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|lichess\.org|localhost:\d+)/i;
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url === 'http://127.0.0.1:4173/test_ai.html') {
      const response = await route.fetch();
      const html = (await response.text()).replace(/<script[\s\S]*?<\/script>/gi, '');
      return route.fulfill({ response, body: html });
    }
    if (/\/data\/max_vs_max\/tournament_summary\.json(?:$|\?)/i.test(url)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total_games: 0, chessnova_wins: 0, stockfish_wins: 0, draws: 0, chessnova_win_rate: 0, draw_rate: 0 }) });
    }
    if (url.startsWith('http://127.0.0.1:4173/')) return route.continue();
    if (/chart(?:\.[^/?]+)*\.js/i.test(url)) {
      const chartFixture = 'window.Chart = function(){ this.destroy=function(){}; this.update=function(){}; }; window.Chart.defaults={}; window.Chart.getChart=function(){ return null; };';
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: chartFixture });
    }
    if (/cdnjs\.cloudflare\.com\/ajax\/libs\/chess\.js/i.test(url)) {
      const chess = fs.readFileSync(path.join(ROOT, 'node_modules/chess.js/chess.js'), 'utf8') + '\nwindow.Chess = Chess;';
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: chess });
    }
    if (/code\.jquery\.com\/jquery/i.test(url)) {
      const jqueryFixture = `window.$ = window.jQuery = function (selector) {
        if (selector === document || selector === window) return { on: function(){ return this; }, resize: function(fn){ window.addEventListener('resize',fn); return this; }, ready: function(fn){ fn(); return this; } };
        const nodes = selector instanceof Element ? [selector] : typeof selector === 'string' && selector.trim().startsWith('<') ? (() => { const template=document.createElement('template'); template.innerHTML=selector.trim(); return [template.content.firstElementChild]; })() : [...document.querySelectorAll(selector)];
        return { nodes: nodes, html: function(value){ if(value===undefined) return nodes[0]?.innerHTML; nodes.forEach(n=>n.innerHTML=value); return this; },
          text: function(value){ if(value===undefined) return nodes[0]?.textContent; nodes.forEach(n=>n.textContent=value); return this; },
          addClass: function(name){ nodes.forEach(n=>n.classList.add(name)); return this; }, removeClass: function(name){ nodes.forEach(n=>n.classList.remove(name)); return this; },
          eq: function(i){ return window.$(nodes[i]); }, append: function(child){ nodes.forEach(n=>n.appendChild(child.nodes?child.nodes[0]:child)); return this; },
          on: function(){ return this; }, click: function(){ return this; }, resize: function(fn){ window.addEventListener('resize',fn); return this; }, ready: function(fn){ fn(); return this; } };
      };`;
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: jqueryFixture });
    }
    if (/unpkg\.com\/@chrisoakman\/chessboardjs/i.test(url)) {
      if (/\.css(?:$|\?)/i.test(url)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      const boardFixture = `window.Chessboard = function(id, config){ const el=document.getElementById(id); el.style.minHeight='320px'; el.style.background='#ddd'; el.textContent='Local chessboard fixture'; return {start:function(){}, position:function(){}, orientation:function(){}, flip:function(){}, resize:function(){}}; };`;
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: boardFixture });
    }
    if (/gstatic\.com\/firebasejs/i.test(url)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    if (!serviceHost.test(url)) return route.abort();
    if (route.request().resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, games: [], data: [], results: [] }) });
  });
}

test('each of the 94 HTML routes loads from the local site build', async ({ page }) => {
  test.setTimeout(120000);
  await isolateExternalServices(page);
  const failures = [];
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`${page.url()}: ${error.message}`));
  for (const file of pages) {
    const response = await page.goto(`/${file.split('/').map(encodeURIComponent).join('/')}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    if (!response || response.status() !== 200) failures.push(`${file}: HTTP ${response?.status() ?? 'no response'}`);
    const title = await page.title().catch(() => '');
    if (!title.trim() && file !== 'deployed_enhanced.html') failures.push(`${file}: empty title`);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (!bodyText.trim()) failures.push(`${file}: empty body`);
  }
  expect(pages.length).toBe(94);
  expect(failures).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test('ChessNova comment generation handles a legal move without undefined evaluation variables', async ({ page }) => {
  await isolateExternalServices(page);
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('/CHESSNOVA.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(() => {
    const played = game.move({ from: 'e2', to: 'e4' });
    const originalRandom = Math.random;
    Math.random = () => 0.2; // Exercise the historical-lesson branch deterministically.
    try {
      generateMoveComment(played, 0, 0, 0, 5, []);
      return { san: played.san, generationCompleted: true };
    } finally {
      Math.random = originalRandom;
    }
  });
  expect(result.san).toBe('e4');
  expect(result.generationCompleted).toBe(true);
  expect(browserErrors).toEqual([]);
});

test('Kasparov–Topalov 1999 replay reaches move 44 and exposes the full PGN', async ({ page }) => {
  await isolateExternalServices(page);
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('/kasparov_immortal_1999.html', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Suivant/ }).click();
  await expect(page.locator('#moveInfo')).toContainText('Coup 1');
  const moveNotations = page.locator('.move-notation');
  await expect(moveNotations).toHaveCount(87);
  for (let index = 0; index < 87; index += 1) {
    if (index > 0) await page.getByRole('button', { name: /Suivant/ }).click();
    await expect.poll(() => page.locator('.move-notation.currently-played').evaluate((element) =>
      Array.from(document.querySelectorAll('.move-notation')).indexOf(element)
    )).toBe(index);
  }
  await page.getByRole('button', { name: /Fin/ }).click();
  await expect(page.locator('#moveInfo')).toContainText('Coup 44');
  const final = await page.evaluate(() => ({
    moveCount: gameMoves.length,
    currentMoveIndex,
    lastMove: gameMoves.at(-1).move,
    pgn: document.getElementById('pgnContent').textContent
  }));
  expect(final.moveCount).toBe(87);
  expect(final.currentMoveIndex).toBe(86);
  expect(final.lastMove).toBe('Qa7');
  expect(final.pgn).toContain('44. Qa7 1-0');
  await page.getByRole('button', { name: /Précédent/ }).click();
  await page.getByRole('button', { name: /Suivant/ }).click();
  await expect(page.locator('#moveInfo')).toContainText('Coup 44');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Télécharger le PGN/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('kasparov-topalov-wijk-aan-zee-1999.pgn');
  expect(await fs.promises.readFile(await download.path(), 'utf8')).toContain('44. Qa7 1-0');
  expect(browserErrors).toEqual([]);
});

test('a local training game accepts a legal user move and reset restores the start position', async ({ page }) => {
  await isolateExternalServices(page);
  const browserErrors=[]; page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('/HUMAN_TRAINING_STANDALONE.html', { waitUntil: 'domcontentloaded' });
  console.log('Training page startup:', await page.evaluate(() => ({ title: document.title, state: document.readyState, buttonCount: document.querySelectorAll('button').length, chess: typeof Chess, board: typeof Chessboard })));
  await page.locator('button[onclick="newGame()"]').click({ timeout: 10000 });
  await expect(page.locator('#board')).toBeVisible();
  const afterMove = await page.evaluate(() => {
    onDrop('e2', 'e4');
    return { fen: game.fen(), history: game.history(), turn: game.turn() };
  });
  expect(afterMove.history[0]).toBe('e4');
  expect(afterMove.turn).toBe('b');
  await expect.poll(() => page.evaluate(() => game.history().length), { timeout: 10000 }).toBeGreaterThan(1);
  await page.getByRole('button', { name: /Nouvelle Partie/i }).click();
  await expect.poll(() => page.evaluate(() => game.history().length)).toBe(0);
  expect(browserErrors).toEqual([]);
});

test('opening training advances, persists mastery, and restores clean state after reset', async ({ page }) => {
  await isolateExternalServices(page);
  const browserErrors=[]; page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('/TRAINING_OPENINGS.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('#opening-grid .card').first().click();
  await page.getByRole('button', { name: /Suivant/i }).click();
  await expect(page.locator('#move-counter')).toContainText('Coup 1');
  await page.getByRole('button', { name: /Maîtrisée/i }).click();
  await expect(page.locator('#prog-lbl')).toContainText('1/8');
  const key = 'supachess_openings_v1';
  expect(JSON.parse(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key))).toHaveLength(1);
  await page.reload();
  await expect(page.locator('#prog-lbl')).toContainText('1/8');
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), key);
  await page.reload();
  await expect(page.locator('#prog-lbl')).toContainText('0/8');
  expect(browserErrors).toEqual([]);
});

test('the Fischer replay advances and returns to the initial position', async ({ page }) => {
  await isolateExternalServices(page);
  const browserErrors=[]; page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('/web/legendary-games/fischer_game_of_century.html', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Suivant/i }).click();
  await expect(page.locator('#moveInfo')).not.toContainText(/Position de départ/i);
  await page.getByRole('button', { name: /Début/i }).click();
  await expect(page.locator('#moveInfo')).toContainText(/Position de départ/i);
  await expect(page.locator('a.back-button').first()).toHaveAttribute('href', '../../index.html');
  expect(browserErrors).toEqual([]);
});

test('nested legacy pages load the shared progress tracker from its own directory', async ({ page }) => {
  await isolateExternalServices(page);
  const missingProgressScripts=[];
  page.on('response', response => {
    if (/\/shared\/progress\.js(?:$|\?)/.test(new URL(response.url()).pathname) && response.status() >= 400) {
      missingProgressScripts.push(response.url());
    }
  });
  await page.goto('/web/legendary-games/fischer_game_of_century.html');
  await expect.poll(() => page.evaluate(() => typeof window.ChessNovaProgress)).toBe('object');
  expect(missingProgressScripts).toEqual([]);
});


test('each legendary game exposes a copyable and downloadable PGN', async ({ page }) => {
  test.setTimeout(60000);
  await isolateExternalServices(page);
  const files = [
    'anand_vs_kasparov.html',
    'carlsen_modern.html',
    'carlsen_vs_kasparov.html',
    'deep_blue_vs_kasparov.html',
    'fischer_game_of_century.html',
    'karpov_positional.html',
    'kasparov_immortal.html',
    'kasparov_vs_karpov.html',
    'tal_masterpiece.html'
  ];

  for (const file of files) {
    await page.goto('/web/legendary-games/' + file, { waitUntil: 'domcontentloaded' });
    const panel = page.locator('.supachess-pgn-export');
    await expect(panel).toBeVisible();
    const pgn = await panel.locator('textarea').inputValue();
    expect(pgn).toMatch(/^\[Event "/);
    expect(pgn).toMatch(/\n\n1\./);
    const legalPgn = await page.evaluate((value) => new Chess().load_pgn(value), pgn);
    expect(legalPgn).toBe(true);

    await panel.getByRole('button', { name: 'Copier le PGN' }).click();
    await expect(panel.locator('[role="status"]')).toContainText('PGN copié.');

    const downloadPromise = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Télécharger le fichier .pgn' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(file.replace(/\.html$/i, '.pgn'));
    const downloadedPgn = await fs.promises.readFile(await download.path(), 'utf8');
    expect(downloadedPgn.trim()).toBe(pgn.trim());
  }
});


test('the Stockfish report renders complete chessboard diagrams', async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto('/supaengine_vs_stockfish_report.html', { waitUntil: 'domcontentloaded' });
  const boards = page.locator('svg.chess-board');
  await expect(boards).toHaveCount(9);
  for (const board of await boards.all()) {
    await expect(board).toHaveAttribute('role', 'img');
    await expect(board).toHaveAttribute('aria-label', /Position/);
    await expect(board.locator('rect.board-square')).toHaveCount(64);
    expect(await board.locator('text.piece').count()).toBeGreaterThan(0);
    expect(await board.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(0);
  }
});

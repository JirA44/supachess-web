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
window.Chart = window.Chart || function(){ this.data={labels:[],datasets:[{data:[]},{data:[]}]}; this.destroy=function(){}; this.update=function(){}; };
window.Chart.defaults = window.Chart.defaults || {};
window.Chart.getChart = window.Chart.getChart || function(){ return null; };
window.Chessboard = window.Chessboard || function(id, config){ window.__lastChessboardConfig=config; const el=document.getElementById(id); if(el){el.style.minHeight='320px';el.style.background='#ddd';el.textContent='Local chessboard fixture';} return {start:function(){},position:function(){},orientation:function(){},flip:function(){},resize:function(){},destroy:function(){}}; };
window.$ = window.jQuery = window.$ || function(selector){
  if(selector===document || selector===window) return {on:function(){return this;},resize:function(fn){window.addEventListener('resize',fn);return this;},ready:function(fn){fn();return this;}};
  const nodes=selector instanceof Element ? [selector] : typeof selector==='string' && selector.startsWith('<') ? [document.createElement('div')] : [...document.querySelectorAll(selector)];
  const api={nodes:nodes,html:function(v){if(v===undefined)return nodes[0]?.innerHTML;nodes.forEach(n=>n.innerHTML=v);return this;},text:function(v){if(v===undefined)return nodes[0]?.textContent;nodes.forEach(n=>n.textContent=v);return this;},addClass:function(c){nodes.forEach(n=>n.classList.add(c));return this;},removeClass:function(c){nodes.forEach(n=>n.classList.remove(c));return this;},eq:function(i){return window.$(nodes[i]);},append:function(c){nodes.forEach(n=>n.appendChild(c.nodes?c.nodes[0]:c));return this;},on:function(){return this;},click:function(){return this;},resize:function(fn){window.addEventListener('resize',fn);return this;},ready:function(fn){fn();return this;}};
  nodes.forEach((n,i)=>{api[i]=n;});api.length=nodes.length;return api;
};`;
  await page.addInitScript({ content: chessRuntime });
  await page.addInitScript(() => { window.firebase = undefined; });
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
      const chartFixture = 'window.Chart = function(){ this.data={labels:[],datasets:[{data:[]},{data:[]}]}; this.destroy=function(){}; this.update=function(){}; }; window.Chart.defaults={}; window.Chart.getChart=function(){ return null; };';
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
      const boardFixture = `window.Chessboard = function(id, config){ window.__lastChessboardConfig=config; const el=document.getElementById(id); el.style.minHeight='320px'; el.style.background='#ddd'; el.textContent='Local chessboard fixture'; return {start:function(){}, position:function(){}, orientation:function(){}, flip:function(){}, resize:function(){}, destroy:function(){}}; };`;
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: boardFixture });
    }
    if (/gstatic\.com\/firebasejs/i.test(url)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    if (!serviceHost.test(url)) return route.abort();
    if (route.request().resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, games: [], data: [], results: [] }) });
  });
}

test('every HTML route loads from the local site build', async ({ page }) => {
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
  expect(pages.length).toBeGreaterThanOrEqual(95);
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

test('profile resumes training and shows saved mastery in the selected language', async ({ page }) => {
  await isolateExternalServices(page);
  await page.addInitScript(() => {
    localStorage.setItem('chessnova_lang', 'en');
    localStorage.setItem('supachess_openings_v1', JSON.stringify(['sicilian','ruy']));
    localStorage.setItem('supachess_tactics_v1', JSON.stringify(['f1','f2','p1']));
    localStorage.setItem('chessnova_training_endgames', JSON.stringify({ completed:['eg1'] }));
  });
  await page.goto('/CHESSNOVA.html', { waitUntil:'domcontentloaded' });
  await page.evaluate(() => {
    currentUser = { username:'Test player', email:'test@example.invalid', elo_rating:1420, created_at:'2026-01-01T00:00:00Z' };
    sessionId = 'profile-test-session';
    openProfileModal();
  });
  await expect(page.locator('#profile-mastery-title')).toHaveText('📚 Your skills');
  await expect(page.locator('#profileContent')).toContainText('Resume training');
  await expect(page.getByRole('link', { name: 'Resume exercises' })).toHaveAttribute('href', 'TRAINING_TACTICS.html');
  await expect(page.getByRole('link', { name: 'Resume mastery training' })).toHaveAttribute('href', 'TRAINING_OPENINGS.html');
  await expect(page.locator('#profileContent')).toContainText('3/40');
  await expect(page.locator('#profileContent')).toContainText('2/8');
  await expect(page.locator('#profileContent')).toContainText('1/10');
  await expect(page.locator('#profileContent svg[role="img"][aria-label="Your skills"]')).toBeVisible();
  await expect(page.locator('#profileContent')).toContainText('Skills mastered');
  await expect(page.locator('#profileContent')).toContainText('What to work on');
  await expect(page.locator('#profileContent')).toContainText('Observed in your latest games');
  for (const pageName of ['TRAINING_TACTICS.html','TRAINING_OPENINGS.html','TRAINING_ENDGAMES.html']) {
    await expect(page.locator(`#profileContent a[href="${pageName}"]`).first()).toBeVisible();
  }
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
  const highlightedIndices = await page.evaluate(() => {
    const indices = [];
    for (let index = 0; index < gameMoves.length; index += 1) {
      goToMove(index);
      indices.push(Array.from(document.querySelectorAll('.move-notation'))
        .findIndex((element) => element.classList.contains('currently-played')));
    }
    return indices;
  });
  expect(highlightedIndices).toEqual(Array.from({ length: 87 }, (_, index) => index));
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

test('opening training replays the legal line and requires the knowledge check before mastery', async ({ page }) => {
  await isolateExternalServices(page);
  const browserErrors=[]; page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('/TRAINING_OPENINGS.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const legalLineLengths = await page.evaluate(() => OPENINGS.map(opening => {
    const line = new Chess();
    for (const move of opening.moves) {
      if (!line.move(move.san)) throw new Error(opening.id + ': coup illégal ' + move.san);
    }
    return line.history().length;
  }));
  expect(legalLineLengths).toEqual([10, 10, 10, 10, 10, 10, 10, 10]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('#opening-grid .card').first().click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const initialFen = await page.evaluate(() => game.fen());
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#move-counter')).toContainText('Après 1.');
  expect(await page.evaluate(() => game.fen())).not.toBe(initialFen);
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => game.fen())).toBe(initialFen);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: /Suivant/i }).click();
  await expect(page.locator('#move-counter')).toContainText('Après 1.');
  expect(await page.evaluate(() => game.fen())).not.toBe(initialFen);
  await page.getByRole('button', { name: /Début/i }).click();
  expect(await page.evaluate(() => game.fen())).toBe(initialFen);
  for (let move = 0; move < 10; move++) await page.getByRole('button', { name: /Suivant/i }).click();
  await expect(page.locator('#opening-quiz')).toBeVisible();
  await expect(page.locator('#prog-lbl')).toContainText('0/8');
  const firstAnswer = page.getByRole('button', { name: '...b5 et le contrôle de b5' });
  const wrongChoice = (await page.locator('#opening-quiz .quiz-option').allTextContents()).findIndex(text => !text.includes('...b5 et le contrôle de b5'));
  await page.locator('#opening-quiz .quiz-option').nth(wrongChoice).click();
  await expect(page.locator('#opening-quiz')).toContainText('Indice 1');
  await firstAnswer.click();
  await page.getByRole('button', { name: /structure asymétrique/i }).click();
  await expect(page.locator('#opening-quiz')).toContainText('2/2');
  await page.getByRole('button', { name: /Valider la maîtrise/i }).click();
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


test('every legendary card on the home page exposes a legal, copyable and downloadable PGN', async ({ page }) => {
  test.setTimeout(120000);
  await isolateExternalServices(page);
  const files = [
    'fischer_game_of_century_interactive_v2.html',
    'kasparov_immortal_1999.html',
    'tal_masterpiece_1958.html',
    'karpov_positional_1978.html',
    'carlsen_brilliancy_2013.html',
    'alphazero_vs_stockfish.html',
    'zup_victory_detailed.html',
    'supaengine_vs_stockfish_report.html',
    'leela_vs_stockfish_2019.html',
    'deep_blue_kasparov_1997.html',
    'alphazero_vs_stockfish_game2.html',
    'stockfish_vs_komodo_2018.html',
    'alphazero_sacrificial_masterpiece.html'
  ];

  const failures = [];
  for (const file of files) {
    const browserMessages = [];
    const onConsole = message => { if (message.type() === 'error') browserMessages.push(message.text()); };
    page.on('console', onConsole);
    try {
    await page.goto('/' + file, { waitUntil: 'domcontentloaded' });
    let pgn;
    const panel = page.locator('.supachess-pgn-export');
    if (await panel.count()) {
      await expect(panel).toBeVisible();
      pgn = await panel.locator('textarea').inputValue();
      expect(pgn).toMatch(/^\[Event "/);
      expect(await page.evaluate((value) => new Chess().load_pgn(value), pgn)).toBe(true);
      await panel.getByRole('button', { name: 'Copier le PGN' }).click();
      await expect(panel.locator('[role="status"]')).toContainText('PGN copié.');
      const downloadPromise = page.waitForEvent('download');
      await panel.getByRole('button', { name: 'Télécharger le fichier .pgn' }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(file.replace(/\.html$/i, '') + '.pgn');
      expect((await fs.promises.readFile(await download.path(), 'utf8')).trim()).toBe(pgn.trim());
    } else if (file === 'kasparov_immortal_1999.html') {
      const content = page.locator('#pgnContent');
      pgn = await content.textContent({ timeout: 5000 });
      expect(pgn).toMatch(/^\[Event "/);
      expect(await page.evaluate((value) => new Chess().load_pgn(value), pgn)).toBe(true);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /Télécharger le PGN/ }).click();
      const download = await downloadPromise;
      expect((await fs.promises.readFile(await download.path(), 'utf8')).trim()).toContain('44. Qa7 1-0');
    } else {
      throw new Error(`${file}: PGN export panel missing. Browser errors: ${browserMessages.join(' | ') || 'none'}`);
    }
    } catch (error) {
      failures.push(`${file}: ${error.message}`);
    } finally {
      page.off('console', onConsole);
    }
  }
  expect(failures).toEqual([]);
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


test('Fischer replay Dots toggle shows and clears legal move hints with readable move text', async ({ page }) => {
  await isolateExternalServices(page);
  await page.addInitScript(() => {
    window.Worker = class {
      constructor() { this.onmessage = null; }
      postMessage(command) {
        if (command === 'uci') queueMicrotask(() => this.onmessage?.({ data: 'uciok' }));
        else if (command === 'isready') queueMicrotask(() => this.onmessage?.({ data: 'readyok' }));
        else if (command.startsWith('go ')) queueMicrotask(() => this.onmessage?.({ data: 'bestmove g1f3' }));
      }
      terminate() {}
    };
  });
  await page.route(/unpkg\.com\/@chrisoakman\/chessboardjs.*\.js(?:\?.*)?$/i, route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.Chessboard = function(id) {
      const host = document.getElementById(id);
      const board = document.createElement('div');
      board.className = 'board-fixture';
      Object.assign(board.style, { display:'grid', gridTemplateColumns:'repeat(8, 1fr)', width:'100%', aspectRatio:'1 / 1' });
      for (let rank = 8; rank >= 1; rank--) {
        for (const file of 'abcdefgh') {
          const square = document.createElement('div');
          square.dataset.square = file + rank;
          Object.assign(square.style, { minWidth:'20px', minHeight:'20px', aspectRatio:'1 / 1' });
          board.appendChild(square);
        }
      }
      host.replaceChildren(board);
      return { position:function(){}, orientation:function(){ return 'white'; }, flip:function(){}, resize:function(){} };
    };`
  }));
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('/fischer_game_of_century_interactive_v2.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#supa-dots-btn')).toBeVisible();
  await expect(page.locator('#supa-dots-lbl')).toHaveText('ON');
  const references = await page.evaluate(() => ({
    game: window.supaDots.getGame() === window.game,
    board: window.supaDots.getBoard() === window.board
  }));
  expect(references).toEqual({ game:true, board:true });

  await page.locator('[data-square="g1"]').click();
  const overlay = page.locator('#supa-dots-overlay > div');
  await expect(overlay).toHaveCount(2);
  await page.locator('#supa-dots-btn').click();
  await expect(page.locator('#supa-dots-lbl')).toHaveText('OFF');
  await expect(overlay).toHaveCount(0);
  await page.locator('[data-square="g1"]').click();
  await expect(overlay).toHaveCount(0);
  await page.locator('#supa-dots-btn').click();
  await expect(page.locator('#supa-dots-lbl')).toHaveText('ON');
  await page.locator('[data-square="g1"]').click();
  await expect(overlay).toHaveCount(2);

  const colors = await page.evaluate(() => ({
    notation: getComputedStyle(document.querySelector('.move-notation')).color,
    comments: [...document.querySelectorAll('.move-comment')].map(el => getComputedStyle(el).color)
  }));
  expect(colors.notation).toBe('rgb(248, 250, 252)');
  expect(colors.comments.length).toBeGreaterThan(0);
  expect(colors.comments.every(color => ['rgb(203, 213, 225)', 'rgb(255, 215, 0)'].includes(color))).toBe(true);
  await page.evaluate(() => { goToNext(); goToNext(); });
  const activeColors = await page.locator('.move-card.active').evaluate(el => ({
    notation: getComputedStyle(el.querySelector('.move-notation')).color,
    comment: getComputedStyle(el.querySelector('.move-comment')).color
  }));
  expect(activeColors).toEqual({ notation:'rgb(31, 41, 55)', comment:'rgb(51, 65, 85)' });
  expect(browserErrors).toEqual([]);
});

test('tactics training rejects a legal wrong move, gives a hint and requires the concept', async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto('/TRAINING_TACTICS.html');
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.locator('#stat-total')).toHaveText('40');
  await page.evaluate(() => window.openPuzzle('knight-fork-A'));
  await expect(page.locator('#modal-bg')).toHaveClass(/open/);
  await page.locator('[data-square="b5"]').click();
  await page.locator('[data-square="a7"]').click();
  await expect(page.locator('#tactic-feedback')).toContainText('Indice 1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('[data-square="b5"]').click();
  await page.locator('[data-square="c7"]').click();
  await page.getByRole('button', { name: 'Le roi et la dame' }).click();
  await expect(page.locator('#tactic-explanation')).toBeHidden();
  await page.getByRole('button', { name: 'Le roi et la tour' }).click();
  await expect(page.locator('#tactic-explanation')).toBeVisible();
  await expect(page.locator('#btn-done')).toBeVisible();
  await page.locator('#btn-done').click();
  await expect(page.locator('#stat-solved')).toHaveText('1');
});
test('endgame training supports the defender to move and gates mastery behind a concept check', async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto('/TRAINING_ENDGAMES.html');
  await page.evaluate(() => window.selectEndgame(5));
  expect(await page.evaluate(() => window.__lastChessboardConfig.orientation)).toBe('black');
  expect(await page.evaluate(() => window.__lastChessboardConfig.onDragStart('g6', 'bR'))).toBe(true);
  expect(await page.evaluate(() => window.__lastChessboardConfig.onDragStart('h1', 'wR'))).toBe(false);
  await page.evaluate(() => window.__lastChessboardConfig.onDrop('g6', 'g7'));
  await expect(page.locator('#feedback-area')).toContainText('Indice 1');
  await page.waitForTimeout(650);
  await page.evaluate(() => window.__lastChessboardConfig.onDrop('g6', 'd6'));
  await expect(page.locator('#endgame-quiz')).toBeVisible();
  await expect(page.locator('#explanation-box')).not.toHaveClass(/visible/);
  await page.locator('#endgame-quiz button').nth(1).click();
  await expect(page.locator('#endgame-quiz-feedback')).toContainText('Indice');
  await page.locator('#endgame-quiz button').nth(0).click();
  await expect(page.locator('#explanation-box')).toHaveClass(/visible/);
  await expect(page.locator('#count-done')).toHaveText('1');
});

test('global site search finds a specific endgame and opens its direct exercise', async ({ page }) => {
  await isolateExternalServices(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/index.html');
  const input = page.locator('#user-search');
  await expect(input).toBeVisible();
  await input.fill('Position Philidor');
  const result = page.locator('#user-search-results a').filter({ hasText: 'Position Philidor' }).first();
  await expect(result).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await result.click();
  await expect(page).toHaveURL(/TRAINING_ENDGAMES\.html\?endgame=philidor/);
  await expect(page.locator('#endgame-title')).toContainText('Position Philidor');
});

test('legendary games advance one half-move per arrow key press', async ({ page }) => {
  await isolateExternalServices(page);
  const paths = [
    '/alphazero_sacrificial_masterpiece.html',
    '/alphazero_vs_stockfish.html',
    '/alphazero_vs_stockfish_game2.html',
    '/carlsen_perfect_2004.html',
    '/kasparov_immortal_1999.html',
    '/scc_carlsen_vs_lazavik.html',
    '/web/legendary-games/carlsen_modern.html',
    '/web/legendary-games/karpov_positional.html',
    '/web/legendary-games/kasparov_immortal.html',
    '/web/legendary-games/tal_masterpiece.html'
  ];

  for (const path of paths) {
    await page.goto(path);
    const before = await page.evaluate(() => (
      typeof currentMoveIndex === 'number' ? currentMoveIndex :
      typeof currentMove === 'number' ? currentMove : null
    ));
    expect(before, path + ' exposes its current half-move').not.toBeNull();
    await page.keyboard.down('ArrowRight');
    const afterPress = await page.evaluate(() => (
      typeof currentMoveIndex === 'number' ? currentMoveIndex :
      typeof currentMove === 'number' ? currentMove : null
    ));
    expect(afterPress, path + ' advances once for one arrow press').toBe(before + 1);
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowRight', bubbles: true, cancelable: true, repeat: true
    })));
    const afterRepeat = await page.evaluate(() => (
      typeof currentMoveIndex === 'number' ? currentMoveIndex :
      typeof currentMove === 'number' ? currentMove : null
    ));
    expect(afterRepeat, path + ' ignores a repeated arrow event').toBe(before + 1);
    await page.keyboard.up('ArrowRight');
  }
});

test('all legendary game main lines are legal and advance one half-move at a time', async ({ page }) => {
  test.setTimeout(120000);
  await isolateExternalServices(page);
  const paths = [
    '/alphazero_sacrificial_masterpiece.html',
    '/alphazero_vs_stockfish.html',
    '/alphazero_vs_stockfish_game2.html',
    '/carlsen_brilliancy_2013.html',
    '/carlsen_perfect_2004.html',
    '/deep_blue_kasparov_1997.html',
    '/deep_blue_vs_kasparov.html',
    '/fischer_game_of_century_interactive_v2.html',
    '/kasparov_immortal_1999.html',
    '/scc_carlsen_vs_lazavik.html',
    '/web/legendary-games/anand_vs_kasparov.html',
    '/web/legendary-games/carlsen_modern.html',
    '/web/legendary-games/carlsen_vs_kasparov.html',
    '/web/legendary-games/deep_blue_vs_kasparov.html',
    '/web/legendary-games/fischer_game_of_century.html',
    '/web/legendary-games/karpov_positional.html',
    '/web/legendary-games/kasparov_immortal.html',
    '/web/legendary-games/kasparov_vs_karpov.html',
    '/web/legendary-games/tal_masterpiece.html',
    '/karpov_positional_1978.html',
    '/tal_masterpiece_1958.html',
    '/tcec_s28_best_game.html'
  ];

  for (const path of paths) {
    await page.goto(path);
    const audit = await page.evaluate(() => {
      const list = typeof gameMoves !== 'undefined' && Array.isArray(gameMoves) ? gameMoves
        : typeof moveHistory !== 'undefined' && Array.isArray(moveHistory) ? moveHistory
        : typeof moves !== 'undefined' && Array.isArray(moves) ? moves
        : typeof gameHistory !== 'undefined' && Array.isArray(gameHistory) ? gameHistory
        : [];
      const listedMoves = list.map((item) => typeof item === 'string' ? item
        : item && (item.san || item.move || item.notation)).filter(Boolean)
        .map((move) => String(move).trim());
      const hasEmbeddedResult = listedMoves.some((move) => /^(1-0|0-1|1\/2-1\/2|\*)$/.test(move));
      const mainLine = listedMoves.filter((move) => !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(move));
      const replay = new Chess();
      let illegalMove = null;
      for (let i = 0; i < mainLine.length; i++) {
        try {
          if (!replay.move(mainLine[i], { sloppy: true })) {
            illegalMove = { index: i, move: mainLine[i] };
            break;
          }
        } catch (_) {
          illegalMove = { index: i, move: mainLine[i] };
          break;
        }
      }
      const currentIndex = () => typeof currentMoveIndex === 'number' ? currentMoveIndex
        : typeof currentMove === 'number' ? currentMove : null;
      const position = typeof chess !== 'undefined' ? chess
        : typeof game !== 'undefined' ? game : null;
      return {
        count: mainLine.length,
        hasEmbeddedResult,
        illegalMove,
        index: currentIndex(),
        fen: position && typeof position.fen === 'function' ? position.fen() : null
      };
    });
    expect(audit.count, path + ' exposes its complete main line').toBeGreaterThan(0);
    expect(audit.hasEmbeddedResult, path + ' stores the result outside the move list').toBe(false);
    expect(audit.illegalMove, path + ' contains only legal consecutive moves').toBeNull();
    expect(audit.index, path + ' exposes its replay position').not.toBeNull();
    expect(audit.fen, path + ' exposes its current board position').toBeTruthy();

    const replay = await page.evaluate((moveCount) => {
      const nextButton = [...document.querySelectorAll('button')]
        .find((button) => /suiv|next/i.test(button.textContent || ''));
      if (!nextButton) return { error: 'next button not found' };
      const currentIndex = () => typeof currentMoveIndex === 'number' ? currentMoveIndex
        : typeof currentMove === 'number' ? currentMove : null;
      const position = typeof chess !== 'undefined' ? chess
        : typeof game !== 'undefined' ? game : null;
      const errors = [];
      for (let i = 0; i < moveCount; i++) {
        const beforeIndex = currentIndex();
        const beforeFen = position.fen();
        nextButton.click();
        const afterIndex = currentIndex();
        const afterFen = position.fen();
        if (afterIndex !== beforeIndex + 1) errors.push({ index: i, kind: 'index', beforeIndex, afterIndex });
        if (afterFen === beforeFen) errors.push({ index: i, kind: 'position', fen: afterFen });
        if (errors.length) break;
      }
      return { errors, steps: moveCount };
    }, audit.count);
    expect(replay.error, path + ' has a working next button').toBeUndefined();
    expect(replay.errors, path + ' advances every move exactly once').toEqual([]);
    expect(replay.steps, path + ' replays its entire main line').toBe(audit.count);
  }
});


test('published PGN source lines match their replay pages', async ({ page }) => {
  await isolateExternalServices(page);
  const sources = [
    { page: '/alphazero_sacrificial_masterpiece.html', pgn: '/data/games/alphazero_vs_stockfish8_sacrificial_masterpiece.pgn' },
    { page: '/carlsen_perfect_2004.html', pgn: '/data/games/carlsen_vs_deepan_2004.pgn' },
    { page: '/web/legendary-games/carlsen_modern.html', pgn: '/data/games/carlsen_karjakin_2016_tiebreak_game4.pgn', download: '../../data/games/carlsen_karjakin_2016_tiebreak_game4.pgn', expectedPlies: 99 },
    { page: '/karpov_positional_1978.html', pgn: '/data/games/korchnoi_karpov_1978_game31.pgn', download: 'data/games/korchnoi_karpov_1978_game31.pgn', expectedPlies: 141, heading: 'Korchnoi–Karpov · Partie 31 (1978)' },
    { page: '/web/legendary-games/carlsen_vs_kasparov.html', pgn: '/data/games/carlsen_vs_kasparov_2004.pgn', download: '../../data/games/carlsen_vs_kasparov_2004.pgn', expectedPlies: 103, heading: '🏆 Carlsen vs Kasparov - Reykjavik Rapid 2004', expectedText: 'Gambit dame · D52', forbiddenText: 'Sicilienne Sveshnikov' },
    { page: '/web/legendary-games/anand_vs_kasparov.html', pgn: '/data/games/anand_vs_kasparov_moscow_1995.pgn', download: '../../data/games/anand_vs_kasparov_moscow_1995.pgn', expectedPlies: 55, heading: '🐅 Anand–Kasparov · PCA/Intel Grand Prix 1995', expectedText: 'Sicilienne Chekhover · B53', forbiddenText: 'Nimzo-Indienne', noMoveRatings: true, white: 'Viswanathan Anand · Blancs', black: 'Garry Kasparov · Noirs' },
    { page: '/web/legendary-games/kasparov_vs_karpov.html', pgn: '/data/games/karpov_kasparov_1985_game16.pgn', download: '../../data/games/karpov_kasparov_1985_game16.pgn', expectedPlies: 80, heading: '⚔️ Karpov–Kasparov · Championnat du monde 1985, partie 16', expectedText: '16...Nd3', forbiddenText: '1-0 Victoire Kasparov', noMoveRatings: true, white: 'Anatoly Karpov · Blancs', black: 'Garry Kasparov · Noirs' },
    { page: '/web/legendary-games/deep_blue_vs_kasparov.html', pgn: '/data/games/deep_blue_kasparov_1997_game6.pgn', download: '../../data/games/deep_blue_kasparov_1997_game6.pgn', expectedPlies: 37, heading: 'Deep Blue–Kasparov · 6e partie', expectedText: '1–0 · abandon après 19.c4', forbiddenText: 'Mystère non résolu', noMoveRatings: true, white: 'Deep Blue · Blancs', black: 'Garry Kasparov · Noirs' },
    { page: '/carlsen_brilliancy_2013.html', pgn: '/data/games/anand_carlsen_world_championship_2013_game9.pgn', download: 'data/games/anand_carlsen_world_championship_2013_game9.pgn', expectedPlies: 56, heading: 'Anand–Carlsen · 9e partie', expectedText: 'Nimzo-indienne' },
    { page: '/web/legendary-games/tal_masterpiece.html', pgn: '/data/games/tal_smyslov_candidates_1959_round8.pgn', download: '../../data/games/tal_smyslov_candidates_1959_round8.pgn', expectedPlies: 51, heading: '🎯 Tal–Smyslov · Candidates 1959 · 8e ronde', expectedText: 'Caro-Kann · B10', forbiddenText: '22.Bxh7+' },
    { page: '/web/legendary-games/karpov_positional.html', pgn: '/data/games/karpov_korchnoi_1978_game32.pgn', download: '../../data/games/karpov_korchnoi_1978_game32.pgn', expectedPlies: 81, heading: '🏰 Karpov–Korchnoi · Partie 32', expectedText: 'Pirc · B07', forbiddenText: 'English Opening' },
    { page: '/web/legendary-games/kasparov_immortal.html', pgn: '/data/games/kasparov_topalov_1999_immortal.pgn', download: '../../data/games/kasparov_topalov_1999_immortal.pgn', expectedPlies: 87, heading: '🏆 Kasparov–Topalov · Wijk aan Zee 1999', expectedText: 'Défense Pirc · B07', forbiddenText: 'sacrifice de Dame' },
    { page: '/kasparov_immortal_1999.html', pgn: '/data/games/kasparov_topalov_1999_immortal.pgn', download: 'data/games/kasparov_topalov_1999_immortal.pgn', expectedPlies: 87, heading: '🏆 Kasparov–Topalov · Wijk aan Zee 1999', forbiddenText: 'sacrifice de Dame' },
    { page: '/deep_blue_kasparov_1997.html', pgn: '/data/games/deep_blue_kasparov_1997_game6.pgn', download: './data/games/deep_blue_kasparov_1997_game6.pgn', expectedPlies: 37, heading: 'Deep Blue–Kasparov · 6e partie', expectedText: '1–0 · abandon après 19.c4', forbiddenText: 'psychologiquement déstabilisé', noMoveRatings: true, white: 'Deep Blue · Blancs', black: 'Garry Kasparov · Noirs' },
    { page: '/deep_blue_vs_kasparov.html', pgn: '/data/games/deep_blue_kasparov_1997_game6.pgn', download: './data/games/deep_blue_kasparov_1997_game6.pgn', expectedPlies: 37, heading: 'Deep Blue–Kasparov · 6e partie', expectedText: '1–0 · abandon après 19.c4', forbiddenText: 'psychologiquement déstabilisé', noMoveRatings: true, white: 'Deep Blue · Blancs', black: 'Garry Kasparov · Noirs' },
    { page: '/ding_gukesh_perfect_2024.html', pgn: '/data/games/ding_liren_vs_gukesh_wcc_2024_game4.pgn', download: 'data/games/ding_liren_vs_gukesh_wcc_2024_game4.pgn', expectedPlies: 84, heading: 'Ding Liren vs Gukesh D', expectedText: '42 coups complets', forbiddenText: '100% ACCURACY' },
    { page: '/nakamura_perfect_2010.html', pgn: '/data/games/nakamura_vs_van_wely_2010.pgn', download: 'data/games/nakamura_vs_van_wely_2010.pgn', expectedPlies: 77, heading: 'Nakamura vs Van Wely', expectedText: '39.Qb3', forbiddenText: '100% ACCURACY' },
    { page: '/nezhmetdinov_perfect_1951.html', pgn: '/data/games/nezhmetdinov_vs_chernikov_1962.pgn', download: 'data/games/nezhmetdinov_vs_chernikov_1962.pgn', expectedPlies: 65, heading: 'Nezhmetdinov vs Chernikov', expectedText: '12.Qxf6', forbiddenText: '100% ACCURACY' },
    { page: '/tarrasch_perfect_1892.html', pgn: '/data/games/tarrasch_vs_marco_1892.pgn', download: 'data/games/tarrasch_vs_marco_1892.pgn', expectedPlies: 35, heading: 'Tarrasch vs Marco - 1892', expectedText: '18.c4', forbiddenText: '100% ACCURACY' },
    { page: '/ding_gukesh_perfect_2024.html', pgn: '/data/games/ding_liren_vs_gukesh_wcc_2024_game4.pgn', download: 'data/games/ding_liren_vs_gukesh_wcc_2024_game4.pgn', expectedPlies: 84, heading: 'Ding Liren vs Gukesh D', expectedText: '42 coups complets', forbiddenText: '100% ACCURACY' },
    { page: '/nakamura_perfect_2010.html', pgn: '/data/games/nakamura_vs_van_wely_2010.pgn', download: 'data/games/nakamura_vs_van_wely_2010.pgn', expectedPlies: 77, heading: 'Nakamura vs Van Wely', expectedText: '39.Qb3', forbiddenText: '100% ACCURACY' },
    { page: '/nezhmetdinov_perfect_1951.html', pgn: '/data/games/nezhmetdinov_vs_chernikov_1962.pgn', download: 'data/games/nezhmetdinov_vs_chernikov_1962.pgn', expectedPlies: 65, heading: 'Nezhmetdinov vs Chernikov', expectedText: '12.Qxf6', forbiddenText: '100% ACCURACY' },
    { page: '/tarrasch_perfect_1892.html', pgn: '/data/games/tarrasch_vs_marco_1892.pgn', download: 'data/games/tarrasch_vs_marco_1892.pgn', expectedPlies: 35, heading: 'Tarrasch vs Marco - 1892', expectedText: '18.c4', forbiddenText: '100% ACCURACY' },
    { page: '/leela_vs_stockfish_2019.html', pgn: '/data/games/leela_stockfish_tcec15_game71.pgn', download: 'data/games/leela_stockfish_tcec15_game71.pgn', expectedPlies: 86, heading: 'Stockfish–LCZero · TCEC Season 15, partie 71.1', expectedText: 'nulle par adjudication', forbiddenText: '1-0 Leela gagne brillamment' },
    { page: '/tal_masterpiece_1958.html', pgn: '/data/games/tal_vs_tolush_urs_ch25_1958_round1.pgn', download: 'data/games/tal_vs_tolush_urs_ch25_1958_round1.pgn', expectedPlies: 55, heading: 'Tal–Tolush · Championnat soviétique 1958, 1re ronde', expectedText: '55 demi-coups', forbiddenText: 'Vasiukov' },
    { page: '/scc_carlsen_vs_lazavik.html', pgn: '/data/games/carlsen_vs_lazavik_scc_2025.pgn' },
    { page: '/stockfish_vs_komodo_2018.html', pgn: '/data/games/stockfish_komodo_tcec13_game47.pgn', download: 'data/games/stockfish_komodo_tcec13_game47.pgn', expectedPlies: 85, heading: 'Stockfish–Komodo · TCEC Season 13, partie 47.1', expectedText: '½–½ · répétition triple', forbiddenText: 'Queen\'s Gambit Declined' },
    { page: '/tcec_s28_best_game.html', pgn: '/data/games/tcec_s28_game83_stockfish_vs_lc0.pgn', expectedPlies: 248, heading: 'TCEC S28 Superfinal - Game 83', expectedText: 'LCZero (Blancs) contre Stockfish (Noirs)', forbiddenText: 'Stockfish (Blancs)' }
  ];
  for (const item of sources) {
    await page.goto(item.page);
    if (item.download) await expect(page.locator('a[download]')).toHaveAttribute('href', item.download);
    if (item.heading) await expect(page.getByRole('heading', { name: item.heading })).toBeVisible();
    if (item.expectedText) await expect(page.locator('body')).toContainText(item.expectedText);
    if (item.forbiddenText) await expect(page.locator('body')).not.toContainText(item.forbiddenText);
    if (item.noMoveRatings) await expect(page.locator('.move-rating')).toHaveCount(0);
    if (item.white) await expect(page.locator('.player-name').filter({ hasText: item.white })).toBeVisible();
    if (item.black) await expect(page.locator('.player-name').filter({ hasText: item.black })).toBeVisible();
    if (item.noMoveRatings) {
      const annotations = await page.evaluate(() => {
        const map = typeof moveAnnotations !== 'undefined' ? moveAnnotations : {};
        const line = typeof moveHistory !== 'undefined' ? moveHistory : [];
        return Object.entries(map).map(([key]) => {
          const moveNumber = Number(key);
          const ply = moveNumber * 2 - 1;
          const card = document.querySelector(`.move-card[data-move="${ply + 1}"]`);
          return {
            moveNumber,
            hasBlackMove: Boolean(line[ply]),
            commentOnBlackMove: Boolean(card && card.querySelector('.move-comment')),
            san: line[ply] && line[ply].san
          };
        });
      });
      expect(annotations.length, item.page + ' has curated comments').toBeGreaterThan(0);
      expect(annotations.every((item) => item.hasBlackMove && item.commentOnBlackMove), item.page + ' attaches every comment to an existing black half-move').toBe(true);
    }
    if (item.page.includes('carlsen_vs_kasparov.html')) {
      await expect(page.locator('.move-rating')).toHaveCount(0);
      await expect(page.locator('.player-info').first()).toContainText('Blancs');
      await expect(page.locator('.player-info').last()).toContainText('Noirs');
    }
    if (item.page.includes('karpov_positional_1978.html')) await expect(page.locator('body')).toContainText('1-0 (Korchnoi)');
    const audit = await page.evaluate(async (pgnPath) => {
      const pgnResponse = await fetch(pgnPath);
      if (!pgnResponse.ok) return { error: 'PGN source unavailable: ' + pgnResponse.status };
      const source = new Chess();
      const loaded = source.load_pgn(await pgnResponse.text(), { sloppy: true });
      if (loaded === false) return { error: 'PGN source could not be parsed' };
      const sourceMoves = source.history();
      const entries = typeof gameMoves !== 'undefined' && Array.isArray(gameMoves) ? gameMoves
        : typeof moveHistory !== 'undefined' && Array.isArray(moveHistory) ? moveHistory
        : typeof moves !== 'undefined' && Array.isArray(moves) ? moves : [];
      const replay = new Chess();
      const pageMoves = [];
      for (const entry of entries) {
        const san = String(typeof entry === 'string' ? entry : entry && (entry.san || entry.move || entry.notation) || '').trim();
        if (!san || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(san)) return { error: 'Result marker or empty move found in page line' };
        const played = replay.move(san, { sloppy: true });
        if (!played) return { error: 'Page line contains an illegal move: ' + san };
        pageMoves.push(played.san);
      }
      return { sourceMoves, pageMoves };
    }, item.pgn);
    expect(audit.error, item.page + ' parses its linked PGN').toBeUndefined();
    expect(audit.pageMoves, item.page + ' follows the linked PGN at every half-move').toEqual(audit.sourceMoves);
    if (item.expectedPlies) expect(audit.pageMoves, item.page + ' has the complete expected ply count').toHaveLength(item.expectedPlies);
  }
});
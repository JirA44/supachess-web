import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4191;
const BASE = `http://127.0.0.1:${PORT}`;
const PAGE = `${BASE}/GENERATEUR_PARTIES_BRILLANTES.html`;

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: process.cwd(),
  stdio: 'ignore'
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${PAGE}`);
      if (response.ok) return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  throw new Error('static server did not start on ' + BASE);
}

const browser = await chromium.launch({ headless: true });
try {
  await waitForServer();
  const page = await browser.newPage();
  await page.route('**/gstatic.com/**', route => route.abort());
  await page.goto(PAGE);
  await page.waitForSelector('#tab-generator');

  assert.equal(await page.locator('#tab-generator').getAttribute('aria-selected'), 'true', 'the generator tab is selected by default');
  assert.equal(await page.locator('#panel-generator').isVisible(), true, 'the generator panel is visible by default');
  assert.equal(await page.locator('#panel-puzzles').isVisible(), false, 'the puzzles panel is hidden by default');

  await page.locator('#tab-puzzles').click();
  assert.equal(await page.locator('#tab-puzzles').getAttribute('aria-selected'), 'true', 'clicking the puzzles tab selects it');
  assert.equal(await page.locator('#panel-puzzles').isVisible(), true, 'the puzzles panel becomes visible');
  assert.equal(await page.locator('#panel-generator').isVisible(), false, 'the generator panel is hidden');

  await page.locator('#tab-generator').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#tab-puzzles').getAttribute('aria-selected'), 'true', 'ArrowRight moves to the next tab');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#tab-generator').getAttribute('aria-selected'), 'true', 'ArrowLeft moves back to the previous tab');

  assert.equal(await page.locator('#engine-settings').getAttribute('open'), null, 'the engine settings stay folded by default');
  assert.match(await page.locator('#engine-settings summary').textContent(), /Réglages avancés du moteur/, 'the folded engine block exposes a clear summary');
  assert.equal(await page.locator('#engine-js').count(), 1, 'the engine JS field is still in the DOM');
  assert.equal(await page.locator('#engine-wasm').count(), 1, 'the engine WASM field is still in the DOM');

  assert.equal(await page.locator('#defense-title').isVisible(), false, 'the empty puzzle title stays hidden');
  assert.equal(await page.locator('#study-title').isVisible(), false, 'the empty study title stays hidden');

  await page.locator('#tab-puzzles').click();
  await page.waitForFunction(() => document.querySelectorAll('#custom-theme-options .chip').length > 0, null, { timeout: 15000 });
  const themeChips = await page.locator('#custom-theme-options .chip').count();
  assert.ok(themeChips > 0, 'the themes are rendered as chips');
  assert.ok(await page.locator('#custom-phase-options .chip').count() > 0, 'the phases are rendered as chips');
  assert.ok((await page.locator('#custom-theme-options .chip').first().textContent()).match(/\d+/), 'each chip shows its exercise count');
  assert.equal(await page.locator('#custom-theme-options .chip').first().getAttribute('aria-pressed'), 'false', 'chips start unselected');

  await page.locator('#custom-theme-options .chip').first().click();
  assert.equal(await page.locator('#custom-theme-options .chip').first().getAttribute('aria-pressed'), 'true', 'clicking a chip toggles it');
  await page.locator('#custom-theme-options .chip').first().click();
  assert.equal(await page.locator('#custom-theme-options .chip').first().getAttribute('aria-pressed'), 'false', 'clicking a chip again untoggles it');

  assert.equal(await page.locator('#custom-bank-loading').isVisible(), false, 'the loading placeholder disappears once the bank is loaded');
  assert.equal(await page.locator('#custom-bank-error').isVisible(), false, 'no error is shown when the bank loads');

  const failed = await browser.newPage();
  await failed.route('**/training_games/tactical-training-puzzles.json', route => route.fulfill({ status: 503, body: 'nope' }));
  await failed.goto(PAGE);
  await failed.locator('#tab-puzzles').click();
  await failed.waitForSelector('#custom-bank-error:not([hidden])');
  assert.equal(await failed.locator('#custom-bank-error').isVisible(), true, 'a failed bank load shows the error panel');
  assert.equal(await failed.locator('#custom-bank-retry').isVisible(), true, 'the error panel offers a retry button');
  await failed.close();

  const hashed = await browser.newPage();
  await hashed.goto(`${PAGE}#custom-problems`);
  await hashed.waitForSelector('#tab-puzzles[aria-selected="true"]');
  assert.equal(await hashed.locator('#panel-puzzles').isVisible(), true, 'the #custom-problems hash opens the puzzles tab');
  const scrollY = await hashed.evaluate(() => window.scrollY);
  assert.ok(scrollY < 40, 'the #custom-problems hash does not scroll the page, got ' + scrollY);
  await hashed.close();

  await page.goto(PAGE);
  await page.locator('#generate').click();
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('Sélectionne les fichiers'), null, { timeout: 10000 });
  assert.match(await page.locator('#status').textContent(), /Sélectionne les fichiers JavaScript et WASM du même build Stockfish 19\./, 'the engine still loads on demand');

  console.log('Generator page checks passed:', themeChips, 'theme chips');
} finally {
  await browser.close();
  server.kill();
}

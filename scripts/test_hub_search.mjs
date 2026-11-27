import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4188;
const BASE = `http://127.0.0.1:${PORT}`;

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: process.cwd(),
  stdio: 'ignore'
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${BASE}/index.html`);
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
  await page.goto(`${BASE}/index.html`);
  await page.waitForSelector('#hub-search-input');

  const input = page.locator('#hub-search-input');
  assert.equal(await input.getAttribute('aria-expanded'), 'false');

  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('/');
  assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'hub-search-input', 'the / shortcut focuses the hub search');

  await input.fill('');
  await page.keyboard.press('Control+k');
  assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'hub-search-input', 'Ctrl+K focuses the hub search');

  await input.fill('defense');
  await page.waitForFunction(() => document.getElementById('hub-search-count').textContent.includes('résultat'));
  const counter = await page.locator('#hub-search-count').textContent();
  assert.match(counter, /\d+ résultat/, 'the live counter reports the number of matches');

  const visibleCards = await page.locator('.hub-card:visible').count();
  assert.ok(visibleCards >= 1 && visibleCards <= 5, 'only matching cards stay visible, got ' + visibleCards);
  assert.equal(await page.locator('#section-laboratoire').isVisible(), false, 'sections without a match are hidden');
  assert.equal(await page.locator('#section-academie').isVisible(), true, 'sections with a match stay visible');

  const defenseVisible = await page.locator('[data-hub-module="training-tactical-defense"]').isVisible();
  assert.equal(defenseVisible, true, 'an accent-free query matches the accented module title');

  const suggestions = page.locator('#hub-search-suggestions .hub-suggestion');
  assert.ok(await suggestions.count() > 0, 'the autocomplete list is populated');
  assert.ok(await suggestions.count() <= 5, 'the autocomplete list is capped at 5 results');
  assert.ok(await page.locator('#hub-search-suggestions .hub-suggestion-badge').count() > 0, 'each suggestion carries a category badge');

  await input.press('ArrowDown');
  const active = await input.getAttribute('aria-activedescendant');
  assert.ok(active, 'ArrowDown activates a suggestion');
  await input.press('Escape');
  assert.equal(await input.getAttribute('aria-expanded'), 'false', 'Escape closes the autocomplete list');

  await input.fill('tactique');
  await page.waitForFunction(() => document.getElementById('hub-search-count').textContent.includes('résultat'));
  const suggestionTitles = await page.locator('#hub-search-suggestions .hub-suggestion-title').allTextContents();
  assert.ok(suggestionTitles.some(title => /tactique/i.test(title)), 'the query matches a tactical module');

  await input.press('ArrowDown');
  await input.press('Enter');
  await page.waitForLoadState('domcontentloaded');
  assert.ok(/TACTICAL_DEFENSE|TRAINING_TACTICS|GENERATEUR_PARTIES_BRILLANTES/.test(page.url()), 'Enter opens the highlighted suggestion, got ' + page.url());

  await page.goto(`${BASE}/index.html`);
  const stored = await page.evaluate(() => localStorage.getItem('supachess_hub_history'));
  assert.ok(stored, 'the hub search history is persisted in localStorage');
  const parsed = JSON.parse(stored);
  assert.ok(Array.isArray(parsed.searches) && parsed.searches.length >= 1, 'the recent searches are stored');
  assert.ok(parsed.searches.length <= 4, 'at most 4 recent searches are stored');
  assert.ok(parsed.clicks && typeof parsed.clicks === 'object', 'the module click counters are stored');

  await page.locator('[data-hub-module="fischer-academy"]').click({ force: true });
  await page.waitForTimeout(150);
  const clicks = JSON.parse(await page.evaluate(() => localStorage.getItem('supachess_hub_history'))).clicks;
  assert.ok((clicks['fischer-academy'] || 0) >= 1, 'clicking a module increments its click counter');

  await page.goto(`${BASE}/index.html`);
  await page.locator('#hub-search-input').focus();
  await page.waitForSelector('#hub-search-suggestions .hub-suggestion-group');
  const groups = await page.locator('#hub-search-suggestions .hub-suggestion-group').allTextContents();
  assert.ok(groups.some(group => /Modules les plus consultés/.test(group)), 'the most clicked modules are listed when the field is empty and focused');
  assert.ok(groups.some(group => /Recherches récentes/.test(group)), 'the recent searches are listed when the field is empty and focused');

  console.log('Hub search checks passed:', suggestionTitles.length, 'suggestions for the tactical query');
} finally {
  await browser.close();
  server.kill();
}

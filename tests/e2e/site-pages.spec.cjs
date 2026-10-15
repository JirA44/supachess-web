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
  const serviceHost = /(?:workers\.dev|onrender\.com|firebaseio\.com|firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|lichess\.org|localhost:\d+)/i;
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:4173/')) return route.continue();
    if (!serviceHost.test(url)) return route.continue();
    if (route.request().resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, games: [], data: [], results: [] }) });
  });
}

test('each of the 94 HTML routes loads from the local site build', async ({ page }) => {
  await isolateExternalServices(page);
  const failures = [];
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`${page.url()}: ${error.message}`));
  for (const file of pages) {
    const response = await page.goto(`/${file.split('/').map(encodeURIComponent).join('/')}`, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() !== 200) failures.push(`${file}: HTTP ${response?.status() ?? 'no response'}`);
    const title = await page.title().catch(() => '');
    if (!title.trim()) failures.push(`${file}: empty title`);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (!bodyText.trim()) failures.push(`${file}: empty body`);
  }
  expect(pages.length).toBe(94);
  expect(failures).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test('a local training game accepts a legal user move and reset restores the start position', async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto('/HUMAN_TRAINING_STANDALONE.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#board')).toBeVisible();
  await page.evaluate(() => newGame());
  const afterMove = await page.evaluate(() => {
    onDrop('e2', 'e4');
    return { fen: game.fen(), history: game.history(), turn: game.turn() };
  });
  expect(afterMove.history[0]).toBe('e4');
  expect(afterMove.turn).toBe('b');
  await expect.poll(() => page.evaluate(() => game.history().length), { timeout: 10000 }).toBeGreaterThan(1);
  await page.getByRole('button', { name: /Nouvelle Partie/i }).click();
  await expect.poll(() => page.evaluate(() => game.history().length)).toBe(0);
});

test('opening training advances, persists mastery, and restores clean state after reset', async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto('/TRAINING_OPENINGS.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('#opening-grid .card').first().click();
  await page.getByRole('button', { name: /Suivant/i }).click();
  await expect(page.locator('#move-counter')).toContainText('Coup 1');
  await page.getByRole('button', { name: /Maîtrisée/i }).click();
  await expect(page.locator('#prog-lbl')).toContainText('1/8');
  const key = 'supachess_openings_v1';
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toContain('italian');
  await page.reload();
  await expect(page.locator('#prog-lbl')).toContainText('1/8');
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), key);
  await page.reload();
  await expect(page.locator('#prog-lbl')).toContainText('0/8');
});

test('the Fischer replay advances and returns to the initial position', async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto('/web/legendary-games/fischer_game_of_century.html', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Suivant/i }).first().click();
  await expect(page.locator('#moveInfo')).not.toContainText(/Position de départ/i);
  await page.getByRole('button', { name: /Début/i }).click();
  await expect(page.locator('#moveInfo')).toContainText(/Position de départ/i);
  await expect(page.locator('a.back-button').first()).toHaveAttribute('href', '../../index.html');
});

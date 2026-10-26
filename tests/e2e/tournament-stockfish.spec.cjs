const { test, expect } = require('@playwright/test');

test('Stockfish bracket page renders engines and vote cards without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/TOURNAMENT_STOCKFISH.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.vote-card')).toHaveCount(4);
  await expect(page.locator('.match-card')).toHaveCount(4);
  await expect(page.locator('#champ-name')).toContainText('En attente');
  await page.waitForTimeout(1500);
  expect(errors.filter((e) => !/firestore|Failed to fetch|network/i.test(e))).toEqual([]);
});

test('Stockfish bracket plays through and reveals a champion', async ({ page }) => {
  await page.goto('/TOURNAMENT_STOCKFISH.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#play-btn').click();
  await expect(page.locator('#champ-name')).toContainText(/Stockfish \d+/, { timeout: 12000 });
  await expect(page.locator('#match-final .match-row.winner')).toHaveCount(1);
  await expect(page.locator('#match-third .match-row.winner')).toHaveCount(1);
});

test('voting marks the selected engine and persists in localStorage', async ({ page }) => {
  await page.goto('/TOURNAMENT_STOCKFISH.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.locator('.vote-card[data-engine="sf19"]').click();
  await expect(page.locator('.vote-card[data-engine="sf19"]')).toHaveClass(/mine/);
  expect(await page.evaluate(() => localStorage.getItem('sf_tournament_vote'))).toBe('sf19');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await expect(page.locator('.vote-card[data-engine="sf19"]')).toHaveClass(/mine/);
});

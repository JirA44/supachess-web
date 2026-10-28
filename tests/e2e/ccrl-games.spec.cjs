const { test, expect } = require('@playwright/test');

test('CCRL viewer loads Stockfish wins, navigates half-moves and explains centipawns', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/training_games/ccrl-games.html');
  await expect(page.locator('#status')).toContainText('parties chargées', { timeout: 15000 });
  await expect(page.locator('#game-select option')).toHaveCount(53);
  await expect(page.locator('#ply-label')).toHaveText(/^0 \/ \d+$/);
  await page.locator('#btn-next').click();
  await expect(page.locator('#ply-label')).toContainText('1 / ');
  await expect(page.locator('#cp-box')).not.toContainText('Avancez dans la partie');
  await page.locator('#btn-prev').click();
  await expect(page.locator('#ply-label')).toContainText('0 / ');
  await expect(page.locator('#cp-box')).toContainText('Avancez dans la partie');
  expect(errors).toEqual([]);
});

test('CCRL viewer lists Reckless wins with the engine query parameter', async ({ page }) => {
  await page.goto('/training_games/ccrl-games.html?engine=reckless');
  await expect(page.locator('#status')).toContainText('parties chargées', { timeout: 15000 });
  await expect(page.locator('#game-select option')).toHaveCount(162);
});

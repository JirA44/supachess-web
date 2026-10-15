const { test, expect } = require('@playwright/test');

test('select profiles, run deterministic simulated tournament, read standings, reset and replay', async ({ page }) => {
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/TOURNAMENT_SIMULATOR.html');
  await expect(page.locator('#simulation-notice')).toContainText('Aucun moteur d’échecs ne calcule');
  for (const id of ['sf17','sf18','sf19']) await page.locator(`#participant-list input[value="${id}"]`).check();
  expect(await page.locator('#participant-list input:checked').count()).toBe(7);
  await page.locator('#cfg-speed').selectOption('30');
  await page.locator('#start-btn').click();
  await expect(page.locator('#tournament-status')).toContainText('terminé', { timeout: 15000 });
  const firstResults=await page.locator('#rounds-list').innerText();
  expect((await page.locator('#rounds-list .round-item').count())).toBe(21);
  await expect(page.locator('#standings-list .stand-row')).toHaveCount(7);
  await expect(page.locator('#crosstable tbody tr')).toHaveCount(7);
  await page.getByRole('button',{name:/Réinitialiser/}).click();
  await expect(page.locator('#tournament-area')).toBeEmpty();
  await page.locator('#start-btn').click();
  await expect(page.locator('#tournament-status')).toContainText('terminé', { timeout: 15000 });
  expect(await page.locator('#rounds-list').innerText()).toBe(firstResults);
  await page.getByRole('button',{name:/Réinitialiser/}).click();
  await expect(page.locator('#start-btn')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('requires at least two selected participants', async ({ page }) => {
  await page.goto('/TOURNAMENT_SIMULATOR.html');
  await page.locator('#participant-list input:checked').uncheck();
  await page.locator('#start-btn').click();
  await expect(page.locator('#selection-error')).toBeVisible();
  await expect(page.locator('#tournament-area')).toBeEmpty();
});

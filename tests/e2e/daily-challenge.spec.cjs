const { test, expect } = require('@playwright/test');

const SOLUTIONS = {
  'Mat en 1 — Roi en cage': ['g6', 'g7'],
  'Mat en 1 — Tour sur la huitième rangée': ['a1', 'a8'],
  'Mat en 1 — Dame protégée': ['b6', 'b7'],
  'Fourchette de Pion': ['d5', 'd6'],
  'Capture de la Dame': ['e5', 'd4'],
  'Mat en 1 — Dame et roi': ['b6', 'b7'],
  'Mat du Berger': ['h5', 'f7'],
  'Surcharge Défensive': ['h4', 'f6'],
};

test('daily challenge accepts the solution and advances to the next puzzle', async ({ page }) => {
  // Relative navigation preserves a configured GitHub Pages subpath.
  await page.goto('DAILY_CHALLENGE.html');
  await expect(page.locator('.puzzle-meta h2')).toBeVisible();

  const title = await page.locator('.puzzle-meta h2').innerText();
  const move = SOLUTIONS[title];
  expect(move, 'a tested solution exists for ' + title).toBeTruthy();

  await page.getByRole('button', { name: new RegExp('^' + move[0] + ',') }).click();
  await page.getByRole('button', { name: new RegExp('^' + move[1] + ',') }).click();

  await expect(page.locator('#move-feedback')).toContainText('Bon coup');
  await expect(page.locator('.solution-box')).toBeVisible();
  const next = page.getByRole('button', { name: /Compris! Suivant/ });
  await expect(next).toBeVisible();
  await next.click();
  await expect(page.locator('.puzzle-meta h2')).not.toHaveText(title);
});

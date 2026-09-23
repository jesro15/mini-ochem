import { test, expect } from '@playwright/test';

test('practice mode stays minimal and switches chapters/categories', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('./?mode=practice');

  await expect(page.getByRole('button', { name: 'Chapter 1', exact: true })).toHaveClass(/active/);
  await expect(page.locator('ochem-practice .practice-search')).toHaveCount(0);
  await expect(page.locator('ochem-practice textarea')).toHaveCount(0);
  await expect(page.locator('ochem-practice [data-open-query]')).toHaveCount(0);

  await expect(page.locator('ochem-practice .problem').first()).toContainText('PROBLEM 1.4');
  await page.locator('ochem-practice [data-category="Molecular orbitals"]').click();
  await expect(page.locator('ochem-practice .problems')).toContainText('PROBLEM 1.24');

  await page.getByRole('button', { name: 'Chapter 2', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Chapter 2', exact: true })).toHaveClass(/active/);
  await expect(page.locator('ochem-practice .problems')).toContainText('PROBLEM 2.9');

  await page.locator('ochem-practice [data-category="Conformations"]').click();
  await expect(page.locator('ochem-practice .problems')).toContainText('PROBLEM 2.12');
  await expect(page.locator('ochem-practice .problems')).toContainText('PROBLEM 2.50');

  await page.locator('ochem-practice [data-category="Hybridization"]').click();
  await expect(page.locator('ochem-practice .problems')).toContainText('PROBLEM 2.52');
  await expect(page.locator('ochem-practice .problems')).toContainText('PROBLEM 2.53');

  await page.getByRole('button', { name: 'Visualizer', exact: true }).click();
  await expect(page.locator('[data-mode-panel="visualizer"]')).toBeVisible();
  await expect(page.locator('[data-mode-panel="practice"]')).toBeHidden();

  expect(errors).toEqual([]);
});

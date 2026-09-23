import { test, expect } from '@playwright/test';

test('Chapter 1 practice mode indexes the assigned set and keeps notes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('./?mode=practice');

  await expect(page.getByRole('heading', { name: 'Chapter 1' })).toBeVisible();
  await expect(page.locator('ochem-practice .problem-card')).toHaveCount(32);
  await expect(page.locator('ochem-practice .problem-count')).toHaveText('32 of 32 problems');

  await page.locator('ochem-practice .practice-search').fill('ozone');
  await expect(page.locator('ochem-practice .problem-card:visible')).toHaveCount(1);
  await expect(page.locator('ochem-practice .problem-card:visible .problem-meta strong')).toHaveText('Problem 1.44');

  await page.locator('ochem-practice .practice-search').fill('');
  await page.locator('ochem-practice [data-topic-filter="Molecular orbitals"]').click();
  await expect(page.locator('ochem-practice .problem-card:visible')).toHaveCount(1);
  await expect(page.locator('ochem-practice .problem-card:visible .problem-meta strong')).toHaveText('Problem 1.24');

  await page.locator('ochem-practice [data-topic-filter="All"]').click();
  const note = page.locator('ochem-practice textarea[data-note-key="ochem-practice-1.4"]');
  await note.fill('dipole practice note');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Chapter 1' })).toBeVisible();
  await expect(page.locator('ochem-practice textarea[data-note-key="ochem-practice-1.4"]')).toHaveValue('dipole practice note');

  await page.getByRole('button', { name: 'Visualizer' }).click();
  await expect(page.locator('[data-mode-panel="visualizer"]')).toBeVisible();
  await expect(page.locator('[data-mode-panel="practice"]')).toBeHidden();

  expect(errors).toEqual([]);
});

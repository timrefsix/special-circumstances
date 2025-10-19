import { expect, test } from '@playwright/test';

test('landing page displays the project scaffold message', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Modular Machine Architect');
  await expect(page.getByRole('main')).toContainText('TypeScript + Vite project scaffold is ready.');
});

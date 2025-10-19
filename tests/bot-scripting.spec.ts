import { expect, test } from '@playwright/test';

test('authors and runs a bot script against the selected entity', async ({ page }) => {
  await page.goto('/');

  const scriptEditor = page.getByTestId('bot-script-editor');
  const runButton = page.getByTestId('bot-script-run');
  const status = page.getByTestId('bot-script-status');
  const summary = page.getByTestId('bot-script-summary');

  const initialTop = await page.evaluate(() => {
    const element = document.querySelector('[data-testid="world-entity"]') as HTMLElement | null;
    return element ? Number.parseFloat(element.style.top) : Number.NaN;
  });

  if (Number.isNaN(initialTop)) {
    throw new Error('Failed to measure initial entity position.');
  }

  await scriptEditor.fill('motor.forward(12)');
  await runButton.click();

  await expect(status).toContainText('Success');
  await expect(summary).toContainText('Heading: 0.0°');
  await expect(summary).toContainText('Position: (20.00, 23.00)');
  await expect(summary).toContainText('Pen: up · Color: #ffffff');

  await page.waitForFunction(
    (previous) => {
      const el = document.querySelector('[data-testid="world-entity"]') as HTMLElement | null;
      if (!el) {
        return false;
      }
      const next = Number.parseFloat(el.style.top);
      return Number.isFinite(next) && next < previous;
    },
    initialTop,
  );

  await scriptEditor.fill('motor.left(90); motor.forward(5); debug.pen(true); debug.color(#00ff00)');
  await runButton.click();

  await expect(status).toContainText('Success');
  await expect(summary).toContainText('Heading: 90.0°');
  await expect(summary).toContainText('Pen: down · Color: #00ff00');
  await expect(summary).toContainText('History: pen(true), color(#00ff00)');
});

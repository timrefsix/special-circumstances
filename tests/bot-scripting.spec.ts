import { expect, test } from '@playwright/test';

const getEntityPosition = async (page: import('@playwright/test').Page) => {
  return page.evaluate(() => {
    const element = document.querySelector('[data-testid="world-entity"]') as HTMLElement | null;
    if (!element) {
      return { top: Number.NaN, left: Number.NaN };
    }
    return {
      top: Number.parseFloat(element.style.top),
      left: Number.parseFloat(element.style.left),
    };
  });
};

test('authors and runs a bot script against the selected entity', async ({ page }) => {
  await page.goto('/');

  const scriptEditor = page.getByTestId('bot-script-editor');
  const runButton = page.getByTestId('bot-script-run');
  const status = page.getByTestId('bot-script-status');
  const summary = page.getByTestId('bot-script-summary');

  const initialPosition = await getEntityPosition(page);
  if (Number.isNaN(initialPosition.top) || Number.isNaN(initialPosition.left)) {
    throw new Error('Failed to read initial entity position.');
  }

  await scriptEditor.fill('motor.forward(12)');
  await runButton.click();
  await expect(status).toContainText('Success', { timeout: 5000 });
  const elapsed = await page.evaluate(() => (window as any).__lastBotRunDuration ?? 0);
  expect(elapsed).toBeGreaterThan(400);
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
    initialPosition.top,
  );

  await scriptEditor.fill('motor.left(90); motor.forward(5); debug.pen(true); debug.color(#00ff00)');
  await runButton.click();
  await expect(status).toContainText('Success', { timeout: 5000 });
  await expect(summary).toContainText('Heading: 90.0°');
  await expect(summary).toContainText('Pen: down · Color: #00ff00');
  await expect(summary).toContainText('History: pen(true), color(#00ff00)');
});

test('executes backwards and right rotations sequentially', async ({ page }) => {
  await page.goto('/');

  const scriptEditor = page.getByTestId('bot-script-editor');
  const runButton = page.getByTestId('bot-script-run');
  const status = page.getByTestId('bot-script-status');
  const summary = page.getByTestId('bot-script-summary');

  const initialPosition = await getEntityPosition(page);
  if (Number.isNaN(initialPosition.top) || Number.isNaN(initialPosition.left)) {
    throw new Error('Failed to read initial entity position.');
  }

  await scriptEditor.fill('motor.backwards(8)');
  await runButton.click();
  await expect(status).toContainText('Success', { timeout: 5000 });
  await expect(summary).toContainText('Heading: 0.0°');
  await expect(summary).toContainText('Position: (20.00, 43.00)');

  await page.waitForFunction(
    (previous) => {
      const el = document.querySelector('[data-testid="world-entity"]') as HTMLElement | null;
      if (!el) {
        return false;
      }
      const next = Number.parseFloat(el.style.top);
      return Number.isFinite(next) && next > previous;
    },
    initialPosition.top,
  );

  const positionAfterBackwards = await getEntityPosition(page);

  await scriptEditor.fill('motor.right(90); motor.forward(10)');
  await runButton.click();
  await expect(status).toContainText('Success', { timeout: 5000 });
  await expect(summary).toContainText('Heading: 270.0°');

  await page.waitForFunction(
    (previous) => {
      const el = document.querySelector('[data-testid="world-entity"]') as HTMLElement | null;
      if (!el) {
        return false;
      }
      const next = Number.parseFloat(el.style.left);
      return Number.isFinite(next) && next < previous;
    },
    positionAfterBackwards.left,
  );

  await expect(summary).toContainText('Position: (10.00, 43.00)');
});

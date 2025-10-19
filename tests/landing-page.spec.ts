import { expect, test, Locator } from '@playwright/test';

const getPanelWidth = async (locator: Locator) => {
  return locator.evaluate((node) => {
    const element = node as HTMLElement;
    const width = window.getComputedStyle(element).width;
    const parsed = Number.parseFloat(width);
    return Number.isNaN(parsed) ? 0 : parsed;
  });
};

test('world layout renders, panel resizes, and collapse state persists', async ({ page }) => {
  await page.goto('/');

  const shell = page.getByTestId('app-shell');
  const world = page.getByTestId('world-view');
  const panel = page.getByTestId('info-panel');
  const toggle = page.getByTestId('panel-toggle');
  const handle = page.getByTestId('panel-resize-handle');
  const selectionName = page.getByTestId('selection-name');
  const selectionStatus = page.getByTestId('selection-status');

  await expect(shell).toBeVisible();
  await expect(world).toBeVisible();
  await expect(panel).toBeVisible();
  await expect(handle).toBeVisible();
  await expect(panel).not.toHaveClass(/collapsed/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAttribute('aria-label', 'Collapse details panel');

  const initialWidth = await getPanelWidth(panel);
  expect(initialWidth).toBeGreaterThan(200);

  const entities = page.getByTestId('world-entity');
  await expect(entities).toHaveCount(3);
  await expect(entities.nth(0)).toHaveClass(/is-selected/);
  await expect(selectionName).toHaveText('Alpha Runner');
  await expect(selectionStatus).toHaveText('moving');

  await entities.nth(1).click();

  await expect(entities.nth(1)).toHaveClass(/is-selected/);
  await expect(entities.nth(0)).not.toHaveClass(/is-selected/);
  await expect(selectionName).toHaveText('Bravo Scout');
  await expect(selectionStatus).toHaveText('idle');

  const handleBox = await handle.boundingBox();
  if (!handleBox) {
    throw new Error('Resize handle bounding box not found');
  }

  const handleY = handleBox.y + handleBox.height / 2;
  const handleX = handleBox.x + handleBox.width / 2;
  await page.mouse.move(handleX, handleY);
  await page.mouse.down();
  await page.mouse.move(handleX - 100, handleY, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(80);

  const widenedWidth = await getPanelWidth(panel);
  expect(widenedWidth).toBeGreaterThan(initialWidth + 40);

  const storedWidthValue = await page.evaluate(() => localStorage.getItem('ui.panelWidth'));
  expect(storedWidthValue).not.toBeNull();
  const persistedWidth = Number(storedWidthValue);
  expect(Number.isNaN(persistedWidth)).toBe(false);
  expect(persistedWidth).toBeGreaterThan(initialWidth + 40);
  const tolerance = 60;

  await toggle.click();

  await expect(panel).toHaveClass(/collapsed/);
  await expect(handle).toHaveClass(/is-inactive/);
  await expect(toggle).toHaveAttribute('aria-label', 'Expand details panel');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeVisible();

  await toggle.click();

  await expect(panel).not.toHaveClass(/collapsed/);
  await expect(handle).not.toHaveClass(/is-inactive/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAttribute('aria-label', 'Collapse details panel');

  const firstEntity = entities.nth(0);
  const firstBox = await firstEntity.boundingBox();
  if (!firstBox) {
    throw new Error('First entity bounding box not found');
  }

  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
  await page.mouse.move(firstBox.x + firstBox.width - 4, firstBox.y + firstBox.height - 4);

  const isHovering = await firstEntity.evaluate((node) => node.matches(':hover'));
  expect(isHovering).toBe(true);

  await page.waitForTimeout(260);
  const widthAfterExpand = await getPanelWidth(panel);
  expect(widthAfterExpand).toBeGreaterThan(initialWidth + 30);
  expect(Math.abs(widthAfterExpand - persistedWidth)).toBeLessThanOrEqual(tolerance);

  await toggle.click();

  await expect(panel).toHaveClass(/collapsed/);
  await expect(handle).toHaveClass(/is-inactive/);

  await page.reload();

  const panelAfterReload = page.getByTestId('info-panel');
  const toggleAfterReload = page.getByTestId('panel-toggle');
  const handleAfterReload = page.getByTestId('panel-resize-handle');

  await expect(panelAfterReload).toHaveClass(/collapsed/);
  await expect(handleAfterReload).toHaveClass(/is-inactive/);
  await expect(toggleAfterReload).toHaveAttribute('aria-expanded', 'false');
  await expect(toggleAfterReload).toHaveAttribute('aria-label', 'Expand details panel');

  await toggleAfterReload.click();

  await expect(panelAfterReload).not.toHaveClass(/collapsed/);
  await expect(handleAfterReload).not.toHaveClass(/is-inactive/);
  await expect(toggleAfterReload).toHaveAttribute('aria-expanded', 'true');
  await expect(toggleAfterReload).toHaveAttribute('aria-label', 'Collapse details panel');

  await page.waitForTimeout(260);
  const widthAfterReloadExpand = await getPanelWidth(panelAfterReload);
  expect(widthAfterReloadExpand).toBeGreaterThan(initialWidth + 30);
  expect(Math.abs(widthAfterReloadExpand - persistedWidth)).toBeLessThanOrEqual(tolerance);

  const entitiesAfterReload = page.getByTestId('world-entity');
  await expect(entitiesAfterReload).toHaveCount(3);
  await expect(entitiesAfterReload.nth(0)).toHaveClass(/is-selected/);
  await expect(page.getByTestId('selection-name')).toHaveText('Alpha Runner');
  await expect(page.getByTestId('selection-status')).toHaveText('moving');
});

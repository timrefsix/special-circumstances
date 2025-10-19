# End-to-End Checks with Playwright

Playwright-driven smoke tests can verify that tasks are complete by exercising the app in a real browser.

## One-time setup
- Install the Playwright browsers: `npx playwright install` (or `npx playwright install chromium` if you only need Chromium).

## Running the checks
- `npm run test:e2e` executes the headless Playwright suite against a Vite dev server.
- `npm run test:e2e:ui` launches the interactive Playwright Test runner for debugging and manual validation.

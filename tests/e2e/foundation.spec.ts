import { expect, test } from '@playwright/test';

test('internal diagnostics report the running API and its real dependencies', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Foundation diagnostics' })).toBeVisible();
  await expect(
    page.getByRole('row', { name: 'API liveness Available', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('row', { name: 'Database and Redis readiness Available', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Refresh health checks' }).click();
  await expect(
    page.getByRole('row', { name: 'Database and Redis readiness Available', exact: true }),
  ).toBeVisible();
});

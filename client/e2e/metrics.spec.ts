import { test, expect } from '@playwright/test';

test.describe('Metrics Flow', () => {
  const email = `metrics-${Date.now()}@example.com`;
  const password = 'Password123!';

  test('view metrics dashboard after creating applications', async ({ page }) => {
    // 1. Register & Login
    await page.goto('/register');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/kanban/);

    // 2. Visit metrics with empty state
    await page.click('text=Metrics');
    await expect(page).toHaveURL(/.*\/metrics/);
    await expect(page.locator('text=No data yet')).toBeVisible();

    // 3. Create a couple of applications
    await page.click('text=Go to Kanban');
    await expect(page).toHaveURL(/.*\/kanban/);

    await page.click('text=New Application');
    await page.fill('input[name="companyName"]', 'Company A');
    await page.fill('input[name="jobTitle"]', 'Role A');
    await page.click('button[type="submit"]');

    // Wait for modal to close and card to appear
    await expect(page.locator('text=Role A')).toBeVisible();

    await page.click('text=New Application');
    await page.fill('input[name="companyName"]', 'Company B');
    await page.fill('input[name="jobTitle"]', 'Role B');
    await page.selectOption('select[name="status"]', 'INTERVIEW');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Role B')).toBeVisible();

    // 4. Visit metrics and check data
    await page.click('text=Metrics');
    await expect(page).toHaveURL(/.*\/metrics/);
    
    // Check summary cards
    await expect(page.locator('text=Total Applications').locator('..').locator('text=2')).toBeVisible();
    await expect(page.locator('text=Interview Conversion').locator('..').locator('text=50%')).toBeVisible();
    
    // Recharts canvases are rendered, we just verify the container exists
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Kanban Flow', () => {
  const email = `kanban-${Date.now()}@example.com`;
  const password = 'Password123!';
  const companyName = `Test Company ${Date.now()}`;
  const jobTitle = 'Software Engineer';

  test.beforeEach(async ({ page }) => {
    // Register & Login before each test in this suite
    await page.goto('/register');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/kanban/);
  });

  test('create, move, edit, and delete an application', async ({ page }) => {
    // 1. Create Application
    await page.click('button:has-text("New")');
    await expect(page.locator('h2:has-text("New Application")')).toBeVisible();

    await page.fill('input[name="companyName"]', companyName);
    await page.fill('input[name="jobTitle"]', jobTitle);
    await page.selectOption('select[name="status"]', 'APPLIED');
    await page.click('button[type="submit"]');

    // Verify it appears in the Applied column
    const appliedCol = page.locator('div[data-status="APPLIED"]');
    await expect(appliedCol.locator(`text=${companyName}`)).toBeVisible();

    // 2. Edit Application
    await appliedCol.locator(`text=${companyName}`).click();
    await expect(page.locator('text=Edit Application')).toBeVisible();
    
    const newTitle = 'Senior Software Engineer';
    await page.fill('input[name="jobTitle"]', newTitle);
    await page.click('button[type="submit"]');
    
    await expect(appliedCol.locator(`text=${newTitle}`)).toBeVisible();

    // Note: Playwright drag-and-drop can be flaky with dnd-kit depending on sensors.
    // In a real E2E, we either simulate exact mouse events or test status change via the edit modal.
    // Since drag and drop relies on pointer events, let's update status via modal to be robust for CI,
    // as dnd-kit requires very specific movement sequences.
    
    await appliedCol.locator(`text=${newTitle}`).click();
    await page.selectOption('select[name="status"]', 'INTERVIEW');
    await page.click('button[type="submit"]');

    const interviewCol = page.locator('div[data-status="INTERVIEW"]');
    await expect(interviewCol.locator(`text=${newTitle}`)).toBeVisible();

    // 3. Delete Application
    await interviewCol.locator(`text=${newTitle}`).click();
    
    // Accept confirm dialog automatically
    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Delete")');

    // Verify it's gone
    await expect(page.locator(`text=${newTitle}`)).not.toBeVisible();
  });
});

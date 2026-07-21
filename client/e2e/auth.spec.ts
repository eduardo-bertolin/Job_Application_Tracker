import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const email = `test-${Date.now()}@example.com`;
  const password = 'Password123!';

  test('register, login, and logout', async ({ page }) => {
    // 1. Register
    await page.goto('/register');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to kanban on success
    await expect(page).toHaveURL(/.*\/kanban/);

    // Logout
    await page.click('text=Logout');
    await expect(page).toHaveURL(/.*\/login/);

    // 2. Login
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to kanban
    await expect(page).toHaveURL(/.*\/kanban/);
  });
});

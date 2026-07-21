import { test, expect } from '@playwright/test';

test.describe('Matching Flow', () => {
  const email = `matching-${Date.now()}@example.com`;
  const password = 'Password123!';
  const resumeText = "I am a senior fullstack software engineer with 10 years of experience in React, Node.js, and TypeScript. I have built scalable microservices and led engineering teams to success. I have extensive experience with database design, CI/CD pipelines, and cloud architecture.";
  const jobDescription = "We are looking for a Senior Software Engineer. The ideal candidate will have strong experience with TypeScript, React, and Node.js. Experience with microservices and team leadership is a huge plus.";

  test.beforeEach(async ({ page }) => {
    // Register & Login
    await page.goto('/register');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/kanban/);
  });

  test('upload resume and see match score on a new application', async ({ page }) => {
    // 1. Add Resume via Paste Text
    await page.click('text=Resume');
    await expect(page).toHaveURL(/.*\/resume/);

    await page.click('text=Paste Text');
    // Using a sufficiently long text
    await page.fill('textarea[placeholder*="Paste your resume text here"]', resumeText);
    
    // Wait for the button to not be disabled and save
    const saveBtn = page.locator('button', { hasText: 'Save Resume' });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    await expect(page.locator('text=Resume saved successfully!')).toBeVisible({ timeout: 10000 }); // Models might take a sec to embed

    // 2. Create Application with Job Description
    await page.click('text=Kanban');
    await expect(page).toHaveURL(/.*\/kanban/);

    await page.click('text=New Application');
    await page.fill('input[name="companyName"]', 'Tech Corp');
    await page.fill('input[name="jobTitle"]', 'Senior Software Engineer');
    await page.fill('textarea[name="jobDescription"]', jobDescription);
    await page.click('button[type="submit"]');

    // 3. Verify match score badge is visible on the card
    // The score might take a moment to compute/fetch
    const card = page.locator('div[data-status="APPLIED"]', { hasText: 'Tech Corp' });
    await expect(card.locator('text=%')).toBeVisible({ timeout: 60000 }); // Look for the % sign in the badge
  });
});

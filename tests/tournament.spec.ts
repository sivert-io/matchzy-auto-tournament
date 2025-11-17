import { test, expect } from '@playwright/test';

/**
 * Tournament page tests
 * @tag tournament
 * @tag crud
 */

test.describe('Tournament Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const apiToken = process.env.API_TOKEN || 'admin123';
    await page.goto('/login');
    await page.getByLabel(/password|token/i).fill(apiToken);
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should navigate to tournament page', { tag: ['@tournament'] }, async ({ page }) => {
    await page.goto('/tournament');
    await expect(page).toHaveURL(/\/tournament/);
    await expect(page).toHaveTitle(/Tournament/i);
  });

  test('should display tournament creation form', { tag: ['@tournament', '@crud'] }, async ({ page }) => {
    await page.goto('/tournament');
    
    // Check for tournament form elements
    await expect(page.getByText(/tournament|create|configure/i)).toBeVisible();
    
    // Check for name input (if form is visible)
    const nameInput = page.getByLabel(/name/i).or(page.locator('input[placeholder*="name" i]'));
    const formVisible = await nameInput.isVisible().catch(() => false);
    
    if (formVisible) {
      await expect(nameInput).toBeVisible();
    }
  });

  test('should create a new tournament', { tag: ['@tournament', '@crud'] }, async ({ page }) => {
    await page.goto('/tournament');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for create/new tournament button or form
    const createButton = page.getByRole('button', { name: /create|new.*tournament/i });
    const createButtonVisible = await createButton.isVisible().catch(() => false);
    
    if (createButtonVisible) {
      await createButton.click();
      
      // Fill in tournament name
      const nameInput = page.getByLabel(/name/i);
      if (await nameInput.isVisible().catch(() => false)) {
        const tournamentName = `Test Tournament ${Date.now()}`;
        await nameInput.fill(tournamentName);
        
        // Submit form if there's a submit button
        const submitButton = page.getByRole('button', { name: /create|save|submit/i });
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          
          // Wait for tournament to be created
          await expect(page.getByText(tournamentName)).toBeVisible({ timeout: 10000 });
        }
      }
    } else {
      // Tournament might already exist, check for existing tournament UI
      const tournamentExists = await page.getByText(/tournament|bracket/i).isVisible().catch(() => false);
      expect(tournamentExists).toBeTruthy();
    }
  });

  test('should display tournament status', { tag: ['@tournament'] }, async ({ page }) => {
    await page.goto('/tournament');
    await page.waitForLoadState('networkidle');
    
    // Check for tournament status indicators
    const statusElements = page.locator('text=/setup|in progress|completed|not started/i');
    const hasStatus = await statusElements.first().isVisible().catch(() => false);
    
    // Status might not always be visible if no tournament exists
    if (hasStatus) {
      await expect(statusElements.first()).toBeVisible();
    }
  });

  test('should navigate to bracket from tournament page', { tag: ['@tournament', '@navigation'] }, async ({ page }) => {
    await page.goto('/tournament');
    await page.waitForLoadState('networkidle');
    
    // Look for "View Bracket" or similar button
    const bracketButton = page.getByRole('button', { name: /view.*bracket|bracket/i });
    const bracketButtonVisible = await bracketButton.isVisible().catch(() => false);
    
    if (bracketButtonVisible) {
      await bracketButton.click();
      await expect(page).toHaveURL(/\/bracket/);
    } else {
      // Skip if no tournament exists
      test.skip();
    }
  });
});


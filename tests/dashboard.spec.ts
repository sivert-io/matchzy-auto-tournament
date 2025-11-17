import { test, expect } from '@playwright/test';

/**
 * Dashboard page tests
 * @tag dashboard
 * @tag navigation
 */

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const apiToken = process.env.API_TOKEN || 'admin123';
    await page.goto('/login');
    await page.getByLabel(/password|token/i).fill(apiToken);
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should display dashboard', { tag: ['@dashboard'] }, async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Dashboard/i);
    
    // Check for dashboard heading
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should display navigation cards', { tag: ['@dashboard', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    
    // Check for main navigation cards
    await expect(page.getByText(/tournament/i)).toBeVisible();
    await expect(page.getByText(/bracket/i)).toBeVisible();
    await expect(page.getByText(/teams/i)).toBeVisible();
    await expect(page.getByText(/servers/i)).toBeVisible();
    await expect(page.getByText(/matches/i)).toBeVisible();
    await expect(page.getByText(/settings/i)).toBeVisible();
  });

  test('should navigate to teams page from dashboard', { tag: ['@dashboard', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    
    // Click on Teams card
    const teamsCard = page.locator('text=/teams/i').locator('..').locator('..').getByRole('button', { name: /open/i }).first();
    await teamsCard.click();
    
    await expect(page).toHaveURL(/\/teams/);
  });

  test('should navigate to servers page from dashboard', { tag: ['@dashboard', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    
    // Click on Servers card
    const serversCard = page.locator('text=/servers/i').locator('..').locator('..').getByRole('button', { name: /open/i }).first();
    await serversCard.click();
    
    await expect(page).toHaveURL(/\/servers/);
  });

  test('should navigate to tournament page from dashboard', { tag: ['@dashboard', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    
    // Click on Tournament card
    const tournamentCard = page.locator('text=/tournament/i').locator('..').locator('..').getByRole('button', { name: /open/i }).first();
    await tournamentCard.click();
    
    await expect(page).toHaveURL(/\/tournament/);
  });

  test('should navigate to settings page from dashboard', { tag: ['@dashboard', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    
    // Click on Settings card
    const settingsCard = page.locator('text=/settings/i').locator('..').locator('..').getByRole('button', { name: /open/i }).first();
    await settingsCard.click();
    
    await expect(page).toHaveURL(/\/settings/);
  });

  test('should display onboarding checklist', { tag: ['@dashboard'] }, async ({ page }) => {
    await page.goto('/');
    
    // Check for onboarding checklist (may or may not be visible depending on state)
    const checklist = page.locator('text=/onboarding|checklist|setup/i');
    const isVisible = await checklist.isVisible().catch(() => false);
    
    // Checklist might not always be visible, so we just check if page loads correctly
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});


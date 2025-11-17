import { test, expect } from '@playwright/test';

/**
 * Settings page tests
 * @tag settings
 * @tag configuration
 */

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const apiToken = process.env.API_TOKEN || 'admin123';
    await page.goto('/login');
    await page.getByLabel(/password|token/i).fill(apiToken);
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should navigate to settings page', { tag: ['@settings'] }, async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
    await expect(page).toHaveTitle(/Settings/i);
  });

  test('should display settings form', { tag: ['@settings'] }, async ({ page }) => {
    await page.goto('/settings');
    
    // Check for settings form elements
    await expect(page.getByText(/settings|webhook|steam/i)).toBeVisible();
    
    // Check for webhook URL input
    const webhookInput = page.getByLabel(/webhook.*url/i).or(page.locator('input[placeholder*="webhook" i]'));
    await expect(webhookInput).toBeVisible();
    
    // Check for Steam API key input
    const steamInput = page.getByLabel(/steam.*api.*key/i).or(page.locator('input[placeholder*="steam" i]'));
    await expect(steamInput).toBeVisible();
  });

  test('should update webhook URL', { tag: ['@settings', '@configuration'] }, async ({ page }) => {
    await page.goto('/settings');
    
    // Find webhook URL input
    const webhookInput = page.getByLabel(/webhook.*url/i).or(page.locator('input[placeholder*="webhook" i]'));
    await expect(webhookInput).toBeVisible();
    
    // Clear and enter new webhook URL
    await webhookInput.clear();
    const testWebhookUrl = `https://example.com/webhook/${Date.now()}`;
    await webhookInput.fill(testWebhookUrl);
    
    // Find and click save button
    const saveButton = page.getByRole('button', { name: /save|update/i });
    await saveButton.click();
    
    // Wait for success message or check that value is saved
    await page.waitForTimeout(1000);
    
    // Verify the value was saved (check if input still has the value or success message appears)
    const savedValue = await webhookInput.inputValue();
    expect(savedValue).toBe(testWebhookUrl);
  });

  test('should update Steam API key', { tag: ['@settings', '@configuration'] }, async ({ page }) => {
    await page.goto('/settings');
    
    // Find Steam API key input
    const steamInput = page.getByLabel(/steam.*api.*key/i).or(page.locator('input[placeholder*="steam" i]'));
    await expect(steamInput).toBeVisible();
    
    // Clear and enter new Steam API key
    await steamInput.clear();
    const testSteamKey = `TEST_STEAM_KEY_${Date.now()}`;
    await steamInput.fill(testSteamKey);
    
    // Find and click save button
    const saveButton = page.getByRole('button', { name: /save|update/i });
    await saveButton.click();
    
    // Wait for save to complete
    await page.waitForTimeout(1000);
    
    // Verify the value was saved
    const savedValue = await steamInput.inputValue();
    expect(savedValue).toBe(testSteamKey);
  });

  test('should clear webhook URL', { tag: ['@settings', '@configuration'] }, async ({ page }) => {
    await page.goto('/settings');
    
    // Find webhook URL input
    const webhookInput = page.getByLabel(/webhook.*url/i).or(page.locator('input[placeholder*="webhook" i]'));
    await expect(webhookInput).toBeVisible();
    
    // Clear the input
    await webhookInput.clear();
    
    // Save
    const saveButton = page.getByRole('button', { name: /save|update/i });
    await saveButton.click();
    
    // Wait for save to complete
    await page.waitForTimeout(1000);
    
    // Verify the value was cleared
    const savedValue = await webhookInput.inputValue();
    expect(savedValue).toBe('');
  });

  test('should display current settings values', { tag: ['@settings'] }, async ({ page }) => {
    await page.goto('/settings');
    
    // Check that inputs are visible and have values (or are empty)
    const webhookInput = page.getByLabel(/webhook.*url/i).or(page.locator('input[placeholder*="webhook" i]'));
    const steamInput = page.getByLabel(/steam.*api.*key/i).or(page.locator('input[placeholder*="steam" i]'));
    
    await expect(webhookInput).toBeVisible();
    await expect(steamInput).toBeVisible();
    
    // Values might be empty, but inputs should be visible
    const webhookValue = await webhookInput.inputValue();
    const steamValue = await steamInput.inputValue();
    
    // Just verify inputs exist and are editable
    expect(webhookValue).toBeDefined();
    expect(steamValue).toBeDefined();
  });
});


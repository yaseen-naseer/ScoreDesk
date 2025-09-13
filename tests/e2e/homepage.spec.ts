import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check for the main heading
    await expect(page).toHaveTitle(/ScoreDesk/);
    
    // Check for login/register buttons
    const loginButton = page.getByRole('link', { name: /sign in/i });
    await expect(loginButton).toBeVisible();
    
    const registerButton = page.getByRole('link', { name: /get started/i });
    await expect(registerButton).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('link', { name: /sign in/i }).click();
    
    // Wait for navigation
    await page.waitForURL('/login');
    
    // Check login page elements
    await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('link', { name: /get started/i }).click();
    
    // Wait for navigation
    await page.waitForURL('/register');
    
    // Check register page elements
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});
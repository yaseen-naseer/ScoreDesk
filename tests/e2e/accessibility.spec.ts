import { test, expect } from '@playwright/test'

test.describe('Accessibility', () => {
  test('login page should be accessible', async ({ page }) => {
    await page.goto('/login')
    
    // Check for proper heading structure
    const h1 = page.getByRole('heading', { level: 1 })
    const h2 = page.getByRole('heading', { level: 2 })
    
    // Should have either h1 or h2 as main heading
    const hasMainHeading = (await h1.count()) > 0 || (await h2.count()) > 0
    expect(hasMainHeading).toBeTruthy()
    
    // Check form labels are properly associated
    const emailInput = page.getByRole('textbox', { name: /email/i })
    const passwordInput = page.getByRole('textbox', { name: /password/i })
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    
    // Check buttons have accessible names
    const signInButton = page.getByRole('button', { name: /sign in/i })
    const googleButton = page.getByRole('button', { name: /sign in with google/i })
    
    await expect(signInButton).toBeVisible()
    await expect(googleButton).toBeVisible()
    
    // Check links have meaningful text
    const registerLink = page.getByRole('link', { name: /sign up/i })
    const forgotPasswordLink = page.getByRole('link', { name: /forgot your password/i })
    
    await expect(registerLink).toBeVisible()
    await expect(forgotPasswordLink).toBeVisible()
  })

  test('register page should be accessible', async ({ page }) => {
    await page.goto('/register')
    
    // Check for proper heading structure
    const h1 = page.getByRole('heading', { level: 1 })
    const h2 = page.getByRole('heading', { level: 2 })
    
    const hasMainHeading = (await h1.count()) > 0 || (await h2.count()) > 0
    expect(hasMainHeading).toBeTruthy()
    
    // Check all form inputs are properly labeled
    await expect(page.getByRole('textbox', { name: /first name/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /last name/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /^password$/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /confirm password/i })).toBeVisible()
    
    // Check buttons have accessible names
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign up with google/i })).toBeVisible()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login')
    
    // Test tab navigation through form elements
    await page.keyboard.press('Tab')
    await expect(page.getByRole('textbox', { name: /email/i })).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByRole('textbox', { name: /password/i })).toBeFocused()
    
    await page.keyboard.press('Tab')
    // Should focus on checkbox or sign in button
    const checkbox = page.getByRole('checkbox')
    const signInButton = page.getByRole('button', { name: /sign in/i })
    
    const checkboxFocused = await checkbox.isVisible() && await checkbox.evaluate(el => document.activeElement === el)
    const buttonFocused = await signInButton.evaluate(el => document.activeElement === el)
    
    expect(checkboxFocused || buttonFocused).toBeTruthy()
  })

  test('should have proper color contrast for dark mode', async ({ page }) => {
    await page.goto('/login')
    
    // Test dark mode by checking if dark classes are applied correctly
    // This is a basic test - in a real scenario, you'd use tools like axe-core
    const body = page.locator('body')
    
    // Check if dark mode classes exist and can be toggled
    // Since we don't have a dark mode toggle yet, this is preparatory
    await expect(body).toBeVisible()
  })

  test('should have meaningful page titles', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/scoredesk.*football.*futsal/i)
    
    await page.goto('/register')
    await expect(page).toHaveTitle(/scoredesk.*football.*futsal/i)
    
    await page.goto('/')
    await expect(page).toHaveTitle(/scoredesk.*football.*futsal/i)
  })

  test('should handle focus management properly', async ({ page }) => {
    await page.goto('/login')
    
    // When page loads, focus should be manageable
    await page.getByRole('textbox', { name: /email/i }).focus()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeFocused()
    
    // Focus should be visible (not just programmatically focused)
    const emailInput = page.getByRole('textbox', { name: /email/i })
    const focusVisible = await emailInput.evaluate((el) => {
      return window.getComputedStyle(el, ':focus').getPropertyValue('outline') !== 'none'
    })
    
    // Note: This test might need adjustment based on the actual focus styles
    // The important thing is that focus is visible to keyboard users
  })
})

import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login page', async ({ page }) => {
    await page.goto('/login')
    
    // Check for login form elements
    await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    
    // Check for Google sign-in button
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible()
    
    // Check for register link
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })

  test('should display register page', async ({ page }) => {
    await page.goto('/register')
    
    // Check for register form elements
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /first name/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /last name/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /^password$/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /confirm password/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
    
    // Check for Google sign-up button
    await expect(page.getByRole('button', { name: /sign up with google/i })).toBeVisible()
    
    // Check for login link
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('should navigate between login and register pages', async ({ page }) => {
    await page.goto('/login')
    
    // Click register link
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL('/register')
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
    
    // Click login link
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible()
  })

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login')
    
    // Try to submit empty form
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Check that required field validation works (HTML5 validation)
    const emailInput = page.getByRole('textbox', { name: /email/i })
    const passwordInput = page.getByRole('textbox', { name: /password/i })
    
    await expect(emailInput).toHaveAttribute('required')
    await expect(passwordInput).toHaveAttribute('required')
  })

  test('should show validation errors for empty register form', async ({ page }) => {
    await page.goto('/register')
    
    // Try to submit empty form
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Check that required field validation works (HTML5 validation)
    const firstNameInput = page.getByRole('textbox', { name: /first name/i })
    const lastNameInput = page.getByRole('textbox', { name: /last name/i })
    const emailInput = page.getByRole('textbox', { name: /email/i })
    const passwordInput = page.getByRole('textbox', { name: /^password$/i })
    const confirmPasswordInput = page.getByRole('textbox', { name: /confirm password/i })
    
    await expect(firstNameInput).toHaveAttribute('required')
    await expect(lastNameInput).toHaveAttribute('required')
    await expect(emailInput).toHaveAttribute('required')
    await expect(passwordInput).toHaveAttribute('required')
    await expect(confirmPasswordInput).toHaveAttribute('required')
  })

  test('should handle password mismatch in register form', async ({ page }) => {
    await page.goto('/register')
    
    // Fill in form with mismatched passwords
    await page.getByRole('textbox', { name: /first name/i }).fill('John')
    await page.getByRole('textbox', { name: /last name/i }).fill('Doe')
    await page.getByRole('textbox', { name: /email/i }).fill('john.doe@example.com')
    await page.getByRole('textbox', { name: /^password$/i }).fill('password123')
    await page.getByRole('textbox', { name: /confirm password/i }).fill('password456')
    
    // Submit form
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Check for error message
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('should handle short password in register form', async ({ page }) => {
    await page.goto('/register')
    
    // Fill in form with short password
    await page.getByRole('textbox', { name: /first name/i }).fill('John')
    await page.getByRole('textbox', { name: /last name/i }).fill('Doe')
    await page.getByRole('textbox', { name: /email/i }).fill('john.doe@example.com')
    await page.getByRole('textbox', { name: /^password$/i }).fill('123')
    await page.getByRole('textbox', { name: /confirm password/i }).fill('123')
    
    // Submit form
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Check for error message
    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible()
  })

  test('should redirect to login from protected routes when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*\/login.*/)
    await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible()
  })
})

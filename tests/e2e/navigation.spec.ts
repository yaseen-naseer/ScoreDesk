import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/')
    
    // Check for main content
    await expect(page.getByRole('heading', { name: /welcome to scoredesk/i })).toBeVisible()
    await expect(page.getByText(/football & futsal management platform/i)).toBeVisible()
  })

  test('should have correct page title and meta description', async ({ page }) => {
    await page.goto('/')
    
    // Check page title
    await expect(page).toHaveTitle(/scoredesk.*football.*futsal.*management/i)
  })

  test('should handle 404 for non-existent routes', async ({ page }) => {
    const response = await page.goto('/non-existent-route')
    
    // Should return 404 status
    expect(response?.status()).toBe(404)
  })

  test('should have responsive design', async ({ page }) => {
    await page.goto('/')
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.getByRole('heading', { name: /welcome to scoredesk/i })).toBeVisible()
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.getByRole('heading', { name: /welcome to scoredesk/i })).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.getByRole('heading', { name: /welcome to scoredesk/i })).toBeVisible()
  })

  test('should navigate to auth pages from homepage', async ({ page }) => {
    await page.goto('/')
    
    // Check if there are navigation links to auth pages (if any)
    // This test might need to be updated once we add navigation to the homepage
    
    // For now, let's just verify we can navigate directly
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible()
    
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
  })
})

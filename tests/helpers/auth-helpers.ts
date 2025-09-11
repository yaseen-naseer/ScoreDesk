import { Page, expect } from '@playwright/test'
import { testUsers } from '../fixtures/test-data'

/**
 * Helper functions for authentication in E2E tests
 */

export async function loginAs(page: Page, userType: keyof typeof testUsers) {
  const user = testUsers[userType]
  
  await page.goto('/login')
  
  // Fill in credentials
  await page.getByRole('textbox', { name: /email/i }).fill(user.email)
  await page.getByRole('textbox', { name: /password/i }).fill(user.password)
  
  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click()
  
  // Wait for successful login (should redirect to dashboard)
  await expect(page).toHaveURL('/dashboard')
  
  // Verify user is logged in by checking for dashboard content
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
}

export async function logout(page: Page) {
  // Look for logout button/link (implementation depends on UI)
  // This will need to be updated once we have a proper logout UI
  
  // For now, we can navigate to a logout endpoint or clear storage
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  
  // Navigate to home page
  await page.goto('/')
  
  // Verify user is logged out
  const isOnLoginPage = page.url().includes('/login')
  const isOnHomePage = page.url() === '/' || page.url().endsWith('/')
  
  expect(isOnLoginPage || isOnHomePage).toBeTruthy()
}

export async function registerUser(page: Page, userData: {
  firstName: string
  lastName: string
  email: string
  password: string
}) {
  await page.goto('/register')
  
  // Fill in registration form
  await page.getByRole('textbox', { name: /first name/i }).fill(userData.firstName)
  await page.getByRole('textbox', { name: /last name/i }).fill(userData.lastName)
  await page.getByRole('textbox', { name: /email/i }).fill(userData.email)
  await page.getByRole('textbox', { name: /^password$/i }).fill(userData.password)
  await page.getByRole('textbox', { name: /confirm password/i }).fill(userData.password)
  
  // Submit form
  await page.getByRole('button', { name: /create account/i }).click()
  
  // Wait for success message or email verification prompt
  await expect(page.getByText(/check your email/i)).toBeVisible()
}

export async function expectToBeLoggedIn(page: Page) {
  // Try to access dashboard - should not redirect to login
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
}

export async function expectToBeLoggedOut(page: Page) {
  // Try to access dashboard - should redirect to login
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/.*\/login.*/)
  await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible()
}

export async function expectToHaveRole(page: Page, expectedRole: keyof typeof testUsers) {
  // This will need to be implemented based on how roles are displayed in the UI
  // For now, we can check if certain role-specific elements are visible
  
  await page.goto('/dashboard')
  
  switch (expectedRole) {
    case 'owner':
      // Owner should see admin settings
      await expect(page.getByText(/admin settings/i)).toBeVisible()
      break
    case 'admin':
      // Admin should see organization management but not admin settings
      await expect(page.getByText(/organizations/i)).toBeVisible()
      await expect(page.getByText(/admin settings/i)).not.toBeVisible()
      break
    case 'viewer':
      // Viewer should not see management buttons
      await expect(page.getByRole('button', { name: /create new match/i })).not.toBeVisible()
      await expect(page.getByRole('button', { name: /add new team/i })).not.toBeVisible()
      break
    default:
      // For other roles, just verify they can access dashboard
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  }
}

export async function setupTestUser(page: Page, userType: keyof typeof testUsers) {
  const user = testUsers[userType]
  
  // This function would be used to create test users in the database
  // For now, it's a placeholder for when we have the full auth system
  
  // In a real implementation, this might:
  // 1. Call an API to create the user
  // 2. Set up their organization membership
  // 3. Assign the correct role
  
  console.log(`Setting up test user: ${user.email} with role: ${user.role}`)
}

export async function cleanupTestUser(page: Page, userType: keyof typeof testUsers) {
  const user = testUsers[userType]
  
  // This function would clean up test users after tests
  // For now, it's a placeholder
  
  console.log(`Cleaning up test user: ${user.email}`)
}

/**
 * Mock authentication state for testing without real auth
 */
export async function mockAuthState(page: Page, userType: keyof typeof testUsers) {
  const user = testUsers[userType]
  
  // Set up mock authentication state in localStorage
  await page.addInitScript((userData) => {
    localStorage.setItem('scoredesk:session', JSON.stringify({
      user: userData,
      lastActivity: Date.now(),
    }))
    localStorage.setItem('scoredesk:currentOrganization', 'org-1')
  }, user)
}

/**
 * Clear all authentication state
 */
export async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

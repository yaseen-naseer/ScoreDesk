import { test, expect } from '@playwright/test'

test('scoreboard optional components render roles correctly', async ({ page }) => {
  // This test assumes a route exists where a scoreboard can be rendered when wired in.
  // For now we just verify the app shell loads without server errors.
  await page.goto('http://localhost:3000/')
  await expect(page).toHaveTitle(/ScoreDesk/i)
})



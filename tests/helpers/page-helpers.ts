import { Page, expect } from '@playwright/test'

/**
 * General page helper functions for E2E tests
 */

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
}

export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { timeout })
}

export async function scrollToElement(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded()
}

export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true })
}

export async function checkAccessibility(page: Page) {
  // Basic accessibility checks
  // In a real implementation, you might use @axe-core/playwright
  
  // Check for proper heading structure
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
  expect(headings.length).toBeGreaterThan(0)
  
  // Check for alt text on images
  const images = await page.locator('img').all()
  for (const img of images) {
    const alt = await img.getAttribute('alt')
    expect(alt).toBeDefined()
  }
  
  // Check for form labels
  const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"], textarea').all()
  for (const input of inputs) {
    const id = await input.getAttribute('id')
    const ariaLabel = await input.getAttribute('aria-label')
    const ariaLabelledBy = await input.getAttribute('aria-labelledby')
    
    if (id) {
      const label = await page.locator(`label[for="${id}"]`).count()
      expect(label > 0 || ariaLabel || ariaLabelledBy).toBeTruthy()
    } else {
      expect(ariaLabel || ariaLabelledBy).toBeTruthy()
    }
  }
}

export async function checkResponsiveDesign(page: Page) {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
  ]
  
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await waitForPageLoad(page)
    
    // Take screenshot for visual comparison
    await page.screenshot({ 
      path: `test-results/responsive/${viewport.name}-${Date.now()}.png`,
      fullPage: true 
    })
    
    // Check that main content is visible
    const mainContent = await page.locator('main, [role="main"], body').first()
    await expect(mainContent).toBeVisible()
  }
}

export async function fillForm(page: Page, formData: Record<string, string>) {
  for (const [fieldName, value] of Object.entries(formData)) {
    // Try different selectors for form fields
    const selectors = [
      `[name="${fieldName}"]`,
      `[data-testid="${fieldName}"]`,
      `#${fieldName}`,
      `input[placeholder*="${fieldName}" i]`,
    ]
    
    let filled = false
    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first()
        if (await element.isVisible()) {
          await element.fill(value)
          filled = true
          break
        }
      } catch {
        // Continue to next selector
      }
    }
    
    if (!filled) {
      throw new Error(`Could not find form field: ${fieldName}`)
    }
  }
}

export async function expectFormValidation(page: Page, expectedErrors: string[]) {
  for (const error of expectedErrors) {
    await expect(page.getByText(new RegExp(error, 'i'))).toBeVisible()
  }
}

export async function expectNoFormValidation(page: Page, errorPatterns: string[]) {
  for (const error of errorPatterns) {
    await expect(page.getByText(new RegExp(error, 'i'))).not.toBeVisible()
  }
}

export async function clickAndWaitForNavigation(page: Page, selector: string) {
  const [response] = await Promise.all([
    page.waitForNavigation(),
    page.click(selector),
  ])
  return response
}

export async function expectPageTitle(page: Page, expectedTitle: string | RegExp) {
  await expect(page).toHaveTitle(expectedTitle)
}

export async function expectUrl(page: Page, expectedUrl: string | RegExp) {
  await expect(page).toHaveURL(expectedUrl)
}

export async function expectElementCount(page: Page, selector: string, count: number) {
  await expect(page.locator(selector)).toHaveCount(count)
}

export async function expectElementText(page: Page, selector: string, text: string | RegExp) {
  await expect(page.locator(selector)).toHaveText(text)
}

export async function expectElementVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible()
}

export async function expectElementHidden(page: Page, selector: string) {
  await expect(page.locator(selector)).not.toBeVisible()
}

export async function simulateSlowNetwork(page: Page) {
  await page.route('**/*', (route) => {
    setTimeout(() => route.continue(), 1000) // Add 1 second delay
  })
}

export async function simulateOfflineMode(page: Page) {
  await page.context().setOffline(true)
}

export async function restoreOnlineMode(page: Page) {
  await page.context().setOffline(false)
}

export async function mockApiResponse(page: Page, url: string, response: any) {
  await page.route(url, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
}

export async function mockApiError(page: Page, url: string, status = 500) {
  await page.route(url, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Mock API error' }),
    })
  })
}

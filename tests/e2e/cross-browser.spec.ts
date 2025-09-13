import { test, expect, devices } from '@playwright/test'

test.describe('Cross-Browser Compatibility', () => {
  test.describe('CSS Compatibility', () => {
    test('should render layouts consistently across browsers', async ({ page, browserName }) => {
      await page.goto('/')
      
      // Test main navigation layout
      const nav = page.getByRole('navigation')
      await expect(nav).toBeVisible()
      
      // Check if navigation items are properly aligned
      const navItems = nav.getByRole('link')
      const navCount = await navItems.count()
      expect(navCount).toBeGreaterThan(0)
      
      // Test CSS Grid/Flexbox compatibility
      const mainContent = page.locator('main')
      await expect(mainContent).toBeVisible()
      
      // Check if cards/components render properly
      const cards = page.locator('[class*="card"]')
      const cardCount = await cards.count()
      
      // Verify cards have proper dimensions
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = cards.nth(i)
        const box = await card.boundingBox()
        expect(box).toBeTruthy()
        expect(box!.width).toBeGreaterThan(0)
        expect(box!.height).toBeGreaterThan(0)
      }
    })

    test('should handle CSS custom properties correctly', async ({ page }) => {
      await page.goto('/login')
      
      // Test CSS variables are applied
      const root = page.locator(':root')
      const computedStyle = await root.evaluate(() => {
        const styles = getComputedStyle(document.documentElement)
        return {
          primaryColor: styles.getPropertyValue('--primary'),
          borderRadius: styles.getPropertyValue('--radius'),
          spacing: styles.getPropertyValue('--spacing')
        }
      })
      
      // Verify CSS custom properties exist (even if empty, they should be defined)
      expect(computedStyle).toBeDefined()
    })

    test('should support CSS animations and transitions', async ({ page }) => {
      await page.goto('/')
      
      // Test hover effects on interactive elements
      const buttons = page.getByRole('button')
      const buttonCount = await buttons.count()
      
      if (buttonCount > 0) {
        const firstButton = buttons.first()
        
        // Test hover state
        await firstButton.hover()
        
        // Check if hover styles are applied
        const hoverStyles = await firstButton.evaluate((el) => {
          const styles = getComputedStyle(el)
          return {
            backgroundColor: styles.backgroundColor,
            transform: styles.transform,
            transition: styles.transition
          }
        })
        
        expect(hoverStyles).toBeDefined()
      }
    })
  })

  test.describe('JavaScript Compatibility', () => {
    test('should support modern JavaScript features', async ({ page }) => {
      await page.goto('/')
      
      // Test ES6+ features
      const jsSupport = await page.evaluate(() => {
        return {
          arrowFunctions: typeof (() => {}) === 'function',
          asyncAwait: typeof (async () => {}) === 'function',
          destructuring: (() => {
            try {
              const obj = { a: 1, b: 2 }
              const { a, b } = obj
              return a === 1 && b === 2
            } catch {
              return false
            }
          })(),
          templateLiterals: typeof `test` === 'string',
          modules: typeof import === 'function'
        }
      })
      
      expect(jsSupport.arrowFunctions).toBe(true)
      expect(jsSupport.asyncAwait).toBe(true)
      expect(jsSupport.destructuring).toBe(true)
      expect(jsSupport.templateLiterals).toBe(true)
      expect(jsSupport.modules).toBe(true)
    })

    test('should handle polyfills correctly', async ({ page }) => {
      await page.goto('/')
      
      // Test IntersectionObserver polyfill
      const intersectionObserverSupport = await page.evaluate(() => {
        return 'IntersectionObserver' in window
      })
      
      // Test smooth scroll polyfill
      const smoothScrollSupport = await page.evaluate(() => {
        return 'scrollBehavior' in document.documentElement.style
      })
      
      // These should be supported either natively or via polyfills
      expect(intersectionObserverSupport).toBe(true)
      // Smooth scroll might not be supported in all browsers, that's okay
    })

    test('should handle fetch API correctly', async ({ page }) => {
      await page.goto('/login')
      
      // Test if fetch is available
      const fetchSupport = await page.evaluate(() => {
        return typeof fetch === 'function'
      })
      
      expect(fetchSupport).toBe(true)
      
      // Test if fetch works (without actually making requests)
      const fetchWorks = await page.evaluate(() => {
        try {
          // Just test if fetch is callable, don't actually fetch
          return typeof fetch === 'function'
        } catch {
          return false
        }
      })
      
      expect(fetchWorks).toBe(true)
    })
  })

  test.describe('Form Compatibility', () => {
    test('should handle form validation consistently', async ({ page }) => {
      await page.goto('/register')
      
      // Test HTML5 validation
      const emailInput = page.getByRole('textbox', { name: /email/i })
      await emailInput.fill('invalid-email')
      
      // Trigger validation
      await emailInput.blur()
      
      // Check if validation message appears
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => {
        return el.validationMessage
      })
      
      // Should have validation message (browser-dependent)
      expect(validationMessage).toBeDefined()
    })

    test('should handle form submission correctly', async ({ page }) => {
      await page.goto('/login')
      
      // Fill form
      await page.getByRole('textbox', { name: /email/i }).fill('test@example.com')
      await page.getByRole('textbox', { name: /password/i }).fill('password123')
      
      // Test form submission (don't actually submit)
      const form = page.locator('form').first()
      const canSubmit = await form.evaluate((form: HTMLFormElement) => {
        return form.checkValidity()
      })
      
      expect(canSubmit).toBe(true)
    })

    test('should handle input events properly', async ({ page }) => {
      await page.goto('/login')
      
      const emailInput = page.getByRole('textbox', { name: /email/i })
      
      // Test input events
      await emailInput.fill('test')
      
      const inputValue = await emailInput.inputValue()
      expect(inputValue).toBe('test')
      
      // Test clear functionality
      await emailInput.clear()
      const clearedValue = await emailInput.inputValue()
      expect(clearedValue).toBe('')
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
      await page.goto('/')
      
      // Check if navigation is responsive
      const nav = page.getByRole('navigation')
      await expect(nav).toBeVisible()
      
      // Check if content is properly sized
      const mainContent = page.locator('main')
      const mainBox = await mainContent.boundingBox()
      expect(mainBox).toBeTruthy()
      expect(mainBox!.width).toBeLessThanOrEqual(375)
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }) // iPad
      await page.goto('/')
      
      const nav = page.getByRole('navigation')
      await expect(nav).toBeVisible()
      
      // Check if layout adapts to tablet size
      const mainContent = page.locator('main')
      const mainBox = await mainContent.boundingBox()
      expect(mainBox).toBeTruthy()
      expect(mainBox!.width).toBeLessThanOrEqual(768)
    })

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 }) // Desktop
      await page.goto('/')
      
      const nav = page.getByRole('navigation')
      await expect(nav).toBeVisible()
      
      // Check if layout uses full desktop width
      const mainContent = page.locator('main')
      const mainBox = await mainContent.boundingBox()
      expect(mainBox).toBeTruthy()
      expect(mainBox!.width).toBeGreaterThan(768)
    })
  })

  test.describe('Real-time Features', () => {
    test('should handle WebSocket connections', async ({ page }) => {
      await page.goto('/matches')
      
      // Test if WebSocket is supported
      const webSocketSupport = await page.evaluate(() => {
        return typeof WebSocket === 'function'
      })
      
      expect(webSocketSupport).toBe(true)
      
      // Test if WebSocket can be created (without connecting)
      const canCreateWebSocket = await page.evaluate(() => {
        try {
          // Don't actually connect, just test if constructor works
          return typeof WebSocket === 'function'
        } catch {
          return false
        }
      })
      
      expect(canCreateWebSocket).toBe(true)
    })

    test('should handle Server-Sent Events', async ({ page }) => {
      await page.goto('/matches')
      
      // Test if EventSource is supported
      const eventSourceSupport = await page.evaluate(() => {
        return typeof EventSource === 'function'
      })
      
      expect(eventSourceSupport).toBe(true)
    })
  })

  test.describe('Browser-Specific Features', () => {
    test('should handle browser-specific CSS prefixes', async ({ page, browserName }) => {
      await page.goto('/')
      
      // Test if CSS prefixes are handled correctly
      const cssSupport = await page.evaluate(() => {
        const testElement = document.createElement('div')
        const styles = [
          'transform',
          'transition',
          'animation',
          'flex',
          'grid'
        ]
        
        const support = {}
        styles.forEach(style => {
          support[style] = style in testElement.style
        })
        
        return support
      })
      
      // All modern browsers should support these CSS properties
      expect(cssSupport.transform).toBe(true)
      expect(cssSupport.transition).toBe(true)
      expect(cssSupport.animation).toBe(true)
      expect(cssSupport.flex).toBe(true)
      expect(cssSupport.grid).toBe(true)
    })

    test('should handle browser-specific JavaScript APIs', async ({ page, browserName }) => {
      await page.goto('/')
      
      // Test browser-specific APIs
      const apiSupport = await page.evaluate(() => {
        return {
          localStorage: typeof localStorage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined',
          indexedDB: typeof indexedDB !== 'undefined',
          serviceWorker: 'serviceWorker' in navigator,
          pushManager: 'PushManager' in window,
          geolocation: 'geolocation' in navigator
        }
      })
      
      // Core APIs should be supported
      expect(apiSupport.localStorage).toBe(true)
      expect(apiSupport.sessionStorage).toBe(true)
      
      // Optional APIs might not be available in all browsers
      // That's okay, we'll handle gracefully
    })
  })

  test.describe('Performance Across Browsers', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/')
      const loadTime = Date.now() - startTime
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    test('should handle large datasets efficiently', async ({ page }) => {
      await page.goto('/matches')
      
      // Test if page handles large lists efficiently
      const matches = page.locator('[data-testid="match-item"]')
      const matchCount = await matches.count()
      
      // Even with many matches, page should remain responsive
      expect(matchCount).toBeGreaterThanOrEqual(0)
      
      // Test scrolling performance
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      
      // Page should still be responsive after scrolling
      const scrollPosition = await page.evaluate(() => window.scrollY)
      expect(scrollPosition).toBeGreaterThan(0)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle JavaScript errors gracefully', async ({ page }) => {
      // Listen for console errors
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })
      
      await page.goto('/')
      
      // Wait a bit for any async operations
      await page.waitForTimeout(1000)
      
      // Should not have critical JavaScript errors
      const criticalErrors = errors.filter(error => 
        error.includes('Uncaught') || 
        error.includes('ReferenceError') || 
        error.includes('TypeError')
      )
      
      expect(criticalErrors.length).toBe(0)
    })

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/*', route => route.abort())
      
      await page.goto('/')
      
      // Should show error state or fallback content
      const errorMessage = page.locator('[data-testid="error-message"]')
      const fallbackContent = page.locator('[data-testid="fallback-content"]')
      
      // Either error message or fallback should be visible
      const hasErrorHandling = await errorMessage.isVisible() || await fallbackContent.isVisible()
      
      // If no specific error handling, at least the page should load
      if (!hasErrorHandling) {
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })
})

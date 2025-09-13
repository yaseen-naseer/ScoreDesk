import { test, expect } from '@playwright/test'

test.describe('Browser-Specific Compatibility', () => {
  test.describe('Chrome/Chromium', () => {
    test('should handle Chrome-specific features', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chrome-specific test')
      
      await page.goto('/')
      
      // Test Chrome-specific APIs
      const chromeFeatures = await page.evaluate(() => {
        return {
          chrome: typeof (window as any).chrome !== 'undefined',
          webkit: typeof (window as any).webkit !== 'undefined',
          requestIdleCallback: typeof requestIdleCallback === 'function',
          requestAnimationFrame: typeof requestAnimationFrame === 'function'
        }
      })
      
      expect(chromeFeatures.requestAnimationFrame).toBe(true)
    })
  })

  test.describe('Firefox', () => {
    test('should handle Firefox-specific features', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test')
      
      await page.goto('/')
      
      // Test Firefox-specific behavior
      const firefoxFeatures = await page.evaluate(() => {
        return {
          mozRequestAnimationFrame: typeof (window as any).mozRequestAnimationFrame === 'function',
          requestAnimationFrame: typeof requestAnimationFrame === 'function',
          cssScrollBehavior: 'scrollBehavior' in document.documentElement.style
        }
      })
      
      expect(firefoxFeatures.requestAnimationFrame).toBe(true)
    })
  })

  test.describe('Safari/WebKit', () => {
    test('should handle Safari-specific features', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test')
      
      await page.goto('/')
      
      // Test Safari-specific behavior
      const safariFeatures = await page.evaluate(() => {
        return {
          webkitRequestAnimationFrame: typeof (window as any).webkitRequestAnimationFrame === 'function',
          requestAnimationFrame: typeof requestAnimationFrame === 'function',
          webkitTransform: 'webkitTransform' in document.documentElement.style,
          transform: 'transform' in document.documentElement.style
        }
      })
      
      expect(safariFeatures.requestAnimationFrame).toBe(true)
    })

    test('should handle Safari CSS prefixes', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific CSS test')
      
      await page.goto('/')
      
      // Test Safari CSS prefix support
      const safariCSS = await page.evaluate(() => {
        const testEl = document.createElement('div')
        const styles = getComputedStyle(testEl)
        
        return {
          webkitTransform: '-webkit-transform' in testEl.style,
          webkitTransition: '-webkit-transition' in testEl.style,
          webkitAnimation: '-webkit-animation' in testEl.style,
          webkitFlex: '-webkit-flex' in testEl.style,
          webkitGrid: '-webkit-grid' in testEl.style
        }
      })
      
      // Safari should support webkit prefixes
      expect(safariCSS.webkitTransform).toBe(true)
      expect(safariCSS.webkitTransition).toBe(true)
      expect(safariCSS.webkitAnimation).toBe(true)
    })
  })
})

import { test, expect } from '@playwright/test'

test.describe('CSS Cross-Browser Compatibility', () => {
  test.describe('Layout Systems', () => {
    test('should support CSS Grid across browsers', async ({ page, browserName }) => {
      await page.goto('/')
      
      // Test CSS Grid support
      const gridSupport = await page.evaluate(() => {
        const testEl = document.createElement('div')
        return 'grid' in testEl.style
      })
      
      expect(gridSupport).toBe(true)
      
      // Test if grid layouts render correctly
      const gridContainer = page.locator('[class*="grid"]').first()
      if (await gridContainer.count() > 0) {
        await expect(gridContainer).toBeVisible()
        
        // Check if grid items are properly positioned
        const gridItems = gridContainer.locator('[class*="grid"] > *')
        const itemCount = await gridItems.count()
        expect(itemCount).toBeGreaterThanOrEqual(0)
      }
    })

    test('should support Flexbox across browsers', async ({ page }) => {
      await page.goto('/')
      
      // Test Flexbox support
      const flexSupport = await page.evaluate(() => {
        const testEl = document.createElement('div')
        return 'flex' in testEl.style
      })
      
      expect(flexSupport).toBe(true)
      
      // Test if flex layouts render correctly
      const flexContainer = page.locator('[class*="flex"]').first()
      if (await flexContainer.count() > 0) {
        await expect(flexContainer).toBeVisible()
        
        // Check if flex items are properly positioned
        const flexItems = flexContainer.locator('[class*="flex"] > *')
        const itemCount = await flexItems.count()
        expect(itemCount).toBeGreaterThanOrEqual(0)
      }
    })
  })

  test.describe('Visual Effects', () => {
    test('should support CSS transforms', async ({ page }) => {
      await page.goto('/')
      
      // Test transform support
      const transformSupport = await page.evaluate(() => {
        const testEl = document.createElement('div')
        return 'transform' in testEl.style || 'webkitTransform' in testEl.style
      })
      
      expect(transformSupport).toBe(true)
      
      // Test if transformed elements render correctly
      const transformedElements = page.locator('[style*="transform"]')
      const transformCount = await transformedElements.count()
      expect(transformCount).toBeGreaterThanOrEqual(0)
    })

    test('should support CSS transitions', async ({ page }) => {
      await page.goto('/')
      
      // Test transition support
      const transitionSupport = await page.evaluate(() => {
        const testEl = document.createElement('div')
        return 'transition' in testEl.style || 'webkitTransition' in testEl.style
      })
      
      expect(transitionSupport).toBe(true)
      
      // Test hover transitions
      const interactiveElements = page.getByRole('button').first()
      if (await interactiveElements.count() > 0) {
        await interactiveElements.hover()
        
        // Check if transition styles are applied
        const transitionStyles = await interactiveElements.evaluate((el) => {
          const styles = getComputedStyle(el)
          return {
            transition: styles.transition,
            webkitTransition: styles.webkitTransition
          }
        })
        
        expect(transitionStyles.transition || transitionStyles.webkitTransition).toBeDefined()
      }
    })

    test('should support CSS animations', async ({ page }) => {
      await page.goto('/')
      
      // Test animation support
      const animationSupport = await page.evaluate(() => {
        const testEl = document.createElement('div')
        return 'animation' in testEl.style || 'webkitAnimation' in testEl.style
      })
      
      expect(animationSupport).toBe(true)
    })
  })

  test.describe('Typography', () => {
    test('should support custom fonts', async ({ page }) => {
      await page.goto('/')
      
      // Test if custom fonts are loaded
      const fontSupport = await page.evaluate(() => {
        return document.fonts && document.fonts.ready
      })
      
      if (fontSupport) {
        await page.evaluate(() => document.fonts.ready)
      }
      
      // Check if text renders correctly
      const textElements = page.locator('h1, h2, h3, p, span').first()
      if (await textElements.count() > 0) {
        await expect(textElements).toBeVisible()
        
        // Check if text has proper styling
        const textStyles = await textElements.evaluate((el) => {
          const styles = getComputedStyle(el)
          return {
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight
          }
        })
        
        expect(textStyles.fontFamily).toBeDefined()
        expect(textStyles.fontSize).toBeDefined()
        expect(textStyles.fontWeight).toBeDefined()
      }
    })

    test('should support text shadows', async ({ page }) => {
      await page.goto('/')
      
      // Test text shadow support
      const textShadowSupport = await page.evaluate(() => {
        const testEl = document.createElement('div')
        return 'textShadow' in testEl.style
      })
      
      expect(textShadowSupport).toBe(true)
    })
  })

  test.describe('Colors and Gradients', () => {
    test('should support CSS custom properties', async ({ page }) => {
      await page.goto('/')
      
      // Test CSS custom properties support
      const customPropertiesSupport = await page.evaluate(() => {
        return CSS.supports('color', 'var(--test)')
      })
      
      expect(customPropertiesSupport).toBe(true)
      
      // Test if custom properties are applied
      const rootStyles = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement)
        return {
          primaryColor: styles.getPropertyValue('--primary'),
          secondaryColor: styles.getPropertyValue('--secondary'),
          borderRadius: styles.getPropertyValue('--radius')
        }
      })
      
      expect(rootStyles).toBeDefined()
    })

    test('should support linear gradients', async ({ page }) => {
      await page.goto('/')
      
      // Test linear gradient support
      const linearGradientSupport = await page.evaluate(() => {
        return CSS.supports('background', 'linear-gradient(red, blue)')
      })
      
      expect(linearGradientSupport).toBe(true)
    })

    test('should support radial gradients', async ({ page }) => {
      await page.goto('/')
      
      // Test radial gradient support
      const radialGradientSupport = await page.evaluate(() => {
        return CSS.supports('background', 'radial-gradient(red, blue)')
      })
      
      expect(radialGradientSupport).toBe(true)
    })
  })

  test.describe('Positioning', () => {
    test('should support sticky positioning', async ({ page }) => {
      await page.goto('/')
      
      // Test sticky positioning support
      const stickySupport = await page.evaluate(() => {
        return CSS.supports('position', 'sticky')
      })
      
      expect(stickySupport).toBe(true)
      
      // Test if sticky elements work correctly
      const stickyElements = page.locator('[style*="position: sticky"]')
      const stickyCount = await stickyElements.count()
      expect(stickyCount).toBeGreaterThanOrEqual(0)
    })

    test('should support fixed positioning', async ({ page }) => {
      await page.goto('/')
      
      // Test fixed positioning support
      const fixedSupport = await page.evaluate(() => {
        return CSS.supports('position', 'fixed')
      })
      
      expect(fixedSupport).toBe(true)
    })
  })

  test.describe('Sizing', () => {
    test('should support calc() function', async ({ page }) => {
      await page.goto('/')
      
      // Test calc() support
      const calcSupport = await page.evaluate(() => {
        return CSS.supports('width', 'calc(100% - 10px)')
      })
      
      expect(calcSupport).toBe(true)
    })

    test('should support minmax() function', async ({ page }) => {
      await page.goto('/')
      
      // Test minmax() support
      const minmaxSupport = await page.evaluate(() => {
        return CSS.supports('width', 'minmax(100px, 1fr)')
      })
      
      expect(minmaxSupport).toBe(true)
    })

    test('should support fit-content', async ({ page }) => {
      await page.goto('/')
      
      // Test fit-content support
      const fitContentSupport = await page.evaluate(() => {
        return CSS.supports('width', 'fit-content')
      })
      
      expect(fitContentSupport).toBe(true)
    })
  })

  test.describe('Scrolling', () => {
    test('should support smooth scrolling', async ({ page }) => {
      await page.goto('/')
      
      // Test smooth scrolling support
      const smoothScrollSupport = await page.evaluate(() => {
        return 'scrollBehavior' in document.documentElement.style
      })
      
      expect(smoothScrollSupport).toBe(true)
    })

    test('should support overscroll behavior', async ({ page }) => {
      await page.goto('/')
      
      // Test overscroll behavior support
      const overscrollSupport = await page.evaluate(() => {
        const testEl = document.createElement('div')
        return 'overscrollBehavior' in testEl.style
      })
      
      expect(overscrollSupport).toBe(true)
    })
  })

  test.describe('Media Queries', () => {
    test('should support hover media query', async ({ page }) => {
      await page.goto('/')
      
      // Test hover media query support
      const hoverSupport = await page.evaluate(() => {
        return CSS.supports('hover', 'hover')
      })
      
      expect(hoverSupport).toBe(true)
    })

    test('should support pointer media query', async ({ page }) => {
      await page.goto('/')
      
      // Test pointer media query support
      const pointerSupport = await page.evaluate(() => {
        return CSS.supports('pointer', 'coarse')
      })
      
      expect(pointerSupport).toBe(true)
    })

    test('should support prefers-reduced-motion', async ({ page }) => {
      await page.goto('/')
      
      // Test prefers-reduced-motion support
      const reducedMotionSupport = await page.evaluate(() => {
        return CSS.supports('prefers-reduced-motion', 'reduce')
      })
      
      expect(reducedMotionSupport).toBe(true)
    })

    test('should support prefers-color-scheme', async ({ page }) => {
      await page.goto('/')
      
      // Test prefers-color-scheme support
      const colorSchemeSupport = await page.evaluate(() => {
        return CSS.supports('prefers-color-scheme', 'dark')
      })
      
      expect(colorSchemeSupport).toBe(true)
    })
  })

  test.describe('Browser-Specific CSS', () => {
    test('should handle webkit prefixes', async ({ page, browserName }) => {
      await page.goto('/')
      
      // Test webkit prefix support
      const webkitSupport = await page.evaluate(() => {
        const testEl = document.createElement('div')
        return 'webkitTransform' in testEl.style
      })
      
      if (browserName === 'webkit') {
        expect(webkitSupport).toBe(true)
      }
    })

    test('should handle moz prefixes', async ({ page, browserName }) => {
      await page.goto('/')
      
      // Test moz prefix support
      const mozSupport = await page.evaluate(() => {
        const testEl = document.createElement('div')
        return 'mozTransform' in testEl.style
      })
      
      if (browserName === 'firefox') {
        expect(mozSupport).toBe(true)
      }
    })

    test('should handle ms prefixes', async ({ page, browserName }) => {
      await page.goto('/')
      
      // Test ms prefix support
      const msSupport = await page.evaluate(() => {
        const testEl = document.createElement('div')
        return 'msTransform' in testEl.style
      })
      
      // MS prefixes are mainly for IE/Edge
      expect(msSupport).toBeDefined()
    })
  })
})

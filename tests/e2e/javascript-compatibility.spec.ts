import { test, expect } from '@playwright/test'

test.describe('JavaScript Cross-Browser Compatibility', () => {
  test.describe('ES6+ Features', () => {
    test('should support arrow functions', async ({ page }) => {
      await page.goto('/')
      
      // Test arrow function support
      const arrowFunctionSupport = await page.evaluate(() => {
        try {
          const arrow = () => 'test'
          return typeof arrow === 'function' && arrow() === 'test'
        } catch {
          return false
        }
      })
      
      expect(arrowFunctionSupport).toBe(true)
    })

    test('should support async/await', async ({ page }) => {
      await page.goto('/')
      
      // Test async/await support
      const asyncAwaitSupport = await page.evaluate(() => {
        try {
          const asyncFunc = async () => 'test'
          return typeof asyncFunc === 'function'
        } catch {
          return false
        }
      })
      
      expect(asyncAwaitSupport).toBe(true)
    })

    test('should support destructuring', async ({ page }) => {
      await page.goto('/')
      
      // Test destructuring support
      const destructuringSupport = await page.evaluate(() => {
        try {
          const obj = { a: 1, b: 2 }
          const { a, b } = obj
          return a === 1 && b === 2
        } catch {
          return false
        }
      })
      
      expect(destructuringSupport).toBe(true)
    })

    test('should support template literals', async ({ page }) => {
      await page.goto('/')
      
      // Test template literal support
      const templateLiteralSupport = await page.evaluate(() => {
        try {
          const name = 'test'
          const template = `Hello ${name}`
          return template === 'Hello test'
        } catch {
          return false
        }
      })
      
      expect(templateLiteralSupport).toBe(true)
    })

    test('should support spread operator', async ({ page }) => {
      await page.goto('/')
      
      // Test spread operator support
      const spreadSupport = await page.evaluate(() => {
        try {
          const arr1 = [1, 2]
          const arr2 = [3, 4]
          const combined = [...arr1, ...arr2]
          return combined.length === 4 && combined[0] === 1
        } catch {
          return false
        }
      })
      
      expect(spreadSupport).toBe(true)
    })

    test('should support rest parameters', async ({ page }) => {
      await page.goto('/')
      
      // Test rest parameters support
      const restSupport = await page.evaluate(() => {
        try {
          const restFunc = (...args) => args.length
          return restFunc(1, 2, 3) === 3
        } catch {
          return false
        }
      })
      
      expect(restSupport).toBe(true)
    })

    test('should support default parameters', async ({ page }) => {
      await page.goto('/')
      
      // Test default parameters support
      const defaultParamSupport = await page.evaluate(() => {
        try {
          const defaultFunc = (a = 'default') => a
          return defaultFunc() === 'default'
        } catch {
          return false
        }
      })
      
      expect(defaultParamSupport).toBe(true)
    })
  })

  test.describe('Promises and Async', () => {
    test('should support Promises', async ({ page }) => {
      await page.goto('/')
      
      // Test Promise support
      const promiseSupport = await page.evaluate(() => {
        try {
          const promise = new Promise(resolve => resolve('test'))
          return promise instanceof Promise
        } catch {
          return false
        }
      })
      
      expect(promiseSupport).toBe(true)
    })

    test('should support Promise.all', async ({ page }) => {
      await page.goto('/')
      
      // Test Promise.all support
      const promiseAllSupport = await page.evaluate(async () => {
        try {
          const promises = [
            Promise.resolve(1),
            Promise.resolve(2),
            Promise.resolve(3)
          ]
          const results = await Promise.all(promises)
          return results.length === 3 && results[0] === 1
        } catch {
          return false
        }
      })
      
      expect(promiseAllSupport).toBe(true)
    })

    test('should support Promise.race', async ({ page }) => {
      await page.goto('/')
      
      // Test Promise.race support
      const promiseRaceSupport = await page.evaluate(async () => {
        try {
          const promises = [
            new Promise(resolve => setTimeout(() => resolve('slow'), 100)),
            Promise.resolve('fast')
          ]
          const result = await Promise.race(promises)
          return result === 'fast'
        } catch {
          return false
        }
      })
      
      expect(promiseRaceSupport).toBe(true)
    })
  })

  test.describe('Web APIs', () => {
    test('should support Fetch API', async ({ page }) => {
      await page.goto('/')
      
      // Test Fetch API support
      const fetchSupport = await page.evaluate(() => {
        return typeof fetch === 'function'
      })
      
      expect(fetchSupport).toBe(true)
    })

    test('should support WebSocket', async ({ page }) => {
      await page.goto('/')
      
      // Test WebSocket support
      const webSocketSupport = await page.evaluate(() => {
        return typeof WebSocket === 'function'
      })
      
      expect(webSocketSupport).toBe(true)
    })

    test('should support Service Worker', async ({ page }) => {
      await page.goto('/')
      
      // Test Service Worker support
      const serviceWorkerSupport = await page.evaluate(() => {
        return 'serviceWorker' in navigator
      })
      
      expect(serviceWorkerSupport).toBe(true)
    })

    test('should support Push Manager', async ({ page }) => {
      await page.goto('/')
      
      // Test Push Manager support
      const pushManagerSupport = await page.evaluate(() => {
        return 'PushManager' in window
      })
      
      expect(pushManagerSupport).toBe(true)
    })

    test('should support Geolocation', async ({ page }) => {
      await page.goto('/')
      
      // Test Geolocation support
      const geolocationSupport = await page.evaluate(() => {
        return 'geolocation' in navigator
      })
      
      expect(geolocationSupport).toBe(true)
    })

    test('should support Local Storage', async ({ page }) => {
      await page.goto('/')
      
      // Test Local Storage support
      const localStorageSupport = await page.evaluate(() => {
        try {
          localStorage.setItem('test', 'value')
          const value = localStorage.getItem('test')
          localStorage.removeItem('test')
          return value === 'value'
        } catch {
          return false
        }
      })
      
      expect(localStorageSupport).toBe(true)
    })

    test('should support Session Storage', async ({ page }) => {
      await page.goto('/')
      
      // Test Session Storage support
      const sessionStorageSupport = await page.evaluate(() => {
        try {
          sessionStorage.setItem('test', 'value')
          const value = sessionStorage.getItem('test')
          sessionStorage.removeItem('test')
          return value === 'value'
        } catch {
          return false
        }
      })
      
      expect(sessionStorageSupport).toBe(true)
    })

    test('should support IndexedDB', async ({ page }) => {
      await page.goto('/')
      
      // Test IndexedDB support
      const indexedDBSupport = await page.evaluate(() => {
        return typeof indexedDB !== 'undefined'
      })
      
      expect(indexedDBSupport).toBe(true)
    })
  })

  test.describe('Modern APIs', () => {
    test('should support Intersection Observer', async ({ page }) => {
      await page.goto('/')
      
      // Test Intersection Observer support
      const intersectionObserverSupport = await page.evaluate(() => {
        return 'IntersectionObserver' in window
      })
      
      expect(intersectionObserverSupport).toBe(true)
    })

    test('should support Resize Observer', async ({ page }) => {
      await page.goto('/')
      
      // Test Resize Observer support
      const resizeObserverSupport = await page.evaluate(() => {
        return 'ResizeObserver' in window
      })
      
      expect(resizeObserverSupport).toBe(true)
    })

    test('should support Mutation Observer', async ({ page }) => {
      await page.goto('/')
      
      // Test Mutation Observer support
      const mutationObserverSupport = await page.evaluate(() => {
        return 'MutationObserver' in window
      })
      
      expect(mutationObserverSupport).toBe(true)
    })

    test('should support Custom Elements', async ({ page }) => {
      await page.goto('/')
      
      // Test Custom Elements support
      const customElementsSupport = await page.evaluate(() => {
        return 'customElements' in window
      })
      
      expect(customElementsSupport).toBe(true)
    })

    test('should support Web Animations', async ({ page }) => {
      await page.goto('/')
      
      // Test Web Animations support
      const webAnimationsSupport = await page.evaluate(() => {
        return 'Animation' in window
      })
      
      expect(webAnimationsSupport).toBe(true)
    })
  })

  test.describe('Media APIs', () => {
    test('should support getUserMedia', async ({ page }) => {
      await page.goto('/')
      
      // Test getUserMedia support
      const getUserMediaSupport = await page.evaluate(() => {
        return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
      })
      
      expect(getUserMediaSupport).toBe(true)
    })

    test('should support WebRTC', async ({ page }) => {
      await page.goto('/')
      
      // Test WebRTC support
      const webRTCSupport = await page.evaluate(() => {
        return 'RTCPeerConnection' in window
      })
      
      expect(webRTCSupport).toBe(true)
    })

    test('should support Web Audio', async ({ page }) => {
      await page.goto('/')
      
      // Test Web Audio support
      const webAudioSupport = await page.evaluate(() => {
        return 'AudioContext' in window || 'webkitAudioContext' in window
      })
      
      expect(webAudioSupport).toBe(true)
    })
  })

  test.describe('File APIs', () => {
    test('should support File Reader', async ({ page }) => {
      await page.goto('/')
      
      // Test File Reader support
      const fileReaderSupport = await page.evaluate(() => {
        return 'FileReader' in window
      })
      
      expect(fileReaderSupport).toBe(true)
    })

    test('should support Drag and Drop', async ({ page }) => {
      await page.goto('/')
      
      // Test Drag and Drop support
      const dragDropSupport = await page.evaluate(() => {
        const testEl = document.createElement('div')
        return 'draggable' in testEl
      })
      
      expect(dragDropSupport).toBe(true)
    })

    test('should support Clipboard API', async ({ page }) => {
      await page.goto('/')
      
      // Test Clipboard API support
      const clipboardSupport = await page.evaluate(() => {
        return 'clipboard' in navigator
      })
      
      expect(clipboardSupport).toBe(true)
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
      
      // Wait for any async operations
      await page.waitForTimeout(1000)
      
      // Should not have critical JavaScript errors
      const criticalErrors = errors.filter(error => 
        error.includes('Uncaught') || 
        error.includes('ReferenceError') || 
        error.includes('TypeError')
      )
      
      expect(criticalErrors.length).toBe(0)
    })

    test('should handle async errors gracefully', async ({ page }) => {
      // Test async error handling
      const asyncErrorHandling = await page.evaluate(async () => {
        try {
          await new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Test error')), 10)
          })
          return false
        } catch (error) {
          return error.message === 'Test error'
        }
      })
      
      expect(asyncErrorHandling).toBe(true)
    })
  })

  test.describe('Performance', () => {
    test('should support requestAnimationFrame', async ({ page }) => {
      await page.goto('/')
      
      // Test requestAnimationFrame support
      const rafSupport = await page.evaluate(() => {
        return typeof requestAnimationFrame === 'function'
      })
      
      expect(rafSupport).toBe(true)
    })

    test('should support requestIdleCallback', async ({ page }) => {
      await page.goto('/')
      
      // Test requestIdleCallback support
      const ricSupport = await page.evaluate(() => {
        return typeof requestIdleCallback === 'function'
      })
      
      expect(ricSupport).toBe(true)
    })

    test('should support performance API', async ({ page }) => {
      await page.goto('/')
      
      // Test Performance API support
      const performanceSupport = await page.evaluate(() => {
        return 'performance' in window && 'now' in performance
      })
      
      expect(performanceSupport).toBe(true)
    })
  })
})

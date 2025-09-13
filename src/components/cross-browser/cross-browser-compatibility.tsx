'use client'

import { useEffect } from 'react'
import { crossBrowserUtils, detectBrowser, detectFeatures, handleBrowserQuirks } from '@/lib/utils/cross-browser'
import { cssCrossBrowserUtils, handleCSSCompatibility } from '@/lib/utils/css-cross-browser'

export default function CrossBrowserCompatibility() {
  useEffect(() => {
    // Initialize cross-browser compatibility
    const initializeCompatibility = () => {
      try {
        // Detect browser and features
        const browser = detectBrowser()
        const features = detectFeatures()
        const cssFeatures = cssCrossBrowserUtils.detectCSSFeatures()

        // Handle browser-specific quirks
        handleBrowserQuirks()
        handleCSSCompatibility()

        // Add browser-specific classes to document
        const root = document.documentElement
        
        // Add browser classes
        root.classList.add(`browser-${browser.name.toLowerCase()}`)
        root.classList.add(`browser-version-${browser.version}`)
        
        // Add device classes
        if (browser.isMobile) {
          root.classList.add('device-mobile')
        } else if (browser.isTablet) {
          root.classList.add('device-tablet')
        } else {
          root.classList.add('device-desktop')
        }

        // Add feature support classes
        Object.entries(features).forEach(([feature, supported]) => {
          if (supported) {
            root.classList.add(`feature-${feature}`)
          } else {
            root.classList.add(`no-feature-${feature}`)
          }
        })

        // Add CSS feature support classes
        Object.entries(cssFeatures).forEach(([feature, supported]) => {
          if (supported) {
            root.classList.add(`css-${feature}`)
          } else {
            root.classList.add(`no-css-${feature}`)
          }
        })

        // Log compatibility info in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Browser Compatibility Info:', {
            browser,
            features,
            cssFeatures
          })
        }

        // Handle specific browser issues
        if (browser.isSafari) {
          handleSafariIssues()
        } else if (browser.isFirefox) {
          handleFirefoxIssues()
        } else if (browser.isIE) {
          handleIEIssues()
        }

      } catch (error) {
        console.error('Cross-browser compatibility initialization failed:', error)
      }
    }

    // Safari-specific fixes
    const handleSafariIssues = () => {
      // Fix Safari viewport issues
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover')
      }

      // Fix Safari scrolling
      document.body.style.webkitOverflowScrolling = 'touch'

      // Fix Safari flexbox issues
      const style = document.createElement('style')
      style.textContent = `
        .safari-flex-fix {
          display: -webkit-box;
          display: -webkit-flex;
          display: flex;
        }
      `
      document.head.appendChild(style)
    }

    // Firefox-specific fixes
    const handleFirefoxIssues = () => {
      // Fix Firefox flexbox issues
      const style = document.createElement('style')
      style.textContent = `
        .firefox-flex-fix {
          display: -moz-box;
          display: -webkit-box;
          display: flex;
        }
      `
      document.head.appendChild(style)
    }

    // IE-specific fixes
    const handleIEIssues = () => {
      // Add IE-specific classes
      document.documentElement.classList.add('ie')
      
      // Fix IE flexbox issues
      const style = document.createElement('style')
      style.textContent = `
        .ie-flex-fix {
          display: -ms-flexbox;
          display: flex;
        }
      `
      document.head.appendChild(style)
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeCompatibility)
    } else {
      initializeCompatibility()
    }

    // Cleanup
    return () => {
      document.removeEventListener('DOMContentLoaded', initializeCompatibility)
    }
  }, [])

  return null
}

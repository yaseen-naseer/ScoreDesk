/**
 * Cross-Browser Compatibility Utilities
 * Provides feature detection and browser-specific workarounds
 */

export interface BrowserInfo {
  name: string
  version: string
  isChrome: boolean
  isFirefox: boolean
  isSafari: boolean
  isEdge: boolean
  isIE: boolean
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export interface FeatureSupport {
  // CSS Features
  cssGrid: boolean
  cssFlexbox: boolean
  cssCustomProperties: boolean
  cssTransforms: boolean
  cssTransitions: boolean
  cssAnimations: boolean
  
  // JavaScript Features
  es6Modules: boolean
  asyncAwait: boolean
  arrowFunctions: boolean
  destructuring: boolean
  templateLiterals: boolean
  promises: boolean
  
  // Web APIs
  fetch: boolean
  webSocket: boolean
  serviceWorker: boolean
  pushManager: boolean
  geolocation: boolean
  localStorage: boolean
  sessionStorage: boolean
  indexedDB: boolean
  
  // Modern APIs
  intersectionObserver: boolean
  resizeObserver: boolean
  mutationObserver: boolean
  customElements: boolean
  webAnimations: boolean
  
  // Media APIs
  getUserMedia: boolean
  webRTC: boolean
  webAudio: boolean
  
  // File APIs
  fileReader: boolean
  dragDrop: boolean
  clipboard: boolean
}

export class CrossBrowserUtils {
  private static instance: CrossBrowserUtils
  private browserInfo: BrowserInfo | null = null
  private featureSupport: FeatureSupport | null = null

  private constructor() {}

  public static getInstance(): CrossBrowserUtils {
    if (!CrossBrowserUtils.instance) {
      CrossBrowserUtils.instance = new CrossBrowserUtils()
    }
    return CrossBrowserUtils.instance
  }

  /**
   * Detect browser information
   */
  public detectBrowser(): BrowserInfo {
    if (this.browserInfo) {
      return this.browserInfo
    }

    if (typeof window === 'undefined') {
      return this.getDefaultBrowserInfo()
    }

    const userAgent = navigator.userAgent
    const platform = navigator.platform

    // Detect browser
    const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent)
    const isFirefox = /Firefox/.test(userAgent)
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
    const isEdge = /Edge/.test(userAgent)
    const isIE = /Trident/.test(userAgent) || /MSIE/.test(userAgent)

    // Detect device type
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android(?=.*\bMobile\b)/i.test(userAgent)
    const isDesktop = !isMobile && !isTablet

    // Extract version (simplified)
    let version = 'unknown'
    if (isChrome) {
      const match = userAgent.match(/Chrome\/(\d+)/)
      version = match ? match[1] : 'unknown'
    } else if (isFirefox) {
      const match = userAgent.match(/Firefox\/(\d+)/)
      version = match ? match[1] : 'unknown'
    } else if (isSafari) {
      const match = userAgent.match(/Version\/(\d+)/)
      version = match ? match[1] : 'unknown'
    }

    this.browserInfo = {
      name: isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : isEdge ? 'Edge' : isIE ? 'IE' : 'Unknown',
      version,
      isChrome,
      isFirefox,
      isSafari,
      isEdge,
      isIE,
      isMobile,
      isTablet,
      isDesktop
    }

    return this.browserInfo
  }

  /**
   * Detect feature support
   */
  public detectFeatures(): FeatureSupport {
    if (this.featureSupport) {
      return this.featureSupport
    }

    if (typeof window === 'undefined') {
      return this.getDefaultFeatureSupport()
    }

    const testElement = document.createElement('div')
    const testStyle = testElement.style

    this.featureSupport = {
      // CSS Features
      cssGrid: 'grid' in testStyle,
      cssFlexbox: 'flex' in testStyle,
      cssCustomProperties: CSS.supports('color', 'var(--test)'),
      cssTransforms: 'transform' in testStyle,
      cssTransitions: 'transition' in testStyle,
      cssAnimations: 'animation' in testStyle,

      // JavaScript Features
      es6Modules: false, // Cannot test import in this context
      asyncAwait: typeof (async () => {}) === 'function',
      arrowFunctions: typeof (() => {}) === 'function',
      destructuring: (() => {
        try {
          const obj = { a: 1 }
          const { a } = obj
          return a === 1
        } catch (e) {
          return false
        }
      })(),
      templateLiterals: typeof `test` === 'string',
      promises: typeof Promise !== 'undefined',

      // Web APIs
      fetch: typeof fetch === 'function',
      webSocket: typeof WebSocket === 'function',
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      geolocation: 'geolocation' in navigator,
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      indexedDB: typeof indexedDB !== 'undefined',

      // Modern APIs
      intersectionObserver: 'IntersectionObserver' in window,
      resizeObserver: 'ResizeObserver' in window,
      mutationObserver: 'MutationObserver' in window,
      customElements: 'customElements' in window,
      webAnimations: 'Animation' in window,

      // Media APIs
      getUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      webRTC: 'RTCPeerConnection' in window,
      webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,

      // File APIs
      fileReader: 'FileReader' in window,
      dragDrop: 'draggable' in testElement,
      clipboard: 'clipboard' in navigator
    }

    return this.featureSupport
  }

  /**
   * Check if a specific feature is supported
   */
  public isFeatureSupported(feature: keyof FeatureSupport): boolean {
    const features = this.detectFeatures()
    return features[feature]
  }

  /**
   * Get browser-specific CSS prefix
   */
  public getCSSPrefix(): string {
    const browser = this.detectBrowser()
    
    if (browser.isSafari || browser.isChrome) {
      return '-webkit-'
    } else if (browser.isFirefox) {
      return '-moz-'
    } else if (browser.isEdge) {
      return '-ms-'
    }
    
    return ''
  }

  /**
   * Apply browser-specific styles
   */
  public applyBrowserStyles(element: HTMLElement, styles: Record<string, string>): void {
    const prefix = this.getCSSPrefix()
    
    Object.entries(styles).forEach(([property, value]) => {
      // Apply standard property
      element.style.setProperty(property, value)
      
      // Apply prefixed version if needed
      if (prefix && this.needsPrefix(property)) {
        element.style.setProperty(`${prefix}${property}`, value)
      }
    })
  }

  /**
   * Check if CSS property needs prefix
   */
  private needsPrefix(property: string): boolean {
    const prefixedProperties = [
      'transform',
      'transition',
      'animation',
      'flex',
      'grid',
      'filter',
      'backdrop-filter',
      'clip-path',
      'mask',
      'user-select'
    ]
    
    return prefixedProperties.includes(property)
  }

  /**
   * Get browser-specific event names
   */
  public getEventNames(): Record<string, string> {
    const browser = this.detectBrowser()
    
    if (browser.isSafari || browser.isChrome) {
      return {
        animationStart: 'webkitAnimationStart',
        animationEnd: 'webkitAnimationEnd',
        transitionEnd: 'webkitTransitionEnd'
      }
    }
    
    return {
      animationStart: 'animationstart',
      animationEnd: 'animationend',
      transitionEnd: 'transitionend'
    }
  }

  /**
   * Handle browser-specific quirks
   */
  public handleBrowserQuirks(): void {
    const browser = this.detectBrowser()
    
    if (browser.isSafari) {
      // Safari-specific fixes
      this.fixSafariScrolling()
      this.fixSafariViewport()
    }
    
    if (browser.isFirefox) {
      // Firefox-specific fixes
      this.fixFirefoxFlexbox()
    }
    
    if (browser.isIE) {
      // IE-specific fixes
      this.fixIESupport()
    }
  }

  private fixSafariScrolling(): void {
    // Fix Safari scrolling issues
    if (typeof document !== 'undefined') {
      document.body.style.webkitOverflowScrolling = 'touch'
    }
  }

  private fixSafariViewport(): void {
    // Fix Safari viewport issues
    if (typeof window !== 'undefined') {
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover')
      }
    }
  }

  private fixFirefoxFlexbox(): void {
    // Firefox flexbox fixes
    if (typeof document !== 'undefined') {
      const style = document.createElement('style')
      style.textContent = `
        .flex-container {
          display: -moz-box;
          display: -webkit-box;
          display: flex;
        }
      `
      document.head.appendChild(style)
    }
  }

  private fixIESupport(): void {
    // IE-specific fixes
    if (typeof window !== 'undefined') {
      // Add IE-specific classes
      document.documentElement.classList.add('ie')
    }
  }

  private getDefaultBrowserInfo(): BrowserInfo {
    return {
      name: 'Unknown',
      version: 'unknown',
      isChrome: false,
      isFirefox: false,
      isSafari: false,
      isEdge: false,
      isIE: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true
    }
  }

  private getDefaultFeatureSupport(): FeatureSupport {
    return {
      cssGrid: false,
      cssFlexbox: false,
      cssCustomProperties: false,
      cssTransforms: false,
      cssTransitions: false,
      cssAnimations: false,
      es6Modules: false,
      asyncAwait: false,
      arrowFunctions: false,
      destructuring: false,
      templateLiterals: false,
      promises: false,
      fetch: false,
      webSocket: false,
      serviceWorker: false,
      pushManager: false,
      geolocation: false,
      localStorage: false,
      sessionStorage: false,
      indexedDB: false,
      intersectionObserver: false,
      resizeObserver: false,
      mutationObserver: false,
      customElements: false,
      webAnimations: false,
      getUserMedia: false,
      webRTC: false,
      webAudio: false,
      fileReader: false,
      dragDrop: false,
      clipboard: false
    }
  }
}

// Export singleton instance
export const crossBrowserUtils = CrossBrowserUtils.getInstance()

// Export utility functions
export const detectBrowser = () => crossBrowserUtils.detectBrowser()
export const detectFeatures = () => crossBrowserUtils.detectFeatures()
export const isFeatureSupported = (feature: keyof FeatureSupport) => crossBrowserUtils.isFeatureSupported(feature)
export const getCSSPrefix = () => crossBrowserUtils.getCSSPrefix()
export const applyBrowserStyles = (element: HTMLElement, styles: Record<string, string>) => crossBrowserUtils.applyBrowserStyles(element, styles)
export const getEventNames = () => crossBrowserUtils.getEventNames()
export const handleBrowserQuirks = () => crossBrowserUtils.handleBrowserQuirks()

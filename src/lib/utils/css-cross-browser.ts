/**
 * CSS Cross-Browser Compatibility Utilities
 * Provides CSS feature detection and fallbacks
 */

export interface CSSFeatureSupport {
  // Layout
  grid: boolean
  flexbox: boolean
  subgrid: boolean
  
  // Visual Effects
  backdropFilter: boolean
  clipPath: boolean
  mask: boolean
  filter: boolean
  
  // Transforms & Animations
  transform: boolean
  transform3d: boolean
  transition: boolean
  animation: boolean
  
  // Typography
  fontFeatureSettings: boolean
  textShadow: boolean
  textStroke: boolean
  
  // Colors & Gradients
  customProperties: boolean
  conicGradient: boolean
  linearGradient: boolean
  radialGradient: boolean
  
  // Positioning
  sticky: boolean
  fixed: boolean
  absolute: boolean
  
  // Sizing
  calc: boolean
  minMax: boolean
  fitContent: boolean
  
  // Scrolling
  scrollBehavior: boolean
  overscrollBehavior: boolean
  
  // Media Queries
  hover: boolean
  pointer: boolean
  prefersReducedMotion: boolean
  prefersColorScheme: boolean
}

export class CSSCrossBrowserUtils {
  private static instance: CSSCrossBrowserUtils
  private featureSupport: CSSFeatureSupport | null = null

  private constructor() {}

  public static getInstance(): CSSCrossBrowserUtils {
    if (!CSSCrossBrowserUtils.instance) {
      CSSCrossBrowserUtils.instance = new CSSCrossBrowserUtils()
    }
    return CSSCrossBrowserUtils.instance
  }

  /**
   * Detect CSS feature support
   */
  public detectCSSFeatures(): CSSFeatureSupport {
    if (this.featureSupport) {
      return this.featureSupport
    }

    if (typeof window === 'undefined') {
      return this.getDefaultCSSSupport()
    }

    const testElement = document.createElement('div')
    const testStyle = testElement.style

    this.featureSupport = {
      // Layout
      grid: 'grid' in testStyle,
      flexbox: 'flex' in testStyle,
      subgrid: CSS.supports('grid-template-columns', 'subgrid'),

      // Visual Effects
      backdropFilter: 'backdropFilter' in testStyle || 'webkitBackdropFilter' in testStyle,
      clipPath: 'clipPath' in testStyle || 'webkitClipPath' in testStyle,
      mask: 'mask' in testStyle || 'webkitMask' in testStyle,
      filter: 'filter' in testStyle || 'webkitFilter' in testStyle,

      // Transforms & Animations
      transform: 'transform' in testStyle || 'webkitTransform' in testStyle,
      transform3d: CSS.supports('transform', 'translateZ(0)'),
      transition: 'transition' in testStyle || 'webkitTransition' in testStyle,
      animation: 'animation' in testStyle || 'webkitAnimation' in testStyle,

      // Typography
      fontFeatureSettings: 'fontFeatureSettings' in testStyle,
      textShadow: 'textShadow' in testStyle,
      textStroke: 'webkitTextStroke' in testStyle,

      // Colors & Gradients
      customProperties: CSS.supports('color', 'var(--test)'),
      conicGradient: CSS.supports('background', 'conic-gradient(red, blue)'),
      linearGradient: CSS.supports('background', 'linear-gradient(red, blue)'),
      radialGradient: CSS.supports('background', 'radial-gradient(red, blue)'),

      // Positioning
      sticky: CSS.supports('position', 'sticky'),
      fixed: CSS.supports('position', 'fixed'),
      absolute: CSS.supports('position', 'absolute'),

      // Sizing
      calc: CSS.supports('width', 'calc(100% - 10px)'),
      minMax: CSS.supports('width', 'minmax(100px, 1fr)'),
      fitContent: CSS.supports('width', 'fit-content'),

      // Scrolling
      scrollBehavior: 'scrollBehavior' in testStyle,
      overscrollBehavior: 'overscrollBehavior' in testStyle,

      // Media Queries
      hover: CSS.supports('hover', 'hover'),
      pointer: CSS.supports('pointer', 'coarse'),
      prefersReducedMotion: CSS.supports('prefers-reduced-motion', 'reduce'),
      prefersColorScheme: CSS.supports('prefers-color-scheme', 'dark')
    }

    return this.featureSupport
  }

  /**
   * Get CSS fallback for unsupported features
   */
  public getCSSFallback(feature: keyof CSSFeatureSupport): string {
    const features = this.detectCSSFeatures()
    
    if (features[feature]) {
      return ''
    }

    const fallbacks: Record<string, string> = {
      grid: 'display: block;',
      flexbox: 'display: block;',
      backdropFilter: 'background-color: rgba(0, 0, 0, 0.5);',
      clipPath: 'overflow: hidden;',
      mask: 'opacity: 0.8;',
      filter: 'opacity: 0.8;',
      transform: 'position: relative;',
      transform3d: 'position: relative;',
      transition: 'transition: none;',
      animation: 'animation: none;',
      customProperties: 'color: inherit;',
      conicGradient: 'background: linear-gradient(45deg, red, blue);',
      linearGradient: 'background-color: red;',
      radialGradient: 'background-color: red;',
      sticky: 'position: relative;',
      calc: 'width: 100%;',
      minMax: 'width: 100%;',
      fitContent: 'width: auto;',
      scrollBehavior: 'scroll-behavior: auto;',
      overscrollBehavior: 'overflow: auto;'
    }

    return fallbacks[feature] || ''
  }

  /**
   * Apply CSS with fallbacks
   */
  public applyCSSWithFallback(element: HTMLElement, property: string, value: string): void {
    const features = this.detectCSSFeatures()
    
    // Apply the main property
    element.style.setProperty(property, value)
    
    // Apply fallback if needed
    const fallback = this.getCSSFallback(property as keyof CSSFeatureSupport)
    if (fallback) {
      element.style.cssText += fallback
    }
  }

  /**
   * Get browser-specific CSS prefix
   */
  public getCSSPrefix(): string {
    if (typeof window === 'undefined') {
      return ''
    }

    const testElement = document.createElement('div')
    const testStyle = testElement.style

    if ('webkitTransform' in testStyle) {
      return '-webkit-'
    } else if ('mozTransform' in testStyle) {
      return '-moz-'
    } else if ('msTransform' in testStyle) {
      return '-ms-'
    } else if ('oTransform' in testStyle) {
      return '-o-'
    }

    return ''
  }

  /**
   * Apply prefixed CSS properties
   */
  public applyPrefixedCSS(element: HTMLElement, property: string, value: string): void {
    const prefix = this.getCSSPrefix()
    
    // Apply standard property
    element.style.setProperty(property, value)
    
    // Apply prefixed version
    if (prefix) {
      element.style.setProperty(`${prefix}${property}`, value)
    }
  }

  /**
   * Create CSS with fallbacks
   */
  public createCSSWithFallbacks(styles: Record<string, string>): string {
    const features = this.detectCSSFeatures()
    const prefix = this.getCSSPrefix()
    let css = ''

    Object.entries(styles).forEach(([property, value]) => {
      // Add prefixed version first
      if (prefix && this.needsPrefix(property)) {
        css += `${prefix}${property}: ${value};\n`
      }
      
      // Add standard version
      css += `${property}: ${value};\n`
      
      // Add fallback if feature not supported
      const fallback = this.getCSSFallback(property as keyof CSSFeatureSupport)
      if (fallback) {
        css += fallback + '\n'
      }
    })

    return css
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
      'user-select',
      'appearance',
      'box-sizing',
      'border-radius',
      'box-shadow',
      'text-shadow',
      'linear-gradient',
      'radial-gradient',
      'conic-gradient',
      'background-size',
      'background-clip',
      'background-origin',
      'background-attachment',
      'background-position',
      'background-repeat',
      'background-image',
      'background-color',
      'background',
      'border-image',
      'border-image-source',
      'border-image-slice',
      'border-image-width',
      'border-image-outset',
      'border-image-repeat',
      'border-radius',
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-left-radius',
      'border-bottom-right-radius',
      'border-image',
      'border-image-source',
      'border-image-slice',
      'border-image-width',
      'border-image-outset',
      'border-image-repeat',
      'border-radius',
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-left-radius',
      'border-bottom-right-radius'
    ]
    
    return prefixedProperties.includes(property)
  }

  /**
   * Handle CSS compatibility issues
   */
  public handleCSSCompatibility(): void {
    if (typeof document === 'undefined') {
      return
    }

    const features = this.detectCSSFeatures()
    
    // Add CSS classes based on feature support
    const root = document.documentElement
    
    Object.entries(features).forEach(([feature, supported]) => {
      if (supported) {
        root.classList.add(`css-${feature}`)
      } else {
        root.classList.add(`no-css-${feature}`)
      }
    })

    // Add browser-specific classes
    const userAgent = navigator.userAgent
    if (/Chrome/.test(userAgent)) {
      root.classList.add('browser-chrome')
    } else if (/Firefox/.test(userAgent)) {
      root.classList.add('browser-firefox')
    } else if (/Safari/.test(userAgent)) {
      root.classList.add('browser-safari')
    } else if (/Edge/.test(userAgent)) {
      root.classList.add('browser-edge')
    } else if (/Trident/.test(userAgent)) {
      root.classList.add('browser-ie')
    }

    // Add device-specific classes
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      root.classList.add('device-mobile')
    } else {
      root.classList.add('device-desktop')
    }
  }

  private getDefaultCSSSupport(): CSSFeatureSupport {
    return {
      grid: false,
      flexbox: false,
      subgrid: false,
      backdropFilter: false,
      clipPath: false,
      mask: false,
      filter: false,
      transform: false,
      transform3d: false,
      transition: false,
      animation: false,
      fontFeatureSettings: false,
      textShadow: false,
      textStroke: false,
      customProperties: false,
      conicGradient: false,
      linearGradient: false,
      radialGradient: false,
      sticky: false,
      fixed: false,
      absolute: false,
      calc: false,
      minMax: false,
      fitContent: false,
      scrollBehavior: false,
      overscrollBehavior: false,
      hover: false,
      pointer: false,
      prefersReducedMotion: false,
      prefersColorScheme: false
    }
  }
}

// Export singleton instance
export const cssCrossBrowserUtils = CSSCrossBrowserUtils.getInstance()

// Export utility functions
export const detectCSSFeatures = () => cssCrossBrowserUtils.detectCSSFeatures()
export const getCSSFallback = (feature: keyof CSSFeatureSupport) => cssCrossBrowserUtils.getCSSFallback(feature)
export const applyCSSWithFallback = (element: HTMLElement, property: string, value: string) => cssCrossBrowserUtils.applyCSSWithFallback(element, property, value)
export const getCSSPrefix = () => cssCrossBrowserUtils.getCSSPrefix()
export const applyPrefixedCSS = (element: HTMLElement, property: string, value: string) => cssCrossBrowserUtils.applyPrefixedCSS(element, property, value)
export const createCSSWithFallbacks = (styles: Record<string, string>) => cssCrossBrowserUtils.createCSSWithFallbacks(styles)
export const handleCSSCompatibility = () => cssCrossBrowserUtils.handleCSSCompatibility()

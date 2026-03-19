import '@testing-library/jest-dom/vitest'

import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

import { vibeCoderModelsRanked } from '../data/pricing'
import { useCalculatorStore } from '../store/use-calculator-store'

const originalClipboard = navigator.clipboard

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: ResizeObserverMock,
})

// Fix JSDOM issues with Radix UI / Pointer events
if (typeof window !== 'undefined') {
  if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
  }
  if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = vi.fn()
  }
  if (!window.HTMLElement.prototype.setPointerCapture) {
    window.HTMLElement.prototype.setPointerCapture = vi.fn()
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  }
}

beforeEach(() => {
  if (window.localStorage && typeof window.localStorage.clear === 'function') {
    window.localStorage.clear()
  }
  useCalculatorStore.setState({
    outputMode: 'lines',
    targetLines: 30000,
    appCount: 2,
    appComplexity: 'medium',
    slotHours: 160,
    activeHoursPerWeek: 20,
    electricityUsdPerKwh: 0.18,
    linesPerHour: 700,
    parallelWorkstreams: 1,
    tokensPerLine: 120,
    amortizationYears: 3,
    hideSoftQuotaSubscriptions: true,
    selectedModelId: vibeCoderModelsRanked[0].id,
    agreedModelIds: vibeCoderModelsRanked.map((m) => m.id),
    enabledCategories: {
      subscription: true,
      api: true,
      'home-hardware': true,
      hyperscaler: true,
      marketplace: true,
    },
  })

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  })
})

afterEach(() => {
  cleanup()
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: originalClipboard,
  })
  vi.restoreAllMocks()
})

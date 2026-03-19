import { describe, expect, it } from 'vitest'
import { calculateScenario, type CalculatorInputs } from './calculator'
import { vibeCoderModelsRanked } from '../data/pricing'

const baseInputs: CalculatorInputs = {
  outputMode: 'lines',
  targetLines: 30000,
  appCount: 2,
  appComplexity: 'medium',
  slotHours: 160,
  activeHoursPerWeek: 20,
  electricityUsdPerKwh: 0.18,
  linesPerHour: 700,
  parallelWorkstreams: 1,
  tokensPerLine: 3500,
  amortizationYears: 3,
  selectedModelId: vibeCoderModelsRanked[0].id,
  hideSoftQuotaSubscriptions: false,
  enabledCategories: {
    subscription: true,
    api: true,
    'home-hardware': true,
    hyperscaler: true,
    marketplace: true,
  },
}

describe('comprehensive recalculation check', () => {
  it('detects changes when targetLines changes', () => {
    const res1 = calculateScenario({ ...baseInputs, targetLines: 10000 })
    const res2 = calculateScenario({ ...baseInputs, targetLines: 20000 })
    expect(res1.effectiveTargetLines).not.toBe(res2.effectiveTargetLines)
    // Most series costs should change if they are usage-based
    const api1 = res1.visibleSeries.find(s => s.category === 'api')!.selectedPoint.totalCostUsd
    const api2 = res2.visibleSeries.find(s => s.category === 'api')!.selectedPoint.totalCostUsd
    expect(api1).not.toBe(api2)
  })

  it('detects changes when linesPerHour changes (affects time-based costs)', () => {
    const res1 = calculateScenario({ ...baseInputs, linesPerHour: 200 })
    const res2 = calculateScenario({ ...baseInputs, linesPerHour: 1000 })
    
    // API cost should NOT change (it's token based)
    const api1 = res1.visibleSeries.find(s => s.category === 'api')!.selectedPoint.totalCostUsd
    const api2 = res2.visibleSeries.find(s => s.category === 'api')!.selectedPoint.totalCostUsd
    expect(api1).toBe(api2)

    // Home hardware cost SHOULD change (it's time based)
    const home1 = res1.visibleSeries.find(s => s.category === 'home-hardware')!.selectedPoint.totalCostUsd
    const home2 = res2.visibleSeries.find(s => s.category === 'home-hardware')!.selectedPoint.totalCostUsd
    expect(home1).not.toBe(home2)
    expect(home2).toBeLessThan(home1) // Higher productivity = less time = less cost
  })

  it('detects changes when parallelWorkstreams changes', () => {
    const res1 = calculateScenario({ ...baseInputs, parallelWorkstreams: 1 })
    const res2 = calculateScenario({ ...baseInputs, parallelWorkstreams: 3 })
    
    expect(res1.parallelMultiplier).toBe(1)
    expect(res2.parallelMultiplier).toBe(2.4)
    expect(res1.effectiveLinesPerHour).not.toBe(res2.effectiveLinesPerHour)

    // Home hardware cost SHOULD change
    const home1 = res1.visibleSeries.find(s => s.category === 'home-hardware')!.selectedPoint.totalCostUsd
    const home2 = res2.visibleSeries.find(s => s.category === 'home-hardware')!.selectedPoint.totalCostUsd
    expect(home1).not.toBe(home2)
  })

  it('detects changes when tokensPerLine changes', () => {
    const res1 = calculateScenario({ ...baseInputs, tokensPerLine: 1000 })
    const res2 = calculateScenario({ ...baseInputs, tokensPerLine: 5000 })
    
    // API cost SHOULD change
    const api1 = res1.visibleSeries.find(s => s.category === 'api')!.selectedPoint.totalCostUsd
    const api2 = res2.visibleSeries.find(s => s.category === 'api')!.selectedPoint.totalCostUsd
    expect(api1).not.toBe(api2)

    // Subscription overage might change
    const cursor1 = res1.visibleSeries.find(s => s.id === 'cursor-pro')!.selectedPoint.totalCostUsd
    const cursor2 = res2.visibleSeries.find(s => s.id === 'cursor-pro')!.selectedPoint.totalCostUsd
    // At 30k lines and 5000 tokens/line, Cursor Pro will definitely hit overage
    expect(cursor1).not.toBe(cursor2)
  })

  it('detects changes when electricityUsdPerKwh changes', () => {
    const res1 = calculateScenario({ ...baseInputs, electricityUsdPerKwh: 0.1 })
    const res2 = calculateScenario({ ...baseInputs, electricityUsdPerKwh: 0.5 })
    
    const home1 = res1.visibleSeries.find(s => s.category === 'home-hardware')!.selectedPoint.totalCostUsd
    const home2 = res2.visibleSeries.find(s => s.category === 'home-hardware')!.selectedPoint.totalCostUsd
    expect(home1).not.toBe(home2)
  })

  it('detects changes when amortizationYears changes', () => {
    const res1 = calculateScenario({ ...baseInputs, amortizationYears: 2 })
    const res2 = calculateScenario({ ...baseInputs, amortizationYears: 5 })
    
    const home1 = res1.visibleSeries.find(s => s.category === 'home-hardware')!.selectedPoint.totalCostUsd
    const home2 = res2.visibleSeries.find(s => s.category === 'home-hardware')!.selectedPoint.totalCostUsd
    expect(home1).not.toBe(home2)
  })

  it('detects changes when selectedModelId changes (affects productivity)', () => {
    const res1 = calculateScenario({ ...baseInputs, selectedModelId: 'claude-opus-4-6' })
    const res2 = calculateScenario({ ...baseInputs, selectedModelId: 'starcoder2' })
    
    expect(res1.modelProductivityMultiplier).toBe(1.0)
    expect(res2.modelProductivityMultiplier).toBeLessThan(1.0)
    expect(res1.effectiveLinesPerHour).not.toBe(res2.effectiveLinesPerHour)
    
    // Home hardware cost SHOULD change as it takes more time to produce same lines
    const home1 = res1.visibleSeries.find(s => s.id === 'rtx-3060-12gb')!.selectedPoint.totalCostUsd
    const home2 = res2.visibleSeries.find(s => s.id === 'rtx-3060-12gb')!.selectedPoint.totalCostUsd
    expect(home1).not.toBe(home2)
    expect(home2).toBeGreaterThan(home1)
  })

  it('detects changes when outputMode and complexity changes', () => {
    const res1 = calculateScenario({ ...baseInputs, outputMode: 'apps', appCount: 1, appComplexity: 'simple' })
    const res2 = calculateScenario({ ...baseInputs, outputMode: 'apps', appCount: 1, appComplexity: 'complex' })
    
    expect(res1.effectiveTargetLines).toBe(1800)
    expect(res2.effectiveTargetLines).toBe(18000)
    
    const api1 = res1.visibleSeries.find(s => s.category === 'api')!.selectedPoint.totalCostUsd
    const api2 = res2.visibleSeries.find(s => s.category === 'api')!.selectedPoint.totalCostUsd
    expect(api1).not.toBe(api2)
  })

  it('detects changes when slotHours changes (affects feasibility but not cost itself, unless logic uses it)', () => {
    const res1 = calculateScenario({ ...baseInputs, slotHours: 10 })
    const res2 = calculateScenario({ ...baseInputs, slotHours: 200 })
    
    // Feasibility should change
    expect(res1.visibleSeries[0].selectedPoint.feasibleInSlot).toBe(false)
    expect(res2.visibleSeries[0].selectedPoint.feasibleInSlot).toBe(true)
    
    // monthlyWorkDays should change
    expect(res1.monthlyWorkDays).toBe(1.25)
    expect(res2.monthlyWorkDays).toBe(25)
  })
})

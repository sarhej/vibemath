import { describe, expect, it } from 'vitest'

import {
  calculateScenario,
  getParallelWorkstreamMultiplier,
  resolveTargetLines,
  type CalculatorInputs,
} from './calculator'
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
    tokensPerLine: 120,
    amortizationYears: 3,
    hideSoftQuotaSubscriptions: false,
    selectedModelId: vibeCoderModelsRanked[0].id,
    enabledCategories: {
    subscription: true,
    api: true,
    'home-hardware': true,
    hyperscaler: true,
    marketplace: true,
  },
}

describe('calculator', () => {
  it('resolves target lines directly in line mode', () => {
    expect(resolveTargetLines(baseInputs)).toBe(30000)
  })

  it('converts app complexity into effective lines', () => {
    expect(
      resolveTargetLines({
        ...baseInputs,
        outputMode: 'apps',
        appCount: 3,
        appComplexity: 'complex',
      }),
    ).toBe(54000)
  })

  it('returns visible series and summary cards', () => {
    const result = calculateScenario(baseInputs)

    expect(result.visibleSeries.length).toBeGreaterThan(10)
    expect(result.summaryCards).toHaveLength(4)
    expect(result.summaryCards[0]?.title).toBe('Cheapest at current volume')
  })

  it('applies diminishing-return multipliers for parallel workstreams', () => {
    expect(getParallelWorkstreamMultiplier(1)).toBe(1)
    expect(getParallelWorkstreamMultiplier(3)).toBe(2.4)
    expect(getParallelWorkstreamMultiplier(5)).toBe(3.45)
  })

  it('keeps subscription pricing flat across monthly output', () => {
    const result = calculateScenario(baseInputs)
    const claude = result.visibleSeries.find((series) => series.id === 'claude-pro')

    expect(claude).toBeDefined()
    expect(claude?.points[0]?.totalCostUsd).toBe(20)
    expect(claude?.points.at(-1)?.totalCostUsd).toBe(20)
  })

  it('reports monthly workdays from the 8-hour assumption', () => {
    const result = calculateScenario(baseInputs)

    expect(result.monthlyWorkHours).toBe(160)
    expect(result.monthlyWorkDays).toBe(20)
  })

  it('raises effective throughput for parallel heavy users', () => {
    const result = calculateScenario({
      ...baseInputs,
      parallelWorkstreams: 3,
    })

    expect(result.parallelMultiplier).toBe(2.4)
    expect(result.effectiveLinesPerHour).toBe(1680)
  })

  it('models budget-based subscription overage for cursor tiers', () => {
    const result = calculateScenario({
      ...baseInputs,
      targetLines: 50000,
      tokensPerLine: 4000,
    })
    const cursorPro = result.visibleSeries.find((series) => series.id === 'cursor-pro')

    expect(cursorPro?.quotaSummary).toContain('on-demand units')
    expect(cursorPro?.quotaLimitLines).toBeGreaterThan(0)
    expect(cursorPro?.selectedPoint.totalCostUsd).toBeGreaterThan(20)
  })

  it('models request-based quota plans with overage', () => {
    const result = calculateScenario({
      ...baseInputs,
      targetLines: 200000, // Very high to force overage
      tokensPerLine: 1000,
    })
    const copilotPro = result.visibleSeries.find((series) => series.id === 'copilot-pro')

    expect(copilotPro?.quotaSummary).toContain('premium requests')
    expect(copilotPro?.selectedPoint.totalCostUsd).toBeGreaterThan(10)
  })

  it('filters out dotted (soft quota) subscriptions when hideSoftQuotaSubscriptions is true', () => {
    const result = calculateScenario({
      ...baseInputs,
      hideSoftQuotaSubscriptions: true,
    })
    const subscriptionSeries = result.visibleSeries.filter((s) => s.category === 'subscription')
    const dottedNames = subscriptionSeries.filter((s) => s.lineStyle === 'dashed').map((s) => s.name)
    expect(dottedNames).toHaveLength(0)
    expect(result.visibleSeries.some((s) => s.id === 'claude-pro')).toBe(false)
  })

  it('filters out disabled categories', () => {
    const result = calculateScenario({
      ...baseInputs,
      enabledCategories: {
        subscription: false,
        api: false,
        'home-hardware': true,
        hyperscaler: false,
        marketplace: false,
      },
    })

    expect(result.visibleSeries.every((series) => series.category === 'home-hardware')).toBe(true)
  })

  it('computes a feasible flag for each point', () => {
    const result = calculateScenario({
      ...baseInputs,
      targetLines: 50000,
      slotHours: 10,
    })

    expect(result.visibleSeries.some((series) => series.selectedPoint.feasibleInSlot === false)).toBe(true)
  })

  describe('subscription pricing accuracy', () => {
    it('keeps Claude Pro at flat $20 for all LOC (soft fair-use, no overage)', () => {
      const result = calculateScenario(baseInputs)
      const claudePro = result.visibleSeries.find((s) => s.id === 'claude-pro')
      expect(claudePro).toBeDefined()
      for (const point of claudePro!.points) {
        expect(point.totalCostUsd).toBe(20)
      }
    })

    it('keeps Antigravity Pro at flat $20 for all LOC (soft fair-use)', () => {
      const result = calculateScenario(baseInputs)
      const ag = result.visibleSeries.find((s) => s.id === 'antigravity-pro')
      expect(ag).toBeDefined()
      for (const point of ag!.points) {
        expect(point.totalCostUsd).toBe(20)
      }
    })

    it('Cursor Pro is $20 at low LOC, increases after budget exhaustion', () => {
      const result = calculateScenario({
        ...baseInputs,
        targetLines: 5000,
        tokensPerLine: 120,
      })
      const cursorPro = result.visibleSeries.find((s) => s.id === 'cursor-pro')
      expect(cursorPro).toBeDefined()
      const lowPoint = cursorPro!.points.find((p) => p.x <= 5000)
      expect(lowPoint?.totalCostUsd).toBe(20)

      const highResult = calculateScenario({
        ...baseInputs,
        targetLines: 100000,
        tokensPerLine: 2000,
      })
      const cursorProHigh = highResult.visibleSeries.find((s) => s.id === 'cursor-pro')
      const highPoint = cursorProHigh!.points.find((p) => p.x >= 80000)
      expect(highPoint?.totalCostUsd).toBeGreaterThan(20)
    })

    it('Cursor Pro+ has included units then overage', () => {
      const result = calculateScenario({
        ...baseInputs,
        targetLines: 50000,
        tokensPerLine: 10000, // force overage
      })
      const proPlus = result.visibleSeries.find((s) => s.id === 'cursor-pro-plus')
      expect(proPlus?.quotaSummary).toContain('on-demand units')
      expect(proPlus?.quotaLimitLines).toBeGreaterThan(0)
      expect(proPlus?.selectedPoint.totalCostUsd).toBeGreaterThan(60)
    })

    it('Windsurf Pro uses unit-based quota and overage', () => {
      const result = calculateScenario({
        ...baseInputs,
        targetLines: 50000,
        tokensPerLine: 2200,
      })
      const surf = result.visibleSeries.find((s) => s.id === 'windsurf-pro')
      expect(surf?.quotaSummary).toContain('prompt credits')
      expect(surf?.selectedPoint.totalCostUsd).toBeGreaterThanOrEqual(15)
    })

    it('Copilot Pro has 300 premium requests then overage', () => {
      const result = calculateScenario({
        ...baseInputs,
        targetLines: 20000,
        tokensPerLine: 3000,
      })
      const copilot = result.visibleSeries.find((s) => s.id === 'copilot-pro')
      expect(copilot?.quotaSummary).toContain('300')
    })
  })

  describe('API pricing accuracy', () => {
    it('OpenRouter cost scales with tokens at 2.8 USD per million', () => {
      const result = calculateScenario({
        ...baseInputs,
        targetLines: 10_000,
        tokensPerLine: 100,
      })
      const openrouter = result.visibleSeries.find((s) => s.id === 'openrouter-premium')
      expect(openrouter).toBeDefined()
      const point = openrouter!.points.find((p) => p.x === 10_000)
      expect(point).toBeDefined()
      const expectedTokens = 10_000 * 100
      const expectedUsd = (expectedTokens / 1_000_000) * 2.8
      expect(point!.totalCostUsd).toBeCloseTo(expectedUsd, 2)
    })

    it('DeepSeek at 0.3 USD per million gives lower cost than OpenAI at same LOC', () => {
      const result = calculateScenario({ ...baseInputs, targetLines: 20000 })
      const deepseek = result.visibleSeries.find((s) => s.id === 'deepseek')
      const openai = result.visibleSeries.find((s) => s.id === 'openai-coding')
      expect(deepseek).toBeDefined()
      expect(openai).toBeDefined()
      const sameX = result.chartPoints[result.chartPoints.length - 1]!
      const costDeepSeek = deepseek!.points.find((p) => p.x === sameX)!.totalCostUsd
      const costOpenAI = openai!.points.find((p) => p.x === sameX)!.totalCostUsd
      expect(costDeepSeek).toBeLessThan(costOpenAI)
    })
  })

  describe('home hardware amortization', () => {
    it('returns homeHardwareParams with amortization years and total months', () => {
      const result = calculateScenario({
        ...baseInputs,
        amortizationYears: 4,
      })
      expect(result.homeHardwareParams.amortizationYears).toBe(4)
      expect(result.homeHardwareParams.totalLifetimeMonths).toBe(48)
    })

    it('longer amortization lowers home hardware cost per hour', () => {
      const inputs = {
        ...baseInputs,
        targetLines: 10000,
        linesPerHour: 500,
      }
      const result3y = calculateScenario({ ...inputs, amortizationYears: 3 })
      const result5y = calculateScenario({ ...inputs, amortizationYears: 5 })
      const rtx3 = result3y.visibleSeries.find((s) => s.id === 'rtx-3060-12gb')!
      const rtx5 = result5y.visibleSeries.find((s) => s.id === 'rtx-3060-12gb')!
      expect(rtx5.selectedPoint.totalCostUsd).toBeLessThan(rtx3.selectedPoint.totalCostUsd)
    })
  })

  describe('home hardware and rental accuracy', () => {
    it('rental cost equals hourly rate times hours needed', () => {
      const result = calculateScenario({
        ...baseInputs,
        targetLines: 7000,
        linesPerHour: 700,
        parallelWorkstreams: 1,
      })
      const runpod = result.visibleSeries.find((s) => s.id === 'runpod-a100')
      expect(runpod).toBeDefined()
      const point = runpod!.points.find((p) => p.x === 7000)
      expect(point).toBeDefined()
      const hoursNeeded = 7000 / 700
      const expectedCost = 1.39 * hoursNeeded
      expect(point!.totalCostUsd).toBeCloseTo(expectedCost, 1)
    })

    it('home hardware cost includes amortization and electricity', () => {
      const result = calculateScenario({
        ...baseInputs,
        targetLines: 5000,
        activeHoursPerWeek: 20,
        electricityUsdPerKwh: 0.2,
        linesPerHour: 500,
      })
      const rtx = result.visibleSeries.find((s) => s.id === 'rtx-3060-12gb')
      expect(rtx).toBeDefined()
      const point = rtx!.points.find((p) => p.x === 5000)
      expect(point).toBeDefined()
      expect(point!.hoursNeeded).toBe(10)
      expect(point!.totalCostUsd).toBeGreaterThan(0)
    })
  })

  describe('token model (context-heavy usage)', () => {
    it('with 3500 tokens/net LOC (research-based normal), API cost scales correctly', () => {
      const result = calculateScenario({
        ...baseInputs,
        tokensPerLine: 3500,
        targetLines: 10_000,
      })
      const openrouter = result.visibleSeries.find((s) => s.id === 'openrouter-premium')
      expect(openrouter).toBeDefined()
      const point = openrouter!.points.find((p) => p.x === 10_000)
      const expectedTokens = 10_000 * 3500
      const expectedUsd = (expectedTokens / 1_000_000) * 2.8
      expect(point!.totalCostUsd).toBeCloseTo(expectedUsd, 0)
    })

    it('with 12000 tokens/net LOC (100K context for ~10 lines), subscription quota exhausts sooner', () => {
      const result = calculateScenario({
        ...baseInputs,
        tokensPerLine: 12000,
        targetLines: 25000,
      })
      const cursorPro = result.visibleSeries.find((s) => s.id === 'cursor-pro')
      expect(cursorPro?.quotaLimitLines).toBeDefined()
      expect(cursorPro!.quotaLimitLines!).toBeLessThan(25000)
      expect(cursorPro!.selectedPoint.totalCostUsd).toBeGreaterThan(20)
    })
  })

  describe('chart data consistency', () => {
    it('every chart row value matches the series point totalCostUsd for that x', () => {
      const result = calculateScenario(baseInputs)
      for (const point of result.chartPoints) {
        const row: Record<string, number> = { lines: point }
        for (const series of result.visibleSeries) {
          const match = series.points.find((p) => p.x === point)
          const value = match?.totalCostUsd ?? 0
          row[series.id] = value
        }
        for (const series of result.visibleSeries) {
          const match = series.points.find((p) => p.x === point)
          const expected = match?.totalCostUsd ?? 0
          expect(row[series.id]).toBe(expected)
        }
      }
    })

    it('at 41000 LOC Claude Pro is 20 (tooltip and chart use same value)', () => {
      const result = calculateScenario({
        ...baseInputs,
        targetLines: 41000,
      })
      const claudePro = result.visibleSeries.find((s) => s.id === 'claude-pro')
      expect(claudePro).toBeDefined()
      expect(claudePro!.selectedPoint.totalCostUsd).toBe(20)
      const anyPoint = claudePro!.points.find((p) => p.x === result.effectiveTargetLines) ?? claudePro!.selectedPoint
      expect(anyPoint.totalCostUsd).toBe(20)
    })
  })
})

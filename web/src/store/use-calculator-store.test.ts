import { describe, expect, it } from 'vitest'

import { buildShareQuery, useCalculatorStore } from './use-calculator-store'

describe('calculator store', () => {
  it('hydrates from query string', () => {
    useCalculatorStore.getState().hydrateFromUrl(
      '?mode=apps&lines=12000&apps=4&complexity=complex&slotHours=80&weeklyHours=30&power=0.22&lph=250&tpl=140&categories=subscription,marketplace',
    )

    const state = useCalculatorStore.getState()

    expect(state.outputMode).toBe('apps')
    expect(state.appCount).toBe(4)
    expect(state.appComplexity).toBe('complex')
    expect(state.slotHours).toBe(80)
    expect(state.linesPerHour).toBe(250)
    expect(state.enabledCategories.subscription).toBe(true)
    expect(state.enabledCategories.marketplace).toBe(true)
    expect(state.enabledCategories.api).toBe(false)
  })

  it('builds a share query from current state', () => {
    const state = useCalculatorStore.getState()
    const query = buildShareQuery(state)
    const params = new URLSearchParams(query)

    expect(params.get('s')).toBeTruthy()
    expect(params.has('mode')).toBe(false)
  })

  it('toggles categories', () => {
    useCalculatorStore.getState().toggleCategory('api')
    expect(useCalculatorStore.getState().enabledCategories.api).toBe(false)
  })

  it('links work hours to usage when linkWorkHoursToUsage is true', () => {
    useCalculatorStore.setState({ linkWorkHoursToUsage: true })
    const state = useCalculatorStore.getState()
    
    state.setSlotHours(160)
    expect(useCalculatorStore.getState().activeHoursPerWeek).toBeCloseTo(160 / (52 / 12), 1)
    
    state.setActiveHoursPerWeek(40)
    expect(useCalculatorStore.getState().slotHours).toBeCloseTo(40 * (52 / 12), 1)
  })

  it('does not link work hours to usage when linkWorkHoursToUsage is false', () => {
    useCalculatorStore.setState({ linkWorkHoursToUsage: false, slotHours: 160, activeHoursPerWeek: 20 })
    const state = useCalculatorStore.getState()
    
    state.setSlotHours(80)
    expect(useCalculatorStore.getState().activeHoursPerWeek).toBe(20)
    
    state.setActiveHoursPerWeek(40)
    expect(useCalculatorStore.getState().slotHours).toBe(80)
  })
})

import { create } from 'zustand'

import { parallelWorkstreamMultipliers, vibeCoderModelsRanked } from '../data/pricing'
import type { CostCategory } from '../data/pricing'
import type { AppComplexity, CalculatorInputs, OutputMode } from '../utils/calculator'

const defaultAgreedModelIds = vibeCoderModelsRanked.map((m) => m.id)

type CalculatorState = CalculatorInputs & {
  agreedModelIds: string[]
  setOutputMode: (mode: OutputMode) => void
  setTargetLines: (targetLines: number) => void
  setAppCount: (appCount: number) => void
  setAppComplexity: (appComplexity: AppComplexity) => void
  setSlotHours: (slotHours: number) => void
  setActiveHoursPerWeek: (activeHoursPerWeek: number) => void
  setElectricityUsdPerKwh: (electricityUsdPerKwh: number) => void
  setLinesPerHour: (linesPerHour: number) => void
  setParallelWorkstreams: (
    parallelWorkstreams: keyof typeof parallelWorkstreamMultipliers,
  ) => void
  setTokensPerLine: (tokensPerLine: number) => void
  setAmortizationYears: (amortizationYears: number) => void
  setHideSoftQuotaSubscriptions: (hide: boolean) => void
  setLinkWorkHoursToUsage: (link: boolean) => void
  setSelectedModelId: (id: string) => void
  syncTargetToProductivity: () => void
  toggleModelAgreed: (modelId: string) => void
  toggleCategory: (category: CostCategory) => void
  hydrateFromUrl: (search: string) => void
}

const defaultEnabledCategories: Record<CostCategory, boolean> = {
  subscription: true,
  api: true,
  'home-hardware': true,
  hyperscaler: true,
  marketplace: true,
}

const defaults: CalculatorInputs = {
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
  hideSoftQuotaSubscriptions: true,
  linkWorkHoursToUsage: true,
  enabledCategories: defaultEnabledCategories,
  selectedModelId: vibeCoderModelsRanked[0].id,
}

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const useCalculatorStore = create<CalculatorState>((set) => ({
  ...defaults,
  agreedModelIds: defaultAgreedModelIds,
  setOutputMode: (outputMode) => set({ outputMode }),
  setTargetLines: (targetLines) => set({ targetLines }),
  setAppCount: (appCount) => set({ appCount }),
  setAppComplexity: (appComplexity) => set({ appComplexity }),
  setSlotHours: (slotHours) =>
    set((state) => ({
      slotHours,
      activeHoursPerWeek: state.linkWorkHoursToUsage ? slotHours / (52 / 12) : state.activeHoursPerWeek,
    })),
  setActiveHoursPerWeek: (activeHoursPerWeek) =>
    set((state) => ({
      activeHoursPerWeek,
      slotHours: state.linkWorkHoursToUsage ? activeHoursPerWeek * (52 / 12) : state.slotHours,
    })),
  setElectricityUsdPerKwh: (electricityUsdPerKwh) => set({ electricityUsdPerKwh }),
  setLinesPerHour: (linesPerHour) => set({ linesPerHour }),
  setParallelWorkstreams: (parallelWorkstreams) => set({ parallelWorkstreams }),
  setTokensPerLine: (tokensPerLine) => set({ tokensPerLine }),
  setAmortizationYears: (amortizationYears) => set({ amortizationYears }),
  setHideSoftQuotaSubscriptions: (hideSoftQuotaSubscriptions) => set({ hideSoftQuotaSubscriptions }),
  setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
  setLinkWorkHoursToUsage: (linkWorkHoursToUsage) =>
    set((state) => {
      if (linkWorkHoursToUsage) {
        return {
          linkWorkHoursToUsage,
          activeHoursPerWeek: state.slotHours / (52 / 12),
        }
      }
      return { linkWorkHoursToUsage }
    }),
  syncTargetToProductivity: () =>
    set((state) => ({
      targetLines: Math.round(
        state.slotHours *
          state.linesPerHour *
          parallelWorkstreamMultipliers[state.parallelWorkstreams],
      ),
    })),
  toggleModelAgreed: (modelId) =>
    set((state) => {
      const has = state.agreedModelIds.includes(modelId)
      const next = has
        ? state.agreedModelIds.filter((id) => id !== modelId)
        : [...state.agreedModelIds, modelId]
      return { agreedModelIds: next }
    }),
  toggleCategory: (category) =>
    set((state) => ({
      enabledCategories: {
        ...state.enabledCategories,
        [category]: !state.enabledCategories[category],
      },
    })),
  hydrateFromUrl: (search) => {
    const params = new URLSearchParams(search)
    const outputMode = params.get('mode')
    const appComplexity = params.get('complexity')
    const categoryFlags = params.get('categories')

    set((state) => ({
      outputMode: outputMode === 'apps' ? 'apps' : defaults.outputMode,
      targetLines: parseNumber(params.get('lines'), state.targetLines),
      appCount: parseNumber(params.get('apps'), state.appCount),
      appComplexity:
        appComplexity === 'simple' || appComplexity === 'medium' || appComplexity === 'complex'
          ? appComplexity
          : defaults.appComplexity,
      slotHours: parseNumber(params.get('slotHours'), state.slotHours),
      activeHoursPerWeek: parseNumber(params.get('weeklyHours'), state.activeHoursPerWeek),
      electricityUsdPerKwh: parseNumber(params.get('power'), state.electricityUsdPerKwh),
      linesPerHour: parseNumber(params.get('lph'), state.linesPerHour),
      parallelWorkstreams:
        parseNumber(params.get('parallel'), state.parallelWorkstreams) in parallelWorkstreamMultipliers
          ? (parseNumber(
              params.get('parallel'),
              state.parallelWorkstreams,
            ) as keyof typeof parallelWorkstreamMultipliers)
          : state.parallelWorkstreams,
      tokensPerLine: parseNumber(params.get('tpl'), state.tokensPerLine),
      amortizationYears: parseNumber(params.get('amort'), state.amortizationYears),
      selectedModelId: params.get('model') ?? state.selectedModelId,
      hideSoftQuotaSubscriptions: params.get('dotted') !== '1',
      linkWorkHoursToUsage: params.get('link') !== '0',
      agreedModelIds: (() => {
        const raw = params.get('models')
        if (!raw) return state.agreedModelIds
        const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
        return ids.length > 0 ? ids : state.agreedModelIds
      })(),
      enabledCategories: categoryFlags
        ? {
            subscription: categoryFlags.includes('subscription'),
            api: categoryFlags.includes('api'),
            'home-hardware': categoryFlags.includes('home-hardware'),
            hyperscaler: categoryFlags.includes('hyperscaler'),
            marketplace: categoryFlags.includes('marketplace'),
          }
        : state.enabledCategories,
    }))
  },
}))

export function buildShareQuery(state: CalculatorInputs & { agreedModelIds?: string[] }) {
  const params = new URLSearchParams()

  params.set('mode', state.outputMode)
  params.set('lines', String(state.targetLines))
  params.set('apps', String(state.appCount))
  params.set('complexity', state.appComplexity)
  params.set('slotHours', String(state.slotHours))
  params.set('weeklyHours', String(state.activeHoursPerWeek))
  params.set('power', String(state.electricityUsdPerKwh))
  params.set('lph', String(state.linesPerHour))
  params.set('parallel', String(state.parallelWorkstreams))
  params.set('tpl', String(state.tokensPerLine))
  params.set('amort', String(state.amortizationYears))
  params.set('model', state.selectedModelId)
  if (!state.hideSoftQuotaSubscriptions) {
    params.set('dotted', '1')
  }
  if (!state.linkWorkHoursToUsage) {
    params.set('link', '0')
  }
  if (state.agreedModelIds?.length) {
    params.set('models', state.agreedModelIds.join(','))
  }
  params.set(
    'categories',
    Object.entries(state.enabledCategories)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key)
      .join(','),
  )

  return params.toString()
}

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

type CompactShareState = {
  m: OutputMode
  l: number
  a: number
  c: AppComplexity
  h: number
  w: number
  p: number
  y: number
  q: number
  t: number
  o: number
  d: number
  k: 0 | 1
  s: string
  r: string[]
  g: string[]
}

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function encodeCompactState(state: CalculatorInputs & { agreedModelIds?: string[] }) {
  const compact: CompactShareState = {
    m: state.outputMode,
    l: state.targetLines,
    a: state.appCount,
    c: state.appComplexity,
    h: state.slotHours,
    w: state.activeHoursPerWeek,
    p: state.electricityUsdPerKwh,
    y: state.linesPerHour,
    q: state.parallelWorkstreams,
    t: state.tokensPerLine,
    o: state.amortizationYears,
    d: state.hideSoftQuotaSubscriptions ? 1 : 0,
    k: state.linkWorkHoursToUsage ? 1 : 0,
    s: state.selectedModelId,
    r: state.agreedModelIds ?? [],
    g: Object.entries(state.enabledCategories)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key),
  }

  const json = JSON.stringify(compact)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeCompactState(value: string): CompactShareState | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json) as CompactShareState
  } catch {
    return null
  }
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
    const compact = decodeCompactState(params.get('s') ?? '')
    const outputMode = params.get('mode')
    const appComplexity = params.get('complexity')
    const categoryFlags = params.get('categories')

    set((state) => ({
      outputMode: compact?.m ?? (outputMode === 'apps' ? 'apps' : defaults.outputMode),
      targetLines: compact?.l ?? parseNumber(params.get('lines'), state.targetLines),
      appCount: compact?.a ?? parseNumber(params.get('apps'), state.appCount),
      appComplexity:
        compact?.c ??
        (appComplexity === 'simple' || appComplexity === 'medium' || appComplexity === 'complex'
          ? appComplexity
          : defaults.appComplexity),
      slotHours: compact?.h ?? parseNumber(params.get('slotHours'), state.slotHours),
      activeHoursPerWeek: compact?.w ?? parseNumber(params.get('weeklyHours'), state.activeHoursPerWeek),
      electricityUsdPerKwh: compact?.p ?? parseNumber(params.get('power'), state.electricityUsdPerKwh),
      linesPerHour: compact?.y ?? parseNumber(params.get('lph'), state.linesPerHour),
      parallelWorkstreams:
        compact?.q
          ? ((compact.q as keyof typeof parallelWorkstreamMultipliers) in parallelWorkstreamMultipliers
              ? (compact.q as keyof typeof parallelWorkstreamMultipliers)
              : state.parallelWorkstreams)
          : parseNumber(params.get('parallel'), state.parallelWorkstreams) in parallelWorkstreamMultipliers
          ? (parseNumber(
              params.get('parallel'),
              state.parallelWorkstreams,
            ) as keyof typeof parallelWorkstreamMultipliers)
          : state.parallelWorkstreams,
      tokensPerLine: compact?.t ?? parseNumber(params.get('tpl'), state.tokensPerLine),
      amortizationYears: compact?.o ?? parseNumber(params.get('amort'), state.amortizationYears),
      selectedModelId: compact?.s ?? params.get('model') ?? state.selectedModelId,
      hideSoftQuotaSubscriptions: compact ? compact.d === 1 : params.get('dotted') !== '1',
      linkWorkHoursToUsage: compact ? compact.k === 1 : params.get('link') !== '0',
      agreedModelIds: (() => {
        if (compact?.r) return compact.r
        const raw = params.get('models')
        if (!raw) return state.agreedModelIds
        const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
        return ids.length > 0 ? ids : state.agreedModelIds
      })(),
      enabledCategories: compact?.g
        ? {
            subscription: compact.g.includes('subscription'),
            api: compact.g.includes('api'),
            'home-hardware': compact.g.includes('home-hardware'),
            hyperscaler: compact.g.includes('hyperscaler'),
            marketplace: compact.g.includes('marketplace'),
          }
        : categoryFlags
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
  params.set('s', encodeCompactState(state))
  return params.toString()
}

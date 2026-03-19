import {
  allOfferings,
  complexityMultipliers,
  parallelWorkstreamMultipliers,
  vibeCoderModelsRanked,
  type CostCategory,
  type Offering,
  type SubscriptionOffering,
} from '../data/pricing'

export type OutputMode = 'lines' | 'apps'
export type AppComplexity = keyof typeof complexityMultipliers

export type CalculatorInputs = {
  outputMode: OutputMode
  targetLines: number
  appCount: number
  appComplexity: AppComplexity
  slotHours: number
  linkWorkHoursToUsage: boolean
  activeHoursPerWeek: number
  electricityUsdPerKwh: number
  linesPerHour: number
  parallelWorkstreams: keyof typeof parallelWorkstreamMultipliers
  tokensPerLine: number
  amortizationYears: number
  /** When true, hide dashed (soft / unclear quota) subscriptions from chart and summary. */
  hideSoftQuotaSubscriptions: boolean
  enabledCategories: Record<CostCategory, boolean>
  selectedModelId: string
}

export type OfferingCostPoint = {
  x: number
  totalCostUsd: number
  hoursNeeded: number
  feasibleInSlot: boolean
}

export type ChartSeries = {
  id: string
  name: string
  category: CostCategory
  color: string
  lineStyle?: 'solid' | 'dashed'
  quotaSummary?: string
  quotaLimitLines?: number
  points: OfferingCostPoint[]
  selectedPoint: OfferingCostPoint
}

export type SummaryCard = {
  title: string
  value: string
  detail: string
}

export type HomeHardwareParams = {
  amortizationYears: number
  monthlyAmortizationUsd: number
  totalLifetimeMonths: number
}

export type CalculatorResult = {
  effectiveTargetLines: number
  chartPoints: number[]
  visibleSeries: ChartSeries[]
  summaryCards: SummaryCard[]
  monthlyWorkDays: number
  monthlyWorkHours: number
  monthlyLocCapacity: number
  effectiveLinesPerHour: number
  parallelMultiplier: number
  modelProductivityMultiplier: number
  homeHardwareParams: HomeHardwareParams
}

const WORK_HOURS_PER_DAY = 8
function getMonthlyWorkDays(slotHours: number) {
  return slotHours / WORK_HOURS_PER_DAY
}

export function getParallelWorkstreamMultiplier(parallelWorkstreams: keyof typeof parallelWorkstreamMultipliers) {
  return parallelWorkstreamMultipliers[parallelWorkstreams]
}

export function resolveTargetLines(inputs: CalculatorInputs) {
  if (inputs.outputMode === 'lines') {
    return inputs.targetLines
  }

  return Math.round(inputs.appCount * complexityMultipliers[inputs.appComplexity])
}

export function buildChartPoints(targetLines: number) {
  const basePoints = [500, 1000, 2500, 5000, 10000, 20000, 35000, 50000]
  const adaptiveMax = Math.max(5000, Math.ceil((targetLines * 1.6) / 500) * 500)
  const adaptivePoints = Array.from({ length: 8 }, (_, index) => {
    const ratio = index / 7
    return roundToNiceStep(500 + ratio * (adaptiveMax - 500))
  })

  return Array.from(new Set([...basePoints, ...adaptivePoints, roundToNiceStep(targetLines)])).sort(
    (a, b) => a - b,
  )
}

function roundToNiceStep(value: number) {
  if (value <= 1000) return Math.round(value / 100) * 100
  if (value <= 10000) return Math.round(value / 500) * 500
  return Math.round(value / 1000) * 1000
}

function subscriptionQuotaLimitLines(offering: SubscriptionOffering, inputs: CalculatorInputs) {
  if (offering.quota.quotaType === 'monthly_budget_usd') {
    const coveredTokens =
      (offering.quota.includedBudgetUsd / offering.quota.referenceApiUsdPerMillionTokens) * 1_000_000
    return Math.round(coveredTokens / inputs.tokensPerLine)
  }

  if (offering.quota.quotaType === 'monthly_units') {
    const coveredTokens = offering.quota.includedUnits * offering.quota.estimatedTokensPerUnit
    return Math.round(coveredTokens / inputs.tokensPerLine)
  }

  return undefined
}

function quotaSummary(offering: SubscriptionOffering) {
  if (offering.quota.quotaType === 'monthly_budget_usd') {
    return `$${offering.quota.includedBudgetUsd} included API budget / month`
  }

  if (offering.quota.quotaType === 'monthly_units') {
    return `${offering.quota.includedUnits.toLocaleString()} ${offering.quota.unitLabel} / month`
  }

  return `${offering.quota.resetCycle.replace('_', ' ')} soft fair-use limit`
}

function costForOffering(offering: Offering, lines: number, inputs: CalculatorInputs): OfferingCostPoint {
  const selectedModel = vibeCoderModelsRanked.find(m => m.id === inputs.selectedModelId) ?? vibeCoderModelsRanked[0]
  const modelProductivityMultiplier = selectedModel.productivityMultiplier
  
  const effectiveLinesPerHour =
    Math.max(inputs.linesPerHour, 1) * 
    getParallelWorkstreamMultiplier(inputs.parallelWorkstreams) *
    modelProductivityMultiplier

  const hoursNeeded = lines / effectiveLinesPerHour
  const feasibleInSlot = hoursNeeded <= inputs.slotHours

  if (offering.category === 'subscription') {
    const totalTokens = lines * inputs.tokensPerLine

    if (offering.quota.quotaType === 'monthly_budget_usd') {
      const variableEquivalentCost =
        (totalTokens / 1_000_000) * offering.quota.referenceApiUsdPerMillionTokens
      const overage = Math.max(0, variableEquivalentCost - offering.quota.includedBudgetUsd)
      return {
        x: lines,
        totalCostUsd: roundCurrency(offering.monthlyPriceUsd + overage),
        hoursNeeded,
        feasibleInSlot,
      }
    }

    if (offering.quota.quotaType === 'monthly_units') {
      const unitsNeeded = totalTokens / offering.quota.estimatedTokensPerUnit
      const overageUnits = Math.max(0, unitsNeeded - offering.quota.includedUnits)
      return {
        x: lines,
        totalCostUsd: roundCurrency(offering.monthlyPriceUsd + overageUnits * offering.quota.overageUsdPerUnit),
        hoursNeeded,
        feasibleInSlot,
      }
    }

    return {
      x: lines,
      totalCostUsd: roundCurrency(offering.monthlyPriceUsd),
      hoursNeeded,
      feasibleInSlot,
    }
  }

  if (offering.category === 'api') {
    const totalTokens = lines * inputs.tokensPerLine
    const totalCostUsd = (totalTokens / 1_000_000) * offering.blendedUsdPerMillionTokens
    return { x: lines, totalCostUsd: roundCurrency(totalCostUsd), hoursNeeded, feasibleInSlot }
  }

  if (offering.category === 'home-hardware') {
    const years = Math.max(1, Math.min(10, Math.round(inputs.amortizationYears)))
    const monthlyAmortization = offering.purchasePriceUsd / (years * 12)
    const electricityHourly = (offering.powerWatts / 1000) * inputs.electricityUsdPerKwh
    
    // Fixed monthly cost (amortization) + Variable electricity based on actual work hours
    const totalCostUsd = monthlyAmortization + electricityHourly * hoursNeeded
    return { x: lines, totalCostUsd: roundCurrency(totalCostUsd), hoursNeeded, feasibleInSlot }
  }

  const totalCostUsd = offering.hourlyRateUsd * hoursNeeded
  return { x: lines, totalCostUsd: roundCurrency(totalCostUsd), hoursNeeded, feasibleInSlot }
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function cheapestOf(series: ChartSeries[]) {
  return [...series].sort((a, b) => a.selectedPoint.totalCostUsd - b.selectedPoint.totalCostUsd)[0]
}

function cheapestCategory(series: ChartSeries[], category: CostCategory) {
  return cheapestOf(series.filter((item) => item.category === category))
}

function buildBreakEvenCard(series: ChartSeries[]) {
  const sub = cheapestCategory(series, 'subscription')
  const home = cheapestCategory(series, 'home-hardware')

  if (!sub || !home) {
    return {
      title: 'Break-even callout',
      value: 'Need more categories',
      detail: 'Enable subscriptions and home-hosted hardware to see a break-even headline.',
    }
  }

  const subPoints = sub.points
  const homePoints = home.points

  const breakEvenPoint = subPoints.find((point, index) => {
    const homePoint = homePoints[index]
    return homePoint && homePoint.totalCostUsd <= point.totalCostUsd
  })

  if (!breakEvenPoint) {
    return {
      title: 'Break-even callout',
      value: 'No crossover yet',
      detail: `${sub.name} stays cheaper than ${home.name} across the visible range.`,
    }
  }

  return {
    title: 'Break-even callout',
    value: `${home.name} at ${breakEvenPoint.x.toLocaleString()} LOC`,
    detail: `${home.name} becomes cheaper than ${sub.name} once output reaches this level.`,
  }
}

function buildHostedBreakEvenCard(series: ChartSeries[]) {
  const bestSubscription = cheapestCategory(series, 'subscription')
  const hostedSeries = series.filter(
    (item) => item.category === 'api' || item.category === 'hyperscaler' || item.category === 'marketplace',
  )
  const bestHosted = cheapestOf(hostedSeries)

  if (!bestSubscription || !bestHosted) {
    return {
      title: 'Hosted break-even',
      value: 'Need subscriptions + hosted',
      detail: 'Enable subscription and hosted categories to see the monthly crossover point.',
    }
  }

  const crossoverPoint = bestHosted.points.find((point, index) => {
    const subscriptionPoint = bestSubscription.points[index]
    return subscriptionPoint && point.totalCostUsd >= subscriptionPoint.totalCostUsd
  })

  if (!crossoverPoint) {
    return {
      title: 'Hosted break-even',
      value: 'Hosted stays cheaper',
      detail: `${bestHosted.name} stays below ${bestSubscription.name} across the visible monthly output range.`,
    }
  }

  const workDays = crossoverPoint.hoursNeeded / WORK_HOURS_PER_DAY

  return {
    title: 'Hosted break-even',
    value: `${crossoverPoint.x.toLocaleString()} LOC / ${crossoverPoint.hoursNeeded.toFixed(1)}h`,
    detail: `Below about ${workDays.toFixed(1)} workdays per month, ${bestHosted.name} is cheaper. Above that, ${bestSubscription.name} wins on fixed monthly pricing.`,
  }
}

export function calculateScenario(inputs: CalculatorInputs): CalculatorResult {
  const effectiveTargetLines = resolveTargetLines(inputs)
  const chartPoints = buildChartPoints(effectiveTargetLines)
  const monthlyWorkHours = inputs.slotHours
  const monthlyWorkDays = getMonthlyWorkDays(monthlyWorkHours)
  const parallelMultiplier = getParallelWorkstreamMultiplier(inputs.parallelWorkstreams)
  
  const selectedModel = vibeCoderModelsRanked.find(m => m.id === inputs.selectedModelId) ?? vibeCoderModelsRanked[0]
  const modelProductivityMultiplier = selectedModel.productivityMultiplier
  const effectiveLinesPerHour = inputs.linesPerHour * parallelMultiplier * modelProductivityMultiplier
  
  // Calculate total monthly productivity in terms of output LOC 
  const monthlyLocCapacity = effectiveLinesPerHour * monthlyWorkHours

  const visibleSeries = allOfferings
    .filter((offering) => {
      if (!inputs.enabledCategories[offering.category]) return false
      if (
        inputs.hideSoftQuotaSubscriptions &&
        offering.category === 'subscription' &&
        offering.quota.quotaType === 'soft_fair_use'
      ) {
        return false
      }
      return true
    })
    .map((offering) => {
      const points = chartPoints.map((lines) => costForOffering(offering, lines, inputs))
      const selectedPoint =
        points.find((point) => point.x === roundToNiceStep(effectiveTargetLines)) ??
        costForOffering(offering, effectiveTargetLines, inputs)

      return {
        id: offering.id,
        name: offering.name,
        category: offering.category,
        color: offering.color,
        lineStyle: offering.category === 'subscription' ? offering.lineStyle : undefined,
        quotaSummary: offering.category === 'subscription' ? quotaSummary(offering) : undefined,
        quotaLimitLines:
          offering.category === 'subscription' ? subscriptionQuotaLimitLines(offering, inputs) : undefined,
        points,
        selectedPoint,
      }
    })

  const overallWinner = cheapestOf(visibleSeries)
  const bestSubscription = cheapestCategory(visibleSeries, 'subscription')
  const bestHome = cheapestCategory(visibleSeries, 'home-hardware')
  const breakEvenCard = buildBreakEvenCard(visibleSeries)
  const hostedBreakEvenCard = buildHostedBreakEvenCard(visibleSeries)

  const summaryCards: SummaryCard[] = [
    overallWinner
      ? {
          title: 'Cheapest at current volume',
          value: overallWinner.name,
          detail: `$${overallWinner.selectedPoint.totalCostUsd.toFixed(2)} for ${effectiveTargetLines.toLocaleString()} LOC this month.`,
        }
      : {
          title: 'Cheapest at current volume',
          value: 'No series enabled',
          detail: 'Enable at least one category to compare options.',
        },
    bestSubscription
      ? {
          title: 'Best monthly subscription',
          value: bestSubscription.name,
          detail: bestSubscription.quotaLimitLines
            ? `$${bestSubscription.selectedPoint.totalCostUsd.toFixed(2)} with included quota around ${bestSubscription.quotaLimitLines.toLocaleString()} LOC/month.`
            : `${bestSubscription.quotaSummary}. Exact exhaustion point is not public, so this is shown as soft fair use.`,
        }
      : {
          title: 'Best monthly subscription',
          value: 'Category hidden',
          detail: 'Turn subscriptions back on to compare seat-based tools.',
        },
    bestHome
      ? {
          title: 'Best home-hosted setup',
          value: bestHome.name,
          detail: `$${bestHome.selectedPoint.totalCostUsd.toFixed(2)} including power and amortization.`,
        }
      : {
          title: 'Best home-hosted setup',
          value: 'Category hidden',
          detail: 'Turn on home-hosted to compare Macs and retail GPU rigs.',
        },
    hostedBreakEvenCard.title === 'Hosted break-even' ? hostedBreakEvenCard : breakEvenCard,
  ]

  const years = Math.max(1, Math.min(10, Math.round(inputs.amortizationYears)))
  const homeHardwareParams: HomeHardwareParams = {
    amortizationYears: years,
    monthlyAmortizationUsd: 0, // Placeholder, calculated per device in the UI table usually, but we can put a reference one if needed. Actually we'll just remove the need for a global one if it's per-device.
    totalLifetimeMonths: years * 12,
  }

  return {
    effectiveTargetLines,
    chartPoints,
    visibleSeries,
    summaryCards,
    monthlyWorkDays,
    monthlyWorkHours,
    monthlyLocCapacity,
    effectiveLinesPerHour,
    parallelMultiplier,
    modelProductivityMultiplier,
    homeHardwareParams,
  }
}

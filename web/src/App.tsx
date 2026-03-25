import { Copy, Download, ExternalLink, Github, Link2, Save, Sparkles, Trash2 } from 'lucide-react'
import { toPng } from 'html-to-image'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Slider } from './components/ui/slider'
import { Switch } from './components/ui/switch'
import { formatChangelogDate, pricingChangelog } from './data/changelog'
import {
  homeHardware,
  parallelWorkstreamMultipliers,
  productivityTemplates,
  subscriptions,
  tokenUsageTemplates,
  vibeCoderModelsRanked,
} from './data/pricing'
import { buildShareQuery, useCalculatorStore } from './store/use-calculator-store'
import { calculateScenario } from './utils/calculator'

const LOCAL_PROFILE_STORAGE_KEY = 'vibemath-local-profiles'

type SavedProfile = {
  id: string
  name: string
  query: string
  savedAt: string
}

function readStoredProfiles() {
  try {
    const storage = window.localStorage
    if (!storage || typeof storage.getItem !== 'function') return []
    const raw = storage.getItem(LOCAL_PROFILE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedProfile[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredProfiles(profiles: SavedProfile[]) {
  try {
    const storage = window.localStorage
    if (!storage || typeof storage.setItem !== 'function') return
    storage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(profiles))
  } catch {
    // Ignore storage failures; profiles still work for the current session.
  }
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [chartReady, setChartReady] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([])

  const state = useCalculatorStore()

  useEffect(() => {
    state.hydrateFromUrl(window.location.search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const element = chartContainerRef.current
    if (!element) return

    const updateChartReady = () => {
      const rect = element.getBoundingClientRect()
      setChartReady(rect.width > 0 && rect.height > 0)
    }

    updateChartReady()

    const frame = window.requestAnimationFrame(updateChartReady)
    const observer = new ResizeObserver(updateChartReady)
    observer.observe(element)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    setSavedProfiles(readStoredProfiles())
  }, [])

  useEffect(() => {
    const query = buildShareQuery(state)
    const url = `${window.location.pathname}?${query}`
    window.history.replaceState({}, '', url)
  }, [
    state,
    state.activeHoursPerWeek,
    state.agreedModelIds,
    state.appComplexity,
    state.appCount,
    state.electricityUsdPerKwh,
    state.enabledCategories,
    state.linesPerHour,
    state.outputMode,
    state.slotHours,
    state.targetLines,
    state.tokensPerLine,
    state.amortizationYears,
    state.hideSoftQuotaSubscriptions,
    state.parallelWorkstreams,
    state.linkWorkHoursToUsage,
    state.selectedModelId,
  ])

  useEffect(() => {
    // If we're linked, and the mode is apps, we might want to sync 
    // but apps mode handles it via complexity.
  }, [state.linkWorkHoursToUsage, state.slotHours, state.linesPerHour])

  const scenario = useMemo(
    () =>
      calculateScenario({
        outputMode: state.outputMode,
        targetLines: state.targetLines,
        appCount: state.appCount,
        appComplexity: state.appComplexity,
        slotHours: state.slotHours,
        linkWorkHoursToUsage: state.linkWorkHoursToUsage,
        activeHoursPerWeek: state.activeHoursPerWeek,
        electricityUsdPerKwh: state.electricityUsdPerKwh,
        linesPerHour: state.linesPerHour,
        parallelWorkstreams: state.parallelWorkstreams,
        tokensPerLine: state.tokensPerLine,
        amortizationYears: state.amortizationYears,
        hideSoftQuotaSubscriptions: state.hideSoftQuotaSubscriptions,
        enabledCategories: state.enabledCategories,
        selectedModelId: state.selectedModelId,
      }),
    [
      state.outputMode,
      state.targetLines,
      state.appCount,
      state.appComplexity,
      state.slotHours,
      state.activeHoursPerWeek,
      state.electricityUsdPerKwh,
      state.linesPerHour,
      state.parallelWorkstreams,
      state.tokensPerLine,
      state.amortizationYears,
      state.hideSoftQuotaSubscriptions,
      state.enabledCategories,
      state.linkWorkHoursToUsage,
      state.selectedModelId,
    ],
  )

  const chartData = useMemo(
    () =>
      scenario.chartPoints.map((point) => {
        const row: Record<string, number> = { lines: point }

        for (const series of scenario.visibleSeries) {
          const match = series.points.find((seriesPoint) => seriesPoint.x === point)
          row[series.id] = match?.totalCostUsd ?? 0
        }

        return row
      }),
    [scenario.chartPoints, scenario.visibleSeries],
  )

  const shareLink = async () => {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    setFeedback('Shareable URL copied.')
  }

  const persistProfiles = (profiles: SavedProfile[]) => {
    setSavedProfiles(profiles)
    writeStoredProfiles(profiles)
  }

  const saveLocalProfile = () => {
    const trimmedName = profileName.trim() || `Profile ${savedProfiles.length + 1}`
    const profile: SavedProfile = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: trimmedName,
      query: buildShareQuery(state),
      savedAt: new Date().toISOString(),
    }

    persistProfiles([profile, ...savedProfiles])
    setProfileName('')
    setFeedback(`Saved locally as "${trimmedName}".`)
  }

  const loadLocalProfile = (profile: SavedProfile) => {
    state.hydrateFromUrl(`?${profile.query}`)
    setFeedback(`Loaded profile "${profile.name}".`)
  }

  const copyProfileShareLink = async (profile: SavedProfile) => {
    const url = `${window.location.origin}${window.location.pathname}?${profile.query}`
    await navigator.clipboard.writeText(url)
    setFeedback(`Share link copied for "${profile.name}".`)
  }

  const deleteLocalProfile = (profileId: string) => {
    persistProfiles(savedProfiles.filter((profile) => profile.id !== profileId))
    setFeedback('Saved profile removed.')
  }

  const exportPng = async () => {
    if (!containerRef.current) return

    const dataUrl = await toPng(containerRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#020817',
    })

    const link = document.createElement('a')
    link.download = 'ai-coding-cost-calculator.png'
    link.href = dataUrl
    link.click()
    setFeedback('PNG exported.')
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="w-full px-4 py-6 sm:px-6 xl:px-8 2xl:px-12">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-cyan-500/10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-4 shadow-2xl shadow-cyan-950/30 sm:rounded-[2rem] sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="space-y-3 min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                Vibe coder economics
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  AI coding cost calculator
                </h1>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300 sm:mt-3 sm:text-sm sm:leading-6 lg:text-base">
                  Compare subscriptions, API providers, Macs, home GPU rigs, hyperscalers, and marketplaces by
                  cost-to-output. Subscription lines now model full monthly billing, included quota, and post-quota
                  overage where it is publicly documented. The chart uses straight segments and quota markers so the
                  pricing shape matches the underlying math.
                </p>
              </div>
            </div>

            <div className="flex flex-shrink-0 flex-wrap gap-2 sm:gap-3">
              <Button variant="ghost" onClick={shareLink} className="min-h-[44px] min-w-[44px] touch-manipulation">
                <Link2 className="h-4 w-4" />
                <span className="sm:inline">Copy URL</span>
              </Button>
              <Button onClick={exportPng} className="min-h-[44px] min-w-[44px] touch-manipulation">
                <Download className="h-4 w-4" />
                <span className="sm:inline">Export PNG</span>
              </Button>
            </div>
          </div>

          {feedback ? <p className="text-sm text-cyan-200">{feedback}</p> : null}
        </div>

        <div ref={containerRef} className="flex flex-col gap-4 sm:gap-6">
          <Card className="w-full" id="controls">
            <CardHeader className="space-y-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Controls</CardTitle>
                  <CardDescription>Tune your assumptions. The chart updates at slider speed.</CardDescription>
                </div>
                <a
                  href="#chart"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 px-4 text-sm font-medium text-cyan-200 transition hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 sm:hidden"
                >
                  Jump to chart
                </a>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6">
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">Output mode</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={state.outputMode === 'lines' ? 'default' : 'subtle'}
                      onClick={() => state.setOutputMode('lines')}
                      className="min-h-[44px] touch-manipulation"
                    >
                      Lines of code
                    </Button>
                    <Button
                      variant={state.outputMode === 'apps' ? 'default' : 'subtle'}
                      onClick={() => state.setOutputMode('apps')}
                      className="min-h-[44px] touch-manipulation"
                    >
                      Apps x complexity
                    </Button>
                  </div>
                </section>

                {state.outputMode === 'lines' ? (
                  <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200">Lines per month</span>
                      <Button
                        variant="subtle"
                        size="sm"
                        className="h-7 rounded-lg text-[10px] uppercase tracking-wider"
                        onClick={state.syncTargetToProductivity}
                      >
                        Sync to throughput
                      </Button>
                    </div>
                    <SliderField
                      label=""
                      value={state.targetLines}
                      min={500}
                      max={200000}
                      step={500}
                      formatter={(value) => `${value.toLocaleString()} LOC`}
                      onValueChange={(value) => state.setTargetLines(value)}
                    />
                  </div>
                ) : (
                  <section className="space-y-4">
                    <SliderField
                      label="Apps in slot"
                      value={state.appCount}
                      min={1}
                      max={24}
                      step={1}
                      formatter={(value) => `${value} apps`}
                      onValueChange={(value) => state.setAppCount(value)}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">Complexity</label>
                      <Select
                        value={state.appComplexity}
                        onValueChange={(value) =>
                          state.setAppComplexity(value as 'simple' | 'medium' | 'complex')
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Simple app</SelectItem>
                          <SelectItem value="medium">Medium app</SelectItem>
                          <SelectItem value="complex">Complex app</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </section>
                )}

                <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">Work intensity</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">Link hours</span>
                      <Switch
                        aria-label="Link hours"
                        checked={state.linkWorkHoursToUsage}
                        onCheckedChange={state.setLinkWorkHoursToUsage}
                      />
                    </div>
                  </div>

                  <SliderField
                    label="Working hours/mo"
                    value={state.slotHours}
                    min={40}
                    max={320}
                    step={8}
                    formatter={(value) => `${value}h (${(value / 8).toFixed(1)}d)`}
                    onValueChange={(value) => state.setSlotHours(value)}
                  />

                  {!state.linkWorkHoursToUsage && (
                    <SliderField
                      label="Owned-device usage/week"
                      value={state.activeHoursPerWeek}
                      min={4}
                      max={80}
                      step={2}
                      formatter={(value) => `${value} h/wk`}
                      onValueChange={(value) => state.setActiveHoursPerWeek(value)}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">Productivity template</label>
                  <div className="grid gap-2">
                    {productivityTemplates.map((template) => {
                      const isActive = state.linesPerHour === template.linesPerHour
                      return (
                        <button
                          key={template.id}
                          className={`group relative min-h-[44px] rounded-xl border px-3 py-2.5 text-left touch-manipulation transition ${
                            isActive
                              ? 'border-cyan-400/60 bg-cyan-400/10'
                              : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                          }`}
                          onClick={() => state.setLinesPerHour(template.linesPerHour)}
                        >
                          <p className="text-sm font-medium text-slate-100">{template.label}</p>
                          <p className="text-xs text-slate-400">{template.linesPerHour.toLocaleString()} LOC/h</p>
                          {isActive && (
                            <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <SliderField
                  label="Parallel AI workstreams"
                  value={state.parallelWorkstreams}
                  min={1}
                  max={5}
                  step={1}
                  formatter={(value) =>
                    `${value} lanes (${parallelWorkstreamMultipliers[value as keyof typeof parallelWorkstreamMultipliers].toFixed(2)}x)`
                  }
                  onValueChange={(value) =>
                    state.setParallelWorkstreams(value as keyof typeof parallelWorkstreamMultipliers)
                  }
                />

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm font-medium text-slate-100">Effective throughput</p>
                  <p className="mt-1 text-xl font-semibold text-cyan-200">
                    {Math.round(scenario.effectiveLinesPerHour).toLocaleString()} LOC/hour
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <SliderField
                  label="Tokens per net LOC (incl. context)"
                  value={state.tokensPerLine}
                  min={40}
                  max={50000}
                  step={500}
                  formatter={(value) => `${value.toLocaleString()}`}
                  onValueChange={(value) => state.setTokensPerLine(value)}
                />
                <div className="space-y-2">
                  <p className="text-xs leading-5 text-slate-500">
                    Context dominates. Heavy Cursor users often see 300M–1B+ tokens/month (Included + On-Demand). Pick preset or tune to match your dashboard.
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {tokenUsageTemplates.map((template) => (
                      <button
                        key={template.id}
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          state.tokensPerLine === template.tokensPerLine
                            ? 'border-cyan-400/60 bg-cyan-400/10'
                            : 'border-slate-800 bg-slate-950/60'
                        }`}
                        onClick={() => state.setTokensPerLine(template.tokensPerLine)}
                      >
                        <p className="text-xs font-medium text-slate-100">{template.label}</p>
                        <p className="text-[11px] text-slate-400">{template.tokensPerLine.toLocaleString()} tok</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-medium text-slate-200">Visible categories</h2>
                  <p className="mt-0.5 text-xs text-slate-400">Hide groups to reduce chart noise.</p>
                </div>
                <ToggleRow
                  label="Hide dotted subscriptions (unclear quota)"
                  checked={state.hideSoftQuotaSubscriptions}
                  onCheckedChange={() => state.setHideSoftQuotaSubscriptions(!state.hideSoftQuotaSubscriptions)}
                />
                <div className="space-y-2">
                  <ToggleRow
                    label="Subscriptions"
                    checked={state.enabledCategories.subscription}
                    onCheckedChange={() => state.toggleCategory('subscription')}
                  />
                  <ToggleRow
                    label="API providers"
                    checked={state.enabledCategories.api}
                    onCheckedChange={() => state.toggleCategory('api')}
                  />
                  <ToggleRow
                    label="Home hosted"
                    checked={state.enabledCategories['home-hardware']}
                    onCheckedChange={() => state.toggleCategory('home-hardware')}
                  />
                  <ToggleRow
                    label="Hyperscalers"
                    checked={state.enabledCategories.hyperscaler}
                    onCheckedChange={() => state.toggleCategory('hyperscaler')}
                  />
                  <ToggleRow
                    label="Marketplaces"
                    checked={state.enabledCategories.marketplace}
                    onCheckedChange={() => state.toggleCategory('marketplace')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Profiles</CardTitle>
              <CardDescription>Save parameter sets locally, reload them instantly, and copy share links per profile.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <label htmlFor="profile-name" className="text-sm font-medium text-slate-200">
                  Profile name
                </label>
                <input
                  id="profile-name"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder="e.g. Cursor heavy / 4090 compare"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-500"
                />
                <Button className="w-full" onClick={saveLocalProfile}>
                  <Save className="h-4 w-4" />
                  Save Locally
                </Button>
                <p className="text-xs leading-5 text-slate-500">
                  Profiles are stored in this browser only. Use share on any saved profile to send the exact setup.
                </p>
              </div>

              <div className="space-y-3">
                {savedProfiles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/20 p-6 text-sm text-slate-500">
                    No saved profiles yet. Save one to compare different setups side by side over time.
                  </div>
                ) : (
                  savedProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{profile.name}</p>
                        <p className="text-xs text-slate-500">
                          Saved {new Date(profile.savedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="subtle" size="sm" onClick={() => loadLocalProfile(profile)}>
                          Load
                        </Button>
                        <Button variant="subtle" size="sm" onClick={() => void copyProfileShareLink(profile)}>
                          <Copy className="h-4 w-4" />
                          Share
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteLocalProfile(profile.id)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0" id="chart">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-xl sm:text-2xl">Cost vs output</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Full-width comparison. X: LOC, tokens, hours/mo. Y: total monthly cost USD. Target:{' '}
                {scenario.effectiveTargetLines.toLocaleString()} LOC this month.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              <div
                ref={chartContainerRef}
                className="h-[50vh] min-h-[320px] w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950/30 p-2 sm:min-h-[420px] md:h-[58vh] md:min-h-[540px] md:rounded-[2rem]"
              >
                  {chartReady ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={280}>
                      <LineChart data={chartData} margin={{ left: 16, right: 16, top: 24, bottom: 42 }}>
                        <CartesianGrid stroke="#1e293b" vertical={false} />
                        <XAxis
                          dataKey="lines"
                          stroke="#94a3b8"
                          tickLine={false}
                          axisLine={false}
                          tick={
                          <XAxisTickWithHours
                            effectiveLinesPerHour={scenario.effectiveLinesPerHour}
                            tokensPerLine={state.tokensPerLine}
                          />
                        }
                        />
                        <YAxis
                          stroke="#94a3b8"
                          tickLine={false}
                          axisLine={false}
                          width={72}
                          tickFormatter={(value) => `$${Math.round(value)}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <ReferenceLine
                          x={scenario.chartPoints.find((value) => value === scenario.effectiveTargetLines)}
                          stroke="#67e8f9"
                          strokeDasharray="4 4"
                        />
                        {scenario.visibleSeries
                          .filter((series) => series.quotaLimitLines)
                          .map((series) => (
                            <ReferenceLine
                              key={`${series.id}-quota`}
                              x={series.quotaLimitLines}
                              stroke={series.color}
                              strokeDasharray="2 6"
                              strokeOpacity={0.45}
                            />
                          ))}
                        {scenario.visibleSeries.map((series) => (
                          <Line
                            key={series.id}
                            type="linear"
                            dataKey={series.id}
                            name={series.name}
                            stroke={series.color}
                            strokeWidth={2.5}
                            strokeDasharray={series.lineStyle === 'dashed' ? '7 5' : undefined}
                            dot={false}
                            activeDot={{ r: 5 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-3xl border border-slate-800 bg-slate-950/40 text-sm text-slate-400">
                      Preparing chart...
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {scenario.summaryCards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="pb-3">
                  <CardDescription>{card.title}</CardDescription>
                  <CardTitle className="text-xl">{card.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-slate-300">{card.detail}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <div className="min-w-0 space-y-6">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <Card className="border-slate-800 bg-slate-950/40">
                    <CardHeader>
                      <CardTitle className="text-base">Assumptions at a glance</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                      <InfoRow label="Output mode" value={state.outputMode === 'lines' ? 'Lines of code' : 'Apps x complexity'} />
                      <InfoRow label="Target output" value={`${scenario.effectiveTargetLines.toLocaleString()} LOC/month`} />
                      <InfoRow label="Monthly work window" value={`${scenario.monthlyWorkHours} hours (${scenario.monthlyWorkDays.toFixed(1)} days)`} />
                      <InfoRow label="Base accepted throughput" value={`${state.linesPerHour.toLocaleString()} LOC/hour`} />
                      <InfoRow label="Parallel workstreams" value={`${state.parallelWorkstreams} lanes (${scenario.parallelMultiplier.toFixed(2)}x)`} />
                      <InfoRow label="Active Model Productivity" value={`${(scenario.modelProductivityMultiplier * 100).toFixed(0)}%`} />
                      <InfoRow label="Monthly Max Output" value={`${Math.round(scenario.monthlyLocCapacity).toLocaleString()} LOC`} />
                      <InfoRow label="Effective throughput" value={`${Math.round(scenario.effectiveLinesPerHour).toLocaleString()} LOC/hour`} />
                      <InfoRow label="Owned-device usage" value={`${state.activeHoursPerWeek} hours/week`} />
                      <InfoRow label="Power cost" value={`$${state.electricityUsdPerKwh.toFixed(2)} / kWh`} />
                      <InfoRow
                        label="Tokens per net LOC (incl. context)"
                        value={`${state.tokensPerLine.toLocaleString()} tokens`}
                      />
                      <InfoRow label="Amortization period" value={`${state.amortizationYears} years`} />
                    </CardContent>
                  </Card>

                  <Card className="border-slate-800 bg-slate-950/40">
                    <CardHeader>
                      <CardTitle className="text-base">Quota-aware subscription logic</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                      <p className="rounded-lg border border-cyan-800/50 bg-cyan-950/20 px-3 py-2 text-cyan-100">
                        <strong>Using your Cursor dashboard:</strong> Total tokens (Included + On-Demand) ÷ your LOC this month ≈ tokens/line. Set that and your LOC target; the chart shows your real cost vs alternatives.
                      </p>
                      <p className="rounded-lg border border-amber-900/30 bg-amber-950/20 px-3 py-2 text-amber-200/80 text-xs italic">
                        <strong>Note on "Context Arbitrage":</strong> Subscriptions like Cursor and Copilot charge per request (Qty), not per token. For 1M+ token contexts, this is often 10-20x cheaper than raw API billing (e.g. OpenRouter). The chart reflects this massive savings for context-heavy vibe coding.
                      </p>
                      <p>Cursor uses included monthly on-demand units, then overage units ($1.20/unit) after exhaustion.</p>
                      <p>Windsurf and Copilot tiers use published credit or request quotas with paid add-ons after exhaustion.</p>
                      <p>Claude and Antigravity stay dashed because their public limits are soft or rolling-window based.</p>
                      <p>Solid subscription lines now use linear segments. Faint vertical markers show estimated quota exhaustion points.</p>
                      <p>Heavy users can stack multiple coding lanes with diminishing returns instead of a naive linear multiplier.</p>
                      <p>Break-even callouts show both lines and time using an 8-hour workday assumption.</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-slate-800 bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-base">Home-hosted assumptions</CardTitle>
                    <CardDescription>
                      Cost is time-based (hours of use), not token-based. Tune these to your real setup.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <SliderField
                        label="Amortization Period"
                        value={state.amortizationYears}
                        min={1}
                        max={6}
                        step={1}
                        formatter={(value) => `${value} years`}
                        onValueChange={(value) => state.setAmortizationYears(value)}
                      />
                      <SliderField
                        label="Electricity rate"
                        value={state.electricityUsdPerKwh}
                        min={0.05}
                        max={0.80}
                        step={0.01}
                        formatter={(value) => `$${value.toFixed(2)}/kWh`}
                        onValueChange={(value) => state.setElectricityUsdPerKwh(value)}
                      />
                    </div>

                    <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                      <InfoRow
                        label="Workdays/mo"
                        value={`${scenario.monthlyWorkDays.toFixed(1)} d`}
                      />
                      <InfoRow
                        label="Total Work window"
                        value={`${scenario.monthlyWorkHours} h`}
                      />
                      <InfoRow
                        label="Lifetime Window"
                        value={`${scenario.homeHardwareParams.totalLifetimeMonths} months`}
                      />
                    </div>
                    
                    <p className="text-xs leading-5 text-slate-500 italic">
                      <strong>Monthly Cost of Ownership model:</strong> Total monthly cost = (Purchase Price ÷ Months of Life) + (Power Draw × Hours of Use). This treats your hardware as a fixed monthly investment (CapEx) plus variable electricity (OpEx). "Effective $/h" is calculated as Total Monthly Cost ÷ your total working hours ({scenario.monthlyWorkHours}h).
                    </p>
                    {scenario.visibleSeries.some((s) => s.category === 'home-hardware') ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[320px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-700 text-slate-400">
                              <th className="py-2 pr-3 font-medium">Device</th>
                              <th className="py-2 pr-3 font-medium">Monthly Amort.</th>
                              <th className="py-2 pr-3 font-medium">Power (Work)</th>
                              <th className="py-2 pr-3 font-medium">Runs (best →)</th>
                              <th className="py-2 font-medium">Effective $/h</th>
                            </tr>
                          </thead>
                          <tbody>
                            {homeHardware
                              .filter((h) =>
                                scenario.visibleSeries.some((s) => s.id === h.id && s.category === 'home-hardware'),
                              )
                              .map((h) => {
                                const months = scenario.homeHardwareParams.totalLifetimeMonths
                                const amortizedMonthly = months > 0 ? h.purchasePriceUsd / months : 0
                                const electricityMonthly =
                                  (h.powerWatts / 1000) * state.electricityUsdPerKwh * scenario.monthlyWorkHours
                                const totalMonthly = amortizedMonthly + electricityMonthly
                                const effectivePerHour = totalMonthly / scenario.monthlyWorkHours
                                
                                const runnableModels = h.vramGb
                                  ? vibeCoderModelsRanked.filter(
                                      (m) =>
                                        state.agreedModelIds.includes(m.id) &&
                                        m.availability === 'self-hosted' &&
                                        m.minVramGb != null &&
                                        m.minVramGb <= h.vramGb!,
                                    )
                                  : []
                                const runsLabel =
                                  runnableModels.length > 0
                                    ? runnableModels.slice(0, 2).map((m) => m.name).join(', ') +
                                      (runnableModels.length > 2 ? ` +${runnableModels.length - 2}` : '')
                                    : '—'
                                return (
                                  <tr key={h.id} className="border-b border-slate-800">
                                    <td className="py-2 pr-3 text-slate-200">{h.name}</td>
                                    <td className="py-2 pr-3 text-slate-300">${amortizedMonthly.toFixed(2)}/mo</td>
                                    <td className="py-2 pr-3 text-slate-300">${electricityMonthly.toFixed(2)}/mo</td>
                                    <td className="max-w-[180px] py-2 pr-3 text-xs text-slate-400" title={runnableModels.map((m) => m.name).join(', ')}>
                                      {runsLabel}
                                    </td>
                                    <td className="py-2 font-medium text-cyan-200">
                                      ${effectivePerHour.toFixed(2)}
                                    </td>
                                  </tr>
                                )
                              })}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-base">Coding models (vibe coder agreed, best → worst)</CardTitle>
                    <CardDescription>
                      Check the models you agree are ok for quality/context. List is used for home-hosted “Runs” column. Share URL saves your choices.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/20 p-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Benchmark Data Sources (2026)</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                        <a href="https://iterathon.tech/blog/gpt-codex-vs-claude-sonnet-vs-gemini-coding-benchmark-2026" target="_blank" rel="noreferrer" className="hover:text-cyan-400 underline decoration-slate-700 underline-offset-2">Iterathon Coding Bench</a>
                        <a href="https://ianlpaterson.com/blog/llm-benchmark-2026-38-actual-tasks-15-models-for-2-29/" target="_blank" rel="noreferrer" className="hover:text-cyan-400 underline decoration-slate-700 underline-offset-2">Ian Paterson Production Tasks</a>
                        <a href="https://leaper.dev/blog/local-llm-vs-api-2026" target="_blank" rel="noreferrer" className="hover:text-cyan-400 underline decoration-slate-700 underline-offset-2">Leaper Local vs API Study</a>
                        <a href="https://modelfit.io/blog/benchmark-local-vs-cloud-flagships/" target="_blank" rel="noreferrer" className="hover:text-cyan-400 underline decoration-slate-700 underline-offset-2">ModelFit Flagship Comparison</a>
                      </div>
                    </div>
                    <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      {vibeCoderModelsRanked.map((model, index) => {
                        const agreed = state.agreedModelIds.includes(model.id)
                        const isActive = state.selectedModelId === model.id
                        return (
                          <li
                            key={model.id}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
                              isActive
                                ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/30'
                                : agreed
                                ? 'border-slate-700 bg-slate-950/60'
                                : 'border-slate-800/80 bg-slate-950/30 opacity-75'
                            }`}
                          >
                            <input
                              type="checkbox"
                              id={`model-${model.id}`}
                              checked={agreed}
                              onChange={() => state.toggleModelAgreed(model.id)}
                              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                              aria-label={`${agreed ? 'Unmark' : 'Mark'} ${model.name} as ok`}
                            />
                            <div 
                              className="flex flex-1 cursor-pointer items-center gap-2"
                              onClick={() => state.setSelectedModelId(model.id)}
                            >
                              <span className="tabular-nums text-slate-500">{index + 1}.</span>
                              <span className={`text-sm ${isActive ? 'font-bold text-cyan-200' : 'text-slate-200'}`}>
                                {model.name}
                                {isActive && <span className="ml-2 text-[10px] uppercase text-cyan-400">(Active)</span>}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] text-slate-500">{(model.productivityMultiplier * 100).toFixed(0)}% Eff.</span>
                              {model.availability === 'api' ? (
                                <span className="rounded bg-slate-700/80 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
                                  API
                                </span>
                              ) : model.minVramGb != null ? (
                                <span className="rounded bg-cyan-900/50 px-1.5 py-0.5 text-[10px] text-cyan-300">
                                  ≥{model.minVramGb} GB
                                </span>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/40">
                  <CardHeader>
                    <CardTitle className="text-base">Subscription tiers and quotas</CardTitle>
                    <CardDescription>
                      Solid lines use published monthly quotas. Dashed lines use soft fair-use plans without a hard public cap.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {subscriptions
                      .filter((plan) =>
                        scenario.visibleSeries.some((series) => series.id === plan.id && series.category === 'subscription'),
                      )
                      .map((plan) => {
                        const series = scenario.visibleSeries.find((item) => item.id === plan.id)

                        return (
                          <div
                            key={plan.id}
                            className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-100">{plan.name}</p>
                                <p className="text-xs text-slate-400">
                                  {plan.provider} · {plan.tier}
                                </p>
                              </div>
                              <span
                                className="rounded-full px-2.5 py-1 text-xs font-medium"
                                style={{ backgroundColor: `${plan.color}22`, color: plan.color }}
                              >
                                ${plan.monthlyPriceUsd}/mo
                              </span>
                            </div>
                            <p className="mt-3 text-sm text-slate-300">{series?.quotaSummary}</p>
                            <p className="mt-2 text-xs text-slate-500">
                              {series?.quotaLimitLines
                                ? `Approx. included coverage: ${series.quotaLimitLines.toLocaleString()} LOC/month before overage.`
                                : 'Soft limit only. Public docs do not provide a stable monthly hard cap.'}
                            </p>
                          </div>
                        )
                      })}
                  </CardContent>
                </Card>
          </div>

          <Card className="border-slate-800 bg-slate-950/40" id="recent-changes">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Recent changes</CardTitle>
              <CardDescription>
                Pricing and provider rows we add or refresh from public list prices. Spot, commitment, and regional
                discounts are not modeled in the chart.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {pricingChangelog.map((entry) => (
                <div key={entry.date}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">
                    {formatChangelogDate(entry.date)}
                  </p>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
                    {entry.items.map((item, i) => (
                      <li key={`${entry.date}-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="mt-12 border-t border-slate-800/80 py-6 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 px-4 text-sm text-slate-500 sm:gap-6">
          <a
            href="https://github.com/sarhej/vibemath"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
          >
            <Github className="h-4 w-4 shrink-0" aria-hidden />
            Open source on GitHub
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </a>
          <a
            href="https://strt.it"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
          >
            <span>strt.it</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </a>
        </div>
      </footer>
    </main>
  )
}

type SliderFieldProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  formatter: (value: number) => string
  onValueChange: (value: number) => void
}

function SliderField({ label, value, min, max, step, formatter, onValueChange }: SliderFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-200">{label}</label>
        <span className="text-sm text-cyan-200">{formatter(value)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onValueChange(next)} />
    </div>
  )
}

type ToggleRowProps = {
  label: string
  checked: boolean
  onCheckedChange: () => void
}

function ToggleRow({ label, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
      <span className="text-sm text-slate-200">{label}</span>
      <Switch aria-label={label} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function formatTokens(tokens: number): string {
  if (tokens >= 1e6) return `${(tokens / 1e6).toFixed(1)}M`
  if (tokens >= 1e3) return `${Math.round(tokens / 1e3)}k`
  return String(Math.round(tokens))
}

type XAxisTickWithHoursProps = {
  x?: number
  y?: number
  payload?: { value?: number; lines?: number } | Array<{ value?: number; lines?: number }>
  effectiveLinesPerHour: number
  tokensPerLine: number
}

function XAxisTickWithHours({
  x = 0,
  y = 0,
  payload,
  effectiveLinesPerHour,
  tokensPerLine,
}: XAxisTickWithHoursProps) {
  const raw = Array.isArray(payload) ? payload[0] : payload
  const lines = Number(raw?.value ?? raw?.lines ?? 0)
  const hours = effectiveLinesPerHour > 0 ? lines / effectiveLinesPerHour : 0
  const tokens = lines * tokensPerLine
  const locLabel = lines >= 1000 ? `${Math.round(lines / 1000)}k` : String(lines)
  const hoursLabel = hours >= 1 ? `${Math.round(hours)}h` : hours > 0 ? `${hours.toFixed(1)}h` : '0h'
  const tokensLabel = formatTokens(tokens)

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="#94a3b8" className="text-[11px]" dy={4}>
        {locLabel} LOC
      </text>
      <text textAnchor="middle" fill="#64748b" className="text-[10px]" dy={16}>
        {tokensLabel} tok
      </text>
      <text textAnchor="middle" fill="#475569" className="text-[10px]" dy={26}>
        {hoursLabel}/mo
      </text>
    </g>
  )
}

type InfoRowProps = {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  )
}

type TooltipPayload = {
  color?: string
  dataKey?: string
  name?: string
  value?: number
}

type TooltipProps = {
  active?: boolean
  label?: number
  payload?: TooltipPayload[]
}

function CustomTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null

  const sorted = [...payload].sort((a, b) => (a.value ?? 0) - (b.value ?? 0))

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-2xl">
      <p className="mb-3 text-sm font-medium text-slate-100">{label?.toLocaleString()} LOC</p>
      <div className="space-y-2">
        {sorted.slice(0, 6).map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}</span>
            </div>
            <span className="font-semibold text-slate-100">${entry.value?.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App

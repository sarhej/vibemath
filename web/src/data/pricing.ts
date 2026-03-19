export type CostCategory =
  | 'subscription'
  | 'api'
  | 'home-hardware'
  | 'hyperscaler'
  | 'marketplace'

export type SubscriptionOffering = {
  id: string
  name: string
  provider: string
  tier: string
  category: 'subscription'
  monthlyPriceUsd: number
  color: string
  lineStyle?: 'solid' | 'dashed'
  quota:
    | {
        quotaType: 'monthly_budget_usd'
        includedBudgetUsd: number
        referenceApiUsdPerMillionTokens: number
        resetCycle: 'monthly'
      }
    | {
        quotaType: 'monthly_units'
        unitLabel: string
        includedUnits: number
        estimatedTokensPerUnit: number
        overageUsdPerUnit: number
        resetCycle: 'monthly'
      }
    | {
        quotaType: 'soft_fair_use'
        note: string
        resetCycle: 'rolling_5h' | 'weekly' | 'monthly'
      }
}

export type ApiOffering = {
  id: string
  name: string
  category: 'api'
  blendedUsdPerMillionTokens: number
  color: string
}

export type HomeHardwareOffering = {
  id: string
  name: string
  category: 'home-hardware'
  purchasePriceUsd: number
  powerWatts: number
  color: string
  /** VRAM or unified memory (GB) for self-hosted model capacity. Used to show which models each device can run. */
  vramGb?: number
}

/** Coding model ranked by vibe-coder consensus (best → worst). minVramGb = typical VRAM needed for 4-bit/8-bit self-hosted. */
export type CodingModel = {
  id: string
  name: string
  /** Typical min VRAM (GB) for self-hosted; omit for API-only. */
  minVramGb?: number
  /** API-only, self-hosted, or both. */
  availability: 'api' | 'self-hosted' | 'both'
  /** Productivity multiplier (1.0 = baseline SOTA). Weaker models require more iterations (lower multiplier). */
  productivityMultiplier: number
}

export type RentalOffering = {
  id: string
  name: string
  category: 'hyperscaler' | 'marketplace'
  hourlyRateUsd: number
  color: string
}

export type Offering =
  | SubscriptionOffering
  | ApiOffering
  | HomeHardwareOffering
  | RentalOffering

export const productivityTemplates = [
  { id: 'careful', label: 'Careful shipping', linesPerHour: 250, helper: 'Reviewed, accepted LOC/hour' },
  { id: 'strong', label: 'Strong AI pair', linesPerHour: 700, helper: 'Single lane, heavy agent assistance' },
  { id: 'vibe', label: 'Vibe sprint', linesPerHour: 1800, helper: 'High-output scaffold and refactor mode' },
] as const

export const parallelWorkstreamMultipliers = {
  1: 1,
  2: 1.75,
  3: 2.4,
  4: 3,
  5: 3.45,
} as const

export const complexityMultipliers = {
  simple: 1800,
  medium: 7000,
  complex: 18000,
} as const

/**
 * Token usage per net line of code (including context).
 * Real usage is dominated by context: files, chat history, tools. Output is ~25–40 tokens/line.
 * Sources: Claude Code ~78K tokens/request, ~500 tokens output (166:1 input:output); Cursor 50K+ for agent runs.
 */
export const tokenUsageTemplates = [
  {
    id: 'output-only',
    label: 'Output only (theoretical)',
    tokensPerLine: 40,
    helper: '~25–40 tokens/line for generated code only. Ignores context; underestimates real cost.',
  },
  {
    id: 'tight',
    label: 'Tight context',
    tokensPerLine: 800,
    helper: 'Small edits, few files in context. ~5–20K tokens per request.',
  },
  {
    id: 'normal',
    label: 'Normal (single file + chat)',
    tokensPerLine: 3500,
    helper: 'Typical Cursor/Claude session. Research: ~78K tokens/request, ~15–20 net LOC per request.',
  },
  {
    id: 'heavy',
    label: 'Heavy context (multi-file, agent)',
    tokensPerLine: 7800,
    helper: 'Large context, agent exploration. ~78K+ per request, ~10 net LOC per request.',
  },
  {
    id: 'max',
    label: 'Max (100K context, few lines)',
    tokensPerLine: 12000,
    helper: '100K context consumed while adding ~10 lines.',
  },
  {
    id: 'heavy-cursor-real',
    label: 'Heavy Cursor (Vibe Mode)',
    tokensPerLine: 20000,
    helper: 'High-volume usage, context-heavy agent runs.',
  },
  {
    id: 'maximum-agent',
    label: 'Vibe God (1.1B tok/mo)',
    tokensPerLine: 36000,
    helper: 'Real data: 1.1B tokens / 30k LOC. Context-heavy agent prompting (Opus/Sonnet mix).',
  },
] as const

export const subscriptions: SubscriptionOffering[] = [
  {
    id: 'cursor-pro',
    name: 'Cursor Pro',
    provider: 'Cursor',
    tier: 'Pro',
    category: 'subscription',
    monthlyPriceUsd: 20,
    color: '#4de8ff',
    quota: {
      quotaType: 'monthly_units',
      unitLabel: 'on-demand units',
      includedUnits: 50,
      estimatedTokensPerUnit: 1350000,
      overageUsdPerUnit: 1.2,
      resetCycle: 'monthly',
    },
  },
  {
    id: 'cursor-pro-plus',
    name: 'Cursor Pro+',
    provider: 'Cursor',
    tier: 'Pro+',
    category: 'subscription',
    monthlyPriceUsd: 60,
    color: '#72f1ff',
    quota: {
      quotaType: 'monthly_units',
      unitLabel: 'on-demand units',
      includedUnits: 200,
      estimatedTokensPerUnit: 1350000,
      overageUsdPerUnit: 1.1,
      resetCycle: 'monthly',
    },
  },
  {
    id: 'cursor-ultra',
    name: 'Cursor Ultra',
    provider: 'Cursor',
    tier: 'Ultra',
    category: 'subscription',
    monthlyPriceUsd: 200,
    color: '#b8fbff',
    quota: {
      quotaType: 'monthly_units',
      unitLabel: 'on-demand units',
      includedUnits: 1000,
      estimatedTokensPerUnit: 1350000,
      overageUsdPerUnit: 0.95,
      resetCycle: 'monthly',
    },
  },
  {
    id: 'claude-pro',
    name: 'Claude Pro',
    provider: 'Claude',
    tier: 'Pro',
    category: 'subscription',
    monthlyPriceUsd: 20,
    color: '#2dd4bf',
    lineStyle: 'dashed',
    quota: {
      quotaType: 'soft_fair_use',
      note: 'Shared dynamic limits across Claude, Claude Code, and Claude Desktop. Anthropic publishes no hard monthly quota.',
      resetCycle: 'rolling_5h',
    },
  },
  {
    id: 'claude-max-5x',
    name: 'Claude Max 5x',
    provider: 'Claude',
    tier: 'Max 5x',
    category: 'subscription',
    monthlyPriceUsd: 100,
    color: '#92ffbd',
    lineStyle: 'dashed',
    quota: {
      quotaType: 'soft_fair_use',
      note: 'About 5x Pro allowance, but still governed by rolling dynamic limits rather than a fixed monthly hard cap.',
      resetCycle: 'rolling_5h',
    },
  },
  {
    id: 'claude-max-20x',
    name: 'Claude Max 20x',
    provider: 'Claude',
    tier: 'Max 20x',
    category: 'subscription',
    monthlyPriceUsd: 200,
    color: '#d0ffd9',
    lineStyle: 'dashed',
    quota: {
      quotaType: 'soft_fair_use',
      note: 'About 20x Pro allowance with the same rolling, dynamic usage system.',
      resetCycle: 'rolling_5h',
    },
  },
  {
    id: 'windsurf-pro',
    name: 'Windsurf Pro',
    provider: 'Windsurf',
    tier: 'Pro',
    category: 'subscription',
    monthlyPriceUsd: 15,
    color: '#f7b955',
    quota: {
      quotaType: 'monthly_units',
      unitLabel: 'prompt credits',
      includedUnits: 500,
      estimatedTokensPerUnit: 250000,
      overageUsdPerUnit: 10 / 250,
      resetCycle: 'monthly',
    },
  },
  {
    id: 'windsurf-teams',
    name: 'Windsurf Teams',
    provider: 'Windsurf',
    tier: 'Teams',
    category: 'subscription',
    monthlyPriceUsd: 30,
    color: '#ffd07a',
    quota: {
      quotaType: 'monthly_units',
      unitLabel: 'prompt credits',
      includedUnits: 500,
      estimatedTokensPerUnit: 250000,
      overageUsdPerUnit: 40 / 1000,
      resetCycle: 'monthly',
    },
  },
  {
    id: 'windsurf-enterprise',
    name: 'Windsurf Enterprise',
    provider: 'Windsurf',
    tier: 'Enterprise',
    category: 'subscription',
    monthlyPriceUsd: 60,
    color: '#ffe4ae',
    quota: {
      quotaType: 'monthly_units',
      unitLabel: 'prompt credits',
      includedUnits: 1000,
      estimatedTokensPerUnit: 250000,
      overageUsdPerUnit: 40 / 1000,
      resetCycle: 'monthly',
    },
  },
  {
    id: 'copilot-pro',
    name: 'GitHub Copilot Pro',
    provider: 'GitHub Copilot',
    tier: 'Pro',
    category: 'subscription',
    monthlyPriceUsd: 10,
    color: '#9a7cff',
    quota: {
      quotaType: 'monthly_units',
      unitLabel: 'premium requests',
      includedUnits: 300,
      estimatedTokensPerUnit: 150000,
      overageUsdPerUnit: 0.04,
      resetCycle: 'monthly',
    },
  },
  {
    id: 'copilot-pro-plus',
    name: 'GitHub Copilot Pro+',
    provider: 'GitHub Copilot',
    tier: 'Pro+',
    category: 'subscription',
    monthlyPriceUsd: 39,
    color: '#c0a6ff',
    quota: {
      quotaType: 'monthly_units',
      unitLabel: 'premium requests',
      includedUnits: 1500,
      estimatedTokensPerUnit: 150000,
      overageUsdPerUnit: 0.04,
      resetCycle: 'monthly',
    },
  },
  {
    id: 'antigravity-pro',
    name: 'Antigravity Pro',
    provider: 'Antigravity',
    tier: 'Pro',
    category: 'subscription',
    monthlyPriceUsd: 20,
    color: '#ff77c8',
    lineStyle: 'dashed',
    quota: {
      quotaType: 'soft_fair_use',
      note: 'Priority access and variable limits are public, but a stable hard monthly quota is not.',
      resetCycle: 'weekly',
    },
  },
  {
    id: 'antigravity-ultra',
    name: 'Antigravity Ultra',
    provider: 'Antigravity',
    tier: 'Ultra',
    category: 'subscription',
    monthlyPriceUsd: 249.99,
    color: '#ff9bd9',
    lineStyle: 'dashed',
    quota: {
      quotaType: 'soft_fair_use',
      note: 'Higher priority quota than Pro, but Google does not publish a clean, stable monthly hard cap.',
      resetCycle: 'rolling_5h',
    },
  },
] as const

/**
 * Coding models vibe coders agree are ok-ish, best → worst.
 * Order reflects consensus quality (Mar 2026); minVramGb lets us map home hardware to "can run" models.
 */
export const vibeCoderModelsRanked: CodingModel[] = [
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', availability: 'api', minVramGb: undefined, productivityMultiplier: 1.0 },
  { id: 'gpt-5-4', name: 'GPT-5.4', availability: 'api', minVramGb: undefined, productivityMultiplier: 1.0 },
  { id: 'gemini-3-1-pro', name: 'Gemini 3.1 Pro', availability: 'api', minVramGb: undefined, productivityMultiplier: 1.0 },
  { id: 'deepseek-coder-v3', name: 'DeepSeek Coder V3 (236B)', availability: 'api', minVramGb: undefined, productivityMultiplier: 0.95 },
  { id: 'qwen3-coder-next', name: 'Qwen3-Coder-Next (MoE, ~46GB)', availability: 'self-hosted', minVramGb: 46, productivityMultiplier: 0.90 },
  { id: 'llama-4-70b', name: 'Llama 4 70B (code)', availability: 'self-hosted', minVramGb: 40, productivityMultiplier: 0.88 },
  { id: 'deepseek-r1-70b', name: 'DeepSeek R1 70B', availability: 'self-hosted', minVramGb: 40, productivityMultiplier: 0.85 },
  { id: 'qwen-32b-coder', name: 'Qwen 2.5 Coder 32B', availability: 'self-hosted', minVramGb: 32, productivityMultiplier: 0.80 },
  { id: 'deepseek-v2-16b', name: 'DeepSeek Coder V2 16B', availability: 'self-hosted', minVramGb: 16, productivityMultiplier: 0.75 },
  { id: 'codestral', name: 'Codestral 22B', availability: 'self-hosted', minVramGb: 16, productivityMultiplier: 0.70 },
  { id: 'code-llama-13b', name: 'Code Llama 13B', availability: 'self-hosted', minVramGb: 10, productivityMultiplier: 0.60 },
  { id: 'qwen-7b-coder', name: 'Qwen 2.5 Coder 7B', availability: 'self-hosted', minVramGb: 6, productivityMultiplier: 0.50 },
  { id: 'llama-3-2-8b', name: 'Llama 3.2 8B (code)', availability: 'self-hosted', minVramGb: 8, productivityMultiplier: 0.45 },
  { id: 'starcoder2', name: 'StarCoder2 15B', availability: 'self-hosted', minVramGb: 10, productivityMultiplier: 0.40 },
]

export const apiProviders: ApiOffering[] = [
  { id: 'openrouter-premium', name: 'OpenRouter context mix', category: 'api', blendedUsdPerMillionTokens: 2.8, color: '#63f59a' },
  { id: 'openai-coding', name: 'OpenAI (GPT-5.2/o3)', category: 'api', blendedUsdPerMillionTokens: 1.9, color: '#7fb4ff' },
  { id: 'anthropic-coding', name: 'Anthropic (Sonnet 4.6)', category: 'api', blendedUsdPerMillionTokens: 3.1, color: '#f7b955' },
  { id: 'google-gemini', name: 'Gemini 3.1 Pro', category: 'api', blendedUsdPerMillionTokens: 2.1, color: '#ff77c8' },
  { id: 'deepseek', name: 'DeepSeek V3.2 (Value)', category: 'api', blendedUsdPerMillionTokens: 0.3, color: '#4de8ff' },
] as const

export const homeHardware: HomeHardwareOffering[] = [
  { id: 'rtx-3060-12gb', name: 'RTX 3060 12GB rig', category: 'home-hardware', purchasePriceUsd: 1100, powerWatts: 350, color: '#4de8ff', vramGb: 12 },
  { id: 'rtx-4060ti-16gb', name: 'RTX 4060 Ti 16GB rig', category: 'home-hardware', purchasePriceUsd: 1400, powerWatts: 380, color: '#79dcff', vramGb: 16 },
  { id: 'rtx-4070-super', name: 'RTX 4070 Super rig', category: 'home-hardware', purchasePriceUsd: 1850, powerWatts: 450, color: '#91f59c', vramGb: 12 },
  { id: 'rtx-3090-24gb', name: 'RTX 3090 24GB rig', category: 'home-hardware', purchasePriceUsd: 2200, powerWatts: 600, color: '#a78bfa', vramGb: 24 },
  { id: 'rtx-4090', name: 'RTX 4090 rig', category: 'home-hardware', purchasePriceUsd: 3600, powerWatts: 750, color: '#ff77c8', vramGb: 24 },
  { id: 'rtx-4090-dual', name: 'Dual RTX 4090 rig', category: 'home-hardware', purchasePriceUsd: 6500, powerWatts: 1400, color: '#ff55aa', vramGb: 48 },
  { id: 'rtx-5090', name: 'RTX 5090 rig', category: 'home-hardware', purchasePriceUsd: 4800, powerWatts: 850, color: '#ff9966', vramGb: 32 },
  { id: 'mac-mini', name: 'Mac mini (64GB)', category: 'home-hardware', purchasePriceUsd: 1499, powerWatts: 60, color: '#7fb4ff', vramGb: 64 },
  { id: 'macbook-pro-max', name: 'MacBook Pro Max', category: 'home-hardware', purchasePriceUsd: 3999, powerWatts: 120, color: '#d99bff', vramGb: 48 },
  { id: 'mac-studio', name: 'Mac Studio (128GB)', category: 'home-hardware', purchasePriceUsd: 4999, powerWatts: 250, color: '#f7b955', vramGb: 128 },
  { id: 'mac-studio-ultra', name: 'Mac Studio Ultra (192GB)', category: 'home-hardware', purchasePriceUsd: 6999, powerWatts: 350, color: '#ef4444', vramGb: 192 },
  { id: 'custom-cluster', name: 'Custom AI Cluster', category: 'home-hardware', purchasePriceUsd: 15000, powerWatts: 2200, color: '#facc15', vramGb: 320 },
] as const

export const rentedHyperscalers: RentalOffering[] = [
  { id: 'aws-h100', name: 'AWS H100', category: 'hyperscaler', hourlyRateUsd: 3.93, color: '#ffcc66' },
  { id: 'azure-a100-80gb', name: 'Azure A100 80GB', category: 'hyperscaler', hourlyRateUsd: 3.67, color: '#f7b955' },
  { id: 'gcp-l4', name: 'GCP L4', category: 'hyperscaler', hourlyRateUsd: 0.82, color: '#ffd86a' },
] as const

export const rentedMarketplaces: RentalOffering[] = [
  { id: 'runpod-a100', name: 'RunPod A100 80GB', category: 'marketplace', hourlyRateUsd: 1.39, color: '#78a6ff' },
  { id: 'runpod-l40s', name: 'RunPod L40S', category: 'marketplace', hourlyRateUsd: 0.79, color: '#5e8fff' },
  { id: 'vast-a100', name: 'Vast.ai A100 80GB', category: 'marketplace', hourlyRateUsd: 0.67, color: '#8db0ff' },
  { id: 'lambda-h100', name: 'Lambda H100', category: 'marketplace', hourlyRateUsd: 2.79, color: '#9fc0ff' },
] as const

export const allOfferings: Offering[] = [
  ...subscriptions,
  ...apiProviders,
  ...homeHardware,
  ...rentedHyperscalers,
  ...rentedMarketplaces,
]

/** Human-edited log of pricing & provider updates (newest first). */

export type PricingChangelogEntry = {
  /** ISO date YYYY-MM-DD */
  date: string
  items: string[]
}

export function formatChangelogDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export const pricingChangelog: PricingChangelogEntry[] = [
  {
    date: '2026-03-25',
    items: [
      'Marketplace: added RunPod H100 PCIe 80GB ($1.99/hr) and RunPod H200 141GB ($3.59/hr) from runpod.io/gpu-pricing.',
      'Marketplace: added Nebius HGX H100 ($2.95/GPU-hr) and HGX H200 ($3.50/GPU-hr) from nebius.com/prices.',
      'Marketplace: Lambda H100 SXM 80GB updated to $3.99/GPU-hr (lambda.ai instance pricing, Apr 2026 effective date on site).',
      'Marketplace: added GPUaaS H200 bare metal India (~$1.85/hr) as a wholesale-style reference (gpuaas.com).',
      'Labels: RunPod A100 clarified as SXM 80GB; Vast.ai A100 marked “(typical)” — live host rates vary; AWS H100 labeled as p5.4xlarge / GPU.',
    ],
  },
]

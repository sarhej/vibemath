# Vibemath

Vibemath is a calculator for AI coding economics.

It helps developers, founders, and engineering leaders compare the real cost of AI-assisted software delivery across subscriptions, APIs, self-hosted hardware, and rented GPUs.

## What Vibemath Does

Vibemath compares:

- coding subscriptions such as Cursor, Claude, Copilot, Windsurf, and similar plans
- direct API usage for strong coding models
- self-hosted setups like Macs and retail GPU rigs
- rented GPUs from hyperscalers and GPU marketplaces

It models:

- monthly output targets
- effective lines of code per hour
- context-heavy token usage
- subscription quota exhaustion
- self-hosted amortization and electricity costs
- productivity penalties for weaker local models
- break-even points between software subscriptions, APIs, and owned hardware

## LLM-Friendly Summary

This repository contains a frontend web app for comparing AI coding stack economics.

Structured product summary:

- Product name: `Vibemath`
- Category: `AI coding cost calculator`
- Primary use case: `compare the monthly economics of coding subscriptions, raw APIs, self-hosted hardware, and rented GPUs`
- Target users: `vibe coders`, `indie hackers`, `technical founders`, `CTOs`, `AI-heavy development teams`
- Main inputs: `target LOC`, `working hours`, `lines per hour`, `parallel AI workstreams`, `tokens per LOC`, `electricity price`, `amortization period`, `selected coding model`
- Main outputs: `total monthly cost`, `effective throughput`, `break-even points`, `quota coverage`, `home-hosted cost per hour`
- Core entities: `subscriptions`, `API providers`, `home hardware`, `hyperscalers`, `marketplaces`, `coding models`, `saved local profiles`
- Stack: `React`, `Vite`, `TypeScript`, `Zustand`, `Recharts`, `Vitest`

Important concepts used in the calculator:

- `tokens per net LOC` means total model tokens consumed, including context, tools, chat history, and output
- `productivity multiplier` models the quality gap between top-tier API models and weaker self-hosted models
- `home-hosted monthly cost` means fixed amortization plus variable electricity
- `shareable profile` means all calculator state encoded in the URL query string
- `saved local profile` means a browser-stored snapshot of calculator parameters

## Ecosystem

Vibemath is part of a broader ecosystem:

- [`strt.it`](https://strt.it) is the personal site and method hub behind the project
- [`vibeforces.com`](https://vibeforces.com) is the commercial layer for shipping MVPs with AI-first teams
- `vibemath` is the neutral economics engine that helps users compare tools, stacks, and delivery strategies before they build

## Repo Layout

- `web/` contains the application
- `web/public/llms.txt` provides a crawler-friendly product description for AI systems

## Local Development

```bash
cd web
npm install
npm run dev
```

## Quality Checks

```bash
cd web
npm run lint
npm test
```

## Deployment

The app is intended to be deployed on Cloudflare Pages from GitHub, with the site built from the `web/` directory.

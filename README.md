# ScrapLoop

<!-- TODO: paste full MVP definition here -->

ScrapLoop turns household scrap into income: photograph your scrap, get an AI
estimate of materials, weight and ₹ value, and book a pickup with your local
kabadiwala.

## Problem

TODO

## How it works

1. A household photographs their scrap.
2. AI estimates materials, weight and ₹ value. *(not built yet)*
3. The household requests a pickup. *(not built yet)*
4. A kabadiwala accepts and completes the job. *(not built yet)*
5. Impact totals and the ward dashboard update. *(not built yet)*

## Stack

- Vite + React 19 + TypeScript (strict)
- Tailwind CSS v4 via the `@tailwindcss/vite` plugin (CSS-first config, no
  `tailwind.config.js`)
- React Router for routing
- Vitest + React Testing Library + jsdom for tests
- oxlint (ships with the current Vite react-ts template)

## Getting started

```bash
git clone <repo-url>
cd scraploop
npm install
cp .env.example .env.local   # real Gemini key goes here; never committed
npm run dev
```

Open http://localhost:5173. The scaffold runs without any API key —
`VITE_GEMINI_API_KEY` is only needed once the AI scan service lands.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build |
| `npm test` | Run tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with oxlint |

## Project structure

```
src/
  app/          # App shell, router, layout, role switching
  components/   # shared presentational primitives (empty for now)
  config/       # static config (rate tables land here later)
  data/         # mock data layer + adapters (later)
  domain/       # types + pure logic, no React, no I/O (later)
  features/
    scan/       # household AI scan (placeholder page)
    pickup/     # pickup request + tracking (placeholder page)
    worker/     # kabadiwala job board (placeholder page)
    ward/       # officer dashboard (placeholder page)
  lib/          # generic utils (later: image compression, formatting)
  services/     # external API clients (later: Gemini)
  test/         # test setup + smoke test
```

Empty directories carry a `.gitkeep` until real code lands.

## Roadmap

TODO

## What's stubbed

TODO

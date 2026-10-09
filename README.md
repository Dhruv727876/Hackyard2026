# ScrapLoop
> A digital marketplace that turns household scrap into income and formalizes informal waste workers.

## Problem
India's recyclable value is lost at the household level. Households can't tell what their scrap is worth or whom to call. Informal kabadiwalas (~1.5M waste pickers) work without demand visibility, fair pricing transparency or digital presence. Municipalities lack ward-level recycling data. Existing apps teach segregation; none close the loop to an actual pickup and payment.

## MVP Objective
Validate one hypothesis: *households will request pickups when AI instantly shows them what their scrap is worth, and kabadiwalas will accept those jobs.*

## Getting Started
**Prerequisites:** Node.js 20+
```bash
git clone <repo-url>
cd scraploop
npm install
cp .env.example .env.local
# Add your NVIDIA_API_KEY= in .env.local (server-only, not VITE_).
# Restart `npm run dev` after editing .env.local.
# If left blank, scans fall back to realistic sample data.
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

## 🎬 Judge Demo Script
The app features a role toggle (Household / Worker / Officer) in the header to simulate the three-sided marketplace without authentication.
1. **Household Scan:** Ensure "Household" is selected. Upload 1-3 photos of scrap (or click "Scan" with no photos to trigger the sample fallback).
2. **Review Valuation:** See the AI-estimated materials, weights, and ₹ value. Edit a weight or material to see the total recalculate live.
3. **Request Pickup:** Click "Request pickup →". Enter an address, click "Use my location", pick a slot, and submit.
4. **Worker Acceptance:** Click the "Worker" role toggle. See your new job on the board sorted by distance. Click "Accept Job".
5. **Worker Completion:** Click "Mark Complete". The job disappears from the board.
6. **Ward Impact:** Click the "Officer" role toggle. View the real-time dashboard showing the kg diverted, ₹ circulated, and CO₂ saved from the job you just completed.
7. **Reset:** Click the subtle "Reset Demo" button in the header to restore the seed data for the next run.

## Architecture
- **Frontend:** Vite, React 19, TypeScript (strict), Tailwind CSS v4.
- **State & Data:** Pure domain logic (`src/domain`), config-driven rate tables (`src/config`), and an async Repository pattern (`src/data`) backed by localStorage. This seam allows a one-file swap to Firestore post-MVP.
- **AI Integration:** NVIDIA Nemotron via a same-origin `/api/scan` proxy (Vite middleware in dev, Vercel function in prod). The API key never ships to the browser. Client-side image compression, strict JSON extraction, and a cached sample fallback if the API is unreachable or unconfigured.
- **Visualization:** Recharts for the municipal impact dashboard.

## What's Stubbed (MVP Scope)
To focus on the core loop (Scan → Value → Pickup → Impact), the following are intentionally mocked:
- **Authentication:** Role switching is a simple UI toggle.
- **Database:** Uses `localStorage`. Ward membership is derived by nearest geographic centroid.
- **Payments:** Payouts are indicative estimates based on a static config table.
- **Maps:** Geolocation uses the browser API, but map tiles (Leaflet) are deferred.
- **Live AI Scans:** If `NVIDIA_API_KEY` is unset or fails, scans use realistic sample data.

## Core User Stories Implemented
- **H1:** Photograph scrap → see itemized materials, est. weight, total ₹.
- **H2:** Correct AI estimates before confirming.
- **H3:** Request pickup with address and time slot.
- **H4:** Track pickup status and personal impact.
- **K1:** Kabadiwala sees nearby requests with distance and payout.
- **K2:** Accept and mark jobs complete.
- **M1:** Ward officer views aggregate kg, ₹, and material mix.

## Post-MVP Roadmap
Auth & worker verification → UPI payments → Multilingual UI (Hindi, Bengali, Kokborok) → WhatsApp bot for workers → Route batching → Municipal API integrations.

# WhatIf-City-Backend

> **WhatIf City — Simulation Engine & REST API Service**

Built with **Node.js**, **Express.js**, **TypeScript**, **Zod**, and **Supabase PostgreSQL**.

## 🚀 Features

- **Discrete-Time Simulation Engine:** Deterministic 1-second ($\Delta t = 1$s) discrete queue simulation.
- **Highway Capacity Manual (HCM 2010):** Level of Service (LOS A through F) classification based on control delay.
- **Defensive Parameter Validation:** Strict cross-field Zod validation enforcing physical signal invariants ($g + y \le C$).
- **Multi-Scenario Comparison:** Compares Baseline vs Plan A vs Plan B with difference metrics and zero-division protection.
- **REST Endpoints:**
  - `GET /api/health` — Health check status
  - `GET /api/scenarios` — Scenario catalog with filters
  - `GET /api/scenarios/:id` — Retrieve scenario details
  - `POST /api/simulations/run` — Run queue simulation
  - `POST /api/simulations/compare` — Compare multiple scenarios
  - `GET /api/projects` & `POST /api/projects` — Manage saved project snapshots
- **Dual Persistence:** Built-in in-memory guest repository for zero paid API lock-in + Supabase PostgreSQL RLS integration.

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start Express server with tsx hot-reload
npm run dev

# Run Vitest unit & integration test suite (Supertest)
npm test

# Build TypeScript to dist/
npm run build
```

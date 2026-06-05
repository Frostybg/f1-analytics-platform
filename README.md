# Formula 1 Analytics Platform

A modern web application that visualizes and analyzes Formula 1 data using the
[OpenF1 API](https://openf1.org/). Built with Node.js, Express, EJS, Bootstrap 5
and Chart.js — no React, no TypeScript, no database.

## Implemented pages

| Route | Status | Description |
|---|---|---|
| `/` | Done | Home dashboard with season summary cards and example speed-trace chart |
| `/drivers` | Done | Full 2026 driver grid — responsive cards with team colours and headshots |
| `/drivers/:driverNumber` | Done | Driver detail page — hero, championship standing, points, recent sessions |
| `/calendar` | Done | Race calendar — GP cards with session badges, summary stats, next-race highlight |

## Tech stack

- **Node.js v18+** + **Express.js** — server and routing
- **EJS** + `express-ejs-layouts` — server-side templating
- **Bootstrap 5** — responsive dark-theme layout (CDN)
- **Chart.js** — data visualization (CDN)
- **Vanilla JavaScript** — client-side interactions
- **OpenF1 API** — live Formula 1 data

No database, authentication, or front-end framework — by design.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
copy .env.example .env      # Windows
# cp .env.example .env       # macOS / Linux

# 3. Run in development (auto-reload via nodemon)
npm run dev

# …or in production mode
npm start
```

Then open <http://localhost:3000>.

## Environment variables

All variables have safe defaults so the app runs without a `.env` file.
Copy `.env.example` to `.env` to override them.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | `development` or `production` |
| `OPENF1_API_BASE_URL` | `https://api.openf1.org/v1` | OpenF1 base URL |
| `OPENF1_API_TIMEOUT` | `10000` | Upstream request timeout (ms) |

## Project structure

```
f1-analytics-platform/
├── server.js                        # Entry point — starts the HTTP server
├── package.json
├── .env.example                     # Environment variable template
│
├── public/                          # Static assets (served as-is)
│   ├── css/main.css                 # F1-inspired dark theme
│   ├── js/main.js                   # Shared client script (navbar behavior)
│   ├── js/charts/exampleChart.js    # Example Chart.js speed-trace component
│   └── js/pages/drivers.js          # Drivers grid — fetch, render, state mgmt
│
├── views/                           # EJS templates
│   ├── layouts/main.ejs             # Master HTML shell (Bootstrap + Chart.js CDN)
│   ├── partials/                    # head, navbar, footer
│   ├── pages/
│   │   ├── home.ejs                 # Dashboard skeleton
│   │   ├── drivers.ejs              # Driver grid shell (client-side fetched)
│   │   └── driver-details.ejs       # Driver detail page (server-side rendered)
│   └── errors/error.ejs             # Shared error view
│
└── src/
    ├── app.js                       # Express app factory
    ├── config/index.js              # Centralised env-based configuration
    ├── routes/
    │   ├── index.js                 # Route aggregator (mount future pages here)
    │   ├── homeRoutes.js
    │   └── driversRoutes.js
    ├── controllers/
    │   ├── homeController.js
    │   └── driversController.js
    ├── services/
    │   ├── httpClient.js            # fetch wrapper — timeout, rate-limit, retry
    │   └── openf1Service.js         # OpenF1 API abstraction (all endpoint logic)
    ├── middleware/errorHandler.js   # Centralised 404 + error rendering
    └── utils/logger.js              # Thin logging wrapper
```

## Architecture notes

**Layered MVC:** routes → controllers → services → views. Each layer has one job; adding a new page is a matter of dropping in a route, controller, and view file, then mounting it in `src/routes/index.js`.

**OpenF1 rate-limit handling:** The `httpClient` serialises outbound requests to stay under OpenF1's 3 req/s cap (350 ms minimum spacing) and retries once on a 429 response. This is transparent to every service method.

**Driver details data strategy:** Championship standing and recent sessions are computed in a single pass over `session_result` data (one request per race weekend, returning all drivers). This keeps the total request count low while enabling standings computation without a dedicated endpoint.

**Client-side vs server-side rendering:**
- Drivers grid: shell renders instantly; data is fetched client-side so loading/error/empty states work cleanly.
- Driver details: fully server-rendered so the hero and stats are available on first paint and search-engine friendly.

## Planned pages (not yet implemented)

- Race Details
- Telemetry Center *(main feature — speed, RPM, throttle, brake, gear, DRS)*
- Driver Comparison
- Circuit Explorer
- About

## License

MIT — unofficial educational project. Not affiliated with Formula 1 companies.

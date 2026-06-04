# Formula 1 Analytics Platform

A modern web application that visualizes and analyzes Formula 1 data using the
[OpenF1 API](https://openf1.org/). Built with Node.js, Express, EJS, Bootstrap 5
and Chart.js.

> **Status: Phase 1 (scaffold).** The Home dashboard skeleton, shared layout,
> navigation, OpenF1 service layer and one example chart are in place. The
> remaining feature pages are added in later phases.

## Tech stack

- **Node.js** + **Express.js** — server & routing
- **EJS** (+ `express-ejs-layouts`) — server-side templating
- **Bootstrap 5** — responsive layout (via CDN)
- **Chart.js** — data visualization (via CDN)
- **Vanilla JavaScript** — client interactions
- **OpenF1 API** — Formula 1 data source

No database, login, or front-end framework in version 1 — by design.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
copy .env.example .env      # Windows
# cp .env.example .env       # macOS / Linux

# 3. Run in development (auto-reload)
npm run dev

# ...or run in production mode
npm start
```

Then open <http://localhost:3000>.

## Project structure

```
f1-analytics-platform/
├── server.js                 # Entry point: starts the HTTP server
├── package.json
├── .env.example              # Environment variable template
├── public/                   # Static assets served as-is
│   ├── css/main.css          # F1-inspired dark theme
│   ├── js/main.js            # Shared client script
│   └── js/charts/            # Per-chart Chart.js components
├── views/                    # EJS templates
│   ├── layouts/main.ejs      # Master layout
│   ├── partials/             # navbar, footer, head
│   ├── pages/                # One file per page (home.ejs ...)
│   └── errors/error.ejs      # Shared error view
└── src/
    ├── app.js                # Express app factory (middleware, views, routes)
    ├── config/               # Centralized env-based configuration
    ├── routes/               # Route definitions (thin)
    ├── controllers/          # Request handling logic
    ├── services/             # OpenF1 API abstraction + HTTP client
    ├── middleware/           # Error handling
    └── utils/                # Logger and helpers
```

## License

MIT — unofficial, educational project. Not affiliated with Formula 1 companies.

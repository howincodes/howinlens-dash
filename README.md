# HowinLens Dashboard

The React admin dashboard for **HowinLens** — an internal ERP that brings a small
team's People (HR), Work (projects & tasks), and Sales/CRM operations under one
role-aware UI.

This repository contains the **frontend only**. It is a single-page application
that talks to the HowinLens REST API (`/api/admin`) for all data and auth.

<p>
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white">
</p>

---

## Features

The UI is organized into permission-gated **hubs**, each backed by its own
route tree and navigation group:

| Hub | Routes | What it covers |
|---|---|---|
| **Overview** | `/overview` | Landing page — CRM pulse, team count, hub shortcuts |
| **People** | `/people`, `/people/:id`, `/people/{attendance,leave,payroll}` | Employee directory with role filter and HR workflow stubs |
| **Work** | `/work/projects`, `/work/tasks` | Project list and a drag-and-drop task board |
| **Sales / CRM** | `/sales/{overview,leads,contacts,campaigns,outreach,referrers}` | Lead pipeline, contacts, campaigns and outreach |
| **Reports** | `/reports/sales/*`, `/reports/prompts` | Sales analytics (funnel, source ROI, leaderboards) |
| **Settings** | `/settings/{general,workspace,roles,audit,hr,crm,lens}` | Workspace config + an editable RBAC permission matrix |
| **Profile** | `/me/profile` | Per-user self-service view |

### Highlights

- **Role-based access control** — the sidebar, routes, and mutation controls are
  gated client-side via `useHasPermission()`; permissions are read from the JWT.
- **Task board** — sortable, drag-and-drop columns (`@dnd-kit`) with density
  modes, bulk actions, and filtering.
- **Server-state caching** — TanStack Query manages the API cache; Zustand holds
  light client state (auth, UI preferences).
- **Accessible primitives** — built on Radix UI, with a small in-house component
  layer in `src/components/ui`.
- **Command palette & shortcuts** — `cmdk` + `react-hotkeys-hook`.
- **Analytics** — charts via Recharts.

## Tech stack

| Area | Library |
|---|---|
| Framework | React 19 |
| Build tool | Vite 8 |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Server state | TanStack Query 5 |
| Client state | Zustand 5 |
| UI primitives | Radix UI |
| Icons | lucide-react |
| Charts | Recharts |
| Drag & drop | dnd-kit |
| Toasts | sonner |

## Getting started

**Prerequisites:** Node.js 20+ and a package manager (`pnpm` recommended; `npm`
or `yarn` work too).

```bash
# install dependencies
pnpm install

# start the dev server (http://localhost:5173)
pnpm dev

# type-check + production build → ./dist
pnpm build

# preview the production build locally
pnpm preview

# lint
pnpm lint
```

### Connecting to the API

The app expects the HowinLens backend on the same origin under `/api`. In
development, Vite proxies API and WebSocket traffic to a local backend — see
`vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': 'http://localhost:3000',
    '/ws': { target: 'ws://localhost:3000', ws: true },
  },
}
```

Point those targets at wherever your backend is running. In production the build
is served as static files by the API server, so all requests stay same-origin.

## Project structure

```
src/
├── App.tsx              # route tree
├── main.tsx             # app bootstrap (Router + Query + Toaster)
├── index.css            # Tailwind layer + design tokens
├── components/          # shared UI
│   ├── ui/              #   in-house primitives (button, input, dialog…)
│   ├── layout/          #   AppShell, header, sidebar
│   ├── tasks/           #   task board + cards
│   ├── sales/           #   CRM widgets
│   └── lens/            #   prompt-tracking views
├── pages/               # route screens, grouped by hub
│   ├── people/
│   ├── work/
│   ├── sales/
│   ├── reports/
│   └── settings/
├── lib/
│   ├── api.ts           # fetch client + typed endpoint helpers
│   ├── modules/         # hub registry + permission-aware navigation
│   ├── crm/             # CRM helpers
│   └── forms/           # form validation
├── hooks/               # custom hooks (WebSocket feed, …)
└── store/               # Zustand stores (auth, …)
```

## Notes

- This is an internal tool published for reference; it is not a standalone
  product and requires the matching HowinLens backend to function.
- No secrets or environment files are committed — see `.gitignore`. All
  authentication happens at runtime against the API using a JWT held in memory.

# Olympus

Private training app for Roman and Andrea at **olympus.romanleipe.com**: log strength
workouts, sync runs from Strava, and follow a training plan that is written and adjusted
together with Claude.

## What it's for

The main goal is consistency: training regularly over months and years, with a plan that
mixes strength and running (Roman trains about 6 sessions a week, with marathons as
occasional targets). The app has three jobs:

1. **Record what happened.** Strength sets are logged on the phone during the workout.
   Runs and other activities arrive automatically from Strava. A free-text note per day
   captures everything else (pain, sleep, energy, "felt great").
2. **Hold the plan.** Planned sessions live as YAML files in [`plan/`](plan/README.md),
   one file per month. The plan is not edited in the app.
3. **Compare plan and actual.** The Calendar shows each planned session with its outcome
   (done, partial, missed, moved a day) plus unplanned activities, and a weekly
   consistency strip.

### How planning works

Plans are made in conversation with Claude in a Claude Code session on this repository:

- **Longer planning** (a month or a multi-month block): discuss goals and constraints, then
  Claude writes the month files.
- **Short-notice changes**, e.g. "I'm running a half marathon with friends on Sunday,
  shuffle the rest of the week": Claude reshuffles the affected days so the week still
  makes sense, for example no heavy legs right before the race.

For each session Claude reads `plan/<user>/context.md` (goals, constraints, principles,
recent decisions) and the actual training data (`npm run snapshot`), edits the YAML,
validates it and commits. The push redeploys the site, and the Calendar shows the new plan
about a minute later. The step-by-step instructions for Claude are in [CLAUDE.md](CLAUDE.md).

Logging and planning are deliberately separate. A note like "shoulder hurt on OHP" does
not change anything by itself; it is read at the next planning session.

### Design principles

- **General, not goal-specific.** No features built around one current goal (like a
  target line for 10 pull-ups). Goals change; they belong in `context.md`, not in the code.
- **Quick logging.** Logging during a workout has to take seconds on a phone.
- **Simple formats.** Metric units only (kg, km), exact kg in 2.5 kg steps in plans, no %1RM.
- **One user first.** Plans and Strava are set up for Roman only. Andrea logs strength
  and body weight but has no plan (she trains intuitively). Everything is keyed by user,
  so adding her later is configuration, not a rebuild.

## Features

| Page | What it does |
| --- | --- |
| **Stats** (`/`) | Summary tiles, body weight, and a card per exercise with its latest top set / max reps / longest hold and a trend line; tap a card for the full chart: weighted (1RM/5RM + volume), reps (max + total), time-based (max + total duration) |
| **Calendar** (`/calendar`) | 2-week and month views with plan vs. actual, day notes, weekly consistency, Strava connect/sync |
| **Weight** (`/bodyweight`) | Log body weight |
| **Log** (`/log`) | Log sets (sets × reps × kg, or duration), add exercises, write the session note, delete recent entries |

The user switcher in the header defaults to Roman. On phones the pages are in a bottom tab bar. The app follows the system light/dark setting.

## Architecture

- **Frontend:** React 18 + Vite + Tailwind, Recharts, hosted on Cloudflare Pages with
  auto-deploy from GitHub.
- **Database:** Supabase (Postgres). The app has no login and talks to Supabase directly
  with the public anon key, so all app tables are readable and writable by anyone with
  that key. The only protected table is `strava_connections` (Strava tokens), which only the
  server function can read, using the service role key.
- **Server:** `server/api.js`, served by Cloudflare Pages Functions at `/api/*`
  (`functions/api/[[path]].js`). Handles Strava OAuth and sync. The Calendar syncs
  automatically when the last sync is older than 15 minutes; the first sync imports
  60 days, and run laps are fetched 20 per sync.
- **Plans:** `plan/<user>/YYYY-MM.yaml`, bundled into the app at build time.
- **Keep-alive:** `.github/workflows/keep-supabase-active.yml` runs `SELECT 1` every 3 days
  through the Supabase Management API so the free-tier project isn't paused.

### Data model

| Table | Contents |
| --- | --- |
| `users` | Roman, Andrea |
| `exercises` | Name + `metric_type`: `one_rep_max`, `max_consecutive`, `time_based` (seconds stored in `reps`) |
| `workout_sets` | One row per logged set |
| `body_weight_logs` | One weight per user per day |
| `day_notes` | One free-text note per user per day |
| `activities` | Strava activities with HR, elevation and laps |
| `strava_connections` | Strava tokens (RLS-protected) |

Schema changes go in `supabase/migrations/` and are run by hand in the Supabase SQL Editor.
`001` and `002` are both applied in production.

### Code map

- `src/pages/`: Dashboard (Stats), Calendar, QuickLog (Log), BodyWeight
- `src/index.css`, `tailwind.config.js`: design tokens (colors for light and dark mode, fonts)
- `src/components/ui.jsx`, `icons.jsx`: shared UI pieces (stepper, sheet, segmented control, ...) and icons
- `src/components/charts/`: exercise and body weight charts with a shared theme
- `src/components/calendar/`: day cards, month grid, consistency strip, Strava bar
- `src/utils/planCore.js`: plan parsing and validation
- `src/utils/matching.js`: plan vs. actual matching (shared by the app and the scripts)
- `src/utils/dates.js`: local-date helpers (never use `toISOString()` for dates)
- `scripts/check-plan.mjs`: `npm run check-plan` validates plan files
- `scripts/training-snapshot.mjs`: `npm run snapshot -- Roman 6` prints recent training as markdown

## Configuration

| Where | Variable | Purpose |
| --- | --- | --- |
| Cloudflare (build) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Frontend database access |
| Cloudflare (runtime, secrets) | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | Strava server function |
| GitHub Actions secrets | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` | Keep-alive workflow |
| Claude Code environment | `SUPABASE_URL`, `SUPABASE_ANON_KEY` + network access to `<project-ref>.supabase.co` | `npm run snapshot` in planning sessions |

The Strava API app's callback domain is `olympus.romanleipe.com`. The service role key
bypasses all database security and must only ever be stored in Cloudflare.

### Setting up from scratch

1. Supabase: create a project, run `supabase/migrations/001_initial_schema.sql`, then `002_plan_notes_strava.sql`.
2. Cloudflare Pages: connect the GitHub repo with framework preset "React (Vite)", build
   command `npm run build`, output directory `dist`, and set the variables above.
3. Strava: create an API app at strava.com/settings/api with the callback domain above,
   then open Calendar → Connect Strava.

Local development: copy `.env.example` to `.env`, then `npm install && npm run dev`.
The Strava functions only run on Cloudflare.

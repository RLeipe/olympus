# Olympus

Private fitness tracker for Roman and Andrea. React + Vite + Tailwind, Supabase (no auth,
public anon key), hosted on Cloudflare at olympus.romanleipe.com. Server code for Strava
lives in `server/api.js` (exposed via `functions/api/[[path]].js`).

## Planning sessions

When Roman asks to plan or adjust training:

1. Read `plan/README.md` (file format) and `plan/<user>/context.md` (goals, constraints, principles).
2. Get recent training data if `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` are set:
   `npm run snapshot -- Roman 6` (plan vs. actual per day, day notes, monthly trends).
   Day notes often contain pain or fatigue remarks; take them into account.
3. Edit the month files in `plan/<user>/YYYY-MM.yaml`. Use exact kg in 2.5 kg steps and
   exercise names exactly as they exist in the app.
4. Update `context.md` when something durable changes (new goal, injury, principle,
   a decision worth remembering). Keep it short; rewrite instead of appending.
5. Run `npm run check-plan`, then commit with a message that says what changed and why.

## Conventions

- Dates are local calendar days (`src/utils/dates.js`); never use `toISOString()` for dates.
- `src/utils/planCore.js` and `src/utils/matching.js` are pure ES modules shared by the app
  and the Node scripts; keep them free of Vite-only features.
- Database changes go in `supabase/migrations/` and are run manually in the Supabase SQL editor.

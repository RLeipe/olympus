# Olympus

Private training app for Roman and Andrea (olympus.romanleipe.com). Read
[README.md](README.md) for what the app is for, how it's built and how it's configured.
Everything described there works in production, including the Strava sync.

## What sessions in this repo are usually about

Most sessions are **training planning** with Roman, not app development. Roman uses the
app to log workouts (Strava brings in runs automatically) and relies on you to create and
adjust his training plan:

- longer planning: a month or a multi-month block, built around his goals
- short-notice changes: "half marathon on Sunday, shuffle the week" means rearrange the
  affected days so the week still works (recovery, no heavy legs before the race, ...)
- reviews: what did I actually do, where did I drift from the plan, why

The plan lives in `plan/<user>/YYYY-MM.yaml` and the app shows plan vs. actual in the
Calendar. You are the only one who edits the plan. Plans exist only for Roman so far.

## Planning sessions

1. Read `plan/README.md` (file format) and `plan/<user>/context.md` (goals, constraints, principles).
2. Get recent training data if `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set:
   `npm run snapshot -- Roman 6` (plan vs. actual per day, day notes, monthly trends).
   Day notes often contain pain or fatigue remarks; take them into account. If the
   variables aren't set or the host is blocked, say so instead of planning blind.
3. Discuss before writing: propose the plan or change, explain the reasoning briefly, and
   get Roman's agreement on anything substantial.
4. Edit the month files in `plan/<user>/YYYY-MM.yaml`. Use exact kg in 2.5 kg steps and
   exercise names exactly as they exist in the app.
5. Update `context.md` when something durable changes (new goal, injury, principle,
   a decision worth remembering). Keep it short; rewrite instead of appending.
6. Run `npm run check-plan`, then commit with a message that says what changed and why,
   and push. The plan shows up in the app after the deploy.

## App development

- Keep the app general: no features tied to one specific current goal; goals belong in `context.md`.
- Dates are local calendar days (`src/utils/dates.js`); never use `toISOString()` for dates.
- `src/utils/planCore.js` and `src/utils/matching.js` are pure ES modules shared by the app
  and the Node scripts; keep them free of Vite-only features.
- Database changes go in `supabase/migrations/` and are run manually in the Supabase SQL editor.
- The app must work well on a phone; check mobile layouts.
- Use the design tokens (`bg-surface`, `text-ink-soft`, `bg-accent`, ... defined in `src/index.css`
  and `tailwind.config.js`) and the shared pieces in `src/components/ui.jsx`, not raw Tailwind
  colors. The look is "Slate & Brass": dark only, deliberately soft contrast, small corners,
  brass used sparingly, Cinzel for titles (`.title`) and Cormorant Garamond for numbers (`.num`).

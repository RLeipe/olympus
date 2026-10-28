# Training plans

Plans are YAML files that the app bundles at build time. Every push to the production
branch redeploys the app, so a plan change shows up in the calendar about a minute later.

```
plan/
  README.md              ← this file (the format)
  <user>/                ← lowercase user name, e.g. roman
    context.md           ← goals, constraints, principles, recent decisions
    2026-11.yaml         ← one file per month, sessions in that month
```

`context.md` is curated, not a log: edit or remove what is no longer true instead of
appending. Keep it short enough to read in full at the start of every planning session.

## Session format

```yaml
sessions:
  - date: 2026-11-03
    type: strength            # run | strength | other | rest
    title: Lower + pull       # optional, otherwise derived from type/kind
    exercises:
      - { name: Squat, sets: 4, reps: 5, weight: 80 }     # weight in kg
      - { name: Pull-ups, sets: 3, reps: max }            # reps: number or "max"
      - { name: Plank, sets: 3, seconds: 60 }             # time-based exercises
    notes: Keep 1-2 reps in reserve   # optional, shown on the card

  - date: 2026-11-04
    type: run
    kind: easy                # easy | long | tempo | intervals | recovery | race
    distance_km: 10
    max_hr: 160               # optional, average HR above this is flagged
    elevation_m: 150          # optional

  - date: 2026-11-06
    type: run
    kind: intervals
    distance_km: 9            # total including warm-up and cool-down
    intervals:
      reps: 6
      distance_m: 800         # rep length by distance, or use duration_s instead
      pace: "4:10"            # optional target pace per km, quoted
      recovery: 90s jog       # optional, free text

  - date: 2026-11-10
    type: run
    kind: intervals
    distance_km: 7
    intervals:
      reps: 10
      duration_s: 60          # rep length by time (exactly one of distance_m / duration_s)
      recovery: 1 min jog

  - date: 2026-11-07
    type: run
    kind: tempo
    distance_km: 8
    pace: "4:45"              # optional target pace per km, quoted

  - date: 2026-11-08
    type: other               # anything else: cycling, hiking, mobility, ...
    title: Mobility
    duration_min: 30          # optional

  - date: 2026-11-09
    type: rest                # optional; not counted in adherence
```

Several sessions on the same date are fine. Exercise names must match the names in the
app, otherwise logged sets cannot be matched to the plan. Case, spaces/hyphens and a
plural "s" are ignored ("Pull Ups" = "pull-up"), other differences are not.

Validate before committing:

```
npm run check-plan
```

## How plan and actual are matched

- **Strength**: sets logged in the app on that day. A planned set counts when a logged set
  has at least the planned reps/seconds and weight.
- **Run**: a Strava run (Run, TrailRun, VirtualRun). Done when the distance reaches 90% of
  the plan. For intervals, laps of roughly the rep distance (or rep duration) at the target
  pace (up to 15 s/km slower still counts, e.g. for a slight uphill) or, without a target
  pace, clearly faster than the run's average count as reps, so record intervals with laps.
- **Other**: any other Strava activity type.
- A session done one day early or late still counts and is shown as "Done Tue" etc.
- Anything done without a matching plan entry shows as "Unplanned".

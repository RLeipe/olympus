# Fitness Tracker - Feature Specification & Implementation Plan

## Project Overview

A private fitness tracking Progressive Web App (PWA) for two users to track strength training and running progress. The app supports dynamic exercise creation, quick workout logging during training sessions, progress visualization, and automatic Strava integration for running activities.

**Target Users:** 2 users (you and your wife)
**Platforms:** Web (Cloudflare Pages) + Android (PWA installable)
**Privacy:** Private app, no authentication required, users switch profiles via dropdown

---

## Core Requirements

### User Management
- Two fixed user profiles (no signup/login)
- Simple user switcher in app header
- Each user can view their own or the other's progress
- No authentication barrier (private deployment)

### Strength Training
- **Dynamic Exercise Creation:** Users can add new exercises during workouts (e.g., "Weighted Pull-ups", "Squat")
- **Exercise Metrics:** Each exercise has a metric type:
  - `one_rep_max`: Track estimated 1RM (Deadlift, Bench Press)
  - `max_consecutive`: Track max consecutive reps (Pull-ups, Push-ups)
  - `total_volume`: Track total volume (sets × reps × weight)
- **Quick Workout Logging:**
  - Exercise selection (dropdown)
  - Smart set input: parse "3x5@80kg, 1x1@90kg" into multiple sets
  - Date field (defaults to today, editable for late entries)
  - Optional notes per set
- **Progress Visualization:**
  - Charts showing metric trends over time (per exercise)
  - Historical workout log
  - Filter by date range (7/30/90 days)

### Running (Strava Integration)
- Automatic import of running activities via Strava API
- OAuth connection per user (connect Strava accounts)
- Sync recent activities (initial 30-day backfill, then ongoing)
- Visualization:
  - Weekly km totals (bar chart)
  - Monthly distance trends
  - Activity list with pace, distance, date
- Running is ONLY via Strava (no manual run logging)

### Body Weight Tracking
- Simple date + weight log
- Line chart showing weight trend over time
- Per-user tracking

### Dashboard
- Overview of recent workouts
- Exercise progress cards with charts
- Body weight chart
- Running activity summary (weekly/monthly km)
- Switch between user views

---

## Tech Stack

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** TailwindCSS
- **Charts:** Recharts
- **Data Fetching:** React Query (TanStack Query)
- **PWA:** Vite PWA plugin + service worker
- **Hosting:** Cloudflare Pages (free tier)

### Backend
- **Database:** Supabase (PostgreSQL, free tier: 500MB)
- **API:** Supabase auto-generated REST API
- **Real-time:** Supabase subscriptions (optional)
- **Serverless Functions:** Supabase Edge Functions (for Strava OAuth)

### Integrations
- **Strava API:** OAuth 2.0 + Activities API
- **Deployment:** GitHub → Cloudflare Pages (auto-deploy)

---

## Database Schema

### Tables

#### `users`
```sql
id                UUID PRIMARY KEY DEFAULT uuid_generate_v4()
name              TEXT NOT NULL UNIQUE  -- "You" / "Wife"
avatar_color      TEXT NOT NULL         -- Hex color for UI
created_at        TIMESTAMP DEFAULT NOW()
```

#### `exercises`
```sql
id                UUID PRIMARY KEY DEFAULT uuid_generate_v4()
name              TEXT NOT NULL
category          TEXT NOT NULL         -- "strength" | "running"
metric_type       TEXT NOT NULL         -- "one_rep_max" | "max_consecutive" | "total_volume"
created_by        UUID REFERENCES users(id)
notes             TEXT
created_at        TIMESTAMP DEFAULT NOW()
```

#### `workout_sets`
```sql
id                UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id           UUID NOT NULL REFERENCES users(id)
exercise_id       UUID NOT NULL REFERENCES exercises(id)
workout_date      DATE NOT NULL DEFAULT CURRENT_DATE
reps              INT NOT NULL
weight            DECIMAL(6,2)          -- Nullable for bodyweight exercises
set_number        INT NOT NULL          -- Order within workout
notes             TEXT
created_at        TIMESTAMP DEFAULT NOW()
```

#### `body_weight_logs`
```sql
id                UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id           UUID NOT NULL REFERENCES users(id)
date              DATE NOT NULL DEFAULT CURRENT_DATE
weight            DECIMAL(5,2) NOT NULL  -- kg
created_at        TIMESTAMP DEFAULT NOW()
UNIQUE(user_id, date)
```

#### `running_activities`
```sql
id                UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id           UUID NOT NULL REFERENCES users(id)
strava_activity_id BIGINT UNIQUE        -- External Strava ID
activity_date     TIMESTAMP NOT NULL
distance          DECIMAL(6,2) NOT NULL  -- km
duration          INT NOT NULL           -- seconds
average_pace      DECIMAL(5,2)          -- min/km
elevation_gain    DECIMAL(6,2)          -- meters
name              TEXT                   -- Activity title
created_at        TIMESTAMP DEFAULT NOW()
```

#### `strava_connections`
```sql
id                UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id           UUID NOT NULL UNIQUE REFERENCES users(id)
access_token      TEXT NOT NULL
refresh_token     TEXT NOT NULL
token_expires_at  TIMESTAMP NOT NULL
athlete_id        BIGINT NOT NULL
connected_at      TIMESTAMP DEFAULT NOW()
last_sync_at      TIMESTAMP
```

---

## Implementation Phases

### Phase 1: Core Infrastructure & Basic Logging
**Duration:** ~1-2 days

**Deliverables:**
- Supabase project setup with database schema
- React app with TailwindCSS and routing
- User switcher component (header dropdown)
- Quick workout logging form:
  - Exercise dropdown (with "+ Add New" modal)
  - Set input parser ("3x5@80kg" → multiple sets)
  - Date picker (defaults to today)
- Exercise management page (list, add, edit, delete)
- Body weight logging form
- Cloudflare Pages deployment

**Technical Tasks:**
1. Initialize Vite + React project
2. Setup Supabase client and environment variables
3. Create database tables via Supabase SQL editor
4. Build `UserContext` for user switching
5. Implement set input parser with regex
6. Connect Cloudflare Pages to GitHub repo

### Phase 2: Dashboard & Progress Visualization
**Duration:** ~1-2 days

**Deliverables:**
- Dashboard homepage with metrics overview
- Exercise progress charts (Recharts):
  - 1RM estimation using Epley formula: `weight × (1 + reps/30)`
  - Max consecutive reps trend
  - Total volume trend
- Body weight line chart
- Recent workout history table
- Date range filters (7/30/90 days)
- Per-user filtering

**Technical Tasks:**
1. Create dashboard layout with grid/cards
2. Implement chart components with Recharts
3. Write SQL queries/views for aggregated metrics
4. Add date range picker component
5. Build workout history list with sorting

### Phase 3: Strava Integration
**Duration:** ~2-3 days

**Deliverables:**
- Strava OAuth connection flow
- Automatic activity sync
- Running dashboard section:
  - Weekly km bar chart
  - Monthly distance line chart
  - Activity list table
- Manual sync button
- Token refresh mechanism

**Technical Tasks:**
1. Register Strava API application (requires domain)
2. Create Supabase Edge Function for OAuth callback:
   ```
   /functions/strava-callback
   /functions/strava-sync
   ```
3. Build OAuth flow:
   - "Connect Strava" button → Strava OAuth page
   - Callback handler → store tokens
4. Implement activity sync:
   - Fetch activities via Strava API
   - Filter for "Run" type
   - Insert/update `running_activities` table
   - Handle pagination (initial 30-day backfill)
5. Setup token refresh (before expiry)
6. Build running dashboard components

**Strava API Endpoints:**
- OAuth: `https://www.strava.com/oauth/authorize`
- Token exchange: `POST /oauth/token`
- Activities: `GET /athlete/activities`

### Phase 4: PWA & Polish
**Duration:** ~1 day

**Deliverables:**
- Installable PWA on Android
- Offline app shell caching
- Loading states and error handling
- Responsive mobile design
- Input validation
- Keyboard shortcuts for power users

**Technical Tasks:**
1. Configure Vite PWA plugin:
   - Add `manifest.json` (name, icons, theme)
   - Generate service worker
2. Add app icons (192x192, 512x512)
3. Implement install prompt for Android
4. Add loading skeletons and spinners
5. Error boundaries and toast notifications
6. Mobile-first responsive CSS
7. Add keyboard shortcuts (e.g., `/` to focus exercise search)
8. Form validation (weight > 0, reps > 0, etc.)

---

## User Flows

### Flow 1: Logging a Strength Workout
1. Open app (defaults to current user)
2. Click "Quick Log" or "+" button
3. Select exercise from dropdown (or click "+ Add New Exercise")
   - If new: enter name, select metric type, save
4. Enter sets: "3x5@80, 1x1@90" (parser handles it)
5. Date auto-filled (change if logging past workout)
6. Click "Save"
7. See confirmation, redirect to dashboard

### Flow 2: Viewing Progress
1. Open dashboard
2. See exercise cards with charts (default: last 30 days)
3. Click exercise card → detailed view with all sets
4. Change date range (7/30/90 days)
5. Switch to wife's profile (header dropdown)
6. See her progress charts

### Flow 3: Connecting Strava
1. Open settings or dashboard
2. Click "Connect Strava"
3. Redirect to Strava OAuth page
4. Approve permissions
5. Redirect back to app
6. See "Connected" status + "Sync Now" button
7. Sync fetches last 30 days of runs
8. Running dashboard populates

### Flow 4: Installing PWA on Android
1. Open app in Chrome on Android
2. See "Add to Home Screen" prompt (or menu → Install)
3. Click "Install"
4. App icon appears on home screen
5. Launch from home screen (full-screen, no browser chrome)

---

## Technical Challenges & Solutions

### Challenge 1: Strava OAuth Complexity
**Problem:** OAuth requires secure token handling, refresh logic, webhook setup

**Solution:**
- Use Supabase Edge Functions (serverless) for OAuth callback
- Store tokens encrypted in database
- Implement token refresh before expiry (cron job or on-demand)
- If webhooks fail: manual sync button as fallback
- Initial sync: backfill last 30 days of activities

**Implementation:**
```javascript
// Edge Function: /functions/strava-callback
export async function handler(req) {
  const { code } = req.query
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code)
  // Store in strava_connections table
  await supabase.from('strava_connections').insert({
    user_id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(tokens.expires_at * 1000),
    athlete_id: tokens.athlete.id
  })
  // Redirect to app
  return redirect('/dashboard')
}
```

### Challenge 2: Set Input Parsing
**Problem:** Need intuitive input for "3x5@80kg, 1x1@90kg" → structured data

**Solution:**
- Regex parser: `(\d+)x(\d+)(?:@([\d.]+)(kg|lbs)?)?`
- Matches:
  - "3x5@80kg" → 3 sets of 5 reps at 80kg
  - "5x5" → 5 sets of 5 reps (bodyweight)
  - "1x1@90" → 1 set of 1 rep at 90kg
- Parse into array of sets, assign `set_number` (1, 2, 3...)
- Allow comma separation for multiple different set ranges
- Fallback: manual set-by-set entry form

**Implementation:**
```javascript
function parseSets(input, defaultWeight = null) {
  const setGroups = input.split(',').map(s => s.trim())
  const allSets = []
  let setNumber = 1

  setGroups.forEach(group => {
    const match = group.match(/(\d+)x(\d+)(?:@([\d.]+)(kg|lbs)?)?/)
    if (!match) return

    const [_, numSets, reps, weight, unit] = match
    for (let i = 0; i < parseInt(numSets); i++) {
      allSets.push({
        set_number: setNumber++,
        reps: parseInt(reps),
        weight: weight ? parseFloat(weight) : defaultWeight
      })
    }
  })

  return allSets
}
```

### Challenge 3: Exercise Metric Calculation
**Problem:** Different exercises need different metrics (1RM vs max reps vs volume)

**Solution:**
- Store `metric_type` with each exercise definition
- Dashboard calculates based on type:

**1RM Calculation (Epley Formula):**
```javascript
function calculate1RM(reps, weight) {
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

// For dashboard: get max estimated 1RM from all sets
function getMaxEstimated1RM(sets) {
  return Math.max(...sets.map(s => calculate1RM(s.reps, s.weight)))
}
```

**Max Consecutive:**
```javascript
function getMaxConsecutive(sets) {
  return Math.max(...sets.map(s => s.reps))
}
```

**Total Volume:**
```javascript
function getTotalVolume(sets) {
  return sets.reduce((sum, s) => sum + (s.reps * s.weight), 0)
}
```

### Challenge 4: Deployment Simplicity
**Problem:** Minimal DevOps experience, need simple deployment

**Solution:**
- **One-time setup:**
  1. Connect GitHub repo to Cloudflare Pages
  2. Set build command: `npm run build`
  3. Set output directory: `dist`
  4. Add environment variables (Supabase URL, keys)
- **Ongoing deployment:**
  - Just `git push` → auto-deploy in ~2 minutes
- **No server management:** Supabase handles backend, Cloudflare handles frontend
- **Database migrations:** Run SQL via Supabase web UI (or eventually Supabase CLI)

---

## Environment Variables

### Cloudflare Pages Environment Variables
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRAVA_CLIENT_ID=your-strava-client-id
```

### Supabase Secrets (for Edge Functions)
```
STRAVA_CLIENT_SECRET=your-strava-client-secret
```

---

## Setup Checklist

### Prerequisites
- [ ] GitHub account
- [ ] Cloudflare account (free)
- [ ] Supabase account (free)
- [ ] Domain pointed to Cloudflare
- [ ] Strava developer account (developers.strava.com)

### Supabase Setup
- [ ] Create new project (choose nearby region)
- [ ] Run database schema SQL (create tables)
- [ ] Insert initial user records (you + wife)
- [ ] Copy API URL and anon key
- [ ] Enable RLS policies (optional, since private app)

### Cloudflare Pages Setup
- [ ] Create new Pages project
- [ ] Connect to GitHub repo (auto-deploy on push)
- [ ] Set build settings:
  - Build command: `npm run build`
  - Output directory: `dist`
  - Node version: 18 or later
- [ ] Add environment variables (see above)
- [ ] Configure custom domain (CNAME to pages.dev)

### Strava API Setup
- [ ] Create API application at developers.strava.com
- [ ] Set application name (e.g., "Fitness Tracker")
- [ ] Set redirect URI: `https://yourdomain.com/auth/strava/callback`
- [ ] Copy Client ID and Client Secret
- [ ] Add to environment variables

---

## Future Enhancements (Out of Scope for V1)

- **Data Export:** CSV export for workouts/body weight
- **Workout Templates:** Save common workout routines
- **Personal Records:** Highlight PRs in dashboard
- **Nutrition Tracking:** Calories/macros
- **Workout Notes:** Rich text editor for session notes
- **Progressive Overload Suggestions:** AI-powered weight recommendations
- **Social Features:** Share workouts (if app expands beyond 2 users)
- **Multi-language Support:** i18n
- **Dark Mode:** Theme toggle

---

## Risks & Mitigations

### Risk 1: Strava API Rate Limits
**Impact:** High (blocks running feature)
**Likelihood:** Low (2 users << 100 requests/day limit)
**Mitigation:**
- Strava free tier: 100 requests/15 min, 1000 requests/day
- With 2 users, even syncing every hour = ~50 requests/day
- Cache activities locally, only fetch new ones
- Show rate limit status in UI

### Risk 2: Supabase Free Tier Limits
**Impact:** Medium (could require paid plan)
**Likelihood:** Very Low (2 users, minimal data)
**Mitigation:**
- Free tier: 500MB DB, 2GB bandwidth, 50K MAU
- Estimated usage: ~10MB data, <100MB bandwidth/month
- Monitor usage in Supabase dashboard
- Upgrade to Pro ($25/mo) if needed (unlikely)

### Risk 3: Complex UX for Quick Logging
**Impact:** Medium (slow workout logging defeats purpose)
**Likelihood:** Medium (UX is hard)
**Mitigation:**
- Start with simple form, iterate based on usage
- Add keyboard shortcuts (power user feature)
- Mobile-first design (since used at gym)
- Test with real workouts, gather feedback

### Risk 4: PWA Installation Not Obvious
**Impact:** Low (app still works on web)
**Likelihood:** Medium (users might not know to install)
**Mitigation:**
- Add "Install App" banner on first visit
- Instructions page with screenshots
- Still fully functional as web app

---

## Success Metrics

Since this is a private app for 2 users, success is qualitative:

- Can log a full workout in <2 minutes
- Charts clearly show progress trends
- Strava runs sync within 1 hour of completion
- App loads in <2 seconds on mobile
- Zero data loss (even if database issues, can restore from Supabase backups)
- Wife actually uses it consistently (ultimate validation!)

---

## Development Timeline Estimate

**Phase 1:** 1-2 days (core logging)
**Phase 2:** 1-2 days (dashboard)
**Phase 3:** 2-3 days (Strava integration)
**Phase 4:** 1 day (PWA polish)

**Total:** ~5-8 days of focused development

**Assumptions:**
- Working in focused blocks (no context switching)
- No major blockers (Strava API works as documented)
- Basic React/SQL proficiency
- Using ChatGPT/Claude for code generation where applicable

---

## Conclusion

This spec provides a complete blueprint for building a pragmatic, private fitness tracking PWA. The architecture is intentionally simple (serverless + managed database) to minimize operational overhead while remaining scalable if needed. The phased approach allows for incremental delivery: Phase 1 gives you a working workout logger, Phase 3 adds the critical Strava integration, and Phase 4 polishes the experience.

Next steps:
1. Review this spec and confirm approach
2. Create Supabase + Cloudflare accounts
3. Begin Phase 1 implementation

Let's build this! 💪

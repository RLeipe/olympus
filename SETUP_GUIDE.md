# Setup Guide - Fitness Tracker App

This guide walks you through setting up all required accounts and services for the fitness tracker app.

## Overview

You'll need to set up 3 services (only 2 required immediately):

1. **Supabase** (Database & Backend) - **SET UP NOW**
2. **Cloudflare Pages** (Frontend Hosting) - **SET UP NOW** (or before first deployment)
3. **Strava API** (Running Integration) - Set up in Phase 3 (can wait)

Total setup time: ~20-30 minutes

---

## Step 1: Supabase Setup (Database & Backend)

### Create Account & Project

1. **Go to [supabase.com](https://supabase.com)**

2. **Click "Start your project"** (or "Sign Up" if you don't have an account)
   - Sign up with GitHub (recommended) or email

3. **Create a new project:**
   - Organization: Create new or use existing
   - Project name: `fitness-tracker` (or whatever you prefer)
   - Database Password: Generate a strong password (save it somewhere safe)
   - Region: Choose closest to you (e.g., `Frankfurt` if in Europe, `US East` if in USA)
   - Pricing Plan: **Free** (sufficient for 2 users)

4. **Wait ~2 minutes** for project to provision

### Get API Credentials

Once your project is ready:

1. **In the left sidebar, click "Project Settings" (gear icon at bottom)**

2. **Click "API" in the settings menu**

3. **Copy these two values** (you'll need them later):
   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon public key: eyJhbGc...very-long-string
   ```

   **Save these somewhere** (text file, password manager, etc.)

### Create Database Schema

1. **In the left sidebar, click "SQL Editor"**

2. **Click "New query"**

3. **Paste this SQL** (creates all tables):

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

-- Create exercises table
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('strength', 'running')),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('one_rep_max', 'max_consecutive', 'total_volume')),
  notes TEXT
);

-- Create workout_sets table
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reps INT NOT NULL,
  weight DECIMAL(6,2),
  set_number INT NOT NULL,
  notes TEXT
);

-- Create body_weight_logs table
CREATE TABLE body_weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight DECIMAL(5,2) NOT NULL,
  UNIQUE(user_id, date)
);

-- Create running_activities table
CREATE TABLE running_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  strava_activity_id BIGINT UNIQUE,
  activity_date TIMESTAMP NOT NULL,
  distance DECIMAL(6,2) NOT NULL,
  duration INT NOT NULL,
  average_pace DECIMAL(5,2),
  elevation_gain DECIMAL(6,2),
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create strava_connections table
CREATE TABLE strava_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,
  athlete_id BIGINT NOT NULL,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_sync_at TIMESTAMP
);

-- Insert initial users
INSERT INTO users (name) VALUES ('Roman'), ('Andrea');

-- Create indexes for common queries
CREATE INDEX idx_workout_sets_user_date ON workout_sets(user_id, workout_date DESC);
CREATE INDEX idx_workout_sets_exercise ON workout_sets(exercise_id, workout_date DESC);
CREATE INDEX idx_body_weight_user_date ON body_weight_logs(user_id, date DESC);
CREATE INDEX idx_running_user_date ON running_activities(user_id, activity_date DESC);
```

4. **Click "Run"** (or press Cmd/Ctrl + Enter)

5. **Verify success:**
   - You should see "Success. No rows returned"
   - In the left sidebar, click "Table Editor"
   - You should see 6 tables: users, exercises, workout_sets, body_weight_logs, running_activities, strava_connections
   - Click "users" table → you should see 2 rows: Roman and Andrea

**Supabase setup complete!** ✅

---

## Step 2: Cloudflare Pages Setup (Frontend Hosting)

You can do this now or wait until we're ready to deploy the app. It takes ~5 minutes.

### Create Account

1. **Go to [dash.cloudflare.com](https://dash.cloudflare.com)**

2. **Sign up** (if you don't have an account)
   - Use the same email as your domain registrar (if using Cloudflare for DNS)

3. **If you already have a domain:**
   - Add it to Cloudflare (follow their DNS setup wizard)
   - This is optional for now - Cloudflare will give you a free `*.pages.dev` subdomain

### Create Pages Project

1. **In the Cloudflare dashboard, click "Workers & Pages" in the left sidebar**

2. **Click "Create application"**

3. **Click "Pages" tab → "Connect to Git"**

4. **Connect your GitHub account:**
   - Click "Connect GitHub"
   - Authorize Cloudflare
   - Select this repository (`olympus`)

5. **Configure build settings:**
   ```
   Project name: fitness-tracker (or whatever you prefer)
   Production branch: main (or whatever your main branch is)
   Build command: npm run build
   Build output directory: dist
   Root directory: / (leave empty)
   ```

6. **Add environment variables** (click "Add environment variable"):
   ```
   VITE_SUPABASE_URL = https://xxxxxxxxxxxxx.supabase.co (from Step 1)
   VITE_SUPABASE_ANON_KEY = eyJhbGc...your-anon-key (from Step 1)
   ```

   Note: Leave VITE_STRAVA_CLIENT_ID empty for now (we'll add it in Phase 3)

7. **Click "Save and Deploy"**

**Note:** The first deploy will fail (no code yet!), but the project is now configured. Once we push the React app code, it will auto-deploy.

### Custom Domain (Optional)

If you want to use your own domain instead of `*.pages.dev`:

1. In your Pages project, click "Custom domains"
2. Click "Set up a custom domain"
3. Enter your domain (e.g., `fitness.yourdomain.com`)
4. Follow the DNS instructions (add CNAME record)
5. Wait for SSL certificate (1-5 minutes)

**Cloudflare Pages setup complete!** ✅

---

## Step 3: Strava API Setup (Phase 3 - Can Wait)

**You can skip this for now!** We'll set this up when we implement Phase 3 (Strava integration).

When you're ready (Phase 3):

1. **Go to [developers.strava.com](https://www.strava.com/settings/api)**

2. **Click "Create an App"** (need a Strava account)

3. **Fill in the form:**
   ```
   Application Name: Fitness Tracker
   Category: Training
   Club: (leave empty)
   Website: https://your-domain.com (or pages.dev URL)
   Authorization Callback Domain: your-domain.com (just the domain, no https://)
   ```

4. **Click "Create"**

5. **Copy your credentials:**
   ```
   Client ID: 12345 (6 digit number)
   Client Secret: abc123...xyz (long string)
   ```

6. **Add Client ID to Cloudflare Pages:**
   - Go to Cloudflare Pages → your project → Settings → Environment variables
   - Add: `VITE_STRAVA_CLIENT_ID = 12345` (your client ID)
   - Redeploy the app

7. **Add Client Secret to Supabase:**
   - Go to Supabase → Project Settings → Edge Functions (when we create them)
   - We'll handle this in Phase 3

---

## Summary: What You Need Right Now

### ✅ Required Now (Before Phase 1 Development)

**Supabase:**
- Account created
- Project provisioned
- Database tables created (SQL above)
- API URL and anon key saved

**Cloudflare Pages:**
- Account created (optional: can wait until first deploy)
- GitHub connected (optional: can do during Phase 1)

### ⏳ Can Wait Until Later

**Strava API:**
- Set up during Phase 3 (not needed for Phases 1-2)

**Custom Domain:**
- Optional, can use `*.pages.dev` subdomain

---

## What's Next?

With Supabase set up, we can now start **Phase 1 development**:

1. Initialize React + Vite project
2. Connect to Supabase
3. Build workout logging interface
4. Deploy to Cloudflare Pages

**Ready to start coding!** 🚀

---

## Troubleshooting

### Supabase Issues

**"Error: relation does not exist"**
- Make sure you ran the SQL script in the SQL Editor
- Check "Table Editor" to verify tables exist

**"Invalid API key"**
- Double-check you copied the **anon** key, not the service_role key
- Verify no extra spaces in the environment variable

**"Connection refused"**
- Project might still be provisioning (wait 2-3 minutes)
- Check project status in Supabase dashboard

### Cloudflare Pages Issues

**"Build failed"**
- Normal if you haven't pushed app code yet
- Verify build command is `npm run build`
- Verify output directory is `dist`

**"Environment variable not found"**
- Must be prefixed with `VITE_` for Vite to expose them
- Redeploy after adding environment variables

### General

**"I don't have a domain yet"**
- No problem! Use the free `*.pages.dev` subdomain Cloudflare provides
- You can add a custom domain later without changing any code

**"Which region should I choose?"**
- Supabase: Choose closest to you (Frankfurt for Europe, US East for US)
- Doesn't matter much for 2-user app, latency difference is minimal

---

## Cost Estimate

**With the free tiers:**

| Service | Free Tier | Estimated Usage | Cost |
|---------|-----------|-----------------|------|
| Supabase | 500MB DB, 2GB bandwidth | ~5MB DB, <100MB bandwidth/month | $0 |
| Cloudflare Pages | Unlimited bandwidth, 500 builds/month | ~10 builds/month | $0 |
| Strava API | 1000 requests/day | ~20 requests/day | $0 |

**Total: $0/month** (likely to stay free forever for 2 users)

If you ever exceed free tiers:
- Supabase Pro: $25/month
- Cloudflare Pages Pro: $20/month
- (Very unlikely with 2 users)

---

## Security Notes

**Public Anon Key:**
- The `anon` key is safe to expose in frontend code
- Supabase uses Row Level Security (RLS) to protect data
- We'll skip RLS since it's a private app (only 2 users)

**Database Password:**
- Never commit to Git
- Only used for direct DB access (not needed for app)

**Strava Client Secret:**
- Never expose in frontend code
- Only use in Supabase Edge Functions (server-side)

---

**Questions?** Let me know if you hit any issues during setup!

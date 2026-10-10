-- Training plan, day notes and Strava sync
-- Run once in the Supabase SQL Editor.

-- One free-text note per user per day (how the session felt, pain, sleep, ...)
CREATE TABLE IF NOT EXISTS day_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  note TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON day_notes TO anon, authenticated;

-- Activities synced from Strava (runs, rides, hikes, ...)
-- Written only by the server-side sync function; the app can read them.
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  strava_id BIGINT NOT NULL UNIQUE,
  activity_date DATE NOT NULL,          -- local date of the start
  start_time TIMESTAMPTZ,
  sport_type TEXT NOT NULL,             -- Strava sport_type, e.g. Run, TrailRun, Ride
  name TEXT,
  distance_m NUMERIC,
  moving_time_s INT,
  elapsed_time_s INT,
  elevation_m NUMERIC,
  avg_hr NUMERIC,
  max_hr NUMERIC,
  avg_speed NUMERIC,                    -- m/s
  laps JSONB,                           -- null = not fetched yet
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_day_notes_user_date ON day_notes(user_id, date DESC);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activities are readable" ON activities;
CREATE POLICY "activities are readable" ON activities FOR SELECT USING (true);
GRANT SELECT ON activities TO anon, authenticated;

-- Strava tokens must never be readable with the public anon key.
-- RLS without any policy blocks anon entirely; the server function uses the service role key.
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON strava_connections FROM anon, authenticated;

-- running_activities from the original schema was never used; activities replaces it.
-- Uncomment to remove it:
-- DROP TABLE IF EXISTS running_activities;

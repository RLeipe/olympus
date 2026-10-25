-- Base schema. Already applied in production; only needed when setting up from scratch.
-- Run in the Supabase SQL Editor, then 002_plan_notes_strava.sql.
-- (Production also still has an unused running_activities table from the first version.)

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('strength', 'running')),
  -- one_rep_max: weighted (1RM/5RM + volume), max_consecutive: reps,
  -- time_based: duration in seconds, stored in workout_sets.reps
  metric_type TEXT NOT NULL CHECK (metric_type IN ('one_rep_max', 'max_consecutive', 'time_based')),
  notes TEXT
);

CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reps INT NOT NULL,
  weight DECIMAL(6,2),             -- kg, null for bodyweight exercises
  set_number INT NOT NULL,
  notes TEXT                       -- no longer written; notes are per day in day_notes
);

CREATE TABLE body_weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight DECIMAL(5,2) NOT NULL,
  UNIQUE (user_id, date)
);

CREATE TABLE strava_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,   -- UTC
  athlete_id BIGINT NOT NULL,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_sync_at TIMESTAMP
);

INSERT INTO users (name) VALUES ('Roman'), ('Andrea');

CREATE INDEX idx_workout_sets_user_date ON workout_sets(user_id, workout_date DESC);
CREATE INDEX idx_workout_sets_exercise ON workout_sets(exercise_id, workout_date DESC);
CREATE INDEX idx_body_weight_user_date ON body_weight_logs(user_id, date DESC);

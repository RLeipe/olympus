-- Meditation log
-- Run once in the Supabase SQL Editor.

-- One row per meditation; several on the same day are fine
CREATE TABLE IF NOT EXISTS meditations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  minutes INT NOT NULL CHECK (minutes > 0 AND minutes % 5 = 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meditations_user_date ON meditations(user_id, date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON meditations TO anon, authenticated;

-- The app has no login, so meditations are open like the other app tables.
ALTER TABLE meditations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meditations are open" ON meditations;
CREATE POLICY "meditations are open" ON meditations FOR ALL USING (true) WITH CHECK (true);

-- Create dictation history table
CREATE TABLE IF NOT EXISTS dictation_history (
  id SERIAL PRIMARY KEY,
  raw_text TEXT NOT NULL,
  edited_text TEXT,
  edit_mode VARCHAR(32) DEFAULT 'raw',
  tone VARCHAR(32),
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dictionary keywords table
CREATE TABLE IF NOT EXISTS dictionary_keywords (
  id SERIAL PRIMARY KEY,
  word VARCHAR(255) NOT NULL,
  source VARCHAR(32) DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast history retrieval by date
CREATE INDEX IF NOT EXISTS idx_history_created_at ON dictation_history (created_at DESC);

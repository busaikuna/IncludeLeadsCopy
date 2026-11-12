BEGIN;

CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  annotation TEXT NOT NULL CHECK (annotation ~ '[^[:space:]]'),
  interaction_date TIMESTAMPTZ NOT NULL,
  type TEXT CHECK (type IN ('ligacao', 'email', 'reuniao', 'mensagem', 'outro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS interactions_lead_date_idx
  ON interactions (lead_id, interaction_date DESC, id DESC);

COMMIT;

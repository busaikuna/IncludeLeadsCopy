BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome TEXT,
  email TEXT,
  telefone TEXT,
  status TEXT DEFAULT 'prospeccao',
  segmento TEXT,
  responsavel TEXT
);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS origem TEXT,
  ADD COLUMN IF NOT EXISTS responsible_user_id INTEGER
    CONSTRAINT leads_responsible_user_id_fkey REFERENCES users (id),
  ADD COLUMN IF NOT EXISTS last_contact TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ,
  ALTER COLUMN status SET DEFAULT 'prospeccao',
  ALTER COLUMN stage_changed_at SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS leads_responsible_user_id_idx
  ON leads (responsible_user_id, id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique_idx
  ON leads (lower(btrim(email)))
  WHERE NULLIF(btrim(email), '') IS NOT NULL;

-- Valida cadastros e edições cadastrais, inclusive quando o lead é antigo.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_contact_check;

CREATE OR REPLACE FUNCTION enforce_leads_contact() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NULLIF(btrim(NEW.email), '') IS NULL
    AND NULLIF(btrim(NEW.telefone), '') IS NULL THEN
    RAISE EXCEPTION 'Informe pelo menos um e-mail ou telefone.'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'leads_contact_check';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER leads_contact_check
  BEFORE INSERT OR UPDATE OF id, nome, contact_name, email, telefone, segmento, origem,
    responsavel, responsible_user_id ON leads
  FOR EACH ROW EXECUTE FUNCTION enforce_leads_contact();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'leads'::regclass
      AND conname = 'leads_stage_outcome_v2_check'
  ) THEN
    -- As etapas antigas não têm equivalência segura por posição no funil.
    CREATE TEMP TABLE lead_stage_review (
      id INTEGER PRIMARY KEY,
      from_stage TEXT NOT NULL CHECK (from_stage IN ('qualificacao', 'proposta', 'negociacao')),
      to_stage TEXT NOT NULL CHECK (to_stage IN (
        'prospeccao', 'primeiro_contato', 'reuniao_agendada', 'proposta_enviada'
      ))
    ) ON COMMIT DROP;

    INSERT INTO lead_stage_review (id, from_stage, to_stage)
    SELECT id, "from", "to"
    FROM jsonb_to_recordset(
      COALESCE(NULLIF(current_setting('includeleads.lead_stage_review', true), ''), '[]')::jsonb
    ) AS review (id INTEGER, "from" TEXT, "to" TEXT);

    IF EXISTS (
      SELECT 1 FROM lead_stage_review AS review
      LEFT JOIN leads AS lead ON lead.id = review.id
      WHERE lower(btrim(lead.status)) IS DISTINCT FROM review.from_stage
    ) THEN
      RAISE EXCEPTION 'A revisão contém leads inexistentes ou com etapa de origem divergente.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM leads AS lead
      LEFT JOIN lead_stage_review AS review ON review.id = lead.id
      WHERE lower(btrim(lead.status)) IN ('qualificacao', 'proposta', 'negociacao')
        AND review.id IS NULL
    ) THEN
      RAISE EXCEPTION 'Há leads com etapas legadas sem revisão.'
        USING HINT = 'Revise os leads indicados no README e execute db:init com --lead-stage-review.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conrelid = 'leads'::regclass
        AND conname = 'leads_stage_outcome_check'
    ) THEN
      -- Corrige last_contact de bancos que executaram a movimentação anterior.
      IF to_regclass('interactions') IS NOT NULL THEN
        WITH latest_interactions AS (
          SELECT lead_id, max(interaction_date) AS last_contact
          FROM interactions
          GROUP BY lead_id
        ), lead_contacts AS (
          SELECT leads.id, latest_interactions.last_contact
          FROM leads
          LEFT JOIN latest_interactions ON latest_interactions.lead_id = leads.id
        )
        UPDATE leads AS lead
        SET last_contact = contact.last_contact
        FROM lead_contacts AS contact
        WHERE lead.id = contact.id
          AND lead.last_contact IS DISTINCT FROM contact.last_contact;
      END IF;
    END IF;

    ALTER TABLE leads
      DROP CONSTRAINT IF EXISTS leads_stage_outcome_check,
      DROP CONSTRAINT IF EXISTS leads_outcome_check;

    UPDATE leads AS lead
    SET status = review.to_stage
    FROM lead_stage_review AS review
    WHERE lead.id = review.id;

    -- Um rótulo de fechamento explícito pode recuperar o desfecho legado.
    WITH legacy_stages AS (
      SELECT id, regexp_replace(lower(btrim(status)), '\s*/\s*', '/') AS label
      FROM leads
    ), normalized_stages AS (
      SELECT id,
        CASE
          WHEN label IS NULL OR label IN ('', 'novo') THEN 'prospeccao'
          WHEN label IN ('fechado/ganho', 'fechado/perdido') THEN 'fechado'
          ELSE label
        END AS stage,
        CASE label
          WHEN 'fechado/ganho' THEN 'GANHO'
          WHEN 'fechado/perdido' THEN 'PERDIDO'
        END AS inferred_outcome
      FROM legacy_stages
    )
    UPDATE leads AS lead
    SET status = normalized.stage,
        outcome = COALESCE(lead.outcome, normalized.inferred_outcome)
    FROM normalized_stages AS normalized
    WHERE lead.id = normalized.id
      AND (normalized.inferred_outcome IS NULL OR lead.outcome IS NULL
        OR lead.outcome = normalized.inferred_outcome)
      AND (lead.status, lead.outcome) IS DISTINCT FROM
        (normalized.stage, COALESCE(lead.outcome, normalized.inferred_outcome));

    -- Uma combinação ambígua faz a migração reverter sem sobrescrever o lead.
    ALTER TABLE leads
      ALTER COLUMN status SET NOT NULL,
      ADD CONSTRAINT leads_stage_outcome_v2_check CHECK (
        (status IN ('prospeccao', 'primeiro_contato', 'reuniao_agendada', 'proposta_enviada')
          AND outcome IS NULL)
        OR (status = 'fechado' AND outcome IS NOT NULL
          AND outcome IN ('GANHO', 'PERDIDO'))
      );

  END IF;
END;
$$;

COMMIT;

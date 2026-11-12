import type { PoolClient } from 'pg';
import { pool } from '../config/database';
import type {
  Lead,
  LeadChanges,
  LeadOutcome,
  LeadStage,
  NewLead,
} from '../models/lead';

const leadColumns = `
  id, nome AS name, nome, email, telefone AS phone, telefone, status,
  contact_name AS "contactName",
  segmento, origem, responsavel, responsible_user_id AS "responsibleUserId",
  last_contact AS "lastContact", outcome, stage_changed_at AS "stageChangedAt"
`;

const editableColumns = {
  name: 'nome',
  contactName: 'contact_name',
  email: 'email',
  phone: 'telefone',
  segmento: 'segmento',
  origem: 'origem',
  responsavel: 'responsavel',
  responsibleUserId: 'responsible_user_id',
} satisfies Record<keyof LeadChanges, string>;

export async function countByStage(ownerId: number | null) {
  const { rows } = await pool.query<{
    status: LeadStage;
    total: string;
    won: string;
    lost: string;
  }>(
    `SELECT status,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'fechado' AND outcome = 'GANHO') AS won,
            COUNT(*) FILTER (WHERE status = 'fechado' AND outcome = 'PERDIDO') AS lost
     FROM leads
     WHERE ($1::integer IS NULL OR responsible_user_id = $1)
     GROUP BY status`,
    [ownerId],
  );

  return rows.map(({ status, total, won, lost }) => ({
    status,
    total: Number(total),
    won: Number(won),
    lost: Number(lost),
  }));
}

export async function list(
  ownerId: number | null,
  filters: {
    origem?: string;
    segmento?: string;
    ultimoContato?: string;
    search?: string;
  } = {},
): Promise<Lead[]> {
  const conditions = ['($1::integer IS NULL OR responsible_user_id = $1)'];
  const params: (number | string | null)[] = [ownerId];
  for (const column of ['origem', 'segmento'] as const) {
    const value = filters[column];
    if (value === undefined) continue;
    params.push(value);
    conditions.push(
      `lower(unaccent(${column})) = lower(unaccent($${params.length}))`,
    );
  }
  if (filters.ultimoContato !== undefined) {
    params.push(filters.ultimoContato);
    conditions.push(
      `(last_contact AT TIME ZONE 'America/Sao_Paulo')::date = $${params.length}::date`,
    );
  }
  if (filters.search !== undefined) {
    const literalSearch = filters.search.replace(/[!%_]/g, '!$&');
    params.push(`%${literalSearch}%`);
    const pattern = `$${params.length}`;
    conditions.push(
      `(nome ILIKE ${pattern} ESCAPE '!' OR contact_name ILIKE ${pattern} ESCAPE '!')`,
    );
  }

  const { rows } = await pool.query<Lead>(
    `SELECT ${leadColumns} FROM leads
     WHERE ${conditions.join(' AND ')}
     ORDER BY id DESC`,
    params,
  );
  return rows;
}

export async function findById(id: number): Promise<Lead | null> {
  const { rows } = await pool.query<Lead>(
    `SELECT ${leadColumns} FROM leads WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function create(data: NewLead): Promise<Lead> {
  const { rows } = await pool.query<Lead>(
    `INSERT INTO leads (nome, contact_name, email, telefone, segmento, origem, responsavel, responsible_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${leadColumns}`,
    [
      data.name,
      data.contactName,
      data.email,
      data.phone,
      data.segmento,
      data.origem,
      data.responsavel,
      data.responsibleUserId,
    ],
  );
  return rows[0];
}

export async function update(
  id: number,
  ownerId: number | null,
  changes: LeadChanges,
): Promise<Lead | null> {
  const fields = (Object.keys(editableColumns) as (keyof LeadChanges)[]).filter(
    (field) => changes[field] !== undefined,
  );
  const assignments = fields.map(
    (field, index) => `${editableColumns[field]} = $${index + 3}`,
  );
  const { rows } = await pool.query<Lead>(
    `UPDATE leads SET ${assignments.join(', ')}
     WHERE id = $1 AND ($2::integer IS NULL OR responsible_user_id = $2)
     RETURNING ${leadColumns}`,
    [id, ownerId, ...fields.map((field) => changes[field])],
  );
  return rows[0] ?? null;
}

export async function updateLastContact(
  client: PoolClient,
  id: number,
  ownerId: number | null,
  interactionDate: Date,
): Promise<boolean> {
  const { rowCount } = await client.query(
    `UPDATE leads
     SET last_contact = GREATEST(last_contact, $3::timestamptz)
     WHERE id = $1 AND ($2::integer IS NULL OR responsible_user_id = $2)`,
    [id, ownerId, interactionDate],
  );
  return rowCount === 1;
}

export async function remove(
  id: number,
  ownerId: number | null,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM leads
     WHERE id = $1 AND ($2::integer IS NULL OR responsible_user_id = $2)`,
    [id, ownerId],
  );
  return rowCount === 1;
}

export async function updateStage(
  id: number,
  ownerId: number | null,
  status: LeadStage,
  outcome: LeadOutcome | null,
): Promise<Lead | null> {
  const { rows } = await pool.query<Lead>(
    `UPDATE leads
     SET status = $1, outcome = $2,
         stage_changed_at = CASE WHEN status IS DISTINCT FROM $1
           THEN clock_timestamp() ELSE stage_changed_at END
     WHERE id = $3 AND ($4::integer IS NULL OR responsible_user_id = $4)
     RETURNING ${leadColumns}`,
    [status, outcome, id, ownerId],
  );
  return rows[0] ?? null;
}

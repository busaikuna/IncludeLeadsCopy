import type { PoolClient } from 'pg';
import { pool } from '../config/database';
import type { Interaction, NewInteraction } from '../models/interaction';

const interactionColumns = `
  id, lead_id AS "leadId", user_id AS "userId", annotation,
  interaction_date AS "interactionDate", type, created_at AS "createdAt"
`;

export async function resolveLocalInteractionDate(
  value: string,
): Promise<Date | null> {
  const { rows } = await pool.query<{ date: Date }>(
    `SELECT date FROM (
       SELECT $1::timestamp AT TIME ZONE 'America/Sao_Paulo' AS date
     ) AS local_date
     WHERE date AT TIME ZONE 'America/Sao_Paulo' = $1::timestamp`,
    [value],
  );
  return rows[0]?.date ?? null;
}

export async function createInteraction(
  client: PoolClient,
  data: NewInteraction,
): Promise<Interaction> {
  const { rows } = await client.query<Interaction>(
    `INSERT INTO interactions (lead_id, user_id, annotation, interaction_date, type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${interactionColumns}`,
    [
      data.leadId,
      data.userId,
      data.annotation,
      data.interactionDate,
      data.type,
    ],
  );
  return rows[0];
}

export async function findInteractionsByLeadId(
  leadId: number,
  ownerId: number | null,
): Promise<Interaction[]> {
  const { rows } = await pool.query<Interaction>(
    `SELECT ${interactionColumns} FROM interactions
     WHERE lead_id = $1
       AND ($2::integer IS NULL OR EXISTS (
         SELECT 1 FROM leads WHERE id = $1 AND responsible_user_id = $2
       ))
     ORDER BY interaction_date DESC, id DESC`,
    [leadId, ownerId],
  );
  return rows;
}

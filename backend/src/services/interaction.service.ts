import { DatabaseError } from 'pg';
import { pool } from '../config/database';
import { AppError } from '../errors/app-error';
import {
  interactionTypes,
  type Interaction,
  type InteractionType,
  type NewInteraction,
} from '../models/interaction';
import * as interactionRepository from '../repositories/interaction.repository';
import * as leadRepository from '../repositories/lead.repository';
import { getLeadAccess, type Requester } from './lead.service';

const DATE_PATTERN =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/;
const INVALID_DATE =
  'Informe uma data de interação válida em formato ISO 8601.';

async function readInteractionDate(value: unknown): Promise<Date> {
  const match = typeof value === 'string' && DATE_PATTERN.exec(value.trim());
  if (!match) throw new AppError(400, INVALID_DATE);

  const [, minutes, seconds = ':00', offset] = match;
  const timestamp = `${minutes}${seconds}`;
  const utc = new Date(`${timestamp}Z`);
  if (
    timestamp.startsWith('0000-') ||
    !Number.isFinite(utc.getTime()) ||
    !utc.toISOString().startsWith(timestamp)
  ) {
    throw new AppError(400, INVALID_DATE);
  }

  const date = offset
    ? new Date(`${timestamp}${offset}`)
    : await interactionRepository.resolveLocalInteractionDate(timestamp);
  if (!date || !Number.isFinite(date.getTime())) {
    throw new AppError(400, INVALID_DATE);
  }
  if (date.getTime() > Date.now()) {
    throw new AppError(400, 'A data da interação não pode estar no futuro.');
  }
  return date;
}

function readType(value: unknown): InteractionType | null {
  if (value == null) return null;
  const type = interactionTypes.find((option) => option === value);
  if (!type) throw new AppError(400, 'Informe um tipo de interação válido.');
  return type;
}

async function saveInteraction(
  data: NewInteraction,
  ownerId: number | null,
): Promise<Interaction | null> {
  const client = await pool.connect();
  let discardClient = false;

  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    const updated = await leadRepository.updateLastContact(
      client,
      data.leadId,
      ownerId,
      data.interactionDate,
    );
    const interaction = updated
      ? await interactionRepository.createInteraction(client, data)
      : null;
    await client.query('COMMIT');
    return interaction;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      discardClient = true;
    }
    if (
      error instanceof DatabaseError &&
      error.code === '23503' &&
      error.constraint === 'interactions_user_id_fkey'
    ) {
      throw new AppError(401, 'Usuário autenticado não encontrado.');
    }
    throw error;
  } finally {
    client.release(discardClient);
  }
}

export async function createInteraction(
  requester: Requester | undefined,
  value: string,
  input: unknown,
): Promise<Interaction> {
  const { lead, ownerId, userId } = await getLeadAccess(requester, value);
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new AppError(400, 'Envie um objeto JSON com os dados da interação.');
  }
  const data = input as Record<string, unknown>;
  const annotation =
    typeof data.annotation === 'string' ? data.annotation.trim() : '';
  if (annotation.includes('\0') || !/[^\s\p{White_Space}]/u.test(annotation)) {
    throw new AppError(400, 'Informe uma anotação válida para a interação.');
  }
  const type = readType(data.type);
  const interactionDate = await readInteractionDate(data.interactionDate);

  const interaction = await saveInteraction(
    { leadId: lead.id, userId, annotation, interactionDate, type },
    ownerId,
  );
  if (!interaction) {
    await getLeadAccess(requester, value);
    throw new AppError(
      409,
      'O lead foi alterado durante o registro. Tente novamente.',
    );
  }
  return interaction;
}

export async function listInteractions(
  requester: Requester | undefined,
  value: string,
): Promise<Interaction[]> {
  const { lead, ownerId } = await getLeadAccess(requester, value);
  const interactions = await interactionRepository.findInteractionsByLeadId(
    lead.id,
    ownerId,
  );
  if (!interactions.length) await getLeadAccess(requester, value);
  return interactions;
}

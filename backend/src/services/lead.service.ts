import { DatabaseError } from 'pg';
import { AppError } from '../errors/app-error';
import {
  leadOutcomes,
  leadStages,
  type Lead,
  type LeadChanges,
  type LeadMetrics,
  type LeadStage,
} from '../models/lead';
import type { User } from '../models/user';
import * as leadRepository from '../repositories/lead.repository';
import * as userRepository from '../repositories/user.repository';

export type Requester = Pick<User, 'id' | 'role'>;

const MAX_ID = 2_147_483_647;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const NOT_FOUND = 'Lead não encontrado.';
const CONTACT_REQUIRED = 'Informe pelo menos um e-mail ou telefone.';
const INVALID_OWNER =
  'Informe o ID de um usuário do Comercial como responsável.';

function requireRequester(requester: Requester | undefined): Requester {
  if (!requester) throw new AppError(401, 'Autenticação necessária.');
  return requester;
}

function parseLeadId(value: string): number {
  const id = Number(value);
  if (/\D/.test(value) || id < 1 || id > MAX_ID) {
    throw new AppError(400, 'ID de lead inválido.');
  }
  return id;
}

function readBody(data: unknown): Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new AppError(400, 'Envie um objeto JSON com os dados do lead.');
  }
  return data as Record<string, unknown>;
}

function readText(value: unknown, field: string): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string' || value.includes('\0')) {
    throw new AppError(400, `Informe um texto válido no campo ${field}.`);
  }
  return value.trim() || null;
}

function readListFilter(value: unknown, field: string): string | undefined {
  const filter = readText(value, field);
  if (filter === null) {
    throw new AppError(400, `Informe um valor para o filtro ${field}.`);
  }
  return filter;
}

function readLastContactFilter(value: unknown): string | undefined {
  const date = readListFilter(value, 'ultimoContato');
  if (date === undefined) return undefined;

  const midnight = new Date(`${date}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date.startsWith('0000-') ||
    Number.isNaN(midnight.getTime()) ||
    midnight.toISOString().slice(0, 10) !== date
  ) {
    throw new AppError(
      400,
      'Informe uma data válida em AAAA-MM-DD no filtro ultimoContato.',
    );
  }
  return date;
}

function readFields(data: Record<string, unknown>): LeadChanges {
  const name = readText(
    Object.hasOwn(data, 'name') ? data.name : data.nome,
    'name',
  );
  if (name === null) throw new AppError(400, 'O nome do lead é obrigatório.');

  const contactName = readText(data.contactName, 'contactName');
  if (contactName === null && data.contactName !== null) {
    throw new AppError(400, 'Informe um texto válido no campo contactName.');
  }

  const emailText = readText(data.email, 'email');
  const email = emailText?.toLowerCase() ?? emailText;
  if (email && !EMAIL_PATTERN.test(email)) {
    throw new AppError(400, 'Informe um e-mail válido.');
  }

  return {
    name,
    contactName,
    email,
    phone: readText(
      Object.hasOwn(data, 'phone') ? data.phone : data.telefone,
      'phone',
    ),
    segmento: readText(data.segmento, 'segmento'),
    origem: readText(data.origem, 'origem'),
  };
}

async function readAssignment(requester: Requester, value: unknown) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_ID
  ) {
    throw new AppError(400, INVALID_OWNER);
  }
  if (requester.role === 'COMERCIAL' && value !== requester.id) {
    throw new AppError(403, 'Comercial só pode atribuir leads a si mesmo.');
  }

  const user = await userRepository.findById(value);
  if (user?.role !== 'COMERCIAL') throw new AppError(400, INVALID_OWNER);

  return { responsibleUserId: user.id, responsavel: user.name };
}

function ownerScope(requester: Requester): number | null {
  return requester.role === 'COMERCIAL' ? requester.id : null;
}

async function findAccessibleLead(
  id: number,
  ownerId: number | null,
): Promise<Lead> {
  const lead = await leadRepository.findById(id);
  if (!lead) throw new AppError(404, NOT_FOUND);
  if (ownerId !== null && lead.responsibleUserId !== ownerId) {
    throw new AppError(403, 'Você não tem permissão para acessar este lead.');
  }
  return lead;
}

async function saveLead<T>(write: Promise<T>): Promise<T> {
  try {
    return await write;
  } catch (error) {
    if (error instanceof DatabaseError) {
      if (
        error.code === '23505' &&
        error.constraint === 'leads_email_unique_idx'
      ) {
        throw new AppError(
          409,
          'Este e-mail já está cadastrado em outro lead.',
        );
      }
      if (
        error.code === '23503' &&
        error.constraint === 'leads_responsible_user_id_fkey'
      ) {
        throw new AppError(400, INVALID_OWNER);
      }
      if (
        error.code === '23514' &&
        error.constraint === 'leads_contact_check'
      ) {
        throw new AppError(400, CONTACT_REQUIRED);
      }
    }
    throw error;
  }
}

export function listLeads(
  requester: Requester | undefined,
  query: Record<string, unknown> = {},
): Promise<Lead[]> {
  const ownerId = ownerScope(requireRequester(requester));
  return leadRepository.list(ownerId, {
    origem: readListFilter(query.origem, 'origem'),
    segmento: readListFilter(query.segmento, 'segmento'),
    ultimoContato: readLastContactFilter(query.ultimoContato),
    search: readListFilter(query.search, 'search'),
  });
}

function percentage(won: number, total: number): number {
  return total === 0 ? 0 : Math.round((won * 1000) / total) / 10;
}

export async function getLeadMetrics(
  requester: Requester | undefined,
): Promise<LeadMetrics> {
  const ownerId = ownerScope(requireRequester(requester));
  const counts = await leadRepository.countByStage(ownerId);
  const byStage = Object.fromEntries(
    leadStages.map((stage) => [stage, 0]),
  ) as Record<LeadStage, number>;

  let totalLeads = 0;
  let won = 0;
  let lost = 0;
  for (const count of counts) {
    byStage[count.status] = count.total;
    totalLeads += count.total;
    won += count.won;
    lost += count.lost;
  }

  const closed = byStage.fechado;
  return {
    totalLeads,
    inProgress: totalLeads - closed,
    closed,
    won,
    lost,
    conversionRate: percentage(won, totalLeads),
    closedConversionRate: percentage(won, closed),
    byStage,
  };
}

export async function getLeadAccess(
  requester: Requester | undefined,
  value: string,
) {
  const user = requireRequester(requester);
  const ownerId = ownerScope(user);
  const lead = await findAccessibleLead(parseLeadId(value), ownerId);
  return { lead, ownerId, userId: user.id };
}

export async function getLead(
  requester: Requester | undefined,
  value: string,
): Promise<Lead> {
  const { lead } = await getLeadAccess(requester, value);
  return lead;
}

export async function createLead(
  requester: Requester | undefined,
  input: unknown,
): Promise<Lead> {
  const user = requireRequester(requester);
  const data = readBody(input);
  const { name, contactName, email, phone, segmento, origem } =
    readFields(data);
  if (!name) throw new AppError(400, 'O nome do lead é obrigatório.');
  if (!email && !phone) throw new AppError(400, CONTACT_REQUIRED);
  const assignment = await readAssignment(user, data.responsibleUserId);

  return saveLead(
    leadRepository.create({
      name,
      contactName: contactName ?? null,
      email: email ?? null,
      phone: phone ?? null,
      segmento: segmento ?? null,
      origem: origem ?? null,
      ...assignment,
    }),
  );
}

export async function updateLead(
  requester: Requester | undefined,
  value: string,
  input: unknown,
): Promise<Lead> {
  const user = requireRequester(requester);
  const id = parseLeadId(value);
  const ownerId = ownerScope(user);
  await findAccessibleLead(id, ownerId);

  const data = readBody(input);
  if (Object.hasOwn(data, 'status') || Object.hasOwn(data, 'stage')) {
    throw new AppError(400, 'O status não pode ser alterado por esta rota.');
  }
  const changes = readFields(data);
  if (Object.hasOwn(data, 'responsibleUserId')) {
    Object.assign(changes, await readAssignment(user, data.responsibleUserId));
  }
  if (Object.values(changes).every((field) => field === undefined)) {
    throw new AppError(400, 'Informe pelo menos um campo para editar.');
  }

  const updated = await saveLead(leadRepository.update(id, ownerId, changes));
  if (!updated) {
    await findAccessibleLead(id, ownerId);
    throw new AppError(404, NOT_FOUND);
  }
  return updated;
}

export async function deleteLead(
  requester: Requester | undefined,
  value: string,
): Promise<void> {
  const ownerId = ownerScope(requireRequester(requester));
  const id = parseLeadId(value);
  if (await leadRepository.remove(id, ownerId)) return;
  await findAccessibleLead(id, ownerId);
  throw new AppError(404, NOT_FOUND);
}

function readStageChange(input: unknown) {
  const data = readBody(input);
  const stage = readText(data.stage, 'stage');
  const status = readText(data.status, 'status');
  if (stage !== undefined && status !== undefined && stage !== status) {
    throw new AppError(400, 'Os campos stage e status devem ser iguais.');
  }
  const requestedStage = stage ?? status;
  if (!requestedStage) {
    throw new AppError(400, 'A nova etapa do lead é obrigatória.');
  }
  const newStage = leadStages.find((option) => option === requestedStage);
  if (!newStage) {
    throw new AppError(
      400,
      `Etapa inválida. Etapas permitidas: ${leadStages.join(', ')}.`,
    );
  }

  if (
    Object.hasOwn(data, 'outcome') &&
    Object.hasOwn(data, 'desfecho') &&
    data.outcome !== data.desfecho
  ) {
    throw new AppError(400, 'Os campos outcome e desfecho devem ser iguais.');
  }
  const requestedOutcome = data.outcome ?? data.desfecho ?? null;
  const outcome =
    leadOutcomes.find((option) => option === requestedOutcome) ?? null;
  if (requestedOutcome !== null && outcome === null) {
    throw new AppError(
      400,
      'O desfecho deve ser obrigatoriamente GANHO ou PERDIDO.',
    );
  }
  if (newStage === 'fechado' && outcome === null) {
    throw new AppError(400, 'Informe o desfecho ao fechar o lead.');
  }
  if (newStage !== 'fechado' && outcome !== null) {
    throw new AppError(400, 'Etapas abertas não aceitam desfecho.');
  }
  return { status: newStage, outcome };
}

export async function updateLeadStage(
  requester: Requester | undefined,
  value: string,
  input: unknown,
): Promise<Lead> {
  const { lead, ownerId } = await getLeadAccess(requester, value);
  const { status, outcome } = readStageChange(input);
  const updated = await leadRepository.updateStage(
    lead.id,
    ownerId,
    status,
    outcome,
  );

  if (!updated) {
    await findAccessibleLead(lead.id, ownerId);
    throw new AppError(409, 'O lead foi alterado durante a movimentação.');
  }

  return updated;
}

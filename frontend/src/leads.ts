import type {
  Lead,
  LeadOutcome,
  LeadStage,
} from '../../backend/src/models/lead';
import { request } from './api';

export type LeadRecord = Omit<Lead, 'lastContact' | 'stageChangedAt'> & {
  lastContact: string | null;
  stageChangedAt: string | null;
};

export type StageSelection = Exclude<LeadStage, 'fechado'> | LeadOutcome;

export const stageLabels = {
  prospeccao: 'Prospecção',
  primeiro_contato: 'Primeiro Contato',
  reuniao_agendada: 'Reunião Agendada',
  proposta_enviada: 'Proposta Enviada',
  fechado: 'Fechado / Perdido',
} satisfies Record<LeadStage, string>;

export const stages = Object.keys(stageLabels) as LeadStage[];

export function updateLeadStage(
  id: number,
  selection: StageSelection,
  token: string,
) {
  const movement =
    selection === 'GANHO' || selection === 'PERDIDO'
      ? { stage: 'fechado', outcome: selection }
      : { stage: selection };

  return request<LeadRecord>(
    `/leads/${id}/stage`,
    { method: 'PATCH', body: JSON.stringify(movement) },
    token,
  );
}

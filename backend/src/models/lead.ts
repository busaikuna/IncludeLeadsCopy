export const leadStages = [
  'prospeccao',
  'primeiro_contato',
  'reuniao_agendada',
  'proposta_enviada',
  'fechado',
] as const;

export const leadOutcomes = ['GANHO', 'PERDIDO'] as const;

export type LeadStage = (typeof leadStages)[number];
export type LeadOutcome = (typeof leadOutcomes)[number];

export interface LeadMetrics {
  totalLeads: number;
  inProgress: number;
  closed: number;
  won: number;
  lost: number;
  conversionRate: number;
  closedConversionRate: number;
  byStage: Record<LeadStage, number>;
}

export interface Lead {
  id: number;
  name: string | null;
  nome: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  telefone: string | null;
  status: LeadStage;
  outcome: LeadOutcome | null;
  stageChangedAt: Date | null;
  segmento: string | null;
  origem: string | null;
  responsavel: string | null;
  responsibleUserId: number | null;
  lastContact: Date | null;
}

export type NewLead = Pick<
  Lead,
  'contactName' | 'email' | 'phone' | 'segmento' | 'origem'
> & {
  name: string;
  responsavel: string;
  responsibleUserId: number;
};

export type LeadChanges = Partial<NewLead>;

export const interactionTypes = [
  'ligacao',
  'email',
  'reuniao',
  'mensagem',
  'outro',
] as const;

export type InteractionType = (typeof interactionTypes)[number];

export interface Interaction {
  id: number;
  leadId: number;
  userId: number;
  annotation: string;
  interactionDate: Date;
  type: InteractionType | null;
  createdAt: Date;
}

export type NewInteraction = Omit<Interaction, 'id' | 'createdAt'>;

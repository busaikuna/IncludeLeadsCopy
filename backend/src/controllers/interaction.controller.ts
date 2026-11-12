import type { Request, Response } from 'express';
import * as interactionService from '../services/interaction.service';

type InteractionRequest = Request<{ leadId: string }, unknown, unknown>;

export async function createInteraction(
  req: InteractionRequest,
  res: Response,
): Promise<void> {
  const interaction = await interactionService.createInteraction(
    req.user,
    req.params.leadId,
    req.body,
  );
  res.status(201).json(interaction);
}

export async function listInteractions(
  req: InteractionRequest,
  res: Response,
): Promise<void> {
  const interactions = await interactionService.listInteractions(
    req.user,
    req.params.leadId,
  );
  res.status(200).json(interactions);
}

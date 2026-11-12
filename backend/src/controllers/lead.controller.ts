import type { Request, Response } from 'express';
import * as leadService from '../services/lead.service';

type LeadRequest = Request<{ id: string }, unknown, unknown>;

export async function createLead(req: Request, res: Response): Promise<void> {
  const lead = await leadService.createLead(req.user, req.body);
  res.status(201).json(lead);
}

export async function listLeads(req: Request, res: Response): Promise<void> {
  const leads = await leadService.listLeads(req.user, req.query);
  res.status(200).json(leads);
}

export async function getLead(req: LeadRequest, res: Response): Promise<void> {
  const lead = await leadService.getLead(req.user, req.params.id);
  res.status(200).json(lead);
}

export async function updateLead(
  req: LeadRequest,
  res: Response,
): Promise<void> {
  const lead = await leadService.updateLead(req.user, req.params.id, req.body);
  res.status(200).json(lead);
}

export async function deleteLead(
  req: LeadRequest,
  res: Response,
): Promise<void> {
  await leadService.deleteLead(req.user, req.params.id);
  res.status(204).send();
}

export async function updateLeadStage(
  req: LeadRequest,
  res: Response,
): Promise<void> {
  const updatedLead = await leadService.updateLeadStage(
    req.user,
    req.params.id,
    req.body,
  );
  res.status(200).json(updatedLead);
}
